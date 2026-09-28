/* One-time production data cleanup.
   - Keeps only the admin (SEED_ADMIN_EMAIL) and the store owner (KEEP_USER_EMAIL).
   - Creates/updates the admin account with SEED_ADMIN_PASSWORD.
   - Deletes every other user and all of their related data
     (orders, order items, payments, status history, cart, addresses,
      email logs, admin audit logs and password-reset tokens).
   Run with:  npm run prisma:prune   (from a machine that can reach the DB)
*/
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "srikantak1@gmail.com").trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Oic1903!";
  const keeperEmail = (process.env.KEEP_USER_EMAIL || "srikantak@yahoo.com").trim().toLowerCase();

  // 1. Ensure the admin account exists (idempotent).
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
  console.log("Admin ready:", adminEmail);

  // 2. Resolve ids to keep (keeper + admin). Keeper keeps its own data untouched.
  const keepIds: string[] = [];
  for (const email of [keeperEmail, adminEmail]) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (u) keepIds.push(u.id);
  }

  const doomed = await prisma.user.findMany({
    where: { id: { notIn: keepIds } },
    select: { id: true }
  });
  const doomedIds = doomed.map((d) => d.id);

  if (doomedIds.length === 0) {
    console.log("No extra users to remove.");
  } else {
    // 3. Remove transactions that belong to the doomed users (FK-safe order).
    const orders = await prisma.order.findMany({
      where: { userId: { in: doomedIds } },
      select: { id: true }
    });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length > 0) {
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.emailLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    // 4. Remove remaining user-scoped data, then users.
    await prisma.emailLog.deleteMany({ where: { userId: { in: doomedIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { changedByUserId: { in: doomedIds } } });
    await prisma.adminAuditLog.deleteMany({ where: { adminUserId: { in: doomedIds } } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: doomedIds } } });
    await prisma.cart.deleteMany({ where: { userId: { in: doomedIds } } }); // cascades CartItems
    await prisma.address.deleteMany({ where: { userId: { in: doomedIds } } });

    const res = await prisma.user.deleteMany({ where: { id: { in: doomedIds } } });
    console.log(`Removed ${res.count} user(s) and their transactions.`);
  }

  console.log("Prune complete. Kept:", [keeperEmail, adminEmail].join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());