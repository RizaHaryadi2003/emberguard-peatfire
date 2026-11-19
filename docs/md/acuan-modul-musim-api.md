# Acuan Modul 05 · Musim Api

Status: **disetujui pengguna** (19 November 2026): pertanyaan modul dan tiga
babak §5. **Dibangun** 19 November 2026 (`/modul/musim-api`); model di §6.
Tampilan belum diperiksa di peramban.
Nomor modul mengikuti `config/modules-content.ts` (Bagian 2 · Kering, modul kedua).

## 1. Pertanyaan modul

Modul Kanal menunjukkan bahwa parit menurunkan muka air gambut. Modul ini
menjawab bagian waktunya:

> **Mengapa asap di Pontianak datang hampir selalu sekitar Agustus–September,
> dan mengapa pada tahun tertentu jauh lebih parah?**

Pengetahuan "sebelum → sesudah": *kebakaran terjadi karena cuaca panas dan
makin kering makin banyak api, sedikit demi sedikit* → *api gambut menunggu
air tanah turun melewati ambang; kemarau pendek belum berbahaya, tetapi
kemarau yang diperpanjang El Niño membuat air tanah turun melewati ambang itu
dan api melonjak berlipat, bukan naik pelan.*

## 2. Sumber utama

Pola yang dipakai sama seperti modul lain: **mekanisme global** (riset dasar
yang dipakai seluruh bidang) + **riset lokal Kalimantan/Kalbar** → satu
pertanyaan penghubung.

| # | Sumber | Jenis data | Dipakai untuk | Teks dibaca |
|---|---|---|---|---|
| A | Field, R. D., van der Werf, G. R., & Shen, S. S. P. (2009). Human amplification of drought-induced biomass burning in Indonesia since 1960. *Nature Geoscience*, 2, 185–188. doi:10.1038/ngeo443 | Catatan jarak pandang bandara 1960–2006 sebagai pengganti data api | Kebakaran besar hanya terjadi bila hujan turun di bawah **ambang**; Borneo berubah dari tahan api menjadi rawan api antara kemarau 1972 dan 1982, seiring pembukaan lahan | Siaran pers *Nature Geoscience* + ringkasan angka dalam sumber C |
| B | Field, R. D., van der Werf, G. R., Fanin, T., dkk. (2016). Indonesian fire activity and smoke pollution in 2015 show persistent nonlinear sensitivity to El Niño-induced drought. *PNAS*, 113(33), 9204–9209. doi:10.1073/pnas.1524888113 | Satelit + jarak pandang bandara, 2015 dibanding 1991, 1994, 1997 | Ambang **rata-rata ±4 mm/hari** hujan musim kemarau; di bawahnya api dan asap naik cepat (**nonlinier**); makin panjang kemarau makin banyak api | Ringkasan NASA; teks lengkap ditolak penerbit (403) |
| C | Fanin, T., & van der Werf, G. R. (2017). Precipitation–fire linkages in Indonesia (1997–2015). *Biogeosciences*, 14, 3995–4008. doi:10.5194/bg-14-3995-2017 | Titik api ATSR + MODIS malam hari, hujan GPCP + TRMM | Akumulasi hujan **120 hari** paling menjelaskan api di Kalimantan selatan; ambang **305 mm per 120 hari**; musim kering Juni–Oktober, api tertinggi September–Oktober; porsi api di lahan gambut 45 % (1997) → **61 %** (2015) | **Lengkap** |
| D | Aldrian, E., & Susanto, R. D. (2003). Identification of three dominant rainfall regions within Indonesia and their relationship to sea surface temperature. *International Journal of Climatology*, 23, 1435–1452. doi:10.1002/joc.950 | Hujan bulanan 1961–1993, ±884 stasiun | Kalimantan barat laut masuk **Wilayah B**: **dua puncak hujan** (Oktober–November dan Maret–Mei), pengaruh El Niño **teredam**; Kalimantan selatan masuk Wilayah A: satu musim kering panjang Juli–September, pengaruh El Niño kuat | **Lengkap** |
| E | Taufik, M., Torfs, P. J. J. F., Uijlenhoet, R., Jones, P. D., Murdiyarso, D., & Van Lanen, H. A. J. (2017). Amplification of wildfire area burnt by hydrological drought in the humid tropics. *Nature Climate Change*, 7, 428–431. doi:10.1038/nclimate3280 | Neraca air 1901–2015 + area terbakar GFED4 1996–2015 se-Borneo | **Mekanisme**: kemarau pendek = risiko rendah; kemarau panjang menurunkan muka air tanah, gambut mengering, lalu api menjalar. Pada tahun kekeringan hidrologis area terbakar maksimum **hampir 10×**, dan kebakaran >10.000 ha **14×** lebih sering | **Lengkap** (naskah diterima, repositori UEA) |
| F | Taufik, M., Widyastuti, M. T., Sulaiman, A., Murdiyarso, D., Santikayasa, I. P., & Minasny, B. (2022). An improved drought-fire assessment for managing fire risks in tropical peatlands. *Agricultural and Forest Meteorology*, 312, 108738. doi:10.1016/j.agrformet.2021.108738 | Hujan, muka air tanah, dan lengas tanah harian 2018–2019 di 8 stasiun gambut, **Kubu Raya** (Kalbar) dan Batanghari (Jambi) | **Angka lokal inti**: bahaya api tinggi umumnya muncul saat muka air tanah **di bawah 40 cm**; lahan **hanya terbakar** saat muka air **di bawah 60 cm** | Abstrak (cermin ASEAN Haze Portal, CIFOR) |
| H | BMKG Stasiun Klimatologi Kalimantan Barat (2026). *Buletin Iklim Kalbar, Edisi Oktober 2026* (Analisis September 2026). kalbar.bmkg.go.id | Pengamatan resmi stasiun BMKG di Kalbar | **Keadaan tahun ini**: ENSO "El Niño Sangat Kuat (+2,70 °C)", diperkirakan bertahan sampai awal 2027; IOD positif (+0,782). Hujan September 2026 di Stasiun Klimatologi Kalbar **117 mm**, padahal normalnya **304 mm**; sifat hujan umumnya Bawah Normal di seluruh Kalbar | **Lengkap** |
| G | Yulianti, N., & Hayasaka, H. (2013). Recent active fires under El Niño conditions in Kalimantan, Indonesia. *American Journal of Plant Sciences*, 4(3A), 685–696. doi:10.4236/ajps.2013.43A087 | Titik api MODIS 2002–2011 + hujan harian Pontianak 2001–2010 | **Kalender Pontianak**: dua masa kering (awal Februari–akhir Maret, dan Agustus ±⅔ bulan); api Kalbar memuncak **pertengahan–akhir Agustus**; Kalbar selatan punya gelombang kedua pertengahan September–pertengahan Oktober; tahun api parah 2002, 2004, 2006, 2009 | **Lengkap** (HTML) |

### Sumber tambahan untuk model muka air (§6)

| # | Sumber | Dipakai untuk | Teks dibaca |
|---|---|---|---|
| I | Putra, S. S., Holden, J., & Baird, A. J. (2021). The effects of ditch dams on water-level dynamics in tropical peatlands. *Hydrological Processes*, 35(5), e14174. doi:10.1002/hyp.14174 | Laju turun muka air saat kemarau, Sebangau: **9,3 mm/hari** hutan, 9,6 bersekat, **12,7 mm/hari** berparit, "semata karena penguapan" (§3.2); saat kemarau muka air di semua lokasi lebih dalam dari 40 cm | **Lengkap** (akses terbuka, White Rose) |
| J | Hirano, T., Kusin, K., Limin, S., & Osaki, M. (2015). Evapotranspiration of tropical peat swamp forests. *Global Change Biology*, 21(5), 1914–1927. doi:10.1111/gcb.12653 | Penguapan tahunan hutan gambut dikeringkan, Kalteng: **1.553 ± 117 mm/tahun** | Abstrak |
| K | Ohkubo, S., Hirano, T., & Kusin, K. (2021). Influence of fire and drainage on evapotranspiration in a degraded peat swamp forest in Central Kalimantan. *Journal of Hydrology*, 603, 126906. doi:10.1016/j.jhydrol.2021.126906 | Penguapan berkurang 33–69 % bila muka air turun 0 → 1 m; alasan model dihentikan di 100 cm | **Lengkap** (naskah penulis, HUSCAP) |

### Kekuatan tiap sumber

- **A, B, C, E** adalah riset tingkat dunia (Nature Geoscience, PNAS, Nature
  Climate Change, Biogeosciences) dan menjadi dasar peringatan dini kebakaran
  di Indonesia. Field (2009) dan Taufik (2017) memakai data tangan pertama
  (jarak pandang bandara, neraca air seabad), bukan sekadar mengutip.
- **D** adalah rujukan baku pembagian iklim hujan Indonesia; dipakai oleh C.
- **F** adalah satu-satunya pengukuran muka air tanah langsung **di Kubu
  Raya**, tetangga Pontianak, oleh penulis E. Ini jembatan dari mekanisme
  global ke lahan pembaca.
- **G** memberi kalender Pontianak. Penerbitnya (SCIRP) **bukan jurnal
  bereputasi tinggi**; angkanya data pengamatan langsung (MODIS dan hujan
  stasiun), tetapi sebaiknya dipakai hanya untuk bulan, bukan untuk klaim
  utama. Tabel normal hujan bulanan Supadio yang resmi **tidak tersedia
  terbuka**: Data Online BMKG (dataonline.bmkg.go.id) memerlukan akun, dan
  buletin bulanan hanya memuat normal bulan yang dibahas. Bila pengguna bisa
  meminta tabel normal ke Stasiun Klimatologi Kalbar, G diganti sepenuhnya.
- **H** adalah data resmi pemerintah, bukan riset; dipakai hanya untuk hook
  "tahun ini" dan sebagai bukti bahwa El Niño memang menekan hujan Kalbar
  pada September 2026.

## 3. Penyesuaian ke Pontianak dan Kalbar

Inilah temuan yang membuat modul ini **khas Kalbar**, bukan salinan cerita
Kalimantan Tengah:

1. **Pontianak di khatulistiwa punya dua masa kering, bukan satu** (D, G).
   Kemarau Agustus di Pontianak pendek (±⅔ bulan) dan tajam, sedangkan
   Palangkaraya kering ±3 bulan (G). Puncak api Kalbar karena itu lebih awal
   (Agustus) daripada Kalteng dan Kalimantan selatan (September–Oktober, C).
2. **Pengaruh El Niño ke hujan Kalbar lebih lemah** (D). Namun semua tahun api
   parah pada 2002–2011 tetap tahun El Niño (G), dan kekeringan *air tanah*,
   bukan hanya hujan, yang menentukan luas terbakar (E). Pesan untuk pembaca:
   *hujan di Pontianak mungkin tidak jauh berkurang, tetapi bila kemarau
   Agustus memanjang, air di gambut turun melewati ambangnya.*
3. **Ambang yang diukur di tanah tetangga sendiri** (F): 40 cm = bahaya
   tinggi, 60 cm = lahan bisa terbakar. Ambang ini menyambung ke Modul Kanal
   (parit menurunkan muka air) dan Modul Bara (api masuk ke dalam gambut).
4. **Tahun ini adalah tahun El Niño sangat kuat** (H). Hujan September 2026
   di Kalbar tinggal ±38 % dari normalnya (117 dari 304 mm). Pembaca tidak
   perlu membayangkan 1997 atau 2015; yang dibahas modul sedang mereka alami.
   Catatan: Aldrian (D) menyebut sinyal El Niño di Wilayah B teredam secara
   rata-rata 1961–1993; data 2026 menunjukkan tahun ekstrem tetap bisa
   menekan hujan Kalbar. Di layar cukup ditulis apa adanya, tanpa
   mempertentangkan keduanya.

## 4. Keterbatasan

- Ambang 4 mm/hari (B) dan 305 mm/120 hari (C) diukur untuk **Kalimantan
  selatan**, bukan Kalbar barat laut; di modul harus disebut "di Kalimantan",
  bukan "di Pontianak".
- Field (2009) dan Field (2016) belum terbaca dalam teks lengkap. Angka dari
  keduanya diambil dari siaran pers resmi dan dari kutipan C; perlu dicek
  lewat perpustakaan sebelum masuk naskah Bab 2.
- F terbaca dari abstraknya saja; rincian stasiun Kubu Raya (desa, jenis
  lahan) belum terbaca.
- G adalah sumber terlemah (lihat §2). Data 2002–2011; belum mencakup 2015,
  2019, dan 2023.
- Angka 10× dan 14× (E) berlaku se-Borneo, bukan per provinsi.

## 5. Rancangan babak (usulan, 3 babak + kartu penutup)

Pola seragam dengan modul lain: hook, babak bertugas, kartu penutup. Setiap
aksi ditulis dulu kalimat "sesudah aksi ini pembaca tahu X".

**Hook.** "Setiap tahun asap datang di bulan yang sama. Kebetulan?" Lalu:
"September 2026, hujan di Kalbar hanya 117 mm dari normal 304 mm." (H)

**Diorama 3D.** Satu petak gambut di pinggir Pontianak dengan muka potong
(seperti Modul Kanal): permukaan rumput/semak, parit kecil, kolom gambut yang
memperlihatkan muka air tanah dengan garis **40 cm** dan **60 cm**. Di atasnya
langit dengan hujan, matahari, dan awan yang mengikuti bulan. Satu cincin
kalender 12 bulan menjadi pengendali waktu.

| Babak | Tugas pembaca | Yang berubah di diorama | Sesudahnya pembaca tahu | Sumber |
|---|---|---|---|---|
| 01 · Kalender Pontianak | Memutar kalender Januari → Desember | Hujan menebal dan menipis dua kali setahun; muka air sedikit turun Februari–Maret dan turun lebih dalam Agustus; titik api muncul sedikit di Agustus | Pontianak punya dua masa kering; yang berbahaya Agustus | D, G |
| 02 · Ambang | Menahan kemarau Agustus lebih lama (penggeser lama kemarau) | Muka air turun; sebelum garis 40 cm hampir tidak ada api; melewati 40 cm api mulai; di bawah 60 cm lahan terbakar dan api melonjak, tidak naik rata | Api tidak bertambah pelan; ia meledak setelah air melewati ambang | F (+ B, C untuk sifat nonlinier) |
| 03 · Tahun El Niño | Membandingkan tahun biasa vs tahun El Niño | Tahun El Niño: hujan Agustus–Oktober berkurang dan datang terlambat, muka air bertahan di bawah 60 cm lebih lama, api bertahan sampai hujan kembali | El Niño tidak menyalakan api; ia memperpanjang kemarau sehingga air gambut tinggal di bawah ambang | E, A, B |

**Kartu penutup**: "Asap Agustus bukan kebetulan: air gambut turun di bawah
40 cm. El Niño hanya membuatnya bertahan lebih lama." + tautan ke Modul Bara
(apa yang terjadi di bawah tanah) dan Modul Kanal (siapa yang menurunkan air).

### Yang sengaja tidak dibuat

- Grafik ONI/indeks El Niño, peta suhu laut Pasifik: benar secara ilmiah,
  tetapi tidak memberi pengetahuan "sebelum → sesudah" bagi pembaca 17 tahun.
- Angka jumlah titik api per tahun: berubah menurut satelit dan sulit
  dibandingkan; diganti dengan pola "sedikit → melonjak".

## 6. Model muka air (`lib/model/fireSeason.ts`)

Ditulis agar penguji dapat menghitung ulang setiap angka di layar.

### 6.1 Seri hujan Pontianak (mm/hari per dasarian)

Tabel normal resmi tidak tersedia (§2), jadi seri disusun dari patokan
bersumber. Nilai di antara patokan adalah **isian skematis**.

| Bulan | Dasarian 1 · 2 · 3 | Patokan |
|---|---|---|
| Jan | 9 · 8 · 6 | peralihan dari puncak Desember |
| Feb | **4** · **7** · **4** | G: kering < 5 mm/hari, pertengahan Februari 7 |
| Mar | **4,5** · **6** · **4,5** | G: kering sampai akhir Maret, pertengahan Maret 6 |
| Apr–Mei | 8 · 9 · 9,5 · 9,5 · 9 · 8,5 | D: puncak Maret–Mei |
| Jun–Jul | 7,5 · 7 · 6,5 · 6 · 6 · 5,5 | menurun menuju kemarau |
| Agu | **2** · **4** · 6 | G: kering tajam ±2 mm/hari awal Agustus, masa kering ±⅔ bulan |
| Sep | 9 · 10,5 · 10,9 | H: normal 304 mm = 10,1 mm/hari |
| Okt–Nov | 10,5 · 11 · 11,5 · 12 · 12 · 11 | D: puncak Oktober–November lebih tinggi |
| Des | 10,5 · 10 · 9,5 | peralihan |

Rata-rata seri 7,94 mm/hari, selisih 1,2 % dari 7,85 mm/hari (G). Diuji di
`lib/model/fireSeason.test.ts`.

### 6.2 Neraca air harian

| Besaran | Nilai | Sumber |
|---|---|---|
| Dasarian kering | hujan < 5 mm/hari | G (definisi masa kering) |
| Laju turun saat kering | 1,27 cm/hari | I (lahan berparit) |
| Penguapan | 1.553 / 365 = 4,25 mm/hari | J |
| Hasil jenis (*specific yield*) | 4,25 / 12,7 = **0,335** | **diturunkan** dari I dan J, karena I menyatakan laju turun itu semata karena penguapan |
| Batas kedalaman model | 100 cm | K: penguapan melemah di kedalaman ini; model berlaju tetap dihentikan |

Aturan per hari: dasarian kering → muka air turun 1,27 cm; dasarian basah →
naik (hujan − 4,25) / 0,335 mm; muka air tidak naik di atas permukaan.
Dijalankan dua tahun dan diambil tahun kedua agar keadaan 1 Januari tidak
ditebak. **Penyederhanaan:** pada dasarian kering hujan dianggap tidak
mengimbangi penguapan sama sekali, mengikuti I.

### 6.3 Tahun El Niño

Hujan Agustus–Oktober dikali 117/304 = 0,385 (H). Satu bulan pengamatan
diterapkan ke tiga bulan karena pengaruh El Niño paling kuat
September–November (D). **Ilustratif.**

### 6.4 Api

Golongan: < 40 cm aman, 40–60 cm bahaya tinggi, ≥ 60 cm terbakar (F).
Tingkat api untuk gambar: 0 di atas 40 cm, naik sampai 0,1 di 60 cm, lalu
melonjak menuju 1 (0,1 + 0,9 · (1 − e^−(d−60)/15)). Ambangnya bersumber; bentuk
kurvanya **ilustratif**, dengan perbandingan puncak 10 : 1 setara "hampir
10×" (E) dan sifat melonjak dari B.

### 6.5 Hasil model

| | Tahun biasa | Tahun El Niño |
|---|---|---|
| Terdalam Februari–Maret | ±36 cm (akhir Maret) | sama |
| Terdalam Agustus | ±25 cm | turun terus sampai batas 100 cm (pertengahan Oktober) |
| Hari di bawah 40 cm | 0 | 87 |
| Hari di bawah 60 cm | 0 | 62 |
| Hari terakhir di bawah 60 cm | — | 17 November |

Babak 02 berangkat dari ±25 cm (20 Agustus, tahun biasa): **12 hari** lagi
tanpa hujan mencapai 40 cm, **28 hari** mencapai 60 cm.

**Catatan jujur untuk naskah.** Menurut model, muka air tahun biasa justru
sedikit lebih dalam pada akhir Maret daripada Agustus, padahal titik api
Kalbar memuncak Agustus (G). Modul tidak menyembunyikannya: kebakaran besar
datang Agustus–Oktober karena **El Niño hanya menyentuh kemarau Agustus**
(D: pengaruhnya Juni–November), bukan Februari–Maret. Waktu pembakaran oleh
manusia (pembukaan lahan menjelang musim tanam) kemungkinan ikut menjelaskan
puncak Agustus; itu bahan Modul "Siapa yang Menyalakan?".

## 7. Keputusan

1. ✅ Pertanyaan modul (§1) dan tiga babak (§5) disetujui (19 November 2026).
2. ✅ Data BMKG dicari (19 November 2026): buletin resmi Oktober 2026 dipakai
   (H); tabel normal 12 bulan Supadio tidak tersedia terbuka, sehingga
   kalender bulanan tetap memakai D + G sampai tabel resmi didapat.
3. Ambang 40/60 cm (F) menjadi angka inti di layar Babak 02.
