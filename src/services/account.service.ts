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

// ---------- OTP engine ----------
const OTP_TTL_MS = 60 * 60 * 1000; // 60 minutes
const OTP_MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/** Cryptographically random 6-digit code (100000-999999). Uses randomBytes so it works on all Node versions. */
function randomOtp(): string {
  const num = crypto.randomBytes(4).readUInt32BE() % 900000;
  return String(100000 + num);
}

async function issueOtp(userId: string, email: string, name: string, purpose: string): Promise<string> {
  const { sendOtpEmail } = await import("@/services/email.service");
  await prisma.emailOtp.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() }
  });
  const code = randomOtp();
  await prisma.emailOtp.create({
    data: { userId, codeHash: hashCode(code), purpose, expiresAt: new Date(Date.now() + OTP_TTL_MS) }
  });
  await sendOtpEmail(email, name, code);
  return code;
}

/** Generate a 6-digit OTP valid for 60 minutes and email it to the user. Returns the raw code (for tests). */
export async function createRegistrationOtp(userId: string, email: string, name: string): Promise<string> {
  return issueOtp(userId, email, name, "registration");
}

/**
 * Validates that an email belongs to an existing customer. Returns true only when the
 * account exists and is active. Used to gate actions like password reset — when false,
 * callers MUST do nothing (no OTP, no email, neutral response) to avoid account enumeration.
 */
export async function isKnownCustomer(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email, isActive: true } });
  return user !== null;
}

/** Issue a password-reset OTP. Returns null if the account does not exist (callers never reveal that). */
export async function createPasswordResetOtp(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    // Not in the customer list (or inactive): do nothing — no OTP, no email.
    return null;
  }
  return issueOtp(user.id, user.email, user.name, "password-reset");
}

/** Consume a password-reset OTP and set the new password. Returns the user or null on any failure. */
export async function resetPasswordWithOtp(
  email: string,
  code: string,
  newPassword: string
): Promise<{ id: string; email: string } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  const otp = await prisma.emailOtp.findFirst({
    where: { userId: user.id, purpose: "password-reset", consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
  if (!otp) throw new AuthError("No valid OTP found. Please request a new code.", 400);
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new AuthError("Too many incorrect attempts. Please request a new code.", 429);
  if (hashCode(code) !== otp.codeHash) {
    await prisma.emailOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new AuthError("Incorrect OTP. Please try again.", 400);
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  ]);
  // Fire the password-changed confirmation email (failure never blocks the reset).
  const { sendPasswordChangedEmail } = await import("@/services/email.service");
  await sendPasswordChangedEmail(user.email, user.name);
  return { id: user.id, email: user.email };
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

export function slugifyName(name: string): string {
  return slugify(name);
}
