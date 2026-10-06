/* Diagnostic: inspect the customer account and test the password match. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || "srikantak@yahoo.com").trim().toLowerCase();
  const pass = process.argv[3] || "[REDACTED]";
  const users = await prisma.user.findMany({
    where: { email: { contains: email } },
    select: { id: true, email: true, role: true, isActive: true, phone: true, passwordHash: true, lastLoginAt: true, createdAt: true, updatedAt: true }
  });
  console.log(`Total user rows matching "${email}": ${users.length}`);
  for (const u of users) {
    const matched = await bcrypt.compare(pass, u.passwordHash);
    console.log("---");
    console.log(`  email       : ${u.email}`);
    console.log(`  role        : ${u.role}`);
    console.log(`  isActive    : ${u.isActive}`);
    console.log(`  phone       : ${u.phone}`);
    console.log(`  lastLoginAt : ${u.lastLoginAt ?? "(never)"}`);
    console.log(`  createdAt   : ${u.createdAt}`);
    console.log(`  updatedAt   : ${u.updatedAt}`);
    console.log(`  pw "${pass}" matches stored hash: ${matched}`);
    console.log(`  passwordHash: ${u.passwordHash.substring(0, 31)}...`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());