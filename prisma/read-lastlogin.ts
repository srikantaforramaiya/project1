/* Read-only: print lastLoginAt for an email. */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const email = (process.argv[2] || "srikantak@yahoo.com").trim().toLowerCase();
  const u = await prisma.user.findUnique({ where: { email }, select: { lastLoginAt: true } });
  console.log(`lastLoginAt=${u?.lastLoginAt ?? "MISSING"}`);
}
main().catch((e) => console.error(e.message)).finally(() => prisma.$disconnect());