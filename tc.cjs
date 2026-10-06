const { execSync } = require("child_process");
const fs = require("fs");
try {
  const out = execSync("npx tsc --noEmit", { encoding: "utf8" }).toString();
  fs.writeFileSync("tc.txt", "TSC_OK\n" + out, "utf8");
} catch (e) {
  fs.writeFileSync("tc.txt", "TSC_FAIL\n" + (e.stderr ? e.stderr.toString() : String(e)), "utf8");
}