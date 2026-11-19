# Papan Cerita (Storyboard) Emberguard

Dokumen ini menetapkan **alur cerita seluruh situs** dan **isi tiap babak**.
Dokumen acuan (`docs/md/acuan-modul-<nama>.md`) mengatur **isi ilmiahnya**;
dokumen ini mengatur **bentuk interaksinya**.

- Disusun 30 September 2026; direvisi 8, 13, dan 19 November 2026
  (19 November: disusun ulang per modul mengikuti urutan situs, isi
  disamakan dengan yang sudah dibangun, Modul Musim Api ditambahkan).
- Berlaku untuk seluruh modul, Simulasi, dan Kuis.
- Modul disebut dengan **namanya**. Nomor dihitung otomatis dari
  `config/modules-content.ts` dan berubah bila ada modul baru.

**Cara membaca:** bagian 1–2 sekali saja (alur dan aturan). Bagian 3 adalah
isi tiap modul dengan templat yang sama. Bagian 4–6 untuk pemrograman dan
naskah skripsi.

---

## Daftar Isi

1. [Alur cerita situs](#1-alur-cerita-situs)
2. [Aturan merancang babak](#2-aturan-merancang-babak)
3. [Storyboard tiap modul](#3-storyboard-tiap-modul)
4. [Simulasi dan Kuis](#4-simulasi-dan-kuis)
5. [Untuk pemrograman](#5-untuk-pemrograman)
6. [Untuk naskah skripsi](#6-untuk-naskah-skripsi)
7. [Urutan pengerjaan](#7-urutan-pengerjaan)

---

## 1. Alur cerita situs

Navigasi: **Beranda · Modul · Simulasi · Kuis**. Alurnya satu:
**kenali → saksikan → tanggung akibatnya → cegah → kendalikan → uji diri.**

```
BERANDA  "Sebelum bara menjadi bencana"
   │     Aksi: gerakkan kursor, hutan sehat tersingkap menjadi hutan terbakar
   ▼
MODUL  13 modul dalam 5 bagian
   │
   ├─ 1 · Gambut      Gambut di Sekitarmu    di mana gambut itu          ✅
   │                  Anatomi Gambut         apa itu gambut              ✅
   │                  Hutan Rawa Gambut      apa yang hidup di atasnya   ✅
   │
   ├─ 2 · Kering      Kanal & Pengeringan    mengapa jadi kering         ✅
   │                  Musim Api              kapan paling rawan          ✅
   │
   ├─ 3 · Api         Siapa yang Menyalakan? dari mana apinya            ⏳
   │                  Bara di Bawah Tanah    bagaimana ia terbakar       ✅
   │
   ├─ 4 · Dampak      Gudang Karbon          apa yang lepas ke udara     ✅
   │                  Kabut Asap             apa yang kita hirup         ⏳
   │                  Yang Hilang dari Hutan apa yang tidak kembali      ⏳
   │
   └─ 5 · Mencegah    Membasahi Kembali      sekat kanal, sumur bor      ⏳
                      Tanpa Api              membuka lahan tanpa bakar   ⏳
                      Saat Tanah Berasap     pilihan tindakan warga      ⏳
   │
   │   + cek singkat 3–4 soal di akhir tiap bagian
   ▼
SIMULASI  satu lanskap, api nyata, sumber daya terbatas        [ kendalikan ]
   ▼
KUIS      mencakup kelima bagian; hasil bisa dibagikan         [ uji diri ]
```

✅ dibangun · 📝 acuan disetujui, belum dibangun · ⏳ belum ada acuan

**Mengapa urutannya begini.** Tiap modul menjawab satu pertanyaan dan hanya
memakai pengetahuan dari modul sebelumnya. Urutannya mengikuti rantai
sebab-akibat di lapangan: gambut alami basah → dikeringkan kanal dan kemarau
→ disulut → membara → karbon dan asap lepas → dicegah. Simulasi diletakkan
sesudah semua modul karena ia **menguji**, bukan mengajar.

---

## 2. Aturan merancang babak

### 2.1 Dari riset ke animasi

```
TEMUAN RISET  →  BESARAN  →  AKSI PEMBACA  →  ANIMASI & AKIBAT
(dok. acuan)     (angka)     (yang dilakukan)  (yang terlihat berubah)
```

Temuan ditulis dulu di dokumen acuan beserta sumbernya. Sesudah itu baru
dipikirkan aksi yang membuat pembaca **menemukan sendiri** temuan itu. Gerak
yang hanya membantu keterbacaan (warna, kamera) boleh ada asal tidak
menyampaikan klaim ilmiah.

### 2.2 Aksi harus membawa ilmu

> Setiap aksi harus membawa **satu pengetahuan inti modul**. Aksi yang tidak
> membawa pengetahuan lebih baik tidak ada.

Sebelum mengusulkan aksi, tulis kalimat: *"sesudah aksi ini pembaca tahu X
yang sebelumnya tidak ia tahu"*, dan X harus bagian tema modul. Bila tidak
bisa, babak itu berupa penjelasan saja. Prinsip ini **mendahului** aturan
2.3–2.5 bila keduanya berbenturan. Contoh: uji peras di Modul Anatomi sempat
dipasang demi Pola 5A, lalu dicabut (11 November 2026) karena tidak memberi
perbedaan berarti sebelum dan sesudahnya.

### 2.3 Pola 5A

> Setiap babak punya satu aksi pembaca yang menghasilkan animasi, dan
> animasi itu mengubah keadaan yang terlihat.

| | Unsur | Pertanyaan pemeriksa | Contoh (Bara, Babak 01) |
|---|---|---|---|
| **A1** | Ajakan | Apa yang diminta dari pembaca, dalam satu kalimat? | "Pilih cara api membakar, lalu klik permukaan gambut." |
| **A2** | Aksi | Apa yang pembaca lakukan dengan tangannya? | Memilih kartu, lalu mengeklik titik di permukaan 3D |
| **A3** | Animasi | Apa yang bergerak sebagai jawaban? | Nyala muncul di titik klik, meredup, menjadi bara |
| **A4** | Akibat | Keadaan apa yang berubah dan tetap berubah? | Ada sel membara yang tidak bisa dibatalkan |
| **A5** | Angka | Fakta terukur apa yang muncul? | "Api harus menahan panasnya 1–2 jam di satu titik" |

### 2.4 Uji kelayakan satu babak

1. **Uji hapus-aksi:** bila aksinya dihapus dan animasi berjalan sendiri,
   apakah babak masih berarti? Kalau ya, babak itu baru video.
2. **Uji balik:** bisakah aksi diulang dengan nilai berbeda dan hasilnya
   berbeda? Kalau tidak, itu tombol, bukan kendali.
3. **Uji pelajaran:** jawaban "apa yang baru kamu pelajari?" datang dari
   **yang terlihat terjadi**, bukan dari teks yang dibaca.
4. **Uji acuan:** setiap gerak yang menyampaikan klaim ilmiah dan setiap
   angka A5 dapat ditunjuk sumbernya di dokumen acuan.

### 2.5 Tingkatan aksi

| Tingkat | Bentuk | Kekuatan | Pakai untuk |
|---|---|---|---|
| 0 | Gulir halaman | Bukan aksi, hanya laju baca | Jangan dipakai sendirian |
| 1 | Tombol / ganti tampilan | Lemah, dua keadaan | Pembanding (mis. permukaan ↔ termal) |
| 2 | Pengatur geser | Kuat, pembaca menemukan ambang | Besaran bersinambung: muka air, waktu |
| 3 | Menunjuk / mengeklik objek 3D | Kuat, pembaca memilih tempat | Memeriksa, menyulut, menempatkan |
| 4 | Menyeret / menggambar di adegan | Paling kuat | Menggali, menggosok |
| 5 | Mengelola waktu dengan akibat tak terbalik | Paling kuat | Menjalankan waktu, kehilangan permanen |

Disarankan: satu modul memakai sekurang-kurangnya dua tingkat berbeda, dan
dua babak berurutan tidak memakai tingkat yang sama, **selama tidak
melanggar 2.2**.

### 2.6 Pola seragam satu modul

Semua modul memakai kerangka yang sama (`components/modul/shared/`):

1. **Hook:** satu layar pembuka, kalimat pemancing + pertanyaan modul.
2. **3–4 babak**, jumlahnya mengikuti isi riset. Babak berikutnya terbuka
   **hanya setelah tugasnya selesai**, dibaca dari keadaan simulasi.
3. **Kartu penutup:** ringkasan satu kalimat + kartu hasil yang bisa
   dibagikan ke media sosial.

Tiga kekuatan yang ditiru dari Modul Bara: **babak terkunci**, **pembaca
dibuat salah dulu** (menyiram, merasa berhasil, lalu termal membongkarnya),
dan **akibat tak terbalik** (gambut yang jadi abu tidak kembali).

Aturan tampilan: panel dan kotak **tidak boleh bergulir**, isi diringkas bila
ruang kurang. Laptop adalah tampilan utama; ponsel mendapat versi sederhana
yang alurnya tetap utuh.

---

## 3. Storyboard tiap modul

Templat yang sama untuk setiap modul:

> **Hook** (layar pembuka) · **Pertanyaan** modul (dari dokumen acuan) ·
> **Sebelum → sesudah** · **Acuan** · **Panggung** · tabel babak · **Penutup**

Kolom tabel: **Tugas** = A1 + A2 (kalimat tugas di layar), **Yang terlihat**
= A3 + A4, **Angka** = A5. Isi modul yang sudah dibangun disalin dari
`config/modul/<nama>.ts`.

---

### Bagian 1 · Gambut

#### 3.1 Gambut di Sekitarmu ✅

`/modul/sekitarmu` · acuan: `acuan-modul-sekitarmu.md`

- **Hook:** "Kebakaran gambut sering terdengar jauh, di pedalaman Kalimantan." → "Seberapa jauh, sebenarnya?"
- **Pertanyaan:** Apakah gambut itu jauh di pedalaman, atau di bawah kota
  kita sendiri?
- **Sebelum → sesudah:** *kebakaran gambut terjadi jauh di pedalaman* →
  *sebagian Kota Pontianak berdiri di atas gambut setebal meteran, dan sudah
  terbakar hampir tiap tahun.*
- **Acuan:** Parabi dkk. (2026); Anda dkk. (2021); Fajania dkk. (2021);
  Rahsia dkk. (2020).
- **Panggung:** peta 2D berlapis dengan citra satelit Sentinel-2 (EOX, 2024),
  batas kecamatan, dan sungai.

| Babak | Tugas | Yang terlihat | Angka |
|---|---|---|---|
| 01 Seluas apa | Geser *Perbesar* peta sampai ke Kota Pontianak | Peta mendekat dari Indonesia ke Kalbar ke Pontianak | 13,43 juta ha gambut Indonesia (Anda dkk., 2021) |
| 02 Di kecamatan mana | Tebak kecamatan yang berdiri di atas gambut, lalu *Periksa* | Tebakan dibuka bertahap; gambut hanya di Pontianak Utara dan Tenggara | 23,1 km² gambut Kota Pontianak (Parabi dkk., 2026) |
| 03 Sedalam apa | Tekan ketiga titik bor | Kolom bor turun, dibandingkan tumpukan orang 1,7 m | 3–15 m di sekitar Jl. Reformasi Untan (Fajania dkk., 2021) |
| 04 Pernah terbakar | Tekan kedua titik api | Titik api menyala di peta | Terbakar hampir tiap tahun (Rahsia dkk., 2020) |

**Penutup:** gambut bukan cerita pedalaman; ia ada di bawah kota pembaca.

#### 3.2 Anatomi Gambut ✅

`/modul/anatomi` · acuan: `acuan-modul-anatomi.md` (bagian 0)

- **Hook:** "Tanah ini sebagian besar isinya air." → "Kok bisa terbakar?"
- **Pertanyaan:** Gambut itu sebenarnya apa, dan mengapa ia bisa terbakar?
- **Sebelum → sesudah:** *gambut adalah tanah hitam biasa* → *gambut adalah
  tumpukan sisa tumbuhan yang ±90 % volumenya air; bila airnya turun, ia
  menjadi bahan bakar.*
- **Acuan:** Anshari dkk. (2026), inti SF61 Kapuas Hilir; Andriesse (1988),
  FAO Soils Bulletin 59; Soil Survey Staff (2014).
- **Panggung:** bongkahan gambut 3D dengan muka potong; tahap berpindah
  mengikuti gulir.

| Tahap | Tugas | Yang terlihat | Angka |
|---|---|---|---|
| 1 Hutan di atas spons | Seret pengatur waktu | Gambut menumpuk sedikit demi sedikit | ≥ 50 cm, tebal minimum gambut (PP 71/2014) |
| 2 Lapis demi lapis | Klik satu lapisan | Lapisan diperbesar: fibrik, hemik, saprik | 3 tingkat kematangan |
| 3 Menyimpan air | *(penjelasan, tanpa aksi, lihat 2.2)* | Pori terisi air | ± 90 % volume fibrik berupa pori (Boelter 1974, dlm. Andriesse 1988) |
| 4 Saat air surut | Geser muka air turun | Gambut di atas air mengering, status berubah aman → rawan | 0,4 m, batas muka air (PP 57/2016) |

**Penutup:** kartu hasil menurut muka air yang dipilih pembaca.

#### 3.3 Hutan Rawa Gambut ✅

`/modul/hutan-rawa` · acuan: `acuan-modul-hutan-rawa.md`

- **Hook:** "Dari luar, hutan rawa gambut tampak seperti hutan yang sama di mana-mana." → "Benarkah begitu?"
- **Pertanyaan:** Apa yang tumbuh di atas gambut, dan mengapa hutan dan
  gambutnya saling bergantung?
- **Sebelum → sesudah:** *hutan rawa adalah satu hutan yang seragam* →
  *bentuk hutan mengikuti tebal gambut, hutan itulah yang membuat gambut, dan
  keduanya hanya bertahan selama airnya terjaga.*
- **Acuan:** Page dkk. (1999); Husson dkk. (2018), Sebangau.
- **Panggung:** diorama 3D kubah gambut dari tepi sungai sampai puncak,
  pejalan 1,7 m, pengukur kolom di muka potong.

| Babak | Tugas | Yang terlihat | Angka |
|---|---|---|---|
| 01 Berjalan ke tengah kubah | Geser *Langkah* dari tepi sungai ke puncak kubah | Gambut menebal, hutan berganti jenis, zona disorot | 45 m pohon tertinggi di atas gambut 10–13 m (Husson dkk., 2018) |
| 02 Hidup dari hujan | Coba *Banjir sungai*, lalu *Hujan* | Banjir berhenti di lereng; hujan meresap sampai puncak | 15–25 m tinggi kanopi (Page dkk., 1999) |
| 03 Rumah bagi siapa | Tekan ketiga jenis hutan | Satwa per zona (orangutan, owa) | 46 jenis terancam punah global (Husson dkk., 2018) |

**Penutup:** hutan dan gambut saling bergantung pada air. Tindakan
pencegahan bagi warga menyusul saat Bagian Mencegah dikerjakan.

---

### Bagian 2 · Kering

#### 3.4 Kanal & Pengeringan ✅

`/modul/kanal` · acuan: `acuan-modul-kanal.md`

- **Hook:** "Parit di sekitar rumahmu terus mengalirkan air, bahkan di musim kemarau." → "Dari mana air itu datang?"
- **Pertanyaan:** Bagaimana parit membuat lahan basah menjadi kering dan
  rawan terbakar?
- **Sebelum → sesudah:** *kanal hanya mengeringkan tepinya* → *satu kanal
  mengeringkan lahan sampai ratusan meter, tanahnya melesak, dan yang bisa
  dikembalikan hanya airnya.*
- **Acuan:** Hooijer dkk. (2012); Ritzema dkk. (2014); Wösten dkk. (2008).
- **Panggung:** bongkahan isometrik petak 24 m × 26 m di tepi kanal +
  peta lahan dari atas dengan patokan lapangan bola.

| Babak | Tugas | Yang terlihat | Angka |
|---|---|---|---|
| 01 Satu kanal | Geser *Kedalaman kanal* sampai 100 cm | Muka air tanah turun mengikuti kanal | 40 cm, batas risiko (Wösten dkk., 2008; PP 57/2016) |
| 02 Jauh dari tepi | Tebak sejauh mana lahan ikut kering (± 5 m / ± 50 m / ratusan m) | Peta lahan dari atas membuka jangkauan kering | 1 km dari kanal masih terpengaruh (Ritzema dkk., 2014) |
| 03 Tahun demi tahun | Jalankan *Waktu* sampai permukaan turun 50 cm | Permukaan melesak, garis tinggi awal tertinggal | 7 cm/tahun per 1 m muka air turun (Hooijer dkk., 2012) |
| 04 Yang kembali hanya airnya | Tekan *Pasang sekat kanal* | Air naik, tanah tetap di bawah garis putus-putus | ± 400 m jangkauan sekat (Ritzema dkk., 2014) |

**Penutup:** *"Air bisa dikembalikan. Tanahnya tidak."*

#### 3.5 Musim Api ✅

`/modul/musim-api` · acuan: `acuan-modul-musim-api.md` · model: `lib/model/fireSeason.ts`
(dibangun 19 November 2026; tampilan belum diperiksa di peramban)

- **Pertanyaan:** Mengapa asap di Pontianak datang hampir selalu sekitar
  Agustus–September, dan mengapa pada tahun tertentu jauh lebih parah?
- **Sebelum → sesudah:** *makin kering makin banyak api, sedikit demi
  sedikit* → *api gambut menunggu air tanah turun melewati ambang; kemarau
  pendek belum berbahaya, tetapi kemarau yang diperpanjang El Niño membuat api
  melonjak berlipat.*
- **Acuan:** Taufik dkk. (2017, 2022); Field dkk. (2009, 2016); Fanin &
  van der Werf (2017); Aldrian & Susanto (2003); Yulianti & Hayasaka (2013);
  Buletin Iklim BMKG Kalbar Oktober 2026.
- **Panggung:** bongkahan gambut 3D Modul Anatomi (dipakai ulang) dengan muka
  air tanah serta garis **40 cm** dan **60 cm** di dinding; hujan dan awan
  mengikuti kalender; bara dan asap mengikuti tingkat api. Di panel: grafik
  kalender setahun (hujan per 10 hari, muka air, kedua ambang) dan
  penggeser hari.
- **Hook:** "Setiap tahun asap datang di bulan yang sama. Kebetulan?" +
  "September 2026, hujan di Kalbar hanya 117 mm dari normal 304 mm."

| Babak | Tugas | Tingkat | Yang terlihat | Angka |
|---|---|---|---|---|
| 01 Kalender Pontianak | Putar kalender Januari → Desember | 2 | Hujan menebal dan menipis dua kali setahun; muka air turun sedikit Februari–Maret, lebih dalam Agustus; titik api sedikit di Agustus | Dua masa kering; puncak api pertengahan–akhir Agustus (Aldrian & Susanto, 2003; Yulianti & Hayasaka, 2013) |
| 02 Ambang | Geser *Hari tanpa hujan* sesudah 20 Agustus sampai lahan terbakar | 2 | Muka air turun; di atas 40 cm hampir tanpa api; lewat 40 cm api mulai; di bawah 60 cm lahan terbakar dan api melonjak | < 40 cm bahaya tinggi, < 60 cm terbakar, Kubu Raya (Taufik dkk., 2022) |
| 03 Tahun El Niño | Pilih *Tahun El Niño*, geser kalender sampai Desember | 1 + 2 | Hujan Agustus–Oktober berkurang dan terlambat; muka air bertahan di bawah 60 cm lebih lama; api bertahan sampai hujan kembali | Area terbakar maksimum ± 10× pada tahun kekeringan air tanah (Taufik dkk., 2017) |

Catatan tingkat: Babak 01 dan 02 sama-sama pengatur geser, tetapi besarannya
berbeda (waktu vs lama kemarau) dan masing-masing membawa pengetahuan
sendiri (2.2).

**Penutup:** *"Asap Agustus bukan kebetulan: air gambut turun di bawah
40 cm. El Niño hanya membuatnya bertahan lebih lama."* Tautan ke Modul Bara
dan Modul Kanal.

---

### Bagian 3 · Api

#### 3.6 Siapa yang Menyalakan? ⏳

Belum ada acuan. Judul dan keterangan ("sampah, puntung, dan api pembuka
lahan") masih sementara sampai acuannya ditetapkan.

#### 3.7 Bara di Bawah Tanah ✅ (patokan)

`/modul/bara` · acuan: `acuan-modul-bara.md`

- **Hook:** "Tidak ada api yang terlihat." → "Asapnya dari mana?"
- **Pertanyaan:** Mengapa api gambut sulit dipadamkan?
- **Sebelum → sesudah:** *api yang tidak terlihat sudah padam* → *bara
  merambat di bawah permukaan dan hanya berhenti bila airnya sampai ke bara.*
- **Acuan:** Usup dkk. (2004), Kalimantan Tengah; Frandsen (1989).
- **Panggung:** bongkahan gambut 3D dengan muka potong dan tampilan termal.

| Babak | Tugas | Yang terlihat | Angka |
|---|---|---|---|
| 01 Api yang tinggal cukup lama | Pilih cara api membakar, klik permukaan | Nyala di titik klik, meredup menjadi bara | Panas 1–2 jam di satu titik |
| 02 Merambat dalam gelap | Majukan waktu sampai bara berumur dua hari | Bara cepat di 20 cm teratas, melambat di lapisan dalam | Bara berhenti di gambut basah |
| 03 Tak terlihat dari atas | Siram, buka termal, tunggu permukaan menyala lagi | Asap hilang; termal membongkar bara di bawah; menyala lagi | Siraman hanya memadamkan permukaan |
| 04 Airnya harus sampai ke bara | Naikkan muka air tanah sampai seluruh bara padam | Bara padam lapis demi lapis dari bawah | Rambatan berhenti saat muka air sampai ke bara |

**Penutup:** kartu hasil menurut kedalaman bara.

---

### Bagian 4 · Dampak

#### 3.8 Gudang Karbon ✅

`/modul/karbon` · acuan: `acuan-modul-karbon.md`

- **Hook:** "Asap kebakaran gambut bisa bertahan berminggu-minggu." → "Apa sebenarnya yang terbakar?"
- **Pertanyaan:** Apa yang lepas saat gambut terbakar, dan berapa lama
  mengembalikannya?
- **Sebelum → sesudah:** *luas terbakar adalah ukuran kerusakan* → *yang
  menentukan adalah kedalaman; setengah meter yang terbakar dalam hitungan
  hari butuh berabad-abad untuk kembali.*
- **Acuan:** Ballhorn dkk. (2009); Page dkk. (2002); ANTARA (2019) untuk
  kebakaran Pontianak.
- **Panggung:** bidang potong yang sama dengan Modul Anatomi, dibaca ulang
  sebagai gudang karbon dan kalender.

| Babak | Tugas | Yang terlihat | Angka |
|---|---|---|---|
| 01 Sekali bakar | Bakar gambut sampai 50 cm, baca yang hilang | Gambut menyusut dari atas, karbon lepas | 33–50 cm rata-rata habis terbakar (Ballhorn dkk., 2009; Page dkk., 2002) |
| 02 Hektare bukan ukurannya | Setel luas dan kedalaman sampai karbonnya sama | Lahan sempit tapi dalam setara lahan luas tapi dangkal | 10 ha terbakar di Pontianak 2019 (ANTARA, 2019) |
| 03 Seribu tahun untuk satu meter | Jalankan waktu sedikitnya satu abad | Gambut tumbuh sangat lambat | 5 abad untuk menimbun kembali 0,5 m |

**Penutup:** *"Yang tidak bisa ditanam kembali."* Hutan bisa ditanam ulang
dalam beberapa dasawarsa, gambutnya tidak.

#### 3.9 Kabut Asap ⏳

Belum ada acuan. Rancangan awal (sebelum aturan acuan) disimpan sebagai
bahan, **belum boleh dikodekan**:

- Panggung: Kota Pontianak dari kejauhan, lahan terbakar di kaki langit.
- Kendali utama: pengatur hari 1 → 30 yang menggerakkan seluruh pemandangan
  (langit, jarak pandang, ISPU). `getAtmosphere` di `lib/model/` sudah
  menyediakan perubahan langit.
- Gagasan babak: geser hari · bernapas seperti hari itu · pilih sudut
  pandang (pelajar, pedagang, pemadam) · lacak asap melewati batas provinsi.
- Angka ISPU dan dampak harus dari acuan, bukan perkiraan.

#### 3.10 Yang Hilang dari Hutan ⏳

Belum ada acuan. Calon sumber lokal: Faradiba dkk. (2022), Rasau Jaya,
Kubu Raya (36 jenis di hutan utuh vs 8 jenis di bekas terbakar); lihat
catatan sumber C di `acuan-modul-hutan-rawa.md`.

---

### Bagian 5 · Mencegah

Tiga modul (**Membasahi Kembali**, **Tanpa Api**, **Saat Tanah Berasap**)
belum ada acuan. Rancangan awal disimpan sebagai bahan: tiap babak membalik
masalah yang sudah dialami pembaca di modul sebelumnya.

| Gagasan | Masalah yang diingatkan | Calon modul |
|---|---|---|
| Pasang sekat sampai lahan aman | Kanal mengeringkan lahan | Membasahi Kembali |
| Buka lahan tanpa bakar | Satu sulutan cukup (Bara) | Tanpa Api |
| Temukan titik panas lebih awal | Api menyebar saat terlambat | Saat Tanah Berasap |
| Susun regu pemadaman desa | Asap mencapai kota | Saat Tanah Berasap |

**Penutup situs** (gagasan): ringkasan perjalanan pembaca, lalu *"Semua itu
bermula dari air yang dikeluarkan. Dan berhenti di tempat yang sama."*

---

## 4. Simulasi dan Kuis

### 4.1 Simulasi

> *"Atur angin, kelembapan, dan kekeringan, lalu coba hentikan api sebelum
> meluas."*

Puncak situs: ruang bebas untuk memakai semua yang sudah dipelajari. Bukan
babak berurutan, melainkan **satu putaran percobaan** yang bisa diulang.

- **Panggung:** lanskap dari atas ± 2 km × 2 km: hutan gambut, kanal, kebun,
  satu permukiman di tepi.
- **A · Menyiapkan keadaan** (sebelum api): muka air tanah, musim/kemarau,
  angin, jumlah dan letak kanal. Setiap geseran langsung mengubah peta rawan.
- **B · Api muncul:** pembaca menaruh titik api, atau menekan "Mulai musim
  kemarau".
- **C · Menanggapi** dengan sumber daya terbatas:

  | Tindakan | Biaya | Hasil sebenarnya |
  |---|---|---|
  | Siram dari darat | Murah | Asap hilang, bara tidak padam (Bara) |
  | Bom air helikopter | Mahal, jeda isi ulang | Padam di permukaan saja |
  | Sekat kanal | Sedang, lambat | Muka air naik, satu-satunya yang memadamkan |
  | Sekat bakar | Sedang | Menahan api permukaan, bukan bara |

- **D · Hasil:** hari, hektare terbakar, biaya, karbon lepas, ISPU
  tertinggi, lalu ajakan *"Coba lagi dengan muka air 0,3 m"*: kemenangan
  ditentukan **sebelum** api menyala.

Teknis: `SmolderSim` perlu diperluas ke bidang datar (tampak atas), atau
`spread.ts` terpisah dengan aturan yang sama.

### 4.2 Kuis

Dua lapis (disepakati 12 November 2026):

1. **Kuis utama** di menu Kuis, yang diuji di Bab 3 naskah; mencakup kelima
   bagian; hasil bisa dibagikan sebagai kartu.
2. **Cek singkat** 3–4 soal di akhir tiap bagian.

Kuis adalah celah terbesar terhadap rumusan masalah skripsi.

---

## 5. Untuk pemrograman

### 5.1 Kontrak babak

Semua modul memakai bentuk data yang sama (lihat `config/modul/*.ts`):

```ts
export type Act = {
  /** Nomor babak di antarmuka, mis. "01". */
  number: string;
  title: string;
  /** Kalimat pengantar babak. */
  lead: string;
  /** A1 — tugas yang harus selesai agar babak berikutnya terbuka. */
  task: string;
  /** A5 — angka kunci babak ini beserta sumbernya. */
  fact: { value: string; caption: string };
};
```

> **Babak berikutnya terbuka hanya bila syaratnya terpenuhi**, dibaca dari
> **keadaan simulasi**, bukan dari "tombol sudah ditekan". Contoh: memeriksa
> `sim.stats.frontDepth > 1.0` berarti bara benar-benar turun satu meter.

### 5.2 Letak berkas

| Isi | Tempat |
|---|---|
| Teks layar dan angka | `config/modul/<nama>.ts` |
| Logika ilmiah (murni, bisa diuji, tanpa React/Three.js) | `lib/model/` |
| Kartu hasil | `lib/kartu/` |
| Kerangka bersama (hook, babak, penutup) | `components/modul/shared/` |
| Komponen dan adegan per modul | `components/modul/<nama>/` |

Setiap tetapan di `lib/` menyebut sumber dan bagiannya dalam komentar.
Bila angka acuan disederhanakan, caranya ditulis di dokumen acuan agar
penguji bisa menghitung ulang.

### 5.3 Daftar periksa sebelum menulis kode satu babak

- [ ] Kalimat "sesudah aksi ini pembaca tahu X" tertulis, dan X bagian tema modul (2.2)
- [ ] Kelima unsur 5A tertulis
- [ ] Lolos keempat uji kelayakan (2.4)
- [ ] Temuan dan angka A5 ada di dokumen acuan; angka tanpa sumber tidak dikodekan
- [ ] Syarat pembuka babak berikutnya dibaca dari keadaan simulasi
- [ ] Logika ilmiah di `lib/`, teks di `config/`
- [ ] Panel tidak bergulir di laptop maupun ponsel

---

## 6. Untuk naskah skripsi

Tiap babak digambar sebagai satu panel, satu halaman per babak:

```
┌──────────────────────────────────────────────────────────┐
│  MODUL <nama> · BABAK 02                 Panel x.y / N   │
├──────────────────────────────────────────────────────────┤
│         [ sketsa tampilan layar ]                        │
│   - letak kanvas 3D, panel teks, dan kendali             │
│   - panah arah gerak animasi                             │
├──────────────────────────────────────────────────────────┤
│ Judul   : Jauh dari tepi                                 │
│ Ajakan  : "Tebak dulu: sampai sejauh mana…"              │
│ Aksi    : memilih satu dari tiga tebakan                 │
│ Animasi : peta lahan dari atas membuka jangkauan kering  │
│ Akibat  : lahan kering jauh melewati tepi kanal          │
│ Angka   : "1 km" (Ritzema dkk., 2014)                    │
│ Syarat  : satu tebakan dipilih                           │
└──────────────────────────────────────────────────────────┘
```

Baris **Aksi** dan **Animasi** menjawab pertanyaan pembimbing ("apa yang
membuat ini interaktif?"), dan sebaiknya dicetak tebal.

**Jumlah panel** saat ini: 1 beranda + 25 babak dari tujuh modul (Sekitarmu
4, Anatomi 4, Hutan Rawa 3, Kanal 4, Musim Api 3, Bara 4, Karbon 3).
Dihitung ulang setiap kali modul baru mendapat acuan.

**Sumber angka resmi** yang sudah dipakai: PP 71/2014 (tebal minimum gambut
50 cm) dan PP 57/2016 (batas muka air 0,4 m). Angka lain berasal dari
dokumen acuan masing-masing modul.

---

## 7. Urutan pengerjaan

| Urutan | Pekerjaan | Keadaan |
|---|---|---|
| 1 | Bagian Gambut (Sekitarmu, Anatomi, Hutan Rawa), Kanal, Bara, Karbon | ✅ selesai |
| 2 | **Musim Api** | ✅ dibangun 19 November 2026; menunggu pemeriksaan tampilan |
| 3 | Siapa yang Menyalakan? | ⏳ cari acuan |
| 4 | Bagian Mencegah (3 modul) | ⏳ cari acuan; menutup alur cerita skripsi berjudul *pencegahan* |
| 5 | Kabut Asap, Yang Hilang dari Hutan | ⏳ cari acuan |
| 6 | Kuis (utama + cek singkat) | ⏳ celah terbesar terhadap rumusan masalah |
| 7 | Simulasi | ⏳ paling besar; kerjakan terakhir |

Bila waktu skripsi menipis, Simulasi lebih baik ditulis sebagai *saran
pengembangan* di bab penutup daripada dikerjakan setengah jadi.
