import "server-only";
import crypto from "crypto";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, AuthError } from "@/lib/auth";
import { forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "@/lib/validations";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "@/services/email.service";

/** Reset links are valid for 1 hour. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Forgot password: create a one-time, hashed reset token and email the customer
 * a dynamic URL to choose a new password. Always returns the same response so
 * that existing accounts cannot be enumerated.
 */
export async function requestPasswordReset(input: unknown): Promise<{ message: string }> {
  const { email } = forgotPasswordSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return { message: "If an account exists for that email, a password reset link has been sent." };
  }

  // Invalidate any previous un-used tokens for this user (single active link).
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const rawToken = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256Hex(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      createdAt: new Date()
    }
  });

  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail({ userId: user.id, email: user.email, name: user.name, resetUrl });

  return { message: "If an account exists for that email, a password reset link has been sent." };
}

/** Reset password using a valid, un-used, un-expired reset token. */
export async function resetPassword(input: unknown) {
  const data = resetPasswordSchema.parse(input);
  const tokenHash = sha256Hex(data.token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!record || !record.user || !record.user.isActive) {
    throw new AuthError("This reset link is invalid. Please request a new link.", 400);
  }
  if (record.usedAt) {
    throw new AuthError("This reset link has already been used. Please request a new link.", 400);
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new AuthError("This reset link has expired. Please request a new link.", 400);
  }

  const passwordHash = await hashPassword(data.password);
  await prisma.user.update({ where: { id: record.user.id }, data: { passwordHash } });

  // Mark this token used and clear any other outstanding tokens for the user.
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: record.user.id, usedAt: null } });

  await sendPasswordChangedEmail({ userId: record.user.id, email: record.user.email, name: record.user.name });

  return { email: record.user.email };
}

/** Change password for an authenticated user (requires the current password). */
export async function changePassword(userId: string, input: unknown) {
  const data = changePasswordSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new AuthError("Account not found.", 404);

  const valid = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!valid) throw new AuthError("Current password is incorrect.", 400);

  const passwordHash = await hashPassword(data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  // Invalidate any outstanding reset tokens so they can't be re-used.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  await sendPasswordChangedEmail({ userId: user.id, email: user.email, name: user.name });

  return { email: user.email };
}
