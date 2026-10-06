/* Temporary verification of the seeded catalog + users on the Aiven DB. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.count();
  const products = await prisma.product.count();
  const productImages = await prisma.productImage.count();
  const users = await prisma.user.findMany({ select: { email: true, role: true, phone: true } });
  const orders = await prisma.order.count();
  const payments = await prisma.payment.count();
  const carts = await prisma.cart.count();

  console.log(`Categories: ${categories}`);
  console.log(`Products: ${products}`);
  console.log(`ProductImages: ${productImages}`);
  console.log(`Orders: ${orders} (should be 0 — no transactions)`);
  console.log(`Payments: ${payments} (should be 0)`);
  console.log(`Carts: ${carts} (should be 0)`);
  console.log("Users:");
  for (const u of users) console.log(`  - ${u.email} | ${u.role} | phone=${u.phone}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());