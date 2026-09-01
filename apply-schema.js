const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const TABLES = ['User','Address','Category','Product','ProductImage','Cart','CartItem','Order','OrderItem','Payment','OrderStatusHistory','AdminAuditLog','EmailLog','PasswordResetToken'];
const ENUMS = ['Role','OrderStatus','PaymentStatus','PaymentRecordStatus','EmailStatus'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];

async function safe(label, fn) {
  try { await fn(); out.push('OK   ' + label); }
  catch (e) { out.push('ERR  ' + label + ' :: ' + e.message.split('\n')[0]); }
  fs.writeFileSync('apply-out.txt', out.join('\n'));
}

async function main() {
  // 1) Cleanup: unlock then drop existing objects
  for (const t of TABLES) {
    await safe('unlock ' + t, () => p.$executeRawUnsafe(`ALTER TABLE IF EXISTS "${t}" SET (schema_locked = false)`));
    await safe('drop   ' + t, () => p.$executeRawUnsafe(`DROP TABLE IF EXISTS "${t}" CASCADE`));
  }
  for (const e of ENUMS) {
    await safe('drop enum ' + e, () => p.$executeRawUnsafe(`DROP TYPE IF EXISTS "${e}" CASCADE`));
  }

  // 2) Apply migration statements — split on ';' (blank lines occur INSIDE CREATE TABLE)
  const sql = fs.readFileSync('prisma/migration.sql', 'utf8');
  const cleaned = sql.split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
  const statements = cleaned.split(';').map((s) => s.trim()).filter(Boolean);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].replace(/;\s*$/, '');
    try {
      await p.$executeRawUnsafe(stmt + ';');
      out.push('OK   ' + stmt.slice(0, 48));
      // CockroachDB v26.2 locks new tables; unlock immediately so later FK ALTERs work.
      const m = stmt.match(/^CREATE TABLE "([^"]+)"/);
      if (m) {
        await safe('unlock ' + m[1], () => p.$executeRawUnsafe(`ALTER TABLE "${m[1]}" SET (schema_locked = false)`));
      }
    } catch (e) {
      out.push('ERR  ' + stmt.slice(0, 48) + ' :: ' + e.message.split('\n')[0]);
    }
    fs.writeFileSync('apply-out.txt', out.join('\n'));
    if (i % 8 === 0) await wait(150);
  }
  fs.writeFileSync('apply-out.txt', out.join('\n'));
  await p.$disconnect();
}
main().catch(async (e) => {
  out.push('FATAL ' + e.message.split('\n')[0]);
  fs.writeFileSync('apply-out.txt', out.join('\n'));
  await p.$disconnect();
  process.exit(1);
});