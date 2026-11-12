# Acuan Riset Modul 04 — Kanal & Pengeringan

> Nomor modul mengikuti susunan 13 modul (12 November 2026). Di dalam dokumen ini nomor lama mungkin masih muncul: dahulu Anatomi 01, Kanal 02, Bara 03, Karbon 04.

Dokumen ini memeriksa kesesuaian Modul 02 dengan temanya, menetapkan
pengetahuan intinya, mencatat acuan riset, lalu mengkalibrasi isi modul yang
sudah ada terhadap acuan itu.

**Keadaan 11 November 2026.** Riza menyetujui semua saran. Sudah diterapkan:
layar pembuka parit Pontianak, fakta keempat babak diganti dengan temuan
Wösten, Ritzema, dan Hooijer, dan fakta `1 mm/tahun` dibuang dari Babak 04.
**Kalibrasi model (diterapkan, teks lengkap Hooijer sudah dibaca).** Hooijer
dkk. (2012) bagian 3.7–3.8 memberi hubungan lurus untuk hutan gambut yang
dikeringkan: lesak S = 7,06 × WD cm/tahun (R² = 0,80, WD 0–0,7 m) dan
kehilangan karbon CL = 98 × WD t CO₂eq/ha/tahun, berlaku sampai sedikitnya
1 m. Model kini memakai keduanya, dibatasi pada WD 1 m, dengan pemampatan
hanya pada tahun pertama (25% lesak lima tahun pertama). Muka air relatif
terhadap permukaan dianggap tetap karena drainase dijaga, sesuai pengamatan
18 tahun Hooijer; batasnya hanya sisa gambut. Akibatnya daerah rawan tidak
lagi menyusut sendiri seperti pada model lama. Untuk perbandingan, rumus
perkebunan akasia adalah S = 1,5 + 4,98 × WD, dan gabungan S = 0,69 + 5,98 × WD.

**Urutan.** Sejak 11 November 2026 modul ini bernomor **02** (dahulu 03),
mendahului Bara di Bawah Tanah, mengikuti rantai sebab-akibat.

- Tanggal: 11 November 2026
- Berlaku untuk: Modul 02 (`/gambut/kanal`), model di `lib/model/drainage.ts`
- Prinsip: setiap aksi harus membawa satu pengetahuan inti modul, dengan
  perbedaan sebelum–sesudah yang jelas (memori `aksi-harus-membawa-ilmu`)

---

## 1. Kesesuaian tema

**Bagian 01 Gambut bertema KENALI.** Empat modulnya menjawab empat pertanyaan
berurutan: apa itu gambut (01), mengapa apinya sulit padam (02), **mengapa
gambut menjadi kering dan mudah terbakar (03)**, dan apa yang hilang (04).

| Pertanyaan | Jawaban |
|---|---|
| Cocok dengan judul "Kanal & Pengeringan"? | **Ya.** Seluruh isinya tentang kanal yang menurunkan muka air tanah dan akibatnya |
| Cocok dengan tema Bagian 01? | **Ya.** Modul 01 hanya menyebut "kanal dan kemarau menurunkan muka air" dalam satu kalimat; Modul 02 menjelaskan *bagaimana* dan *seberapa jauh* |
| Cocok dengan naskah? | **Ya, sangat.** Naskah II.B.3 menyebut pengeringan gambut sebagai akar kebakaran berulang (Nurhidayah dkk., 2023) dan jarak ke kanal sebagai prediktor terkuat (Horton dkk., 2021). Modul ini memperlihatkan alasannya |
| Dekat dengan pengguna? | **Ya.** Pontianak penuh parit, dan 858,4 ha wilayahnya gambut (ANTARA, 2024, di naskah 1.1). Hook dapat memakai parit di kota sendiri |

**Tumpang tindih yang perlu dibereskan.** Babak 04 menutup dengan "gambut
tumbuh satu milimeter per tahun" (fakta `1 mm/tahun`). Pelajaran pemulihan
seribu tahun itu sudah menjadi isi Modul 01 Tahap 1 dan Modul 04 Babak 04.
Di Modul 02 cukup: **air bisa dikembalikan, tanah yang melesak tidak.**

## 2. Pengetahuan inti (satu kalimat)

> **Kanal mengeringkan gambut sampai ratusan meter dari tepinya; gambut yang
> kering mudah terbakar dan terus melesak, dan menyekat kanal hanya
> mengembalikan airnya, bukan tanahnya.**

## 3. Acuan yang dipakai

Pola yang sama dengan Modul 03: mekanisme dari penelitian lapangan Asia
Tenggara, ditambah data Borneo.

| Peran | Karya | Status pembacaan |
|---|---|---|
| **Penurunan permukaan (mekanisme)** | Hooijer, A., Page, S., Jauhiainen, J., Lee, W. A., Lu, X. X., Idris, A., & Anshari, G. (2012). Subsidence and carbon loss in drained tropical peatlands. *Biogeosciences*, 9, 1053–1071. <https://doi.org/10.5194/bg-9-1053-2012> | Abstrak; teks lengkap terbuka (akses bebas), belum dibaca utuh |
| **Ambang 40 cm dan kebakaran (Borneo)** | Wösten, J. H. M., Clymans, E., Page, S. E., Rieley, J. O., & Limin, S. H. (2008). Peat–water interrelationships in a tropical peatland ecosystem in Southeast Asia. *Catena*, 73(2), 212–224. | Abstrak saja |
| **Jarak pengaruh kanal dan sekat (Borneo)** | Ritzema, H., Limin, S., Kusin, K., Jauhiainen, J., & Wösten, H. (2014). Canal blocking strategies for hydrological restoration of degraded tropical peatlands in Central Kalimantan, Indonesia. *Catena*, 114, 11–20. | Kutipan sekunder; teks lengkap belum dibaca |
| **Laju lesak, Kalimantan Barat** | Anshari, G. Z., Gusmayanti, E., & Novita, N. (2021). Tinjauan laju penurunan permukaan gambut tropis yang dikeringkan (judul asli perlu dicek). | Ringkasan dari hasil pencarian; **judul, jurnal, dan halaman perlu dicek** |
| Batas aturan | PP 57/2016 (muka air ≤ 0,4 m) | Sudah dipakai Modul 01 dan 03 |

Catatan: Anshari adalah penulis utama acuan Modul 01 dan ikut menulis Hooijer
dkk. (2012), jadi rangkaian acuannya tersambung.

### Batas acuan (perlu ditulis jujur di naskah)

- Hooijer dkk. (2012) mengukur di perkebunan akasia dan sawit di Sumatra,
  bukan di Kalimantan Barat. Angka 142 cm dalam lima tahun berasal dari
  drainase dalam perkebunan.
- Ambang 40 cm pada Wösten dkk. (2008) adalah ambang yang dipakai modelnya,
  bukan nilai yang diukur sebagai awal kebakaran.
- Jarak pengaruh kanal sangat bergantung pada kedalaman kanal dan sifat
  gambut setempat. Belum ada satu rumus baku yang dapat dikutip.

## 4. Temuan yang dipakai

| Temuan | Sumber |
|---|---|
| Lesak tahun pertama besar: 75 cm dari 142 cm dalam lima tahun pertama | Hooijer dkk. (2012) |
| Sesudah lima tahun lesak mendatar ± 5 cm/tahun pada muka air rata-rata 0,7 m | Hooijer dkk. (2012) |
| Oksidasi gambut menyumbang ± 75% lesak setelah 5 tahun dan 92% setelah 18 tahun; pemampatan hanya berarti pada tahun pertama | Hooijer dkk. (2012) |
| Kehilangan karbon 178 t CO₂eq/ha/tahun pada lima tahun pertama, lalu 73 t CO₂eq/ha/tahun | Hooijer dkk. (2012) |
| Rata-rata lesak gambut tropis yang dikeringkan 3,9 cm/tahun (rentang 2–6) | Anshari dkk. (2021) |
| Muka air yang lebih dalam dari 40 cm menaikkan risiko kebakaran; daerah dengan muka air dalam bertepatan dengan daerah terbakar pada Juli 1997 | Wösten dkk. (2008) |
| Muka air di tepi kanal Kalampangan 0,40–0,50 m lebih dalam daripada pada jarak 1.000 m | Ritzema dkk. (2014) |
| Sekat kanal menaikkan muka air sampai ± 400 m di kiri-kanan kanal | Ritzema dkk. (2014) |

## 5. Angka di kode dibandingkan dengan acuan

| Tetapan (`lib/model/drainage.ts`) | Sekarang | Kata acuan | Tindakan |
|---|---|---|---|
| `SUBSIDENCE_CM_PER_YEAR_PER_M` | ~~5 cm/tahun per 1 m~~ → **7,06** | S = 7,06 × WD, hutan dikeringkan (Hooijer, §3.7) | **Diterapkan**, dibatasi pada WD 1 m |
| `COMPACTION_SHARE`, `COMPACTION_YEARS` | ~~30% dalam 2 tahun~~ → 25% dari lesak 5 tahun, tahun pertama saja | Pemampatan hanya berarti pada tahun pertama; oksidasi 75% setelah 5 tahun | **Diterapkan** |
| `EMISSION_T_PER_HA_PER_M` | ~~80~~ → **98** t CO₂eq/ha/tahun per 1 m | CL = 98 × WD, hutan dikeringkan (Hooijer, §3.8) | **Diterapkan** |
| `INFLUENCE_LENGTH_PER_M` | 190 m per 1 m kanal | Tidak ada rumus baku. Kalampangan: selisih 0,40–0,50 m antara tepi dan 1.000 m; sekat terasa sampai ± 400 m | **Asumsi model terkalibrasi.** Uji: kanal yang umum di Kalampangan harus menghasilkan selisih ± 0,4–0,5 m pada 1.000 m |
| `NATURAL_WATER_DEPTH_M` | 0,1 m | Gambut utuh: air dekat permukaan (Wösten: −40 sampai +100 cm) | Tetap, tandai asumsi |
| Ambang 40 cm | PP 57/2016 | PP 57/2016 dan Wösten dkk. (2008) | Tambah Wösten sebagai dasar ilmiahnya |

## 6. Kalibrasi ke animasi, per babak

Setiap babak harus lolos uji satu kalimat: *"sesudah aksi ini pembaca tahu X
yang sebelumnya tidak ia tahu."*

| Babak | Aksi sekarang | X yang dibawa pulang | Nilai | Usulan |
|---|---|---|---|---|
| **01 Satu kanal** | Gali kanal sampai 1 m | Kanal membuat air di dalam gambut mengalir keluar sendiri, dan muka air turun | ✅ Lolos | Tetap. Fakta diganti dari PP saja menjadi Wösten: di bawah 40 cm, gambut rawan terbakar |
| **02 Jauh dari tepi** | Cari pada grafik jarak tempat muka air melewati 40 cm | Yang rawan bukan hanya tepi kanal, melainkan ratusan meter ke dalam | ✅ Lolos, inti modul | Tetap. Fakta "190 m" diganti dengan temuan Kalampangan (Ritzema) |
| **03 Tahun demi tahun** | Jalankan waktu sampai lesak 50 cm | Gambut kering melesak sendiri tanpa api, cepat di tahun pertama, lalu beberapa cm per tahun | ✅ Lolos | Tetap. Lesak tahun pertama dibuat lebih curam (Hooijer); fakta "± 5 cm/tahun" diberi sumber |
| **04 Yang kembali hanya airnya** | Pasang sekat, bandingkan dengan garis putus-putus | Sekat mengembalikan air dan menurunkan risiko kebakaran, tetapi tanah yang sudah melesak tidak kembali | ✅ Lolos | Tetap. Fakta `1 mm/tahun` **dibuang** (milik Modul 01 dan 04), diganti "sekat menaikkan muka air sampai ± 400 m" (Ritzema). Babak ini juga jembatan ke Bagian Pencegahan |

**Hook.** Modul ini **belum punya layar pembuka** (`ModuleHook`), padahal
Modul 01 dan 03 punya. Usul: mulai dari parit di Pontianak, misalnya "Parit
di sekitar rumahmu terus mengalirkan air, bahkan di musim kemarau. Dari mana
air itu datang?" Jawabannya ada di Babak 01: dari dalam gambut. Keputusan C.

**Standar Modul 03 yang belum ada:** layar pembuka, dan pemeriksaan tampilan
ponsel. Kartu hasil dan tombol ulang perlu dicek apakah sudah setara.

**Yang dibuang dari modul:** tidak ada fitur yang dibuang; keempat babak lolos
uji. Yang dibuang hanya fakta yang menumpuk dengan modul lain.

## 7. Keputusan untuk Riza

**A. Teks lengkap.** Hooijer dkk. (2012) terbuka bebas dan perlu dibaca utuh
sebelum angka dikunci. Ritzema dkk. (2014) dan Wösten dkk. (2008) berbayar;
sementara dikutip dari abstrak atau kutipan sekunder.

**B. Laju lesak yang dipakai**

- **B1 (disarankan): Hooijer**, ± 5 cm/tahun pada muka air 0,7 m, dengan
  tahun pertama yang curam. Mekanismenya lengkap dan terukur langsung.
- B2: rata-rata Anshari 3,9 cm/tahun. Lebih dekat ke Kalimantan Barat, tetapi
  sumbernya tinjauan, dan rinciannya belum terverifikasi.

**C. Hook parit Pontianak.** Ya atau tidak.

---

## 8. Daftar kutipan untuk naskah

| Dipakai di | Kutip sebagai |
|---|---|
| Babak 01: ambang 40 cm | Wösten dkk. (2008); PP 57/2016 |
| Babak 02: jarak pengaruh kanal | Ritzema dkk. (2014) |
| Babak 03: lesak dan oksidasi | Hooijer dkk. (2012); Anshari dkk. (2021) |
| Babak 04: sekat kanal | Ritzema dkk. (2014) |
| Naskah II.B.3: pengeringan sebagai penyebab | Nurhidayah dkk. (2023); Horton dkk. (2021) (sudah ada di naskah) |
