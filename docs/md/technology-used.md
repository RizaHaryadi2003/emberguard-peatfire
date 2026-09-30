# Technology Used

Dokumen ini merangkum MCP server, Skill, serta seluruh teknologi yang dipakai
pada proyek Anima. Disusun dari pemeriksaan langsung berkas proyek.

Tanggal pemeriksaan: 17 September 2026

---

## 1. MCP Server

| Server | Sumber | Tipe | Fungsi |
|---|---|---|---|
| `context7` | `.mcp.json` (proyek) | HTTP — `mcp.context7.com/mcp` | Ambil dokumentasi resmi library/framework versi terkini |
| `playwright` | `.mcp.json` (proyek) | stdio — `npx @playwright/mcp@latest` | Kendali browser: navigasi, klik, isi form, screenshot, baca console |
| `Claude Docs` | Akun claude.ai (bukan proyek) | Connector | Buat & sunting dokumen daring |
| `Notion` | Akun claude.ai (bukan proyek) | Connector | Baca/tulis halaman & database Notion |

Kedua server proyek diaktifkan lewat `.claude/settings.local.json`
(`enableAllProjectMcpServers: true`).

---

## 2. Skill di `.claude/skills/` (23 buah)

| Kelompok | Skill | Kegunaan |
|---|---|---|
| Animasi GSAP (7) | `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-react`, `gsap-utils`, `gsap-performance` | Tween, timeline, animasi berbasis gulir, plugin, integrasi React, utilitas, optimasi 60fps |
| Three.js (8) | `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-textures`, `threejs-lighting`, `threejs-loaders`, `threejs-animation`, `threejs-interaction` | Scene/kamera/renderer, geometri, material PBR, tekstur, pencahayaan & bayangan, muat GLTF/HDR, animasi rangka, raycasting |
| Desain & UI (6) | `ui-ux-pro-max`, `ui-styling`, `design`, `design-system`, `brand`, `banner-design` | Intelijen UI/UX, shadcn + Tailwind, identitas visual, token desain, brand voice, banner |
| Lain (2) | `motion-design`, `slides` | Prinsip gerak untuk UI, presentasi HTML |

Selain itu tersedia skill bawaan Claude Code (`code-review`, `simplify`, `run`,
`init`, `security-review`, `loop`, `schedule`, `dataviz`, `artifact-*`, dll.)
yang bukan bagian dari repositori ini.

---

## 3. Teknologi yang Dipakai

| Lapisan | Teknologi | Versi | Catatan |
|---|---|---|---|
| Bahasa | TypeScript | ^5 | `strict` lewat `tsconfig.json` |
| Bahasa | JavaScript (ESM) | — | Berkas konfigurasi `.mjs`/`.mts` |
| Framework | Next.js | 16.3.5 | App Router (`app/`), sekaligus frontend + backend |
| UI | React | 19.2.8 | + `react-dom` 19.2.8 |
| Styling | Tailwind CSS | ^4 | Via `@tailwindcss/postcss` |
| Styling | PostCSS | — | `postcss.config.mjs` |
| 3D | Three.js | ^0.186.0 | Mesin render WebGL |
| 3D | React Three Fiber | ^9.7.0 | Pembungkus React untuk Three.js |
| 3D | `@react-three/drei` | ^10.7.8 | Helper siap pakai R3F |
| Animasi | GSAP | ^3.15.0 | + `@gsap/react` ^2.1.2 (`useGSAP`) |
| Audio | Howler.js | ^2.2.4 | + `@types/howler` |
| Pengujian | Vitest | ^5.0.0 | `environment: node`, cakupan `lib/**/*.test.ts`, `passWithNoTests` |
| Linting | ESLint | ^9 | Flat config + `eslint-config-next` |
| Manajer paket | npm | — | `package-lock.json` |
| Versi kontrol | — | — | Belum memakai git |

**Backend:** belum ada backend terpisah — tidak ada basis data, ORM, maupun API
eksternal. Seluruh kemampuan sisi server saat ini bertumpu pada Next.js
(Route Handler / Server Component) yang belum ditulis.

**Isi `app/` baru 3 berkas:** `layout.tsx`, `page.tsx`, `globals.css` — masih
scaffold bawaan `create-next-app`. Direktori `lib/` yang dirujuk
`vitest.config.mts` belum ada.

---

## 4. Framework Frontend & Backend

| Peran | Framework | Versi | Status | Penjelasan singkat |
|---|---|---|---|---|
| Frontend | React | 19.2.8 | Terpasang & dipakai | Pustaka antarmuka berbasis komponen; dasar seluruh berkas `.tsx` di `app/` |
| Frontend | Next.js (App Router) | 16.3.5 | Terpasang & dipakai | Kerangka utama frontend: routing berbasis folder `app/`, Server & Client Component, pemuatan aset |
| Backend | Next.js (Route Handler / Server Component) | 16.3.5 | Terpasang, **belum ditulis** | Next.js merangkap backend — logika sisi server nanti berjalan di sini, bukan pada server terpisah |
| Backend | — | — | Tidak ada | Belum ada Express/NestJS/Laravel, belum ada basis data maupun ORM |

Ringkasnya: proyek memakai arsitektur **fullstack satu kerangka** — Next.js
menangani frontend dan backend sekaligus, dengan React sebagai lapisan UI-nya.
Sisi backend masih kosong sepenuhnya.
