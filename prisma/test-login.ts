/* Isolate the exact login path against Aiven: findUnique → bcrypt → update → SignJWT. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || "srikantak@yahoo.com").trim().toLowerCase();
  const password = process.argv[3] || "[REDACTED]";
  const AUTH_SECRET = process.env.AUTH_SECRET || "dev-only-secret-change-me-min-16-chars";
  console.log("AUTH_SECRET length:", AUTH_SECRET.length);

  console.log("1) findUnique…");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("   -> NOT FOUND");
    return;
  }
  console.log(`   -> ${user.email} | role=${user.role} | isActive=${user.isActive}`);

  console.log("2) bcrypt.compare…");
  console.log(`   -> ${await bcrypt.compare(password, user.passwordHash)}`);

  console.log("3) prisma.user.update(lastLoginAt)…");
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  console.log(`   -> ok, lastLoginAt now = ${updated.lastLoginAt}`);

  console.log("4) SignJWT…");
  const token = await new SignJWT({ id: user.id, name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${7 * 24}h`)
    .sign(new TextEncoder().encode(AUTH_SECRET));
  console.log(`   -> ok, token length = ${token.length}`);
}

main()
  .catch((e) => {
    console.error("STEP FAILED ->", (e as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());