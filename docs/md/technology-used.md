# Teknologi yang Digunakan

Dokumen ini merangkum teknologi yang dipakai proyek **Emberguard-peatfire**
beserta alasan tiap pilihan. Isinya disusun dari pemeriksaan langsung berkas
proyek, bukan dari rencana.

- Tanggal pemeriksaan: **19 November 2026** (sebelumnya 28 Oktober 2026)
- Diverifikasi dengan: `npm test` (21 berkas, **244 uji lolos**),
  `npx tsc --noEmit` (tanpa keluhan), `npm run lint` (0 galat), dan
  `npm run build` (berhasil, 14 rute). Diperbarui sesudah Modul Musim Api:
  22 berkas, 264 uji lolos

---

## Daftar Isi

1. [Ringkasan](#1-ringkasan)
2. [Tumpukan teknologi](#2-tumpukan-teknologi)
3. [Struktur proyek](#3-struktur-proyek)
4. [Next.js pada proyek ini](#4-nextjs-pada-proyek-ini)
5. [Grafis 3D](#5-grafis-3d)
6. [Animasi antarmuka dan suara](#6-animasi-antarmuka-dan-suara)
7. [Performa](#7-performa)
8. [Pengujian](#8-pengujian)
9. [Penyebaran (deploy)](#9-penyebaran-deploy)
10. [Mengapa tanpa basis data](#10-mengapa-tanpa-basis-data)
11. [Aksesibilitas dan ponsel](#11-aksesibilitas-dan-ponsel)
12. [Aset dan lisensi](#12-aset-dan-lisensi)
13. [Perkakas bantu pengembangan](#13-perkakas-bantu-pengembangan)

---

## 1. Ringkasan

| Pertanyaan | Jawaban |
|---|---|
| Bahasa pemrograman | **TypeScript** (mode `strict`) untuk seluruh kode; **GLSL** untuk peneduh (*shader*); JavaScript ESM hanya untuk berkas konfigurasi |
| Kerangka kerja | **Next.js 16.4.5** (App Router) di atas **React 19.2.8** |
| Sisi depan (*frontend*) | TSX + Tailwind CSS v4; grafis 3D dengan Three.js lewat React Three Fiber; animasi antarmuka dengan GSAP |
| Sisi belakang (*backend*) | **Tidak ada basis data, akun, atau API data.** Tidak ada kode sisi server; gambar pratinjau tautan dibuat saat build (bagian 4.4) |
| Tempat berjalan | Vercel: cabang `dev` = pratinjau, `main` = produksi |

Seluruh simulasi ilmiah berjalan **di peramban pengguna**. Alasannya ada di
bagian 10.

---

## 2. Tumpukan teknologi

Versi di bawah adalah versi yang benar-benar terpasang (`package-lock.json`).

### 2.1 Bahasa

| Bahasa | Cakupan | Catatan |
|---|---|---|
| TypeScript 5.9 | Seluruh `.ts` dan `.tsx` | `strict: true`, alias impor `@/*` |
| GLSL | Peneduh di `components/modul/*/scene/` (lihat 5.2) | Ditulis tangan sebagai templat teks |
| CSS | `app/globals.css` | Beserta arahan Tailwind v4 |
| JavaScript ESM | `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.mts` | Hanya konfigurasi |

### 2.2 Pustaka aplikasi

| Kelompok | Paket | Versi | Peran |
|---|---|---|---|
| Kerangka | `next` | 16.4.5 | Perutean, pembangkitan halaman, optimasi font dan aset |
| Kerangka | `react`, `react-dom` | 19.2.8 | Komponen, keadaan, daur hidup |
| Tata letak | `tailwindcss` + `@tailwindcss/postcss` | 4.3.3 | Penataan dengan kelas utilitas |
| Grafis | `three` | 0.186.0 | Mesin WebGL: jala, bahan, cahaya, bayangan |
| Grafis | `@react-three/fiber` | 9.7.0 | Menulis adegan Three.js sebagai JSX |
| Grafis | `@react-three/drei` | 10.7.8 | Pembantu siap pakai (langit, pemuat GLTF) |
| Animasi | `gsap` + `@gsap/react` | 3.15.0 / 2.1.2 | Garis waktu, ScrollTrigger, hook `useGSAP` |
| Ikon | `lucide-react` | 1.47.0 | Ikon SVG |
| Audio | `howler` | 2.2.4 | **Terpasang, belum dipakai** (lihat 6.2) |

### 2.3 Perkakas pengembangan

| Perkakas | Versi | Keterangan |
|---|---|---|
| Vitest | 5.1.0 | Uji otomatis model ilmiah (bagian 8) |
| ESLint | 9.39 | Konfigurasi rata + `eslint-config-next` |
| Turbopack | bawaan Next 16 | Penyusun berkas untuk `next dev` dan `next build` |
| npm | — | Pengelola paket (`package-lock.json`) |
| Git | 2.50 | Sejak 30 September 2026; dua cabang `dev` dan `main` |
| Vercel CLI | — | Menautkan proyek (`.vercel/`) dan variabel lingkungan |

---

## 3. Struktur proyek

### 3.1 Letak berkas

| Folder | Isi |
|---|---|
| `app/` | Rute halaman (`page.tsx`), tata letak, gambar pratinjau tautan (`opengraph-image.tsx`) |
| `components/layout/` | Navbar dan halaman penanda |
| `components/hero/` | Beranda |
| `components/modul/shared/` | Kerangka bersama semua modul: hook, babak, panah ke modul berikutnya, tuntunan, ajakan buka di laptop |
| `components/modul/shared/scene/` | Fondasi adegan 3D bersama: langit dan cahaya, tanah, tumbuhan, profil mutu, penjaga performa |
| `components/modul/<nama>/` | Komponen dan adegan per modul |
| `config/` | Seluruh teks Bahasa Indonesia; `config/modul/<nama>.ts` per modul, `config/modules-content.ts` daftar modul |
| `lib/model/` | Model ilmiah murni |
| `lib/preview/` | Gambar pratinjau tautan dan fonnya |
| `lib/` (akar) | Pembantu umum: suara, batas bingkai, kursor, acak ber-*seed* |
| `hooks/` | Hook React bersama (`useSmoothCursor`) |
| `data/` | Data peta Modul Gambut di Sekitarmu + sumbernya |
| `public/` | Model 3D, tekstur, foto, citra satelit |
| `assets/fonts/` | Fon untuk gambar pratinjau tautan |
| `docs/md/` | Dokumen acuan, storyboard, dan dokumen ini |

### 3.2 Empat lapis dengan arah ketergantungan satu arah

Lapis atas boleh memanggil lapis bawah, tidak sebaliknya.

| Lapis | Letak | Isi | Bergantung pada |
|---|---|---|---|
| 4. Konten | `config/` | Teks dan angka yang tampil | — |
| 3. Antarmuka | `components/**/*.tsx` | React, Tailwind, GSAP | 4, 2, 1 |
| 2. Visual 3D | `components/**/scene/` | React Three Fiber, GLSL | 1 |
| 1. Logika murni | `lib/` | Model ilmiah, tanpa React, Three.js, atau DOM | — |

Pemisahan lapis 1 adalah keputusan paling menentukan: isinya bisa diuji
otomatis di Node tanpa peramban, dan bisa dikutip sebagai algoritma di naskah.

### 3.3 Model ilmiah (`lib/model/`)

| Berkas | Baris | Isi | Dipakai modul |
|---|---|---|---|
| `smolder.ts` | 857 | Sel-otomata perambatan bara gambut | Bara di Bawah Tanah |
| `drainage.ts` | 546 | Kerucut penurunan muka air, lesak, emisi | Kanal & Pengeringan |
| `carbon.ts` | 484 | Cadangan karbon, CO₂ lepas, umur menurut kedalaman, pemulihan | Gudang Karbon |
| `peat.ts` | 243 | Profil lapisan, status muka air, indeks bahaya | Anatomi Gambut |
| `fireSeason.ts` | 242 | Neraca air harian setahun, ambang api, tahun El Niño | Musim Api |
| `atmosphere.ts` | 92 | Peralihan langit cerah ke berasap | Adegan bersama |

Model besar memakai pola yang sama: langkah waktu tetap (`STEP_*`) agar hasil
tidak bergantung kecepatan perangkat, satu kelas `*Sim` penyimpan keadaan, dan
satu tipe `*Stats` yang dibaca React. Setiap tetapan menyebut sumbernya di
komentar; sumbernya dirinci di `docs/md/acuan-modul-<nama>.md`.

---

## 4. Next.js pada proyek ini

### 4.1 Rute dari struktur folder

Struktur folder adalah struktur URL; hanya `page.tsx` yang menjadi halaman.

```
app/page.tsx                    →  /
app/modul/page.tsx              →  /modul             daftar 13 modul
app/modul/sekitarmu/page.tsx    →  /modul/sekitarmu
app/modul/anatomi/page.tsx      →  /modul/anatomi
app/modul/hutan-rawa/page.tsx   →  /modul/hutan-rawa
app/modul/kanal/page.tsx        →  /modul/kanal
app/modul/musim-api/page.tsx    →  /modul/musim-api
app/modul/bara/page.tsx         →  /modul/bara
app/modul/karbon/page.tsx       →  /modul/karbon
app/simulasi/page.tsx           →  /simulasi          penanda
app/kuis/page.tsx               →  /kuis              penanda
```

`app/layout.tsx` membungkus semuanya: `<html lang="id">`, font, dan
`<Navbar />`.

### 4.2 Komponen server dan komponen klien

Bawaannya setiap komponen adalah **komponen server** (dirender menjadi HTML,
JavaScript-nya tidak dikirim). Komponen yang butuh keadaan atau antarmuka
peramban ditandai `"use client"`. Polanya tiga lapis:

```
app/modul/bara/page.tsx                  komponen server: metadata + merakit
        ▼
components/modul/bara/BaraModule.tsx     "use client": keadaan, GSAP, suara
        ▼  dynamic(..., { ssr: false })
components/modul/bara/scene/BaraScene.tsx   <Canvas> WebGL
```

Lapis ketiga wajib dipisah karena WebGL butuh `window` dan `document` yang
tidak ada di server. Manfaat tambahannya: teks dan tombol tampil seketika,
sementara berkas Three.js yang besar diunduh di belakang.

### 4.3 Hasil pembangunan

```
○ /                     ○ /modul/hutan-rawa
○ /kuis                 ○ /modul/karbon
○ /modul                ○ /modul/sekitarmu
○ /modul/musim-api
○ /simulasi             ○ /_not-found
○ /modul/anatomi        ○ /modul/bara
○ /modul/kanal          ○ …/opengraph-image (8 gambar)

○ statis
```

Sejak kartu hasil dihapus (4.4), semua halaman statis.

### 4.4 Gambar pratinjau tautan

Kartu hasil yang bisa dibagikan dihapus pada 21 November 2026. Hanya ada di
3 dari 7 modul, tidak menambah pengetahuan, dan merupakan satu-satunya kode
sisi server. Kalimat penutup yang membawa ilmu dipindah ke arahan terakhir
tiap modul.

Agar tautan yang dibagikan di media sosial tetap tampil menarik, tiap modul
punya `opengraph-image.tsx` (konvensi berkas Next.js) yang menggambar satu
gambar tetap 1200 × 630 berisi pertanyaan pembuka modul, ditambah satu
gambar untuk seluruh situs di `app/opengraph-image.tsx`:

- Gambarnya dibuat **sekali saat build** dengan `ImageResponse` dari
  `next/og`, lewat pembantu bersama `lib/preview/previewImage.tsx`.
- Teksnya diambil dari `<NAMA>_HOOK` di `config/modul/<nama>.ts`, jadi tidak
  ada teks yang ditulis dua kali.
- Fon dibaca dari `assets/fonts/` (Inter dan Playfair Display, lisensi OFL
  disertakan), tidak diunduh dari internet.

### 4.5 Font halaman

`next/font/google` memuat Inter dan Playfair Display, lalu menyajikannya dari
server sendiri sebagai variabel CSS (`--font-inter`, `--font-playfair`).
Pengunjung tidak menghubungi Google, dan tata letak tidak bergeser ketika
font selesai dimuat.

**Catatan (19 November 2026):** berkas font diunduh dari `fonts.gstatic.com`
**saat `next dev` atau `next build` berjalan**. Bila koneksi putus atau
lambat, server pengembangan gagal dengan galat `Module not found:
Can't resolve '@vercel/turbopack-next/internal/font/google/font'` dan semua
halaman menjadi 500. Penyelesaiannya: hentikan server lalu jalankan ulang
`npm run dev`. Build di Vercel tidak terdampak.

### 4.6 Konfigurasi khusus (`next.config.ts`)

| Pengaturan | Gunanya |
|---|---|
| `allowedDevOrigins: ["192.168.*.*", "172.*.*.*", "10.*.*.*"]` | Pengujian dari ponsel di jaringan yang sama. Tanpa ini ponsel memuat HTML tetapi JavaScript ditolak, sehingga tombol tidak merespons |
| `redirects()` | Alamat lama tetap hidup: `/gambut/*` → `/modul/*`, `/dampak` → `/modul#dampak`, `/pencegahan` → `/modul#mencegah` (permanen) |

---

## 5. Grafis 3D

### 5.1 Three.js dan React Three Fiber

Three.js adalah mesin WebGL; React Three Fiber membuat adegannya ditulis
sebagai JSX dengan pola yang sama seperti antarmuka. Semua diorama memakai
fondasi bersama di `components/modul/shared/scene/` (langit dan cahaya,
tanah, varian tumbuhan, tekstur prosedural), sehingga modul baru tidak
membangun dari nol.

Animasi di dalam kanvas memakai `useFrame` dengan peredaman berbasis waktu
(`THREE.MathUtils.damp`), bukan GSAP, agar kecepatan gerak sama pada 30 fps
maupun 144 fps.

### 5.2 Peneduh buatan sendiri

| Berkas | Modul | Gunanya |
|---|---|---|
| `bara/scene/faceMaterial.ts` | Bara | Muka potong yang membaca keadaan simulasi |
| `bara/scene/burnMaterial.ts`, `SurfaceFlame.tsx` | Bara | Permukaan hangus dan nyala |
| `kanal/scene/transectMaterial.ts` | Kanal | Dinding penampang kanal berlapis |
| `karbon/scene/archiveMaterial.ts` | Karbon | Bidang potong sebagai arsip umur |
| `hutan-rawa/scene/domeMaterial.ts` | Hutan Rawa | Lapisan, akar, dan kayu di kubah gambut |
| `hutan-rawa/scene/waterMaterial.ts` | Hutan Rawa | Riak sungai, banjir berlumpur, endapan |
| `shared/scene/noiseTexture.ts` | Bersama | Derau untuk tekstur alami |

Contoh teknik terpenting (Modul Bara): 5.376 sel simulasi tidak mungkin
digambar satu jala per sel. Keadaannya ditulis ke **satu tekstur data
96 × 56 piksel** (R = abu/rongga, G = panas bara, B = kelembapan, A = hangus),
lalu dibaca peneduh di GPU. Seluruh penampang jadi satu perintah gambar, dan
peneduh titik menggeser geometri ke dalam sebesar tingkat abu sehingga rongga
bekas terbakar punya kedalaman nyata.

---

## 6. Animasi antarmuka dan suara

### 6.1 GSAP

- **`useGSAP`**: hook resmi yang membersihkan animasi otomatis saat komponen
  dilepas. Dipakai di daftar modul, Modul Anatomi, dan Modul Bara.
- **ScrollTrigger**: menahan bagian di layar dan memindahkan tahap mengikuti
  gulir, di Modul Anatomi dan daftar modul.

### 6.2 Suara

`lib/ambientSound.ts` membuat suara suasana **langsung di peramban** dengan
Web Audio API, tanpa berkas suara: derau tersaring untuk angin, riak air,
derak bara, dan kicau burung yang berhenti saat asap menebal. Suara mati
secara bawaan.

`howler` adalah pemutar **berkas** suara. Proyek belum punya berkas suara,
jadi paketnya belum dipakai; dipertahankan untuk narasi atau efek rekaman
kelak.

---

## 7. Performa

Patokannya **laptop kelas menengah**, bukan laptop kencang. Efek mahal
(blur, *mask*, lapisan raksasa di atas konten bergerak) dihindari.

| Teknik | Letak | Cara kerja |
|---|---|---|
| Dua profil mutu | `shared/scene/dioramaConstants.ts` (`QUALITY_PROFILE`) | `high` vs `low`: resolusi (1,5× / 1×), peta bayangan (1024 / 512), bayangan lunak, *antialias*, anisotropi (8 / 2), langkah simulasi per bingkai (24 / 8), jumlah tumbuhan bawah (10 / 5), kepulan asap (30 / 14) |
| Penurunan resolusi adaptif | `shared/scene/PerformanceGuard.tsx` | Mengukur laju bingkai tiap 1,5 detik dan menurunkan resolusi bila tersendat |
| Batas bingkai | `lib/frameBudget.ts` | 60 fps saat pembaca berinteraksi, 30 fps saat diam (4 detik sesudah masukan terakhir); mutu diturunkan bila < 24 fps tiga jendela berturut-turut |
| Ref untuk data per bingkai | komponen adegan | Posisi kamera, nyala, dan muka air disimpan di `useRef`, bukan `useState`, agar menggeser pengatur tidak merender ulang kanvas puluhan kali per detik |
| Larik bertipe | `lib/model/` | `Uint8Array`, `Float32Array`, `Int32Array` dialokasikan sekali, agar tidak tersendat karena pengumpul sampah memori |
| Gambar besar | Modul Sekitarmu | Citra satelit sebagai `<img>` + `transform`, dimuat bertahap |
| Pengukur `?fps` | `shared/scene/FpsMeter.tsx` | Tambahkan `?fps` di alamat untuk melihat laju bingkai |

Angka performa hanya sah dari `npm run build` + `npm start`; `next dev`
kira-kira dua kali lebih lambat.

---

## 8. Pengujian

Yang diuji adalah **model ilmiah dan perhitungan murni**, bukan tampilan.
Komponen React dan adegan 3D diperiksa manual di peramban (laptop 1440 × 900
dan ponsel 390 × 844), dengan tangkapan layar di `docs/screenshots/`.

```ts
// vitest.config.mts
test: { environment: "node", include: ["lib/**/*.test.ts", "components/**/*.test.ts"] }
```

Keadaan 19 November 2026: **21 berkas, 244 uji, semua lolos**.

| Berkas uji | Uji | Cakupan |
|---|---|---|
| `lib/model/smolder.test.ts` | 44 | Penyalaan, perambatan, pemadaman, lesak |
| `lib/model/carbon.test.ts` | 32 | Cadangan karbon, CO₂, umur, pemulihan |
| `lib/model/drainage.test.ts` | 29 | Pengaruh kanal, lesak, emisi |
| `lib/model/peat.test.ts` | 28 | Klasifikasi lapisan, status air, bahaya |
| `lib/model/fireSeason.test.ts` | 20 | Seri hujan, neraca air, tahun El Niño, ambang api |
| `lib/frameBudget.test.ts` | 13 | Batas bingkai dan penurunan mutu |
| `components/modul/bara/scene/crossSection.test.ts` | 12 | Sel simulasi ke geometri penampang |
| `components/modul/bara/scene/layerHint.test.ts` | 8 | Petunjuk lapisan Bara |
| `lib/spotlight.test.ts` | 7 | Penghalusan kursor beranda |
| `lib/model/reach.test.ts` | 3 | Jangkauan kanal dalam lapangan bola |
| `components/modul/bara/scene/layerContents.test.ts` | 7 | Isi lapisan Bara |
| `components/modul/hutan-rawa/scene/domeShape.test.ts` | 6 | Bentuk kubah gambut |
| `components/modul/kanal/scene/transect.test.ts` | 6 | Penampang kanal |
| `lib/modules.test.ts` | 5 | Daftar dan nomor modul |
| `components/modul/hutan-rawa/scene/dome.test.ts` | 5 | Zona kubah |
| `components/modul/bara/scene/viewFit.test.ts` | 5 | Pembingkaian kamera |
| `lib/model/atmosphere.test.ts` | 4 | Peralihan langit |
| `components/modul/bara/scene/burnMaterial.test.ts` | 4 | Bahan hangus |
| `lib/ambientSound.test.ts` | 2 | Laju derak dan kicau |
| `components/modul/bara/baraContent.test.ts` | 2 | Isi teks Bara |

---

## 9. Penyebaran (deploy)

| Hal | Keadaan |
|---|---|
| Layanan | Vercel, proyek tertaut lewat `.vercel/` |
| Cabang `dev` | Tempat bekerja; setiap push membuat **deploy pratinjau** |
| Cabang `main` | **Produksi**; otomatis ter-deploy. `dev` digabung ke `main` hanya setelah dinyatakan final |
| `.vercelignore` | Mengecualikan `docs/`, `.claude/`, `.playwright-mcp/`, `.env*`, dan PNG di luar `public/`, karena Vercel CLI tidak membaca `.gitignore` |
| `.env.local` | Hanya `VERCEL_OIDC_TOKEN` dari Vercel CLI; tidak dibaca kode aplikasi dan tidak masuk git |

---

## 10. Mengapa tanpa basis data

Pemeriksaan berkas menunjukkan tidak ada: basis data atau ORM, paket
autentikasi, Server Action (`"use server"`), pemanggilan `fetch` ke layanan
luar, maupun variabel lingkungan yang dibaca kode. Tidak ada kode sisi server:
gambar pratinjau tautan (4.4) dibuat sekali saat build.

Alasannya:

1. **Simulasi harus berjalan ±60 bingkai per detik.** Model dijalankan
   puluhan langkah tiap bingkai; menunggu server 50–200 ms per langkah
   membuatnya mustahil.
2. **Tidak ada data yang perlu disimpan.** Tidak ada akun, kemajuan belajar,
   atau masukan pengguna.
3. **Murah dan tahan lama.** Penguji bisa membukanya kapan saja tanpa server
   yang harus dirawat.

Bila kelak perlu menyimpan data (mis. hasil kuis untuk Bab 4 naskah),
Next.js sudah bisa merangkap sisi belakang lewat *Route Handler* tanpa
berganti teknologi.

---

## 11. Aksesibilitas dan ponsel

| Aspek | Penerapan |
|---|---|
| Pengurangan gerak | `prefers-reduced-motion` dihormati: paralaks mati, peredaman kamera nyaris seketika |
| Pembaca layar | `lang="id"` di `<html>`; `aria-current` pada menu aktif |
| Format lokal | Angka memakai `toLocaleString("id-ID")`, tertulis "0,6" bukan "0.6" |
| Suara | Mati secara bawaan, dinyalakan lewat tombol |
| Ponsel dan tablet | Tampilan sederhana tetapi alur dan penjelasan utuh; panel diringkas agar tidak tumpang tindih |
| Ajakan ke laptop | `LaptopNudge` di layar sempit mengajak mencoba versi lengkap di laptop |
| Panel tanpa gulir | Panel dan kotak modul tidak bergulir; isinya diringkas bila ruang kurang |

---

## 12. Aset dan lisensi

| Jenis | Letak | Jumlah | Catatan sumber |
|---|---|---|---|
| Model 3D `.glb` | `public/models/gambut/` | 6 | Tumbuhan, batu, ranting · `SUMBER.md` |
| Tekstur `.webp` | `public/textures/gambut/` | 13 | Warna dan peta normal lapisan gambut · `SUMBER.md` |
| Foto satwa | `public/images/hutan-rawa/` | 2 | Orangutan Sebangau dan owa · `SUMBER.md` |
| Citra satelit | `public/images/sekitarmu/` | 3 | EOX Sentinel-2 cloudless 2024 (CC BY-NC-SA) · `data/SUMBER.md` |
| Data peta | `data/sekitarmu-map.json` | 1 | Natural Earth (domain publik) + OpenStreetMap (ODbL) · `data/SUMBER.md` |
| Fon pratinjau tautan | `assets/fonts/` | 3 | Inter, Playfair Display (OFL; lisensi disertakan) |
| Tekstur prosedural | dibuat saat berjalan | — | Bara, percikan, asap, derau digambar lewat kode |

---

## 13. Perkakas bantu pengembangan

Bukan bagian aplikasi; hanya dipakai selama pengembangan.

| Perkakas | Sumber | Fungsi |
|---|---|---|
| `context7` (MCP, HTTP) | `.mcp.json` | Mengambil dokumentasi resmi pustaka versi terkini |
| `playwright` (MCP, stdio) | `.mcp.json` | Mengendalikan peramban untuk memeriksa tampilan laptop dan ponsel |
| Skill GSAP, Three.js, UI/UX | `.claude/skills/` | Panduan penulisan kode |

`.claude/`, `.playwright-mcp/`, dan arsip unduhan di `docs/` tidak disertakan
ke repositori karena bukan karya sendiri atau berkas lokal.
