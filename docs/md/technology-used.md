# Teknologi yang Digunakan

Dokumen ini merangkum seluruh teknologi yang dipakai proyek **Emberguard**,
beserta alasan tiap pilihan. Disusun dari pemeriksaan langsung berkas proyek,
bukan dari rencana atau perkiraan.

- Tanggal pemeriksaan: **28 Oktober 2026**
- Diverifikasi dengan: `npm test` (157 uji lolos), `npm run lint`, dan
  `npx tsc --noEmit` (keduanya tanpa keluhan)

---

## 1. Ringkasan Jawaban

| Pertanyaan | Jawaban |
|---|---|
| Bahasa pemrograman | **TypeScript** (mode `strict`) untuk seluruh kode sumber; **GLSL** untuk peneduh (*shader*); **JavaScript ESM** hanya pada berkas konfigurasi |
| Kerangka kerja | **Next.js 16.3.5** dengan App Router, di atas **React 19.2.8** |
| Bahasa sisi depan (*frontend*) | TypeScript + TSX, ditata dengan Tailwind CSS v4, digrafiskan dengan Three.js melalui React Three Fiber, dianimasikan dengan GSAP |
| Bahasa sisi belakang (*backend*) | **Tidak ada.** Proyek tidak memiliki basis data, API sisi server, maupun autentikasi. Seluruh perhitungan berjalan di peramban pengguna |

Arsitekturnya adalah **aplikasi sisi klien yang dibangkitkan sebagai situs
statis**. Alasan lengkapnya ada pada bagian 6.

---

## 2. Daftar Teknologi

### 2.1 Bahasa

| Bahasa | Versi | Cakupan | Catatan |
|---|---|---|---|
| TypeScript | ^5 | Seluruh `.ts` dan `.tsx` | `strict: true`, `target: ES2017`, alias impor `@/*` |
| GLSL | — | `components/gambut/bara/scene/faceMaterial.ts` | Peneduh titik & fragmen, ditulis tangan sebagai templat teks |
| JavaScript (ESM) | — | `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.mts` | Hanya konfigurasi |
| CSS | — | `app/globals.css` | Beserta arahan Tailwind v4 |

### 2.2 Pustaka Terpasang

| Kelompok | Paket | Versi | Peran nyata |
|---|---|---|---|
| Kerangka | `next` | 16.3.5 | Perutean, pembangkitan halaman, optimasi aset, pemecahan berkas |
| Kerangka | `react` / `react-dom` | 19.2.8 | Komponen, keadaan, daur hidup |
| Tata letak | `tailwindcss` + `@tailwindcss/postcss` | ^4 | Penataan berbasis kelas utilitas |
| Grafis | `three` | ^0.186.0 | Mesin WebGL: jala, bahan, cahaya, bayangan |
| Grafis | `@react-three/fiber` | ^9.7.0 | Menulis adegan Three.js sebagai JSX |
| Grafis | `@react-three/drei` | ^10.7.8 | Pembantu siap pakai (langit fisik, pemuat GLTF) |
| Animasi | `gsap` + `@gsap/react` | ^3.15.0 / ^2.1.2 | Garis waktu, ScrollTrigger, hook `useGSAP` |
| Ikon | `lucide-react` | ^1.47.0 | Ikon SVG |
| Audio | `howler` | ^2.2.4 | **Terpasang, belum dipakai.** Lihat bagian 5.3 |

### 2.3 Perkakas Pengembangan

| Perkakas | Versi | Keterangan |
|---|---|---|
| Vitest | ^5.0.0 | Lingkungan `node`, menguji `lib/**` dan berkas perhitungan di `components/**` |
| ESLint | ^9 | Konfigurasi rata (*flat config*) + `eslint-config-next` |
| Turbopack | bawaan Next 16 | Penyusun berkas, dipakai otomatis oleh `next build` |
| npm | — | `package-lock.json` |
| Git | 2.50.1 | Dipasang 30 September 2026; dokumen pribadi dikecualikan lewat `.gitignore` |

### 2.4 MCP Server & Skill (perkakas bantu, bukan bagian aplikasi)

| Server | Sumber | Jenis | Fungsi |
|---|---|---|---|
| `context7` | `.mcp.json` | HTTP | Mengambil dokumentasi resmi pustaka versi terkini |
| `playwright` | `.mcp.json` | stdio | Mengendalikan peramban: navigasi, klik, tangkapan layar, baca konsol |

Keduanya diaktifkan lewat `.claude/settings.local.json`. Skill GSAP, Three.js,
dan UI/UX tersimpan di `.claude/skills/`. Baik `.claude/` maupun arsip unduhan
di `docs/Skills and MCP/` tidak disertakan ke repositori karena bukan karya
sendiri.

---

## 3. Cara Kerja Next.js pada Proyek Ini

### 3.1 Perutean dari struktur folder

App Router tidak memakai berkas konfigurasi rute. **Struktur folder adalah
struktur URL**, dan hanya berkas bernama `page.tsx` yang menjadi halaman.

```
app/page.tsx                 →  /
app/gambut/page.tsx          →  /gambut
app/gambut/anatomi/page.tsx  →  /gambut/anatomi
app/gambut/bara/page.tsx     →  /gambut/bara
app/simulasi/page.tsx        →  /simulasi
app/dampak/page.tsx          →  /dampak
app/pencegahan/page.tsx      →  /pencegahan
```

`app/layout.tsx` membungkus semuanya: menetapkan `<html lang="id">`, memuat
font, dan menempatkan `<Navbar />` yang tampil di setiap halaman.

### 3.2 Komponen Server dan Komponen Klien

Secara bawaan setiap komponen adalah **Komponen Server**: dirender menjadi HTML
saat pembangunan, dan kode JavaScript-nya tidak pernah dikirim ke peramban.
Komponen yang memerlukan keadaan, penanganan peristiwa, atau antarmuka peramban
harus ditandai `"use client"`.

Proyek ini menerapkannya dalam tiga lapis yang konsisten:

```
app/gambut/bara/page.tsx              Komponen Server
  • hanya mengekspor metadata dan merakit komponen
  • tidak mengirim JavaScript apa pun
        │
        ▼
components/gambut/bara/BaraModule.tsx   "use client"
  • useState, useRef, useEffect, GSAP, AudioContext
        │
        ▼ dynamic(..., { ssr: false })
components/gambut/bara/scene/BaraScene.tsx
  • <Canvas> WebGL — tidak dapat dirender di sisi server
```

Lapis ketiga wajib dipisah karena WebGL memerlukan objek `window` dan
`document` yang tidak tersedia di Node.js. Pemisahan itu sekaligus memberi
manfaat: teks dan tombol tampil seketika, sementara berkas Three.js yang besar
diunduh di belakang layar.

### 3.3 Metadata

Tiap halaman mengekspor objek `metadata`, dan Next.js mengubahnya menjadi tag
`<head>` saat pembangunan:

```ts
export const metadata: Metadata = { title: "Bara di Bawah Tanah — Emberguard" };
```

### 3.4 Optimasi font

`next/font/google` mengunduh Inter dan Playfair Display **saat pembangunan**,
menyajikannya dari server sendiri, lalu menyediakannya sebagai variabel CSS.
Akibatnya tidak ada permintaan ke `fonts.googleapis.com` saat halaman dibuka,
dan tidak ada pergeseran tata letak ketika font selesai dimuat.

### 3.5 Konfigurasi khusus

```ts
// next.config.ts
allowedDevOrigins: ["192.168.66.26", "192.168.1.*", "192.168.0.*"],
```

Diperlukan untuk pengujian dari ponsel pada jaringan yang sama. Tanpa ini,
peramban ponsel memuat HTML tetapi berkas JavaScript ditolak, sehingga hidrasi
gagal dan seluruh tombol tidak merespons.

### 3.6 Hasil pembangunan produksi

```
Route (app)
┌ ○ /                  ┌ ○ /gambut/anatomi
├ ○ /_not-found        ├ ○ /gambut/bara
├ ○ /dampak            ├ ○ /pencegahan
├ ○ /gambut            └ ○ /simulasi

○  (Static)  prerendered as static content
```

Kedelapan rute berstatus **statis**. Ini bukti bahwa aplikasi memang tidak
memerlukan server saat dijalankan: seluruh keluaran dapat ditempatkan pada
layanan hosting statis.

---

## 4. Arsitektur Aplikasi

Proyek dibagi menjadi empat lapis dengan arah ketergantungan satu arah — lapis
atas boleh memanggil lapis bawah, tidak sebaliknya.

| Lapis | Letak | Isi | Bergantung pada |
|---|---|---|---|
| 4. Konten | `config/` | Seluruh teks Bahasa Indonesia | — |
| 3. Antarmuka | `components/**/*.tsx` | React, Tailwind, GSAP | Lapis 4, 2, 1 |
| 2. Visual 3D | `components/**/scene/` | React Three Fiber, GLSL | Lapis 1 |
| 1. Logika murni | `lib/` | Model ilmiah, tanpa React/Three.js/DOM | — |

Pemisahan lapis 1 adalah keputusan yang paling menentukan. Karena `lib/` tidak
mengimpor React maupun Three.js, isinya dapat diuji otomatis di lingkungan Node
tanpa menjalankan peramban, dan dapat dikutip sebagai algoritma pada naskah.

Isi `lib/`:

| Berkas | Baris | Isi |
|---|---|---|
| `smolder.ts` | 622 | Model sel-otomata perambatan bara gambut (Modul 02) |
| `drainage.ts` | 519 | Hidrologi kanal: kerucut penurunan muka air, subsiden, emisi (Modul 03) |
| `carbon.ts` | 475 | Cadangan karbon, CO₂ yang lepas, umur menurut kedalaman, pemulihan (Modul 04) |
| `peat.ts` | 228 | Profil lapisan gambut, status muka air, indeks bahaya (Modul 01) |
| `ambientSound.ts` | 168 | Sintesis suara suasana lewat Web Audio API |
| `atmosphere.ts` | 92 | Peralihan langit cerah menuju langit berasap |
| `spotlight.ts` | 35 | Penghalusan gerak sorot kursor |
| `random.ts` | 14 | Pembangkit acak ber-*seed* (Lehmer) |

Tiga model terbesar memakai pola yang sama: `STEP_*` tetap supaya hasilnya
tidak bergantung pada kecepatan perangkat, satu kelas `*Sim` yang menyimpan
keadaan, dan satu tipe `*Stats` yang dibaca komponen React. Pada `drainage.ts`
dan `carbon.ts`, tetapan kuantitatif yang belum memiliki sumber dikumpulkan
dalam satu blok bertanda di kepala berkas — diurutkan menurut besar
pengaruhnya pada kesimpulan — supaya dapat diganti sekaligus dan tidak
terkutip sebelum waktunya.

---

## 5. Catatan Tiap Teknologi Besar

### 5.1 Three.js dan React Three Fiber

Three.js adalah mesin render WebGL; React Three Fiber memungkinkan adegannya
ditulis sebagai JSX, sehingga komposisi adegan mengikuti pola React yang sama
dengan antarmuka.

Tantangan utamanya adalah menggambar 5.376 sel simulasi setiap bingkai.
Membuat satu jala per sel tidak mungkin dilakukan. Penyelesaiannya: keadaan
simulasi ditulis ke **satu tekstur data 96 × 56 piksel**, di mana setiap piksel
mewakili satu sel —

| Saluran | Isi |
|---|---|
| R | tingkat abu / rongga |
| G | panas bara |
| B | kelembapan |
| A | tingkat hangus |

— lalu tekstur itu dibaca oleh peneduh sendiri di GPU. Hasilnya satu perintah
gambar untuk seluruh bidang penampang.

Peneduh ditulis sendiri, bukan memakai `MeshStandardMaterial`, karena yang
dibutuhkan bukan sekadar pewarnaan: peneduh titik **menggeser geometri ke
dalam** sebesar tingkat abu, sehingga rongga bekas terbakar memiliki kedalaman
fisik dan berbayang dengan benar ketika kamera bergerak.

### 5.2 GSAP

Dipakai untuk dua hal berbeda:

- **ScrollTrigger** pada Modul 01 — menahan bagian di layar selama empat layar
  gulir, dan memindahkan tahap cerita mengikuti posisi gulir.
- **`useGSAP`** — hook resmi yang membersihkan animasi secara otomatis ketika
  komponen dilepas, sehingga tidak ada animasi tertinggal.

Animasi di dalam kanvas 3D **tidak** memakai GSAP, melainkan `useFrame` dari
React Three Fiber dengan peredaman berbasis waktu (`THREE.MathUtils.damp`),
supaya kecepatan geraknya sama pada 30 fps maupun 144 fps.

### 5.3 Audio — mengapa `howler` belum dipakai

`lib/ambientSound.ts` membangun seluruh suasana suara **langsung di peramban**
memakai Web Audio API, tanpa satu pun berkas suara: derau coklat tersaring
untuk angin, derau pita-sempit untuk riak air, letupan pendek untuk derak bara,
dan osilator sinus untuk kicau burung. Kicau burung berhenti saat asap menebal.

Howler.js adalah pemutar **berkas** suara (`.mp3`, `.ogg`): tugasnya memuat,
memutar, mengulang, dan mengatur volume rekaman. Karena proyek ini tidak
memiliki berkas suara apa pun, Howler belum memiliki pekerjaan. Paketnya tetap
dipertahankan untuk kebutuhan narasi atau efek suara berbasis rekaman pada
modul berikutnya.

### 5.4 Vitest

Konfigurasinya sengaja sempit:

```ts
test: {
  environment: "node",
  include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
}
```

Yang diuji adalah **model ilmiahnya**, bukan tampilannya. Komponen React dan
adegan 3D diuji secara manual dan visual, dengan bukti tangkapan layar di
`docs/screenshots/`.

Cakupannya diperluas ke `components/**` karena sebagian bentuk geometri
diorama dan penilaian jawaban pembaca masih berada di sana bersama
komponennya. Yang diuji tetap hanya berkas yang murni perhitungan — tidak
satu pun uji merender React.

Keadaan terakhir: **11 berkas uji, 157 uji, seluruhnya lolos** (durasi 3,41
detik).

| Berkas uji | Uji | Cakupan |
|---|---|---|
| `lib/carbon.test.ts` | 32 | Cadangan karbon, CO₂, umur menurut kedalaman, pemulihan |
| `lib/peat.test.ts` | 28 | Klasifikasi lapisan, status air, indeks bahaya |
| `lib/drainage.test.ts` | 25 | Panjang pengaruh kanal, subsiden, emisi, pemadatan |
| `lib/smolder.test.ts` | 23 | Penyalaan, perambatan, pemadaman, subsiden |
| `components/gambut/bara/scene/crossSection.test.ts` | 12 | Pemetaan sel simulasi ke geometri penampang |
| `components/gambut/kanal/probe.test.ts` | 9 | Penilaian penanda jarak babak 02 Modul 03 |
| `components/gambut/karbon/depthProbe.test.ts` | 8 | Penilaian penanda kedalaman babak 01 Modul 04 |
| `lib/spotlight.test.ts` | 7 | Interpolasi dan penghalusan kursor |
| `components/gambut/bara/scene/baraState.test.ts` | 7 | Keadaan adegan Modul 02 |
| `lib/atmosphere.test.ts` | 4 | Peralihan suasana langit |
| `lib/ambientSound.test.ts` | 2 | Laju derak bara dan peluang kicau burung |

---

## 6. Mengapa Tidak Ada Backend

Pemeriksaan berkas menunjukkan tidak ada satu pun dari berikut ini:

- berkas `route.ts` di dalam `app/` (Route Handler)
- arahan `"use server"` (Server Action)
- paket basis data atau ORM
- paket autentikasi
- pemanggilan `fetch` ke layanan luar
- berkas variabel lingkungan

Ketiadaan itu disengaja, dengan tiga alasan:

1. **Simulasi harus berjalan pada 60 bingkai per detik.** Model dijalankan
   puluhan langkah setiap bingkai. Bila tiap langkah harus menunggu jawaban
   server, jeda jaringan sebesar 50–200 milidetik membuatnya mustahil.
   Menghitung di peramban menghilangkan jeda itu sepenuhnya.
2. **Tidak ada data yang perlu disimpan.** Aplikasi tidak memiliki akun, tidak
   menyimpan kemajuan belajar, dan tidak mengumpulkan masukan pengguna.
3. **Dapat ditempatkan sebagai situs statis.** Hasil pembangunan tidak
   memerlukan server yang berjalan terus-menerus, sehingga penguji dapat
   membukanya kapan saja tanpa biaya dan tanpa pemeliharaan.

Meskipun demikian, Next.js tetap dipilih karena menyediakan perutean, optimasi
font dan aset, pemecahan berkas otomatis, serta pembangkitan HTML statis. Bila
kelak dibutuhkan penyimpanan data — misalnya hasil kuis atau statistik
penggunaan — kerangka ini sudah siap merangkap sisi belakang melalui Route
Handler tanpa perlu berganti teknologi.

---

## 7. Strategi Performa

### 7.1 Anggaran grafis dua tingkat

`components/gambut/scene/dioramaConstants.ts` menetapkan dua profil mutu yang
dipakai bersama oleh seluruh modul:

| Parameter | `high` | `low` | Arti |
|---|---|---|---|
| `maxDpr` | 1,5 | 1 | Batas resolusi render |
| `shadowSize` | 1024 | 512 | Sisi peta bayangan |
| `softShadow` | ya | tidak | Bayangan lunak |
| `antialias` | ya | tidak | Penghalusan tepi |
| `envHz` | 4 | 1,5 | Frekuensi pembuatan ulang peta lingkungan |
| `simSteps` | 24 | 8 | Batas langkah simulasi per bingkai |
| `fieldHz` | 30 | 15 | Frekuensi penyalinan hasil simulasi ke tekstur |
| `subsideSec` | 0,5 | 1,2 | Jeda pembentukan ulang geometri permukaan |
| `understory` | 10 | 5 | Jumlah tumbuhan bawah |

Perhatikan bahwa yang diturunkan bukan hanya mutu gambar, tetapi juga frekuensi
simulasi — sehingga perangkat lemah tetap lancar.

### 7.2 Penurunan resolusi adaptif

`PerformanceGuard` mengukur laju bingkai tiap 1,5 detik. Bila rata-ratanya di
bawah 55 fps, resolusi render diturunkan bertahap sebesar 0,25 hingga batas 1×.
Tiga detik pertama diabaikan karena tekstur dan model masih diunggah ke GPU.

### 7.3 Ref, bukan keadaan React, untuk data per bingkai

Nilai yang berubah setiap bingkai — posisi kamera, kekuatan nyala, muka air
yang dituju — disimpan dalam `useRef`, bukan `useState`. Bila disimpan sebagai
keadaan React, menggeser satu pengatur akan memicu render ulang seluruh kanvas
puluhan kali per detik.

### 7.4 Larik bertipe

Simulasi memakai `Uint8Array`, `Float32Array`, dan `Int32Array`, dan penampung
sel penyebar dialokasikan sekali lalu dipakai ulang. Tanpa itu, pengumpul
sampah memori akan menyebabkan tersendat berkala pada kecepatan waktu
tertinggi.

### 7.5 Pengukuran harus memakai pembangunan produksi

Server pengembangan `next dev` kira-kira dua kali lebih lambat karena menyusun
berkas ketika diminta. Angka performa hanya sah bila diambil dari `npm run
build` lalu `npm start`; keputusan rancangan tidak boleh diambil berdasarkan
angka dari server pengembangan.

---

## 8. Aksesibilitas

| Aspek | Penerapan |
|---|---|
| Pengurangan gerak | Nilai `reducedMotion` mematikan paralaks dan mempercepat peredaman kamera hingga nyaris seketika |
| Pembaca layar | `aria-current` pada menu aktif; `lang="id"` pada elemen `<html>` |
| Format lokal | Angka memakai `toLocaleString("id-ID")` sehingga tertulis "0,6" bukan "0.6" |
| Layar sempit | Kamera menjauh 1,65× saat rasio layar di bawah 0,8 |
| Suara | Mati secara bawaan, dinyalakan lewat tombol |

---

## 9. Aset

| Jenis | Format | Jumlah | Catatan |
|---|---|---|---|
| Model 3D | `.glb` (GLTF biner) | 6 | Tumbuhan, batu, ranting |
| Tekstur | `.webp` | 13 | Warna dan peta normal tiap lapisan gambut |
| Tekstur prosedural | dibuat saat jalan | — | Bara, percikan, dan asap digambar lewat kanvas 2D |

Sumber dan lisensi tercatat pada `public/models/gambut/SUMBER.md` dan
`public/textures/gambut/SUMBER.md`.

---

## 10. Keadaan Pengerjaan

| Bagian | Keadaan |
|---|---|
| Beranda, Navbar, halaman `/gambut` | Selesai |
| Modul 01 — Anatomi Gambut | Selesai |
| Modul 02 — Bara di Bawah Tanah | Selesai — empat babak berjalan dengan gerbangnya |
| Modul 03 — Kanal & Pengeringan | Selesai — empat babak berjalan dengan gerbangnya |
| Modul 04 — Gudang Karbon | Selesai — empat babak berjalan dengan gerbangnya |
| `/simulasi`, `/dampak`, `/pencegahan` | Halaman penanda |

Satu hal yang masih tertunda: `config/assets.ts` masih berisi teks kosong untuk
kedua gambar latar halaman awal, sehingga efek sorot kursor belum terlihat.
