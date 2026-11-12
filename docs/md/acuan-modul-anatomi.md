# Acuan Riset Modul 02 — Anatomi Gambut

> Nomor modul mengikuti susunan 13 modul (12 November 2026). Di dalam dokumen ini nomor lama mungkin masih muncul: dahulu Anatomi 01, Kanal 02, Bara 03, Karbon 04.

Dokumen ini mengganti dasar Modul 01 dari **perkiraan sendiri** menjadi **temuan
riset yang dapat ditelusuri**. Setiap tahap animasi diturunkan dari satu
bagian acuan: apa yang dikatakan riset, angka apa yang dipakai, lalu bagaimana
temuan itu diubah menjadi aksi dan animasi.

- Tanggal: 8 November 2026
- Berlaku untuk: Modul 01 (`/gambut/anatomi`)
- Modul lain menyusul, masing-masing dengan satu acuan utama

---

## 0. Pembaruan 11 November 2026: desain dipertahankan, acuan disesuaikan

Riza memutuskan desain Modul 01 dipertahankan, karena tampilannya sederhana
dan sudah menjelaskan gambut dengan baik. Yang dicari adalah acuan yang tepat
untuk desain itu. Bagian ini menggantikan butir 1–4 pada bagian 7 dan
keputusan A–B pada bagian 8.

### Acuan baru

| Peran | Karya | Status pembacaan |
|---|---|---|
| **Profil dan laju tumbuh, Kalimantan Barat** | Anshari, G. Z., Ruwaimana, M., Ritonga, R. P., Gangga, A., Loisel, J., Galego-Sala, A. V., van der Kaars, S., & Novita, N. (2026). Peatland inception and development across Kalimantan, Indonesia. *Scientific Reports*, 16, 5496. <https://doi.org/10.1038/s41598-026-35152-x> | Teks HTML dan Tabel 1–2 terbaca; lampiran (Gbr. S1) belum |
| Pembanding laju tumbuh | Dommain, R., Couwenberg, J., & Joosten, H. (2011). Development and carbon sequestration of tropical peat domes in south-east Asia. *Quaternary Science Reviews*, 30(7–8), 999–1010. <https://doi.org/10.1016/j.quascirev.2011.01.018> | Abstrak saja |
| Batas kandungan serat | Soil Survey Staff (2014). *Keys to Soil Taxonomy* (edisi ke-12). USDA-NRCS. | Dari kutipan sekunder; **cocokkan dengan teks Keys aslinya** |

Penulis utama Anshari adalah peneliti Jurusan Ilmu Tanah Universitas
Tanjungpura, Pontianak. Inti-intinya berasal dari Mempawah dan Kapuas Hilir,
jadi lebih dekat ke sasaran pengguna daripada data Sarawak dalam Andriesse.

### Klaim desain dan dasarnya

| Klaim di modul | Dasar | Catatan |
|---|---|---|
| Gambut tumbuh ± 1 mm/tahun; 2,8 m ≈ 2.800 tahun | Inti SF61: 682 cm, dasar 6.850–6.670 tahun kal. BP (Anshari dkk., 2026, Tabel 2) → ± 1,0 mm/tahun | Rata-rata seluruh inti. Lajunya tidak rata: 488–682 cm terbentuk relatif cepat. Kisaran Borneo 0,54–1,89 mm/tahun (Dommain dkk., 2011). Inti SBC1 di Mempawah: 853 cm, ± 7.300 tahun → ± 1,2 mm/tahun |
| Fibrik di atas, saprik di bawah | SF61: "gradually transitioned from less decomposed near the surface to more decomposed toward the base" (Anshari dkk., 2026) | Ditulis sebagai **satu contoh profil**, bukan aturan umum. Andriesse (1988, §4.2.3) dan Najiyati dkk. (2005) mencatat lapisan atas sering lebih matang, terutama di lahan yang dikeringkan |
| Tebal tiap lapisan (0,6 / 1,6 / 2,8 m) | Tidak ada | **Ilustrasi.** Artikel tidak membagi SF61 menjadi fibrik, hemik, dan saprik |
| Fibrik > 3/4, hemik 1/6–3/4, saprik < 1/6 serat (setelah digosok) | Soil Survey Staff (2014) | Sebelumnya fibrik "> 2/3". Literatur Indonesia menulisnya > 75%, 17–75%, < 17% |
| Pori ± 90% pada fibrik | Boelter (1974) dalam Andriesse (1988) | Tidak berubah |
| Batas 50 cm dan 0,4 m | PP 71/2014, PP 57/2016 | Tidak berubah |

Laju 1 mm/tahun juga dipakai Modul 02 dan 04 (`lib/carbon.ts`), jadi tidak ada
angka di modul lain yang ikut berubah. Laju akumulasi karbon SF61 menurut
artikel yang sama adalah 63 g C m⁻² tahun⁻¹, yang dapat dipakai saat Modul 04
ditinjau.

---

## 1. Acuan yang Dipakai

> **Andriesse, J. P. (1988).** *Nature and Management of Tropical Peat Soils.*
> FAO Soils Bulletin 59. Roma: Food and Agriculture Organization of the United
> Nations. ISBN 92-5-102657-2.
> Teks lengkap: <https://www.fao.org/4/x5872e/x5872e00.htm>

### Alasan memilih acuan ini

| Pertimbangan | Keterangan |
|---|---|
| Diterbitkan lembaga dunia | FAO adalah badan PBB untuk pangan dan pertanian. Buletin ini menjadi rujukan baku tentang tanah gambut tropis. |
| Mencakup keempat tahap | Bab 3 tentang pembentukan, Bab 4 tentang sifat fisik dan air, Bab 5 tentang klasifikasi fibrik–hemik–saprik, Bab 7 tentang pengeringan dan penurunan tanah. Satu acuan cukup untuk satu modul utuh. |
| Data dari wilayah kita | Banyak data diambil dari Sarawak, Kalimantan Tengah, dan Kalimantan Barat, yang termasuk pulau yang sama dengan Pontianak. |
| Teks lengkap terbuka | Dosen penguji dapat membuka dan memeriksa setiap kutipan tanpa akses berbayar. |

### Batas acuan ini (perlu ditulis jujur di naskah)

- Terbit tahun 1988. Angka luas dan karbon sudah usang, tetapi Modul 01 tidak
  memakai keduanya. Sifat fisik gambut tidak berubah sejak saat itu.
- Sebagian angka adalah **data sekunder**, yaitu kutipan Andriesse atas
  peneliti lain (Anderson 1964, Driessen & Rochimah 1976, Soil Taxonomy).
  Saat dikutip di naskah, tuliskan sumber aslinya juga, mis. "Anderson (1964)
  dalam Andriesse (1988)".
- Sebagian tabel berasal dari gambut iklim sedang (Eropa, Amerika Serikat).
  Bila angka seperti itu dipakai, hal ini dinyatakan pada tempatnya.

---

## 2. Cara Mengubah Riset Menjadi Animasi

Setiap tahap mengikuti empat langkah yang sama:

```
TEMUAN RISET          →  BESARAN           →  AKSI PEMBACA        →  ANIMASI & AKIBAT
(kutipan + bagian)       (angka, satuan)      (yang ia kerjakan)     (yang ia lihat berubah)
```

Aturannya: **tidak ada gerak di layar yang tidak bersumber dari kolom pertama.**
Bila suatu gerak dibutuhkan demi keterbacaan tetapi tidak ada di riset
(mis. warna, kecepatan kamera), gerak itu boleh ada asalkan tidak
menyampaikan klaim ilmiah.

---

## 3. Tahap 1 — Hutan di Atas Spons: Bagaimana Gambut Terbentuk

### Yang dikatakan riset (Bab 3)

1. **Syarat terbentuknya gambut.** "For peat to form it is essential that the
   production of biomass is greater than its chemical breakdown." Penguraian
   tertahan karena keadaan **anaerob** akibat genangan (§3.1).
2. **Neraca air.** Gambut mulai tumbuh bila
   `INFLOW + PRECIPITATION = OUTFLOW + EVAPOTRANSPIRATION + RETENTION`
   (Moore & Bellamy 1974, §3.2.1).
3. **Tiga tahap tumbuh** (§3.2.1, §3.3):
   - **Gambut primer**: mengisi cekungan, masih disuplai air sungai/tanah.
   - **Gambut sekunder**: tumbuh melewati tepi cekungan.
   - **Gambut tersier**: naik di atas muka air tanah regional dan membentuk
     **kubah** dengan muka air sendiri yang **hanya diisi hujan**
     (*perched water-table fed only by precipitation*).
   Tahap awal disebut **topogen**, tahap akhir **ombrogen**.
4. **Hara makin miskin ke atas.** Saat permukaan kubah naik, akar tidak lagi
   mencapai tanah mineral dan air sungai tidak masuk, sehingga hara makin
   sedikit dan vegetasi makin miskin jenis (§3.2.2). Di pesisir Sarawak,
   urutannya mangrove → hutan rawa air tawar → tegakan tunggal *Shorea albida*
   di puncak kubah (§3.4).
5. **Laju tumbuh melambat seiring tahap.** Dari data Anderson (1964) di
   Sarawak: lapisan terdalam (4.300 tahun) tumbuh **1 m per 214 tahun**,
   lapisan berumur 3.900 tahun **1 m per 333 tahun**, dan 2.300 tahun
   terakhir **1 m per 455 tahun**. Gambut tropis tumbuh "at least 3 times as
   fast" dibanding iklim sedang, yang rata-ratanya 1 m per 1.500 tahun (§3.4).
6. **Umur.** "Most peats in the tropics are also less than 10 000 years old.
   Coastal peats in South East Asia are generally less than 6 000 years old"
   (§3.2.1).

### Besaran yang dipakai

| Besaran | Nilai | Sumber |
|---|---|---|
| Laju tumbuh fase awal | 1 m / 214 tahun ≈ 4,7 mm/tahun | Anderson 1964 dalam Andriesse 1988, §3.4 |
| Laju tumbuh fase tengah | 1 m / 333 tahun ≈ 3,0 mm/tahun | idem |
| Laju tumbuh fase akhir | 1 m / 455 tahun ≈ 2,2 mm/tahun | idem |
| Umur gambut pesisir Asia Tenggara | < 6.000 tahun | §3.2.1 |
| Batas tebal lahan gambut | ≥ 50 cm | PP 71/2014 (aturan nasional, tetap dipakai) |

### Konversi ke animasi

| | |
|---|---|
| **A1 Ajakan** | "Seret waktu dan lihat rawa ini menimbun dirinya sendiri." |
| **A2 Aksi** | Pengatur waktu (tingkat 2) |
| **A3 Animasi** | Penampang lanskap: cekungan di antara dua tanggul sungai. Serasah jatuh dan tertimbun. Gambut mengisi cekungan (primer), meluap melewati tepi (sekunder), lalu menggembung menjadi kubah (tersier). **Panah air berubah**: mula-mula air masuk dari sungai dan hujan, akhirnya hanya hujan. Pohon di puncak kubah makin jarang dan seragam. **Pertumbuhan terlihat melambat**: seretan yang sama panjangnya menambah tebal makin sedikit. |
| **A4 Akibat** | Penanda "50 cm, sah disebut gambut" dilewati. Label sumber air berganti dari *topogen* ke *ombrogen*. |
| **A5 Angka** | "1 m per 214 tahun di awal, 1 m per 455 tahun di akhir." |
| **Syarat lanjut** | Kubah mencapai tahap ombrogen (dibaca dari keadaan model, bukan dari posisi pengatur). |

**Pelajaran yang didapat dari yang dilihat:** gambut bukan tanah yang
"ditaruh"; ia tumbuh sendiri, makin lama makin lambat, dan pada akhirnya hanya
bergantung pada hujan. Fakta terakhir inilah yang membuat kanal (Modul 02)
begitu merusak.

---

## 4. Tahap 2 — Lapis demi Lapis: Mengenali Kematangan

### Yang dikatakan riset (Bab 5, §5.6; Tabel 17 dari Soil Taxonomy)

| Sifat | Fibrik | Hemik | Saprik |
|---|---|---|---|
| Kandungan serat (sebelum digosok) | > 2/3 volume | 1/3 – 2/3 volume | < 1/3 volume |
| Bobot isi (g/cm³) | < 0,1 | 0,07 – 0,18 | > 0,2 |
| Air saat jenuh (% bobot kering) | 850 – > 3.000 | 450 – 850 | < 450 |
| Warna | coklat kekuningan muda / coklat kemerahan | coklat keabuan gelap s.d. coklat kemerahan gelap | abu-abu sangat gelap s.d. hitam |

**Cara lapangan menentukan kematangan** (§5.6.1): "rubbing a small volume of
wet material between thumb and fingers about ten times with firm pressure",
lalu serat yang tersisa diperiksa dengan kaca pembesar 10×. Serat didefinisikan
sebagai potongan jaringan tumbuhan yang tertahan saringan 100 mesh (0,15 mm).

**Urutan lapisan di alam.** Andriesse mencatat bahwa pada kebanyakan gambut
tropis alami, "surface layers are generally more sapric than subsurface
layers" karena iklim, muka air yang naik-turun, dan oksidasi (§4.2.3). Jadi
urutan *fibrik di atas, saprik di bawah* **bukan aturan umum** untuk gambut
tropis.

### Konversi ke animasi

| | |
|---|---|
| **A1 Ajakan** | "Ambil contoh dari satu lapisan, lalu gosok sepuluh kali." |
| **A2 Aksi** | Klik lapisan untuk mengambil contoh (tingkat 3), lalu **seret bolak-balik** di atas contoh itu (tingkat 4). Setiap seretan dihitung satu gosokan. |
| **A3 Animasi** | Contoh tanah di antara dua jari. Serat yang lemah putus dan larut di tiap gosokan; serat kuat tetap tinggal. Bilah "serat tersisa" turun sampai berhenti. |
| **A4 Akibat** | Setelah sepuluh gosokan, contoh tergolong fibrik, hemik, atau saprik menurut ambang Tabel 17. Kartu lapisan terbuka dengan bobot isi, kadar air jenuh, dan warnanya. |
| **A5 Angka** | "> 2/3 serat = fibrik · < 1/3 serat = saprik" |
| **Syarat lanjut** | Dua lapisan berbeda sudah digosok, sehingga pembaca membandingkan sendiri. |

**Pelajaran:** kematangan tidak ditebak dari letak lapisan, tetapi diuji dari
seratnya. Ini cara yang sama yang dipakai peneliti di lapangan.

---

## 5. Tahap 3 — Menyimpan Air: Spons yang Bisa Diukur

### Yang dikatakan riset (Bab 4 dan Tabel 16)

1. **Pori.** "Fibric peats in their normal state commonly have a total
   porosity of 90 percent by volume, whereas sapric materials commonly have
   less than 85 percent pores" (Boelter 1974, §4.2.4). Data Indonesia
   (Driessen & Rochimah 1976, Tabel 10): bobot isi 0,10 g/cm³ → pori
   **92–93%**, sedangkan 0,25 g/cm³ → pori **81–83%**.
2. **Daya tampung air.** Fibrik menahan 850 sampai lebih dari 3.000% bobot
   keringnya; saprik kurang dari 450% (Tabel 17). Artinya **1 kg fibrik kering
   dapat menahan 8,5 sampai lebih dari 30 kg air**.
3. **Uji peras von Post** (Tabel 16): gambut yang belum terurai (H1–H2), bila
   diperas, mengeluarkan air jernih atau kekuningan. Makin terurai, air makin
   keruh dan gelap. Pada H6 sepertiga gambut lolos di sela jari, pada H8 dua
   pertiganya, dan pada H10 seluruhnya.

### Konversi ke animasi

| | |
|---|---|
| **A1 Ajakan** | "Tekan dan tahan untuk memeras contoh gambut." |
| **A2 Aksi** | Tekan-tahan pada contoh (tingkat 3). Pembaca memilih contoh dari lapisan yang ia gosok di Tahap 2. |
| **A3 Animasi** | Air menetes ke gelas ukur. Banyaknya air mengikuti Tabel 17; **warnanya** mengikuti skala von Post (jernih → coklat keruh → pekat). Pada contoh yang matang, sebagian gambut ikut lolos di sela jari. Timbangan di samping menunjukkan bobot air dibanding bobot kering. |
| **A4 Akibat** | Contoh yang diperas menjadi kering dan menyusut; contoh itu tidak dapat dipakai lagi pada sesi ini. |
| **A5 Angka** | "1 kg gambut fibrik kering menahan 8,5 – 30 kg air · pori ± 90% volume" |
| **Syarat lanjut** | Dua contoh berbeda sudah diperas sehingga perbedaan jumlah dan warna airnya terlihat. |

**Catatan:** padanan skala von Post (H1–H10) dengan fibrik/hemik/saprik
**tidak dinyatakan langsung** oleh Andriesse. Sebelum dipakai, padanan itu
perlu acuan tambahan. Bila tidak ditemukan, animasi hanya memakai warna air
umum (jernih untuk serat utuh, gelap untuk yang hancur), sesuai uraian
Tabel 16, tanpa menyebut nomor H.

---

## 6. Tahap 4 — Saat Air Surut: Kering yang Tidak Kembali

### Yang dikatakan riset (Bab 4 §4.2.7, Bab 7, Bab 8)

1. **Oksidasi.** "Waterlogged and anaerobic peat in the natural swamp becomes
   aerobic when drained. The aerobic conditions lead to biological oxidation"
   (§7.3.1).
2. **Kering tak balik** (*irreversible drying*). Setelah kering di bawah
   matahari, lapisan atas "become rather like coffee grounds, and are very
   difficult to re-wet". Daya tahan airnya dapat turun **40–75%** (data
   gambut AS, §4.2.7). Penyusutan contoh dari Tamban, Kalimantan Tengah:
   **67–85% volume** (Tabel 11).
3. **Kehilangan cepat.** "30 cm of peat which took 400 years to develop can
   easily be destroyed in less than 10 years because of injudicious drainage"
   (§7.4).
4. **Batas ± 40 cm.** Di Belanda, muka air sekitar 40 cm "has been maintained
   for centuries which has minimized the rate of subsidence" (§8.2.2). Ini
   sejalan dengan batas **0,4 m** pada **PP 57/2016**.
5. **Api.** Pembakaran saat membuka lahan "can lead to intensive peat fires
   when not properly controlled. Controlling peat fires is extremely
   difficult" (§7.2.3). Kalimat ini menjadi jembatan ke Modul 03.

### Konversi ke animasi

| | |
|---|---|
| **A1 Ajakan** | "Turunkan muka air, lalu coba naikkan lagi." |
| **A2 Aksi** | Pengatur muka air 0–100 cm (tingkat 2), digeser turun lalu naik. |
| **A3 Animasi** | Bagian di atas muka air berubah dari basah mengilap menjadi butiran seperti ampas kopi dan menyusut. Saat pengatur dinaikkan kembali, **lapisan bawah basah lagi, tetapi lapisan atas yang sudah jadi butiran tetap kering dan lebih rendah.** |
| **A4 Akibat** | **Tak terbalik.** Jejak tinggi permukaan awal tertinggal sebagai garis putus-putus. Status berubah menjadi "rawan terbakar" setelah melewati 40 cm. |
| **A5 Angka** | "30 cm gambut: 400 tahun terbentuk, < 10 tahun hilang" dan "0,4 m, batas muka air (PP 57/2016)" |
| **Syarat lanjut** | Pembaca sudah menurunkan muka air melewati 40 cm **dan** menaikkannya kembali, sehingga ia melihat bagian yang tidak pulih. |

**Pelajaran:** air dapat dikembalikan, tetapi gambut yang sudah kering tidak.
Pembaca menemukannya sendiri karena **ia sendiri yang mencoba membatalkan**.
Kalimat ini juga menyiapkan pesan penutup Modul 02.

**Catatan:** angka "400 tahun → < 10 tahun" berasal dari kajian radiokarbon
umum di Bab 7, bukan khusus Sarawak, sehingga lajunya (± 0,75 mm/tahun) tidak
sama dengan laju di Tahap 1. Di layar, angka ini disajikan sebagai kutipan
utuh, bukan dihitung ulang dari model Tahap 1.

---

## 7. Isi Modul 01 Sekarang yang Bertentangan dengan Acuan

Hasil pemeriksaan `lib/peat.ts` dan `config/gambut-content.ts` terhadap
Andriesse (1988):

| # | Keadaan sekarang | Kata acuan | Tindakan |
|---|---|---|---|
| 1 | Laju tumbuh tetap **1 mm/tahun**; 2,8 m gambut = **2.800 tahun** (`PEAT_GROWTH_MM_PER_YEAR`) | Gambut tropis Sarawak 2,2–4,7 mm/tahun dan **melambat** seiring tahap; 1 mm/tahun lebih dekat ke gambut iklim sedang | Ganti dengan tiga fase laju dari Anderson (1964). Dengan cara itu 2,8 m tercapai dalam **± 900 tahun** (1 m × 214 + 1 m × 333 + 0,8 m × 455 tahun; penyederhanaan sendiri dari angka acuan) |
| 2 | Komentar kode: "Di gambut tropis laju ini berkisar 0,5–2 mm/tahun" | Tidak ada di acuan | Hapus, ganti dengan kutipan Andriesse |
| 3 | Urutan tetap fibrik (atas) → hemik → saprik (bawah); `getDeepestLayer` menyatakan "kematangan ditentukan oleh kedalaman timbunan" | Pada gambut tropis alami, lapisan **atas umumnya lebih saprik** (§4.2.3) | Profil diberi label *contoh satu profil* dan klaim "makin ke bawah makin matang" dihapus dari teks. Lihat keputusan B |
| 4 | Ambang serat: hemik **1/6–2/3**, saprik **< 1/6** | Tabel 17: hemik **1/3–2/3**, saprik **< 1/3** (sebelum digosok) | Samakan dengan Tabel 17, dan tulis "sebelum digosok" |
| 5 | "± 90% bagian volume gambut alami yang berupa air", berlaku untuk semua lapisan | 90% berlaku untuk **fibrik**; saprik < 85% | Tulis "± 90% pada gambut fibrik" |
| 6 | Tahap 3 tidak menuntut aksi (`STEP_FREE`) | — | Diganti uji peras (bagian 5) |
| 7 | Tahap 4 hanya pengatur bolak-balik tanpa akibat tetap | Kering tak balik (§4.2.7) | Tambahkan lapisan yang tidak pulih (bagian 6) |
| 8 | Batas ≥ 50 cm (PP 71/2014) dan 0,4 m (PP 57/2016) | Tidak bertentangan; 40 cm didukung §8.2.2 | **Tetap** |

---

## 8. Keputusan yang Perlu Diambil Sebelum Menulis Kode

**A. Laju tumbuh di Tahap 1**

- **A1 (disarankan): tiga fase Anderson (1964).** Sesuai acuan, dan
  perlambatannya sendiri adalah temuan yang dapat dilihat pembaca.
- A2: satu laju rata-rata tetap, ± 3 mm/tahun. Lebih sederhana, tetapi
  membuang temuan perlambatan.

**B. Urutan lapisan di Tahap 2**

- **B1 (disarankan): pertahankan tiga lapisan sebagai satu contoh profil**,
  tetapi kematangan setiap lapisan diketahui pembaca lewat uji gosok, bukan
  dari letaknya. Teks tidak lagi menyatakan bahwa urutan itu berlaku umum.
- B2: balik urutan menjadi saprik di atas. Lebih dekat ke §4.2.3, tetapi
  bongkahan 3D Modul 01–04 harus diubah semuanya.

**C. Panggung Tahap 1.** Kubah gambut hanya terlihat pada penampang
lanskap selebar ratusan meter, bukan pada bongkahan 4,4 m. Tahap 1 perlu
gambar penampang tersendiri sebelum kamera mendekat ke bongkahan pada Tahap 2.

---

## 9. Daftar Kutipan untuk Naskah

| Dipakai di | Kutip sebagai |
|---|---|
| Tahap 1: tiga tahap tumbuh, kubah ombrogen | Moore & Bellamy (1974) dalam Andriesse (1988), §3.2–3.3 |
| Tahap 1: laju tumbuh Sarawak | Anderson (1964) dalam Andriesse (1988), §3.4 |
| Tahap 1: umur < 6.000 tahun | Andriesse (1988), §3.2.1 |
| Tahap 2: ambang serat, bobot isi, air jenuh, warna | Soil Survey Staff (1975) dalam Andriesse (1988), Tabel 17 |
| Tahap 2: uji gosok sepuluh kali | Andriesse (1988), §5.6.1 |
| Tahap 2: lapisan atas lebih saprik | Andriesse (1988), §4.2.3 |
| Tahap 3: pori 90% / < 85% | Boelter (1974) dalam Andriesse (1988), §4.2.4 |
| Tahap 3: pori gambut Indonesia | Driessen & Rochimah (1976) dalam Andriesse (1988), Tabel 10 |
| Tahap 3: uji peras von Post | Ekono (1981) dalam Andriesse (1988), Tabel 16 |
| Tahap 4: kering tak balik | Andriesse (1988), §4.2.7; Driessen & Suhardjo (1976), Tabel 11 |
| Tahap 4: 400 tahun → < 10 tahun | Andriesse (1988), §7.4 |
| Tahap 4: muka air ± 40 cm | Andriesse (1988), §8.2.2; PP 57/2016 |
| Pembuka: "sebagian besar isinya air" | Boelter (1974) dalam Andriesse (1988), §4.2.4; Driessen & Rochimah (1976), Tabel 10 |
| Kartu hasil: 400 tahun → < 10 tahun, batas 40 cm | Andriesse (1988), §7.4; PP 57/2016 |
