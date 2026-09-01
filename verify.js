const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const tables = await p.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
  const enums = await p.$queryRawUnsafe(`SELECT DISTINCT t.typname FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid`);
  const counts = {};
  for (const t of tables) {
    const name = t.table_name;
    const c = await p.$queryRawUnsafe(`SELECT count(*)::INT AS n FROM "${name}"`);
    counts[name] = c[0].n;
  }
  fs.writeFileSync('verify-out.txt', 'TABLES: ' + tables.map(t => t.table_name).join(', ') + '\nENUMS: ' + enums.map(e => e.typname).join(', ') + '\nROWCOUNTS: ' + JSON.stringify(counts, (k, v) => typeof v === 'bigint' ? Number(v) : v));
  await p.$disconnect();
}
main().catch(async (e) => { fs.writeFileSync('verify-out.txt', 'FATAL ' + e.message.split('\n')[0]); await p.$disconnect(); });