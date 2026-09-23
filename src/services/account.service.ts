import "server-only";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/api-helpers";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { registerSchema, loginSchema, profileUpdateSchema, addressSchema } from "@/lib/validations";
import { AuthError } from "@/lib/auth";

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
  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    throw new AuthError("Invalid email or password.", 401);
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
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