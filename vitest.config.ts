import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration tests hit the real DB and are opt-in via RUN_DB_TESTS=1
    exclude: ["tests/**/*.db.test.ts", "node_modules/**"]
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") }
  }
});
