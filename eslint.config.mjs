import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Adegan React Three Fiber sengaja mengubah objek three.js (posisi, warna,
  // material) di dalam useFrame — pola resmi R3F demi 60 fps tanpa render ulang.
  // Aturan React Compiler ini menganggapnya pelanggaran, padahal React Compiler
  // tidak diaktifkan di proyek ini.
  {
    files: ["components/**/scene/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Skrip bawaan skill AI, bukan kode aplikasi.
    ".claude/**",
  ]),
]);

export default eslintConfig;
