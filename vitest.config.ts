import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Installed skills ship their own Node.js tests, outside this app's suite.
    exclude: [...configDefaults.exclude, ".agents/**", ".claude/**", "channel/**"],
  },
});
