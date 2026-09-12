/* Full user-journey test suite: register → logout → login → address → browse → cart →
   checkout → QR → notify → admin verify → full order lifecycle → authorization checks */
const BASE = "http://localhost:3000";
const PASS = "9790719925:ReportPass1!";
const fs = require("fs");
const crypto = require("crypto");

// Registration now requires email-OTP verification. The plaintext OTP is NOT stored
// in the DB (only a SHA-256 hash + an AES-256-GCM cipher). The test recovers the code
// by decrypting the cipher exactly as src/services/account.service.ts does, using the
// same AUTH_SECRET-derived key, so it can drive the real /api/auth/verify-otp flow.
function loadAuthSecret() {
  const txt = fs.readFileSync(".env", "utf8");
  const m = txt.match(/^AUTH_SECRET=(.+)$/m);
  if (!m) throw new Error("AUTH_SECRET not found in .env");
  return m[1].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

function decryptOtpCipher(cipher) {
  const key = crypto.createHash("sha256").update(loadAuthSecret()).digest();
  const [ivHex, tagHex, ctHex] = cipher.split(":");
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  d.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([d.update(Buffer.from(ctHex, "hex")), d.final()]).toString("utf8");
}

async function fetchRegistrationOtp(email) {
  const { PrismaClient } = require("@prisma/client");
  const client = new PrismaClient();
  const user = await client.user.findUnique({ where: { email } });
  if (!user) { await client.$disconnect(); return null; }
  const otp = await client.emailOtp.findFirst({
    where: { userId: user.id, purpose: "registration", consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
  await client.$disconnect();
  return otp && otp.cipher ? decryptOtpCipher(otp.cipher) : null;
}

function makeClient() {
  let cookie = "";
  return {
    async req(method, path, body) {
      const res = await fetch(BASE + path, {
        method,
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        redirect: "manual"
      });
      const sc = res.headers.get("set-cookie");
      if (sc) cookie = sc.split(";")[0];
      let data = null;
      if ((res.headers.get("content-type") ?? "").includes("json")) data = await res.json().catch(() => null);
      return { status: res.status, data, headers: res.headers };
    },
    async raw(path) {
      return fetch(BASE + path, { headers: cookie ? { Cookie: cookie } : {} });
    }
  };
}

const results = [];
let outOfAreaId = null;
function save() { fs.writeFileSync("journey-report.txt", results.map(r => `${r.pass ? "PASS" : "FAIL"} | ${r.name}${r.detail ? " | " + r.detail : ""}`).join("\n") + `\n\n=== ${results.filter(r => r.pass).length} passed / ${results.length} total ===`); }
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: detail ?? "" });
  console.log((cond ? "PASS " : "FAIL ") + name + (detail ? `  [${detail}]` : ""));
  save();
}

async function main() {
  const stamp = Date.now().toString().slice(-8);

  // ── 1. Registration (now requires email-OTP verification) ──
  const nu = makeClient();
  const regEmail = `journey${stamp}@test.com`;
  const reg = await nu.req("POST", "/api/auth/register", {
    name: "Journey Tester", email: regEmail, phone: `98${stamp}`,
    password: PASS, confirmPassword: PASS
  });
  check("1.1 New customer can register (requires verification)", reg.status === 200 && reg.data.requiresVerification === true && reg.data.email === regEmail, JSON.stringify(reg.data));

  // Recover the emailed OTP (stored encrypted in EmailOtp.cipher) and drive the real verify flow.
  const otp = await fetchRegistrationOtp(regEmail);
  check("1.1a Registration OTP issued and recoverable", typeof otp === "string" && /^\d{6}$/.test(otp));

  const regBad = await nu.req("POST", "/api/auth/register", {
    name: "X", email: `bad${stamp}@test.com`, phone: "123", password: "weak", confirmPassword: "other"
  });
  check("1.2 Weak password / bad phone rejected", regBad.status === 422);

  const regDup = await makeClient().req("POST", "/api/auth/register", {
    name: "Dup", email: "priya@example.com", phone: "9812345678", password: PASS, confirmPassword: PASS
  });
  check("1.3 Duplicate email rejected", regDup.status === 409);

  // ── 1b. OTP verification ──
  const wrongOtp = await nu.req("POST", "/api/auth/verify-otp", { email: regEmail, otp: "000000" });
  check("1.4 Wrong OTP rejected, email stays unverified", wrongOtp.status === 400 || wrongOtp.status === 401);
  const notYetLogic = await makeClient().req("POST", "/api/auth/login", { email: regEmail, password: PASS });
  check("1.5 Login blocked until email verified", notYetLogic.status === 401 || notYetLogic.status === 403);

  const verify = await nu.req("POST", "/api/auth/verify-otp", { email: regEmail, otp });
  check("1.6 Correct OTP verifies email (session created)", verify.status === 200);
  const sess = await nu.req("GET", "/api/auth/session");
  check("1.7 Session active after email verification", sess.status === 200 && sess.data.email === regEmail);

  // ── 2. Logout / Login ──
  const lo = await nu.req("POST", "/api/auth/logout");
  check("2.1 Logout works", lo.status === 200);
  const afterLogout = await nu.req("GET", "/api/cart");
  check("2.2 Session cleared after logout", afterLogout.status === 401);

  const c = makeClient();
  const badLogin = await c.req("POST", "/api/auth/login", { email: regEmail, password: "WrongPass1!" });
  check("2.3 Invalid login rejected", badLogin.status === 401);
  const login = await c.req("POST", "/api/auth/login", { email: regEmail, password: PASS });
  check("2.4 Login with correct password", login.status === 200);

  // ── 3. Address management ──
  const addr1 = await c.req("POST", "/api/account/addresses", {
    label: "Home", recipientName: "Journey Tester", phone: "9790719925",
    addressLine1: "5 Belathur Main Road, Kadugodi", city: "Bengaluru", state: "Karnataka",
    postalCode: "560067", isDefault: true
  });
  check("3.1 Address saved (isDefault=true checkbox value)", addr1.status === 201, addr1.status !== 201 ? JSON.stringify(addr1.data) : undefined);

  const addr2 = await c.req("POST", "/api/account/addresses", {
    label: "Office", recipientName: "Journey Tester", phone: "9790719925",
    addressLine1: "99 Work Ave, Whitefield", city: "Bengaluru", state: "Karnataka",
    postalCode: "560066", isDefault: false
  });
  check("3.2 Second address saved (unchecked default)", addr2.status === 201, addr2.status !== 201 ? JSON.stringify(addr2.data) : undefined);

  const list = await c.req("GET", "/api/account/addresses");
  check("3.3 Both addresses listed, default correct", list.status === 200 && list.data.addresses.length === 2 && list.data.addresses.find(a => a.id === addr1.data.address.id)?.isDefault === true);

  const badPin = await c.req("POST", "/api/account/addresses", {
    label: "Bad", recipientName: "T", phone: "9790719925", addressLine1: "Somewhere 1",
    city: "Bengaluru", state: "Karnataka", postalCode: "12345", isDefault: false
  });
  check("3.4 Invalid PIN rejected", badPin.status === 422);

  // 3.5 Out-of-area address CAN be saved; checkout rejects it later (tested in 5.0)
  const outOfArea = await c.req("POST", "/api/account/addresses", {
    label: "Far Away", recipientName: "Journey Tester", phone: "9790719925",
    addressLine1: "1 Remote Road", city: "Bengaluru", state: "Karnataka",
    postalCode: "560001", isDefault: false
  });
  check("3.5 Out-of-area address saved (customer can store it)", outOfArea.status === 201);
  outOfAreaId = outOfArea.data.address.id;

  // ── 4. Browse & cart ──
  const menu = await fetch(BASE + "/menu?category=snacks&sort=price-asc").then(r => r.status);
  check("4.1 Menu with filters loads", menu === 200);

  const { PrismaClient } = require("@prisma/client");
  const p = new PrismaClient();
  const product = await p.product.findFirst({ where: { slug: "chicken-biryani" }, select: { id: true } });
  await p.$disconnect();

  const add1 = await c.req("POST", "/api/cart/items", { productId: product.id, quantity: 2 });
  check("4.2 Add to cart", add1.status === 200);
  const cart = await c.req("GET", "/api/cart");
  check("4.3 Cart persists server-side", cart.status === 200 && cart.data.items.length === 1 && cart.data.items[0].quantity === 2);
  const upd = await c.req("PATCH", "/api/cart/items", { itemId: cart.data.items[0].id, quantity: 1 });
  check("4.4 Update quantity", upd.status === 200);

  // ── 5.0 Out-of-area checkout must be rejected ──
  const coBlocked = await c.req("POST", "/api/checkout", { addressId: outOfAreaId });
  check("5.0 Checkout rejects non-serviceable PIN politely", coBlocked.status === 422 && (coBlocked.data.error ?? "").includes("560001"), coBlocked.status !== 422 ? JSON.stringify(coBlocked.data) : undefined);

  // ── 5. Checkout → QR → notify ──
  const co = await c.req("POST", "/api/checkout", { addressId: addr1.data.address.id, customerNotes: "Journey test" });
  check("5.1 Checkout creates order", co.status === 200, co.status !== 200 ? JSON.stringify(co.data) : undefined);
  const orderNumber = co.data.orderNumber;

  const qr = await c.req("GET", `/api/payments/qr?orderNumber=${orderNumber}`);
  check("5.2 UPI QR (srikantak1@okicici) generated as SVG", qr.status === 200 && (qr.headers.get("content-type") ?? "").includes("svg"));
  const svg = await (await c.raw(`/api/payments/qr?orderNumber=${orderNumber}`)).text();
  check("5.3 QR is a valid non-trivial SVG", svg.startsWith("<svg") && svg.length > 1000);
  const cfg = await c.req("GET", `/api/payments/config?orderNumber=${orderNumber}`);
  check("5.3b Payment config shows UPI ID srikantak1@okicici + correct amount", cfg.status === 200 && cfg.data.upiVpa === "srikantak1@okicici" && cfg.data.grandTotal > 0);

  const other = makeClient();
  await other.req("POST", "/api/auth/login", { email: "priya@example.com", password: "Customer!123" });
  check("5.4 Other customer cannot see this QR", (await other.req("GET", `/api/payments/qr?orderNumber=${orderNumber}`)).status === 404);

  const notify = await c.req("POST", "/api/payments/notify", { orderNumber });
  check("5.5 Customer 'I have paid' notification accepted", notify.status === 200);

  // ── 6. Admin verification & order lifecycle ──
  const a = makeClient();
  check("6.1 Admin login", (await a.req("POST", "/api/auth/login", { email: "admin@neonbites.test", password: "ChangeMe!123" })).status === 200);
  const custBlocked = await c.req("PATCH", `/api/admin/orders/${orderNumber}/status`, { status: "CONFIRMED" });
  check("6.2 Customer blocked from admin API", custBlocked.status === 403);

  const pay = await a.req("PATCH", `/api/admin/orders/${orderNumber}/status`, { status: "PAYMENT_RECEIVED", notes: "UPI received - verified" });
  check("6.3 Admin confirms UPI payment received", pay.status === 200 && pay.data.paymentConfirmed === true, pay.status !== 200 ? JSON.stringify(pay.data) : undefined);

  const pp = new PrismaClient();
  const order = await pp.order.findUnique({ where: { orderNumber }, include: { payments: true, statusHistory: true, emailLogs: true } });
  check("6.4 Payment marked PAID", order.paymentStatus === "PAID" && order.payments.some(x => x.status === "PAID"));
  check("6.5 Status history recorded", order.statusHistory.length >= 3);
  check("6.6 Confirmation email logged", order.emailLogs.length > 0);

  const flow = ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];
  for (let i = 0; i < flow.length; i++) {
    const r = await a.req("PATCH", `/api/admin/orders/${orderNumber}/status`, { status: flow[i] });
    check(`6.${7 + i} Status → ${flow[i]}`, r.status === 200);
  }
  await pp.$disconnect();

  // ── 7. Customer account area ──
  const myCart = await c.req("GET", "/api/cart");
  check("7.1 Cart cleared after order", myCart.status === 200 && myCart.data.items.length === 0);
  const session = await c.req("GET", "/api/auth/session");
  check("7.2 Session reflects profile", session.status === 200 && session.data.email === `journey${stamp}@test.com`);
  const profile = await c.req("PATCH", "/api/account/profile", { name: "Journey T. Updated", phone: "9790719926" });
  check("7.3 Profile update works", profile.status === 200 && profile.data.user.phone === "9790719926");

  // ── 8. Protected routes ──
  const anon = makeClient();
  const prot = await anon.req("GET", "/checkout");
  check("8.1 Anonymous checkout redirects to login", prot.status === 307 && (prot.headers.get("location") ?? "").includes("/auth/login"));
  const adminPage = await anon.req("GET", "/admin");
  check("8.2 Anonymous admin redirects to login", adminPage.status === 307);

  console.log(`\n=== SUMMARY: ${results.filter(r => r.pass).length} passed / ${results.length} total ===`);
  process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch((e) => { check("FATAL", false, e.message.split("\n")[0]); console.error(e); });



