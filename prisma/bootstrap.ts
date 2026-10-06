/* Bootstrap the Aiven PostgreSQL database with:
   1) Catalog sample data ONLY (categories + products from seed-products.ts).
      No sample users and NO transactions (orders/payments/order items/status
      history/carts/addresses/email logs/audit logs) are created.
   2) The admin user  srikantak1@gmail.com / [REDACTED]  (role ADMIN)
   3) The customer    srikantak@yahoo.com / [REDACTED]  (role CUSTOMER)

   Idempotent — safe to re-run. Usage:  npm run prisma:bootstrap
   (Run `npm run prisma:push` first to create all the tables/enums on the DB.) */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedProducts } from "./seed-products";

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || "srikantak1@gmail.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "[REDACTED]";
const CUSTOMER_EMAIL = (process.env.SEED_CUSTOMER_EMAIL || "srikantak@yahoo.com").trim().toLowerCase();
const CUSTOMER_PASSWORD = process.env.SEED_CUSTOMER_PASSWORD || "[REDACTED]";

async function upsertUser(params: {
  email: string;
  password: string;
  role: "ADMIN" | "CUSTOMER";
  name: string;
  phone: string;
}): Promise<void> {
  const hash = await bcrypt.hash(params.password, 12);
  await prisma.user.upsert({
    where: { email: params.email },
    update: {
      role: params.role,
      passwordHash: hash,
      name: params.name,
      phone: params.phone,
      isActive: true
    },
    create: {
      email: params.email,
      passwordHash: hash,
      role: params.role,
      name: params.name,
      phone: params.phone,
      isActive: true
    }
  });
  console.log(`${params.role} ready: ${params.email}`);
}

async function main() {
  console.log("Bootstrapping database (catalog + users only, no transactions)…");

  await seedProducts(prisma);
  await upsertUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "ADMIN",
    name: "Store Admin",
    phone: "9876543210"
  });
  await upsertUser({
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
    role: "CUSTOMER",
    name: "Srikanta Customer",
    phone: "9000000001"
  });

  console.log("Bootstrap complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());