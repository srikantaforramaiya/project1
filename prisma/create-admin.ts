/* Create or update the store admin user.
   Reads SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (defaults: srikantak1@gmail.com / [REDACTED]).
   Idempotent — safe to re-run. Usage:  npm run prisma:admin   */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "srikantak1@gmail.com").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "[REDACTED]";
  const hash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", isActive: true, passwordHash: hash },
    create: {
      name: "Store Admin",
      email,
      phone: "9876543210",
      passwordHash: hash,
      role: "ADMIN"
    }
  });
  console.log(`Admin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());