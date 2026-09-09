import "server-only";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/api-helpers";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { registerSchema, loginSchema, profileUpdateSchema, addressSchema } from "@/lib/validations";
import { AuthError } from "@/lib/auth";
import crypto from "crypto";

export async function registerCustomer(input: unknown) {
  const data = registerSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AuthError("An account with this email already exists. Please log in.", 409);
  }
  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, phone: data.phone, passwordHash, role: "CUSTOMER" }
  });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function loginUser(input: unknown) {
  const data = loginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.isActive) {
    throw new AuthError("Invalid email or password.", 401);
  }
  if (!user.emailVerified) {
    throw new AuthError("Your email is not verified yet. Please enter the OTP we emailed you.", 403);
  }
  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    throw new AuthError("Invalid email or password.", 401);
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// ---------- Registration OTP ----------
const OTP_TTL_MS = 60 * 60 * 1000; // 60 minutes
const OTP_MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/** Generate a 6-digit OTP valid for 60 minutes and email it to the user. Returns the raw code (for tests). */
export async function createRegistrationOtp(userId: string, email: string, name: string): Promise<string> {
  const { sendOtpEmail } = await import("@/services/email.service");
  await prisma.emailOtp.updateMany({
    where: { userId, consumedAt: null },
    data: { consumedAt: new Date() }
  });
  const code = String(crypto.randomInt(100000, 1000000));
  await prisma.emailOtp.create({
    data: { userId, codeHash: hashCode(code), purpose: "registration", expiresAt: new Date(Date.now() + OTP_TTL_MS) }
  });
  await sendOtpEmail(email, name, code);
  return code;
}

/** Resend the OTP for an unverified account. Never reveals whether the account exists. */
export async function resendRegistrationOtp(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return; // silently ignore to avoid account enumeration
  await createRegistrationOtp(user.id, user.email, user.name);
}

/** Verify a registration OTP. Returns the verified user or null. */
export async function verifyRegistrationOtp(
  email: string,
  code: string
): Promise<{ id: string; name: string; email: string; role: string } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return null;
  const otp = await prisma.emailOtp.findFirst({
    where: { userId: user.id, consumedAt: null, purpose: "registration", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
  if (!otp) throw new AuthError("No valid OTP found. Please request a new code.", 400);
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new AuthError("Too many incorrect attempts. Please request a new code.", 429);
  if (hashCode(code) !== otp.codeHash) {
    await prisma.emailOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new AuthError("Incorrect OTP. Please try again.", 400);
  }
  await prisma.$transaction([
    prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } })
  ]);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function updateProfile(userId: string, input: unknown) {
  const data = profileUpdateSchema.parse(input);
  return prisma.user.update({
    where: { id: userId },
    data: { name: data.name, phone: data.phone },
    select: { id: true, name: true, phone: true }
  });
}

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
  });
}

export async function createAddress(userId: string, input: unknown) {
  const data = addressSchema.parse(input);
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.create({ data: { ...data, addressLine2: data.addressLine2 || null, landmark: data.landmark || null, userId } });
}

export async function updateAddress(userId: string, addressId: string, input: unknown) {
  const data = addressSchema.parse(input);
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw new AuthError("Address not found.", 404);
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.update({
    where: { id: addressId },
    data: { ...data, addressLine2: data.addressLine2 || null, landmark: data.landmark || null }
  });
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  await prisma.address.deleteMany({ where: { id: addressId, userId } });
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<void> {
  await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  await prisma.address.updateMany({ where: { id: addressId, userId }, data: { isDefault: true } });
}

/** Creates a single-use, hashed, 1-hour password reset token. Always returns a URL (never reveals whether the email exists). */
export async function createPasswordResetToken(email: string, appUrl: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return `${appUrl}/auth/reset-password?token=invalid`;
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
  });
  return `${appUrl}/auth/reset-password?token=${token}`;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return false;
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  ]);
  return true;
}

export function slugifyName(name: string): string {
  return slugify(name);
}
