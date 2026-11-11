# Acuan Riset Modul 04 — Gudang Karbon

Dokumen ini memeriksa kesesuaian Modul 04 dengan temanya, menetapkan
pengetahuan intinya, mencatat acuan riset, lalu mengkalibrasi isi modul yang
sudah ada terhadap acuan itu.

**Keadaan 11 November 2026.** Riza menyetujui semua saran, dan semuanya sudah
diterapkan: Babak "Arsip" dicabut (modul kini tiga babak), layar pembuka
ditambahkan, kebakaran pembanding diganti 10 ha dari berita BPBD Pontianak
(ANTARA, 13 Agustus 2019) dengan kedalaman 0,33 m dari Ballhorn dkk. (2009),
batas "jauh lebih sempit" menjadi 5 ha dan luas maksimum 30 ha, emisi per
orang menjadi 2,8 t (Global Carbon Budget lewat Our World in Data, 2024),
tanda kedalaman terukur 2006 dan 1997 dipasang pada pengatur bakar, dan
kalimat "tidak pernah lebih cepat" dihapus. Modul tetap di Bagian 01.

- Tanggal: 11 November 2026
- Berlaku untuk: Modul 04 (`/gambut/karbon`), model di `lib/carbon.ts`
- Prinsip: setiap aksi harus membawa satu pengetahuan inti modul, dengan
  perbedaan sebelum–sesudah yang jelas (memori `aksi-harus-membawa-ilmu`)

---

## 1. Kesesuaian tema

| Pertanyaan | Jawaban |
|---|---|
| Cocok dengan judul "Gudang Karbon"? | **Ya.** Isinya simpanan karbon gambut dan berapa yang lepas saat terbakar |
| Cocok dengan tema Bagian 01 (KENALI)? | **Sebagian.** Modul 01–03 menjelaskan gambut dan mengapa ia terbakar. Modul 04 sudah membahas *akibat*, yang sebenarnya tema Bagian 03 Dampak. Masih dapat dipertahankan sebagai penutup Bagian 01: "apa yang hilang" |
| Cocok dengan naskah? | **Lemah.** Dampak di naskah (II.B.4) adalah asap, kesehatan, dan sekolah diliburkan. Karbon tidak disebut sama sekali. Bila modul ini dipertahankan, naskah perlu satu paragraf dampak karbon |
| Dekat dengan pengguna? | **Kurang.** Bagi remaja Pontianak, asap lebih terasa daripada ton CO₂. Pembanding "emisi berapa orang setahun" membantu, tetapi tetap abstrak |

**Tumpang tindih yang perlu dibereskan.**

- **Babak 01 "Arsip di bawah kaki"** mengajarkan bahwa 1 mm = 1 tahun dan
  meminta pembaca mencari gambut seumur Borobudur. Pelajaran "gambut adalah
  kalender, 2,8 m = 2.800 tahun" sudah dibawa Modul 01 Tahap 1. Ini
  pengulangan.
- **Babak 04 "Seribu tahun untuk satu meter"** berbagi pelajaran "tidak
  kembali" dengan Modul 02 Babak 04. Bedanya jelas dan layak dipertahankan:
  Modul 02 tentang **tanah** yang melesak, Modul 04 tentang **karbon** yang
  butuh berabad-abad untuk ditabung lagi.

## 2. Pengetahuan inti (satu kalimat)

> **Gambut adalah gudang karbon; saat terbakar, yang menentukan banyaknya
> karbon yang lepas adalah kedalaman yang habis terbakar, bukan hanya
> luasnya, dan yang lepas dalam beberapa minggu butuh berabad-abad untuk
> ditabung kembali.**

## 3. Acuan yang dipakai

| Peran | Karya | Status pembacaan |
|---|---|---|
| **Kedalaman terbakar, lapangan (Borneo)** | Page, S. E., Siegert, F., Rieley, J. O., Boehm, H.-D. V., Jaya, A., & Limin, S. (2002). The amount of carbon released from peat and forest fires in Indonesia during 1997. *Nature*, 420, 61–65. <https://doi.org/10.1038/nature01131> | Abstrak; sudah tercatat di acuan Modul 03 |
| **Kedalaman terbakar, LiDAR (Borneo)** | Ballhorn, U., Siegert, F., Mason, M., & Limin, S. (2009). Derivation of burn scar depths and estimation of carbon emissions with LIDAR in Indonesian peatlands. *PNAS*, 106, 21213–21218. | Abstrak dan ringkasan |
| **Karbon per volume gambut** | Warren, M. W., Kauffman, J. B., Murdiyarso, D., dkk. (2012). A cost-efficient method to assess carbon stocks in tropical peat soil. *Biogeosciences*, 9, 4477–4485. <https://doi.org/10.5194/bg-9-4477-2012> | Abstrak; teks lengkap terbuka |
| **Laju menabung karbon (Kalimantan Barat)** | Anshari dkk. (2026), *Scientific Reports*, 16, 5496 (acuan Modul 01) | Terbaca |
| Pembanding emisi per orang | Data emisi nasional (mis. Global Carbon Budget lewat Our World in Data) | **Belum ditetapkan**; nilai 2023 berkisar 2,6–2,8 t CO₂ per orang menurut beberapa kompilasi |

### Batas acuan (perlu ditulis jujur di naskah)

- Page dkk. (2002) dan Ballhorn dkk. (2009) mengukur di Kalimantan Tengah.
  Kedalaman terbakar sangat beragam antar lokasi.
- Persamaan Warren dkk. (2012) berlaku untuk gambut berkadar karbon organik
  di atas 40%. Farmer dkk. (2013) menunjukkan persamaan itu tidak tepat untuk
  gambut di bawah sawit.
- Semua angka karbon di modul adalah hasil kali (volume × karbon per volume),
  bukan pengukuran emisi kebakaran tertentu.

## 4. Temuan yang dipakai

| Temuan | Sumber |
|---|---|
| Pada kebakaran 1997, rata-rata lebih dari setengah meter gambut habis terbakar (43 lokasi diukur langsung) | Page dkk. (2002) |
| Kebakaran 2006: rata-rata kedalaman bekas terbakar 0,33 ± 0,18 m, diukur dengan LiDAR | Ballhorn dkk. (2009) |
| Karbon per volume naik lurus dengan kerapatan lindak: Cd = 495,14 × BD + 5,41 (kg C/m³, BD dalam g/cm³). Pada BD 0,10 → ± 55 kg C/m³ | Warren dkk. (2012) |
| Inti SF61 (Kapuas Hilir) menabung 63 g C/m²/tahun | Anshari dkk. (2026) |

## 5. Angka di kode dibandingkan dengan acuan

| Tetapan (`lib/carbon.ts`) | Sekarang | Kata acuan | Tindakan |
|---|---|---|---|
| `PEAT_BULK_DENSITY_KG_M3` × `CARBON_FRACTION` | 100 × 0,55 = 55 kg C/m³ | Warren: BD 0,10 → 54,9 kg C/m³ | **Cocok.** Ganti dasar perhitungannya ke persamaan Warren |
| CO₂ per ha per 1 m terbakar | ± 2.000 t | 55 kg C/m³ × 10.000 m³ × 44/12 = 2.017 t | **Cocok**, kini bersumber |
| `HEADLINE_FIRE` (kebakaran "dari berita") | 120 ha, terbakar **0,08 m** | Rata-rata terukur 0,33 m (Ballhorn) sampai > 0,5 m (Page) | **Bertentangan.** 8 cm jauh di bawah rata-rata terukur; dan "berita" itu sendiri tidak bersumber. Keputusan B |
| `PERSON_T_CO2_PER_YEAR` | 2,3 t | 2,6–2,8 t (2023, beberapa kompilasi) | Perbarui dengan satu sumber resmi |
| Laju menabung kembali | 1 mm/tahun | Anshari dkk. (2026) | Tetap |

## 6. Kalibrasi ke animasi, per babak

| Babak | Aksi sekarang | X yang dibawa pulang | Nilai | Usulan |
|---|---|---|---|---|
| **01 Arsip di bawah kaki** | Cari gambut seumur Borobudur | 1 mm gambut = 1 tahun | ❌ **Mengulang Modul 01** | **Dibuang**, atau dilebur menjadi satu kalimat pembuka Babak 04 |
| **02 Sekali bakar** | Bakar sampai 50 cm, baca yang hilang | Api gambut menghabiskan gambut sampai puluhan sentimeter, dan tiap meter per hektare melepas ± 2.000 t CO₂ | ✅ Lolos | Tetap. Kedalaman acuan diberi tanda pada penggaris: 0,33 m (Ballhorn) dan > 0,5 m (Page) |
| **03 Hektare bukan ukurannya** | Setel luas dan kedalaman sampai karbonnya sama | Kedalaman sama pentingnya dengan luas | ✅ Lolos, inti modul | Tetap. "Kebakaran dari berita" diganti contoh nyata yang bersumber (Keputusan B) |
| **04 Seribu tahun untuk satu meter** | Jalankan waktu sampai sedikitnya satu abad | Yang hilang dalam minggu butuh berabad-abad untuk ditabung lagi | ✅ Lolos | Tetap. Kalimat "satu milimeter setahun, **dan tidak pernah lebih cepat**" dihapus (keliru: itu rata-rata, dan inti SF61 sebagian tumbuh lebih cepat) |

**Hook.** Modul ini juga **belum punya layar pembuka**. Usul: "Asap kebakaran
gambut bisa berbulan-bulan. Apa sebenarnya yang terbakar?" Keputusan C.

## 7. Keputusan untuk Riza

**A. Babak 01 Arsip**

- **A1 (disarankan): dibuang.** Modul menjadi tiga babak, semuanya membawa
  pengetahuan baru. Pelajaran "1 mm = 1 tahun" cukup diingatkan dalam satu
  kalimat di Babak 04.
- A2: dipertahankan sebagai pengulang Modul 01.

**B. Kebakaran pembanding di Babak 03**

- **B1 (disarankan):** kebakaran nyata yang luasnya bersumber, misalnya dari
  berita BPBD atau ANTARA tentang Pontianak yang sudah dikutip naskah, dengan
  kedalaman terbakar dari Ballhorn (0,33 m) dan pernyataan jujur bahwa
  kedalamannya diambil dari rata-rata penelitian.
- B2: tetap contoh rekaan, diberi label "contoh".

**C. Hook.** Ya atau tidak, dan kalimatnya.

**D. Posisi modul.** Tetap di Bagian 01 sebagai "apa yang hilang", atau
dipindah ke Bagian 03 Dampak bersama asap. Saran: **tetap**, karena modulnya
sudah ada dan memakai bongkahan yang sama dengan Modul 01–02; tambahkan satu
paragraf dampak karbon di naskah II.B.4.

---

## 8. Daftar kutipan untuk naskah

| Dipakai di | Kutip sebagai |
|---|---|
| Babak 02: kedalaman terbakar | Page dkk. (2002); Ballhorn dkk. (2009) |
| Babak 02–03: karbon per volume | Warren dkk. (2012) |
| Babak 04: laju menabung | Anshari dkk. (2026) |
| Pembanding per orang | Sumber emisi nasional yang dipilih |
