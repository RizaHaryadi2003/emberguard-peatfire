import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Logika murni ada di lib/, tetapi sebagian bentuk geometri diorama masih
    // berada di components/ bersama komponennya; keduanya diuji.
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
    passWithNoTests: true,
  },
});
