import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // voice/.whisper holds a whisper.cpp checkout with its own test suite
    exclude: [...configDefaults.exclude, "voice/**"],
  },
});
