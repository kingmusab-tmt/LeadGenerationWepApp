import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts"],
    // The default 5s timeout got flaky as the suite grew — several test
    // files dynamically import modules with heavy transitive dependencies
    // (twilio, pdf-lib, stripe, mongoose), and the first test in each file
    // to trigger that cold import/transform can occasionally exceed 5s
    // under load, even though the actual test logic runs in milliseconds.
    // Later tests in the same file are fast once the module is cached.
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**/*.ts"],
      exclude: ["**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
