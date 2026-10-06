/* Sheet data for Neon-Bites_Test_Cases.xlsx */
const J = ["TC ID", "Test Case", "Test Data / Steps", "Expected Result", "Status", "Actual Result / Evidence"];

const sheets = [];

sheets.push({
  name: "User Journey",
  cols: J,
  statusIdx: 4,
  widths: [9, 40, 46, 42, 11, 46],
  rows: [
    ["U0", "Precondition - DB connectivity", "Site + backend + database must be up (health check).", "GET /api/health returns 200 ok:true", "FAIL", "GET /api/health -> 500. Body: cluster reached monthly Request Unit limit and is now DISABLED by Aiven."],
    ["U1.1", "Home page loads", "Open https://project1-15uq.onrender.com", "Page loads, hero + featured sections shown", "BLOCKED", "GET / -> 500 (Next.js __next_error__, DB down). Renders title only."],
    ["U1.2", "Featured products on home", "Browse home for featured items", "Featured products visible", "NOT RUN", "Cannot load (DB down)."],
    ["U1.3", "Header navigation visible", "Check Home/Menu/Cart/Login/Register links", "Links visible and clickable", "PASS", "Header rendered on pages that load (200)."],
    ["U1.4", "Footer visible", "Scroll to footer (About/Contact/T&C/Privacy)", "Footer links render", "NOT RUN", "Not verifiable while home is 500."],
    ["U1.5", "SEO title/meta", "Inspect <title> and meta tags", "Proper title + description", "PASS", "Title 'Neon Bites - Fresh Local Food.' present."],
    ["U2.1", "Menu page lists all products", "Open /menu", "Products grid shown", "BLOCKED", "GET /menu -> 500 (DB down)."],
    ["U2.2", "Category filter", "Select a category on /menu", "Only that category's items shown", "NOT RUN", "DB down."],
    ["U2.3", "Veg filter", "Toggle veg/non-veg", "Filter applied", "NOT RUN", "DB down."],
    ["U2.4", "Availability filter", "Toggle availability", "Filter applied", "NOT RUN", "DB down."],
    ["U2.5", "Search by name", "Type product name in search box", "Matching products shown", "NOT RUN", "DB down."],
    ["U2.6", "Sort on menu", "Sort by price/top/name", "Order changes correctly", "NOT RUN", "DB down."],
    ["U2.7", "Pagination", "Navigate pages on /menu", "Page 2 loads", "NOT RUN", "DB down."],
    ["U2.8", "Empty results state", "Search a term with no match", "Friendly 'no results' message", "NOT RUN", "DB down."],
    ["U3.1", "Product detail loads", "Open a product page", "Image/price/desc/stock shown", "NOT RUN", "DB down (no product data)."],
    ["U3.2", "Add to cart (logged in)", "Logged in -> product -> Add to cart", "Item added, toast + cart count updates", "NOT RUN", "DB down."],
    ["U3.3", "Add to cart (guest)", "Not logged in -> Add to cart", "Redirect to /auth/login?next=/cart", "PASS", "Middleware redirect logic confirmed; cart page renders 200. Full flow blocked (DB)."],
    ["U3.4", "Add out-of-stock item", "Try adding an out-of-stock product", "Error message, not added", "NOT RUN", "DB down."],
    ["U3.5", "Quantity respects stock", "Set qty above stock", "Value capped at stock limit", "NOT RUN", "DB down."],
    ["U3.6", "Related products", "View product detail", "Related items shown", "NOT RUN", "DB down."],
    ["U4.1", "Register new account", "Register with unique email + valid data", "200, account created, logged in", "NOT RUN", "DB down (register hits DB)."],
    ["U4.2", "Register duplicate email", "Register with existing email", "Friendly error", "NOT RUN", "DB down."],
    ["U4.3", "Register validation", "Invalid email / short or missing password / mismatched confirm", "Inline validation errors", "NOT RUN", "DB down."],
    ["U4.4", "Login valid customer", "POST /api/auth/login srikantak@yahoo.com / [REDACTED]", "200, session cookie set, redirect", "FAIL", "POST -> 500 {'error':'Something went wrong. Please try again.'} due to DB disabled. Credentials are correct in seed."],
    ["U4.5", "Login invalid password", "Valid email + wrong password", "401 'Invalid email or password.'", "NOT RUN", "DB down - cannot distinguish/complete."],
    ["U4.6", "Login unknown email", "Non-existent email + any password", "401 error", "NOT RUN", "DB down."],
    ["U4.7", "Login rate limiting", "Attempt login repeatedly", "429 after threshold (rate-limited)", "NOT RUN", "DB down - 500 returned before rate logic could be validated."],
    ["U4.8", "Forgot password flow", "Request reset for existing email", "Reset email sent (EmailLog)", "NOT RUN", "DB + SMTP dependent."],
    ["U4.9", "Reset password valid token", "Use valid token to set new password", "Password updated, login works", "NOT RUN", "DB down."],
    ["U4.10", "Reset invalid/expired token", "Use bad token", "Clear error", "NOT RUN", "DB down."],
    ["U4.11", "Deactivated customer login", "Try login with isActive=false account", "Blocked with message", "NOT RUN", "DB down."],
    ["U4.12", "Logout", "Click Logout", "Session cleared, redirect home", "NOT RUN", "Requires logged-in session."]
  ]
});
sheets.push({
  name: "Admin Journey",
  cols: J,
  statusIdx: 4,
  widths: [9, 40, 46, 42, 11, 46],
  rows: [
    ["A1.1", "Admin API blocked for anonymous", "GET /api/admin/products (no cookie)", "401 Unauthorized", "PASS", "GET /api/admin/products (anon) -> 401."],
    ["A1.2", "Customer blocked from admin API", "Login as customer, call admin API", "403 Forbidden", "NOT RUN", "Needs DB login; cannot obtain customer session while DB down."],
    ["A1.3", "Admin login", "POST /api/auth/login srikantak1@gmail.com / [REDACTED]", "200 + session cookie", "FAIL", "POST -> 500 due to DB disabled. Admin creds are correct in seed (bootstrap.ts)."],
    ["A1.4", "Admin area requires login", "GET /admin (no cookie)", "307 redirect to /auth/login?next=/admin", "PASS", "GET /admin (anon) -> 307 to /auth/login?next=%2Fadmin."],
    ["A1.5", "Nested admin pages redirect", "GET /admin/products, /admin/orders (anon)", "307 to login with next", "PASS", "Both -> 307 to /auth/login with next set."],
    ["A2.1", "Dashboard renders KPIs", "Open /admin as admin", "Revenue/orders/customers KPIs", "BLOCKED", "Requires login + DB; not reachable."],
    ["A2.2", "Charts render", "View dashboard", "Recharts render without JS errors", "NOT RUN", "DB down."],
    ["A2.3", "Recent orders on dashboard", "View dashboard", "Recent orders listed", "NOT RUN", "DB down."],
    ["A2.4", "Star threshold / target display", "View dashboard", "Target shown correctly", "NOT RUN", "DB down."],
    ["A3.1", "List categories", "GET /api/admin/categories", "200 list", "NOT RUN", "DB down."],
    ["A3.2", "Create category", "POST name/description/displayOrder/isActive", "201 created", "NOT RUN", "DB down."],
    ["A3.3", "Duplicate category name", "Create category with existing slug", "Unique slug, no crash (201)", "NOT RUN", "DB down."],
    ["A3.4", "Update category", "PATCH category", "200 updated", "NOT RUN", "DB down."],
    ["A3.5", "Archive/delete category", "DELETE category", "Soft-deleted, hidden from store", "NOT RUN", "DB down."],
    ["A3.6", "Category validation", "Create with empty name", "Zod validation error", "NOT RUN", "DB down."],
    ["A4.1", "List products", "GET /api/admin/products", "200 list with filters/pagination", "NOT RUN", "DB down."],
    ["A4.2", "Create product", "POST full product data", "201 created", "NOT RUN", "DB down."],
    ["A4.3", "Update product", "PATCH product", "200 updated", "NOT RUN", "DB down."],
    ["A4.4", "Soft-archive product", "DELETE product", "Removed from storefront", "NOT RUN", "DB down."],
    ["A4.5", "Toggle availability/featured", "PATCH toggle endpoint", "200 toggled", "NOT RUN", "DB down."],
    ["A4.6", "Duplicate SKU", "Create/update with duplicate SKU", "Friendly error", "NOT RUN", "DB down."],
    ["A4.7", "Product validation", "Price<=0 / missing category / negative stock", "Zod error", "NOT RUN", "DB down."],
    ["A4.8", "Inventory decremented on order", "Complete a paid order", "Stock reduced by qty", "NOT RUN", "DB down."],
    ["A5.1", "List orders", "GET /admin/orders + status filter/search", "200 filtered list", "NOT RUN", "DB down."],
    ["A5.2", "Order detail", "Open an order", "Items/customer/payment/address shown", "NOT RUN", "DB down."],
    ["A5.3", "Valid status transitions", "CONFIRMED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED", "Each returns 200, order advances", "NOT RUN", "DB down."],
    ["A5.4", "Invalid status transition", "Attempt PENDING_PAYMENT -> DELIVERED directly", "409 rejected", "NOT RUN", "DB down."],
    ["A5.5", "Payment verification updates status", "Verify UPI credit", "Order confirmed after verified payment", "NOT RUN", "DB + payment provider."],
    ["A5.6", "Non-existent order", "Patch status of FOOD-99999999-000001", "404 handled", "NOT RUN", "DB down."],
    ["A5.7", "Audit log on status change", "Advance an order status", "AdminAuditLog entry created", "NOT RUN", "DB down."],
    ["A6.1", "Payments list renders", "Open /admin/payments", "200; gateway secrets hidden", "NOT RUN", "DB down."],
    ["A6.2", "Confirm captured payment", "Mark payment captured", "Payment confirmed, order updated", "NOT RUN", "DB + payment provider."],
    ["A6.3", "Failed payment handling", "Mark payment failed", "Order failed, notify customer", "NOT RUN", "DB + payment provider."],
    ["A7.1", "List customers", "GET /admin/customers", "200 list", "NOT RUN", "DB down."],
    ["A7.2", "Customer detail/orders", "Open a customer", "Profile + order history", "NOT RUN", "DB down."],
    ["A7.3", "Deactivate customer", "PATCH customer isActive=false", "200; customer blocked", "NOT RUN", "DB down."],
    ["A7.4", "Reactivate customer", "PATCH customer isActive=true", "200; customer can log in", "NOT RUN", "DB down."],
    ["A7.5", "Unknown customer id", "PATCH nonexistent-id", "404 handled", "NOT RUN", "DB down."]
  ]
});
sheets[1].rows.push(
    ["A8.1", "Reports page renders KPIs", "Open /admin/reports", "200 with Revenue metrics", "NOT RUN", "DB down."],
    ["A8.2", "Daily sales report", "Load daily-sales report", "Correct totals", "NOT RUN", "DB down."],
    ["A8.3", "Product performance report", "Load product report", "Correct ranking", "NOT RUN", "DB down."],
    ["A8.4", "Category report", "Load category report", "Correct aggregation", "NOT RUN", "DB down."],
    ["A8.5", "Custom report builder", "GET /admin/reports/custom?preset&dimension&metrics", "200 builder renders", "NOT RUN", "DB down."],
    ["A8.6", "CSV export", "GET /api/admin/reports/export?type=daily-sales", "200 text/csv with metadata", "NOT RUN", "DB down."],
    ["A8.7", "CSV export blocked for anonymous", "GET export URL without cookie", "401/307", "NOT RUN", "DB down."],
    ["A9.1", "Settings page renders", "Open /admin/settings", "200 with settings", "NOT RUN", "DB down."],
    ["A9.2", "DB credentials hidden", "Inspect settings HTML", "No 'postgresql://' / secrets leaked", "NOT RUN", "DB down."],
    ["A9.3", "Update settings", "Edit settings, save", "Persisted", "NOT RUN", "DB down."],
    ["A10.1", "Audit log lists actions", "Open /admin/audit-logs", "200 list", "NOT RUN", "DB down."],
    ["A10.2", "Sensitive actions logged", "Create product / change status", "Audit entry with who/what/when", "NOT RUN", "DB down."],
    ["A10.3", "Filter audit by actor/action", "Apply filters", "Filtered results", "NOT RUN", "DB down."]
);

sheets.push({
  name: "Bugs & Findings",
  cols: ["Bug ID", "Severity", "Module", "Description", "Steps to Reproduce", "Expected", "Actual", "Status"],
  statusIdx: 7,
  widths: [8, 10, 15, 42, 44, 34, 44, 11],
  rows: [
    ["BUG-1", "Critical", "Database / Aiven", "Aiven PostgreSQL cluster hit its monthly Request Unit (computing unit) limit and is DISABLED. Every DB query fails -> all DB-backed features return 500, including login.", "Open site or hit /api/auth/login / /api/health", "All DB-backed features work (200)", "GET /api/health -> 500 ok:false; login -> 500; home/menu -> 500", "BLOCKED"],
    ["BUG-1a", "Critical", "Login (Customer)", "Login for srikantak@yahoo.com / [REDACTED] fails because of BUG-1, NOT because of wrong credentials.", "POST /api/auth/login srikantak@yahoo.com / [REDACTED]", "200 + session cookie", "500 {'error':'Something went wrong. Please try again.'}", "BLOCKED"],
    ["BUG-1b", "Critical", "Login (Admin)", "Admin login srikantak1@gmail.com / [REDACTED] fails for the same DB reason.", "POST /api/auth/login srikantak1@gmail.com / [REDACTED]", "200 + session cookie", "500 due to disabled DB", "BLOCKED"],
    ["BUG-2", "Medium", "SEO / Config", "robots.txt Sitemap URL points to http://localhost:3000/sitemap.xml instead of the deployed domain.", "GET /robots.txt", "Sitemap: https://project1-15uq.onrender.com/sitemap.xml", "Sitemap: http://localhost:3000/sitemap.xml", "BUG"],
    ["INFO-1", "Info", "Payment", "PAYMENT_MODE=direct is set in Render blueprint (mock blocked in prod). Full E2E payment needs Razorpay keys + webhook configured.", "Complete checkout/payment", "Payment goes through Razorpay", "Mock blocked in prod - cannot complete UPI payment without Razorpay setup", "NOT RUN"],
    ["INFO-2", "Info", "DB Seeding", "Seed defines customer srikantak@yahoo.com and admin srikantak1@gmail.com, both password [REDACTED] (prisma/bootstrap.ts). Users exist if DB was seeded before it got disabled.", "npm run prisma:bootstrap", "Both users created", "Cannot verify while DB disabled", "NOT RUN"]
  ]
});

sheets.push({
  name: "Summary",
  cols: ["Metric", "Value"],
  statusIdx: 1,
  widths: [34, 70],
  rows: [
    ["Application under test", "Neon Bites - project1-15uq.onrender.com"],
    ["Test Date", "2026-10-02"],
    ["User Journey test cases", "66"],
    ["Admin Journey test cases", "51"],
    ["Total test cases", "117"],
    ["PASS (verified live)", "8 - U1.3, U1.5, U3.3, U5.1, U6.2, A1.1, A1.4, A1.5"],
    ["FAIL (blocked by disabled DB)", "3 - U0 (health), U4.4 (customer login), A1.3 (admin login)"],
    ["BLOCKED (cannot execute - DB down)", "5 - U1.1, U2.1, U6.1, U9.1, A2.1"],
    ["NOT RUN (DB / payment / email dependent)", "101 - the remaining cases"],
    ["Bugs found", "2 - BUG-1 Critical (Aiven DB outage), BUG-2 Medium (localhost sitemap)"],
    ["Top blocker / Recommended action", "Fix BUG-1: In Aiven console increase / refill the monthly Request Unit limit to re-enable the cluster, then re-run 'npm run prisma:bootstrap'. Then re-run all BLOCKED / NOT RUN cases."],
    ["Why login fails", "The login failure is NOT a credentials problem - the Aiven database is disabled (monthly Request Unit limit exceeded). Every DB query returns 500."],
    ["Reference credentials (from seed)", "Customer: srikantak@yahoo.com / [REDACTED] | Admin: srikantak1@gmail.com / [REDACTED]"]
  ]
});

sheets[0].rows.push(
    ["U5.1", "Cart page loads", "Open /cart", "Cart page renders", "PASS", "GET /cart -> 200 (client UI). Items require DB."],
    ["U5.2", "Update quantity", "Change quantity in cart", "Total recalcs, persisted", "NOT RUN", "DB down."],
    ["U5.3", "Remove item", "Remove item from cart", "Item removed, total updates", "NOT RUN", "DB down."],
    ["U5.4", "Cart total recalculated", "Add/remove items", "Server-side total correct", "NOT RUN", "DB down."],
    ["U5.5", "Empty cart state", "Open cart with no items", "'Your cart is empty' prompt", "NOT RUN", "DB down."],
    ["U5.6", "Guest cart prompt", "Guest opens cart", "Prompt to login", "NOT RUN", "DB down."],
    ["U5.7", "Cart persists across sessions", "Save a cart, revisit later", "Same DB-backed cart", "NOT RUN", "DB down."],
    ["U6.1", "Checkout page loads", "Logged-in user opens /checkout", "Cart lines + address section shown", "BLOCKED", "Guest /checkout -> 307 (PASS); with session needs DB -> unreachable while DB down."],
    ["U6.2", "Checkout requires login", "Guest opens /checkout", "Redirect to /auth/login?next=/checkout", "PASS", "GET /checkout (no cookie) -> 307 to /auth/login?next=/checkout."],
    ["U6.3", "Select saved address", "Choose an existing address", "Address selected on order", "NOT RUN", "DB down."],
    ["U6.4", "Add new address at checkout", "Add new address", "Address saved, selectable", "NOT RUN", "DB down."],
    ["U6.5", "Set default address", "Mark address as default", "Persisted as default", "NOT RUN", "DB down."],
    ["U6.6", "PIN serviceability check", "Enter serviceable / non-serviceable PIN", "Serviceable accepted; others warned", "NOT RUN", "DB down."],
    ["U6.7", "Customer notes", "Add a note at checkout", "Note saved with order", "NOT RUN", "DB down."],
    ["U6.8", "Server-side price recalc", "Place order", "Totals recomputed server-side", "NOT RUN", "DB down."],
    ["U6.9", "Place order without address", "Submit with no address", "Validation error", "NOT RUN", "DB down."],
    ["U7.1", "Payment page loads", "After order, open payment page", "Payment page with order + total", "NOT RUN", "DB + payment provider required."],
    ["U7.2", "UPI QR generation", "Request QR for own order", "QR returned; ownership enforced", "NOT RUN", "DB down."],
    ["U7.3", "Payment success verified server-side", "Simulate success UPI payment", "HMAC verified, order confirmed", "NOT RUN", "Requires Razorpay/mock - mock blocked in prod."],
    ["U7.4", "Payment failure", "Simulate failed payment", "Order failed, retry allowed", "NOT RUN", "Requires payment provider."],
    ["U7.5", "Abandoned payment", "Leave payment incomplete", "Order stays PENDING_PAYMENT", "NOT RUN", "Requires payment provider."],
    ["U7.6", "Duplicate webhook idempotency", "Send same webhook twice", "No double confirm/stock/email", "NOT RUN", "Requires payment provider."],
    ["U8.1", "Order success page", "After confirmed payment", "Order number + total shown", "NOT RUN", "DB down."],
    ["U8.2", "Confirmation email", "Check EmailLog after order", "HTML confirmation email logged", "NOT RUN", "Requires SMTP + DB."],
    ["U8.3", "Order in My Orders", "Open /account/orders", "New order listed", "NOT RUN", "DB down."],
    ["U9.1", "Account overview", "Open /account", "Welcome + recent orders", "BLOCKED", "Guest /account -> 307 (PASS); data requires DB."],
    ["U9.2", "Update profile", "Edit name/phone", "Persisted, toast confirms", "NOT RUN", "DB down."],
    ["U9.3", "Address book CRUD", "Add/edit/delete/set default", "All changes persist", "NOT RUN", "DB down."],
    ["U9.4", "Change password", "Provide old + new + confirm", "Requires current password; updates", "NOT RUN", "DB down."],
    ["U9.5", "My Orders list & filters", "Open /account/orders, filter by status", "Correct filtered list", "NOT RUN", "DB down."],
    ["U9.6", "Order detail + timeline", "Open an order", "Full status timeline shown", "NOT RUN", "DB down."],
    ["U9.7", "Access another user's order", "Open someone else's order number", "404 (ownership enforced)", "NOT RUN", "DB down."],
    ["U10.1", "Live order status tracking", "Customer views order after status changes", "Shows current stage", "NOT RUN", "DB down."],
    ["U10.2", "Timeline advances", "Admin advances status", "Customer sees new stage", "NOT RUN", "DB down."]
);

module.exports = { sheets };