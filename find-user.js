const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.user.findMany({ where: { email: { contains: "yahoo" } }, select: { email: true, name: true, role: true, createdAt: true } })
  .then(u => { console.log(JSON.stringify(u, null, 2)); return p.$disconnect(); })
  .catch(e => { console.error(e.message.split("\n")[0]); process.exit(1); });