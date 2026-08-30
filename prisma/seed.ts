/* Seed script: categories, products, demo customers, demo orders and an admin user.
   Admin credentials come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD — never hard-code real ones. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedProducts } from "./seed-products";
import { seedDemoOrders } from "./seed-orders";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@neonbites.test";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!123";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", isActive: true },
    create: {
      name: "Store Admin",
      email: adminEmail,
      phone: "9876543210",
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerified: true
    }
  });
  console.log(`Admin ready: ${adminEmail}`);

  const customerHash = await bcrypt.hash("Customer!123", 12);
  const customersData = [
    { name: "Priya Sharma", email: "priya@example.com", phone: "9812345678" },
    { name: "Rahul Gowda", email: "rahul@example.com", phone: "9822345678" },
    { name: "Ananya Rao", email: "ananya@example.com", phone: "9832345678" }
  ];
  for (const c of customersData) {
    const u = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { ...c, passwordHash: customerHash, role: "CUSTOMER", emailVerified: true }
    });
    const address = await prisma.address.findFirst({ where: { userId: u.id } });
    if (!address) {
      await prisma.address.create({
        data: {
          userId: u.id,
          label: "Home",
          recipientName: c.name,
          phone: c.phone,
          addressLine1: "42, 5th Cross, Indiranagar",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560038",
          isDefault: true
        }
      });
    }
  }

  await seedProducts(prisma);
  await seedDemoOrders(prisma);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

