/* Seed script: creates the admin user and the store menu (categories + products).
   Admin credentials come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
   No demo customers or demo orders are created — the production database is
   trimmed down to the admin (SEED_ADMIN_EMAIL) and the owner (KEEP_USER_EMAIL). */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedProducts } from "./seed-products";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "srikantak1@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Oic1903!";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", isActive: true },
    create: {
      name: "Store Admin",
      email: adminEmail,
      phone: "9876543210",
      passwordHash: adminHash,
      role: "ADMIN"
    }
  });
  console.log(`Admin ready: ${adminEmail}`);

  await seedProducts(prisma);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

