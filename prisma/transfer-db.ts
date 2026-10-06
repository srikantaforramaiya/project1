/* Data migration: copies ALL rows from the previous database (SOURCE) into the
   new Aiven PostgreSQL database (TARGET), preserving primary keys (cuid strings),
   timestamps and foreign-key relationships so the app keeps working unchanged.

   Usage (run from the project root once the target schema exists):

       # 1) Point .env at the new DB and create the schema on it:
       #    (edit .env  DATABASE_URL to the Aiven URL)  then:
       npm run prisma:generate
       npm run prisma:push        # creates tables + enums on the Aiven DB

       # 2) Run the copy. Defaults: SOURCE = old CockroachDB, TARGET = new Aiven DB.
       #    Override either URL via env vars if needed:
       npm run prisma:transfer

   The script is idempotent: re-running it updates nothing that already exists
   (it uses `upsert` keyed on `id`), so it is safe to re-run after a failure.
*/
import { PrismaClient } from "@prisma/client";

const SOURCE_URL =
  process.env.SOURCE_DATABASE_URL ||
  "postgresql://srikanta:[REDACTED]@dogged-ant-20102.jxf.gcp-asia-south1.cockroachlabs.cloud:26257/defaultdb?sslmode=require";

const TARGET_URL =
  process.env.TARGET_DATABASE_URL ||
  "postgresql://avnadmin:[REDACTED]@pg-1197dc1b-srikanta-project1.f.aivencloud.com:25176/defaultdb?sslmode=require";

const source = new PrismaClient({ datasourceUrl: SOURCE_URL });
const target = new PrismaClient({ datasourceUrl: TARGET_URL });

/* Scalar (non-relation) columns for each model — copied verbatim so ids, enums,
   decimals, json blobs and timestamps survive the move. */
const FIELDS: Record<string, string[]> = {
  User: ["id", "name", "email", "phone", "passwordHash", "role", "isActive", "createdAt", "updatedAt", "lastLoginAt"],
  Category: ["id", "name", "slug", "description", "imageUrl", "displayOrder", "isActive", "createdAt", "updatedAt"],
  Product: ["id", "categoryId", "name", "slug", "shortDescription", "description", "sku", "price", "compareAtPrice", "imageUrl", "thumbnailUrl", "isVegetarian", "isVegan", "isSpicy", "spiceLevel", "preparationTimeMinutes", "stockQuantity", "trackInventory", "minimumOrderQuantity", "maximumOrderQuantity", "isAvailable", "isFeatured", "displayOrder", "createdAt", "updatedAt", "deletedAt"],
  Address: ["id", "userId", "label", "recipientName", "phone", "addressLine1", "addressLine2", "landmark", "city", "state", "postalCode", "latitude", "longitude", "isDefault", "createdAt", "updatedAt"],
  Cart: ["id", "userId", "createdAt", "updatedAt"],
  Order: ["id", "orderNumber", "userId", "addressId", "customerName", "customerEmail", "customerPhone", "deliveryAddressSnapshot", "subtotal", "deliveryCharge", "discountAmount", "taxAmount", "grandTotal", "paymentStatus", "orderStatus", "customerNotes", "adminNotes", "createdAt", "confirmedAt", "preparingAt", "readyAt", "dispatchedAt", "deliveredAt", "cancelledAt", "updatedAt"],
  OrderItem: ["id", "orderId", "productId", "productNameSnapshot", "productSkuSnapshot", "unitPrice", "quantity", "lineTotal", "createdAt"],
  Payment: ["id", "orderId", "provider", "providerOrderId", "providerPaymentId", "providerSignature", "upiTransactionId", "amount", "currency", "status", "paymentMethod", "failureReason", "rawProviderResponse", "createdAt", "updatedAt", "paidAt"],
  OrderStatusHistory: ["id", "orderId", "oldStatus", "newStatus", "changedByUserId", "notes", "createdAt"],
  ProductImage: ["id", "productId", "imageUrl", "altText", "displayOrder", "createdAt"],
  CartItem: ["id", "cartId", "productId", "quantity", "createdAt", "updatedAt"],
  AdminAuditLog: ["id", "adminUserId", "action", "entityType", "entityId", "beforeData", "afterData", "ipAddress", "userAgent", "createdAt"],
  EmailLog: ["id", "userId", "orderId", "recipient", "subject", "template", "status", "providerMessageId", "errorMessage", "sentAt", "createdAt"],
  PasswordResetToken: ["id", "userId", "tokenHash", "expiresAt", "usedAt", "createdAt"]
};

/** Foreign-key safe order: parents before children. */
const ORDER = [
  "User",
  "Category",
  "Product",
  "Address",
  "Cart",
  "Order",
  "OrderItem",
  "Payment",
  "OrderStatusHistory",
  "ProductImage",
  "CartItem",
  "AdminAuditLog",
  "EmailLog",
  "PasswordResetToken"
];

function pick<T extends object>(row: T, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f] = row[f];
  return out;
}

function mask(url: string): string {
  return url.replace(/\/\/[^@]+@/, "//***:***@");
}

async function readAll(model: string, fields: string[]): Promise<Record<string, unknown>[]> {
  const rows = await (source as any)[uncapitalize(model)].findMany();
  return rows.map((r: object) => pick(r, fields));
}

async function upsertRows(model: string, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) {
    console.log(`[${model}] 0/0 copied (no rows).`);
    return 0;
  }
  let ok = 0;
  for (const row of rows) {
    try {
      // `as any`: each model delegate has its own input type; the migration data
      // already matches the target schema field-for-field.
      await (target as any)[uncapitalize(model)].upsert({
        where: { id: row.id as string },
        update: {},
        create: row
      });
      ok++;
    } catch (e) {
      console.error(`  [${model}] FAILED id=${(row as { id: string }).id}: ${(e as Error).message}`);
    }
  }
  console.log(`[${model}] ${ok}/${rows.length} copied.`);
  return ok;
}

async function countRows(prisma: PrismaClient, model: string): Promise<number | string> {
  try {
    return await (prisma as any)[uncapitalize(model)].count();
  } catch (e) {
    console.error(`    could not count ${model}: ${(e as Error).message}`);
    return "ERR";
  }
}

async function preflight(db: PrismaClient, label: string): Promise<void> {
  try {
    await db.$queryRawUnsafe("SELECT 1 AS ok");
    console.log(`  ${label}: reachable ✅`);
  } catch (e) {
    console.error(`  ${label}: NOT reachable ❌ -> ${(e as Error).message.split("\n")[0].trim()}`);
  }
}

function uncapitalize(s: string): string {
  return s[0].toLowerCase() + s.slice(1);
}

async function main() {
  console.log("=== Prisma DB transfer ===\n");
  console.log("  Source:", mask(SOURCE_URL));
  console.log("  Target:", mask(TARGET_URL));

  console.log("\n-- Preflight connectivity --");
  await preflight(source, "SOURCE");
  await preflight(target, "TARGET");

  console.log("\n-- Copying (FK-safe order) --");
  for (const model of ORDER) {
    try {
      await upsertRows(model, await readAll(model, FIELDS[model]!));
    } catch (e) {
      console.error(`  [${model}] COPY FAILED: ${(e as Error).message}`);
    }
  }

  console.log("\n-- Verification (source vs target row counts) --");
  let mismatch = 0;
  for (const model of ORDER) {
    const s = await countRows(source, model);
    const t = await countRows(target, model);
    const mark = s === t ? "OK  " : "DIFF";
    if (s !== t) mismatch++;
    console.log(`  ${mark} ${model.padEnd(20)} src=${s}  tgt=${t}`);
  }
  console.log(
    mismatch === 0
      ? "\nAll tables match — migration complete."
      : `\n${mismatch} table(s) differ. Fix the cause, then re-run this script it is idempotent (upsert by id).`
  );
}

main()
  .catch((e) => {
    console.error("Transfer failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });