/* Admin journey test: login → dashboard → categories → products → orders → customers → payments → reports → settings → audit logs */
const BASE = "http://localhost:3000";
const fs = require("fs");

function makeClient() {
  let cookie = "";
  return {
    async req(method, path, body, rawText) {
      const res = await fetch(BASE + path, {
        method,
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        redirect: "manual"
      });
      const sc = res.headers.get("set-cookie");
      if (sc) cookie = sc.split(";")[0];
      const ct = res.headers.get("content-type") ?? "";
      if (rawText || ct.includes("csv") || ct.includes("html") || ct.includes("svg")) {
        return { status: res.status, text: await res.text(), headers: res.headers };
      }
      const data = await res.json().catch(() => null);
      return { status: res.status, data, headers: res.headers };
    }
  };
}

const results = [];
function save() { fs.writeFileSync("admin-report.txt", results.map(r => `${r.pass ? "PASS" : "FAIL"} | ${r.name}${r.detail ? " | " + r.detail : ""}`).join("\n") + `\n\n=== ${results.filter(r => r.pass).length} passed / ${results.length} total ===`); }
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: detail ?? "" });
  console.log((cond ? "PASS " : "FAIL ") + name + (detail ? `  [${detail}]` : ""));
  save();
}

async function main() {
  const stamp = Date.now().toString().slice(-6);
  const a = makeClient();

  // 1. Admin auth
  const anonAdmin = await makeClient().req("GET", "/api/admin/products");
  check("A1.1 Admin API blocked without login", anonAdmin.status === 401 || anonAdmin.status === 307);
  const custLogin = makeClient();
  await custLogin.req("POST", "/api/auth/login", { email: "priya@example.com", password: "Customer!123" });
  const custBlocked = await custLogin.req("GET", "/api/admin/products");
  check("A1.2 Customer blocked from admin API", custBlocked.status === 403);
  check("A1.3 Admin login", (await a.req("POST", "/api/auth/login", { email: "admin@neonbites.test", password: "ChangeMe!123" })).status === 200);

  // 2. Dashboard page renders
  const dash = await a.req("GET", "/admin", null, true);
  check("A2.1 Dashboard renders", dash.status === 200 && dash.text.includes("Dashboard"));

  // 3. Categories
  const cat = await a.req("POST", "/api/admin/categories", { name: `Test Cat ${stamp}`, description: "Journey test", displayOrder: 99, isActive: true });
  check("A3.1 Create category", cat.status === 201);
  const catUpd = await a.req("PATCH", `/api/admin/categories/${cat.data.category.id}`, { name: `Test Cat ${stamp} Upd`, displayOrder: 99, isActive: true });
  check("A3.2 Update category", catUpd.status === 200);
  const catDup = await a.req("POST", "/api/admin/categories", { name: "Breakfast", displayOrder: 1, isActive: true });
  check("A3.3 Duplicate category name gets unique slug (no crash)", catDup.status === 201);

  // 4. Products CRUD
  const prod = await a.req("POST", "/api/admin/products", {
    name: `Journey Paneer ${stamp}`, sku: `JT-${stamp}`, categoryId: cat.data.category.id,
    shortDescription: "A journey-test dish", description: "Created by admin journey test",
    price: 199, isVegetarian: true, isAvailable: true, isFeatured: false,
    preparationTimeMinutes: 12, minimumOrderQuantity: 1, displayOrder: 99,
    trackInventory: true, stockQuantity: 10
  });
  check("A4.1 Create product", prod.status === 201, prod.status !== 201 ? JSON.stringify(prod.data) : undefined);
  const prodId = prod.data.product?.id;

  const badProd = await a.req("POST", "/api/admin/products", { name: "Bad", sku: "X", price: -5, categoryId: cat.data.category.id, shortDescription: "no" });
  check("A4.2 Invalid product rejected (negative price)", badProd.status === 422);

  const avail = await a.req("PATCH", `/api/admin/products/${prodId}/toggle`, { isAvailable: false });
  check("A4.3 Mark product sold out", avail.status === 200 && avail.data.product.isAvailable === false);
  const menuCheck = await fetch(BASE + "/menu?available=0&search=" + encodeURIComponent(`Journey Paneer ${stamp}`)).then(r => r.text());
  check("A4.4 Sold-out product shows 'Sold Out' on storefront", menuCheck.includes("Sold Out"));
  await a.req("PATCH", `/api/admin/products/${prodId}/toggle`, { isAvailable: true });
  await a.req("PATCH", `/api/admin/products/${prodId}/toggle`, { isFeatured: true });

  const prodUpd = await a.req("PATCH", `/api/admin/products/${prodId}`, {
    name: `Journey Paneer ${stamp} Deluxe`, sku: `JT-${stamp}`, categoryId: cat.data.category.id,
    shortDescription: "Updated journey dish", price: 249, isVegetarian: true, isAvailable: true,
    isFeatured: true, preparationTimeMinutes: 15, minimumOrderQuantity: 1, displayOrder: 99,
    trackInventory: true, stockQuantity: 8
  });
  check("A4.5 Edit product (price change)", prodUpd.status === 200 && Number(prodUpd.data.product.price) === 249);

  // Customer can order the new product (cart cleared first for a clean run)
  const c = makeClient();
  await c.req("POST", "/api/auth/login", { email: "priya@example.com", password: "Customer!123" });
  const cart0 = await c.req("GET", "/api/cart");
  for (const it of (cart0.data.items ?? [])) await c.req("DELETE", "/api/cart/items", { itemId: it.id });
  await c.req("POST", "/api/cart/items", { productId: prodId, quantity: 1 });
  // ensure a serviceable-area address exists (560066/560067 only)
  const addrList0 = (await c.req("GET", "/api/account/addresses")).data.addresses;
  let addrId = addrList0.find(a => ["560066", "560067"].includes(a.postalCode))?.id;
  if (!addrId) {
    const na = await c.req("POST", "/api/account/addresses", { label: "Belathur", recipientName: "Priya Sharma", phone: "9812345678", addressLine1: "Near Kadugodi Tree Park", city: "Bengaluru", state: "Karnataka", postalCode: "560067", isDefault: true });
    addrId = na.data.address.id;
  }
  const co = await c.req("POST", "/api/checkout", { addressId: addrId });
  check("A4.6 New product visible & orderable by customer", co.status === 200, co.status !== 200 ? JSON.stringify(co.data) : undefined);
  const newOrder = co.data.orderNumber;

  // Inventory decremented after order (stock was 8, ordered 1)
  const prodList = await a.req("GET", `/api/admin/products?search=${encodeURIComponent(`Journey Paneer ${stamp} Deluxe`)}`);
  const prodRow = prodList.data?.items?.find(x => x.id === prodId);
  check("A4.7 Inventory decremented after order", prodRow && prodRow.stockQuantity === 7, prodRow ? `stock=${prodRow.stockQuantity}` : "not found");

  // Archive product (soft delete) — order history preserved
  const arch = await a.req("DELETE", `/api/admin/products/${prodId}`);
  check("A4.8 Archive product (soft delete)", arch.status === 200);
  const orderItems = await (async () => { const { PrismaClient } = await import("@prisma/client"); const pp = new PrismaClient(); const oi = await pp.orderItem.findFirst({ where: { productId: prodId } }); await pp.$disconnect(); return oi; })();
  check("A4.9 Order history snapshot preserved after archive", !!orderItems);

  // 5. Orders admin
  const ordersPage = await a.req("GET", "/admin/orders", null, true);
  check("A5.1 Orders page renders", ordersPage.status === 200 && ordersPage.text.includes("Orders"));
  const invalid = await a.req("PATCH", `/api/admin/orders/${newOrder}/status`, { status: "DELIVERED" });
  check("A5.2 Invalid status transition (PENDING_PAYMENT→DELIVERED) rejected", invalid.status === 409);
  const notFound = await a.req("PATCH", `/api/admin/orders/FOOD-99999999-000001/status`, { status: "CONFIRMED" });
  check("A5.3 Non-existent order handled", notFound.status === 404);

  // 6. Customers
  const custPage = await a.req("GET", "/admin/customers", null, true);
  check("A6.1 Customers page renders", custPage.status === 200 && custPage.text.includes("Customers"));
  const { PrismaClient } = require("@prisma/client");
  const p2 = new PrismaClient();
  const someCustomer = await p2.user.findFirst({ where: { role: "CUSTOMER" }, orderBy: { createdAt: "desc" }, select: { id: true } });
  await p2.$disconnect();
  const deact = await a.req("PATCH", `/api/admin/customers/${someCustomer.id}`, { isActive: false });
  check("A6.2 Deactivate customer", deact.status === 200 && deact.data.user.isActive === false);
  const act = await a.req("PATCH", `/api/admin/customers/${someCustomer.id}`, { isActive: true });
  check("A6.3 Reactivate customer", act.status === 200 && act.data.user.isActive === true);
  const selfDeact = await a.req("PATCH", `/api/admin/customers/nonexistent-id`, { isActive: false });
  check("A6.4 Unknown customer handled", selfDeact.status === 404);

  // 7. Payments, reports, exports
  const payPage = await a.req("GET", "/admin/payments", null, true);
  check("A7.1 Payments page renders (gateway secrets hidden)", payPage.status === 200 && payPage.text.includes("Payments") && !payPage.text.includes("Oic1903"));
  const repPage = await a.req("GET", "/admin/reports", null, true);
  check("A7.2 Reports page renders with KPIs", repPage.status === 200 && repPage.text.includes("Reports") && repPage.text.includes("Revenue"));
  const customRep = await a.req("GET", "/admin/reports/custom?preset=last_30_days&dimension=day&metrics=revenue,order_count", null, true);
  check("A7.3 Custom report builder renders", customRep.status === 200);
  const csv = await a.req("GET", "/api/admin/reports/export?type=daily-sales&preset=last_30_days", null, true);
  check("A7.4 CSV export works with report metadata", csv.status === 200 && (csv.headers.get("content-type") ?? "").includes("csv") && csv.text.includes("Report:"));
  const csvCustom = await a.req("GET", "/api/admin/reports/export?type=custom&preset=last_30_days&dimension=product&metrics=revenue,order_count", null, true);
  check("A7.5 Custom report CSV export works", csvCustom.status === 200 && (csvCustom.headers.get("content-type") ?? "").includes("csv"));
  const csvAnon = await makeClient().req("GET", "/api/admin/reports/export?type=daily-sales&preset=today");
  check("A7.6 CSV export blocked for anonymous", csvAnon.status === 401 || csvAnon.status === 307);

  // 8. Settings & audit logs
  const setPage = await a.req("GET", "/admin/settings", null, true);
  check("A8.1 Settings renders, DB credentials never shown", setPage.status === 200 && setPage.text.includes("Settings") && !setPage.text.includes("postgresql://"));
  const audit = await a.req("GET", "/admin/audit-logs", null, true);
  check("A8.2 Audit logs render with product actions", audit.status === 200 && audit.text.includes("product."));
  const pp2 = new PrismaClient();
  const auditCount = await pp2.adminAuditLog.count();
  await pp2.$disconnect();
  check("A8.3 Audit entries persisted in DB", auditCount > 0, `count=${auditCount}`);

  console.log(`\n=== ADMIN SUMMARY: ${results.filter(r => r.pass).length} passed / ${results.length} total ===`);
  process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch((e) => { check("FATAL", false, e.message.split("\n")[0]); console.error(e); });



