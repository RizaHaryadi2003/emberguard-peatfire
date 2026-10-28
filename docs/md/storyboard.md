# Papan Cerita (Storyboard) Emberguard

Dokumen ini menetapkan **cerita seluruh situs** dan **aturan yang membuatnya
disebut animasi interaktif**, bukan animasi biasa.

Disusun setelah Modul 01 dan Modul 02 selesai, dengan cara membaca ulang apa
yang sudah berhasil pada keduanya, lalu menjadikannya patokan untuk bagian yang
belum dikerjakan. Jadi aturannya bukan teori dari luar, melainkan pola yang
sudah terbukti berjalan di dalam proyek ini sendiri.

- Tanggal: 30 September 2026
- Berlaku untuk: seluruh bagian, termasuk Modul 01 dan 02 yang sudah jadi

---

## 1. Masalah yang Dipecahkan Dokumen Ini

Modul 01 dirancang sambil jalan dan Modul 02 menyusul dengan bentuk yang
berbeda. Keduanya berjalan baik, tetapi belum ada aturan tertulis yang
menyatakan **mengapa** bentuknya seperti itu. Akibatnya:

- Modul 03 dan 04 tidak punya patokan, dan berisiko memakai bentuk ketiga yang
  berbeda lagi.
- Bagian Simulasi, Dampak, dan Pencegahan masih kosong tanpa arah.
- Sulit menjawab pertanyaan penguji: "apa yang membuat ini interaktif?"

Dokumen ini menutup ketiganya.

---

## 2. Aturan Dasar: Pola 5A

> **Setiap babak harus memiliki satu aksi pembaca yang menghasilkan animasi,
> dan animasi itu harus mengubah keadaan yang terlihat.**

Itulah inti yang disampaikan pembimbing. Supaya dapat diperiksa satu per satu,
aturan itu dipecah menjadi lima unsur yang **wajib ada pada setiap babak**:

| | Unsur | Pertanyaan pemeriksa | Contoh dari Modul 02 Babak 01 |
|---|---|---|---|
| **A1** | **Ajakan** | Apa yang diminta dari pembaca, dalam satu kalimat? | "Pilih satu sumber sulutan, lalu klik permukaan gambut." |
| **A2** | **Aksi** | Apa yang pembaca lakukan dengan tangannya? | Memilih kartu, lalu mengeklik titik di permukaan 3D |
| **A3** | **Animasi** | Apa yang bergerak sebagai jawaban? | Nyala api muncul di titik klik, meredup, berubah jadi titik bara |
| **A4** | **Akibat** | Keadaan apa yang berubah dan tetap berubah? | Simulasi mulai berjalan; ada sel membara yang tidak bisa dibatalkan |
| **A5** | **Angka** | Fakta terukur apa yang muncul dari kejadian itu? | "± 500 °C — suhu bara gambut" |

### Uji kelayakan satu babak

Sebelum sebuah babak ditulis kodenya, jawab tiga pertanyaan ini:

1. **Uji hapus-aksi** — bila A2 dihapus dan animasinya berjalan sendiri, apakah
   babak ini masih berarti? Kalau **ya**, babak ini belum interaktif; ia hanya
   video. Perbaiki dulu.
2. **Uji balik** — apakah pembaca bisa mengulang aksinya dengan nilai berbeda
   dan melihat hasil yang berbeda? Kalau tidak bisa, itu tombol, bukan kendali.
3. **Uji pelajaran** — bila pembaca ditanya "apa yang baru saja kamu pelajari?",
   apakah jawabannya datang dari **yang ia lihat terjadi**, bukan dari teks yang
   ia baca? Kalau jawabannya dari teks, animasinya cuma hiasan.

Babak yang lolos ketiganya sah disebut animasi interaktif.

### Tingkatan aksi

Tidak semua aksi setara. Urut dari paling lemah:

| Tingkat | Bentuk | Kekuatan | Pakai untuk |
|---|---|---|---|
| 0 | Gulir halaman | Terlalu lemah — bukan aksi, hanya laju baca | Jangan dipakai sendirian |
| 1 | Tombol / ganti tampilan | Lemah, hasilnya cuma dua keadaan | Pembanding (mis. permukaan ↔ termal) |
| 2 | Pengatur geser (*slider*) | **Kuat** — pembaca menemukan ambang sendiri | Besaran bersinambung: muka air, angin |
| 3 | Menunjuk / mengeklik objek 3D | **Kuat** — pembaca memilih tempat | Memeriksa, menyulut, menempatkan |
| 4 | Menyeret / menggambar di adegan | **Paling kuat** — pembaca membentuk dunia | Menggali kanal, membuat sekat |
| 5 | Mengelola waktu dengan akibat tak terbalik | **Paling kuat** | Menjalankan waktu, kehilangan permanen |

**Aturan susunan:** satu bagian harus memakai sekurang-kurangnya tiga tingkat
berbeda, dan tidak boleh dua babak berurutan memakai tingkat yang sama.

---

## 3. Audit Dua Modul yang Sudah Jadi

### Modul 02 — Bara di Bawah Tanah ⭐ **jadikan patokan**

| Babak | Ajakan | Tingkat | 5A lengkap? |
|---|---|---|---|
| 01 Satu sulutan kecil | Pilih sumber, klik permukaan | 3 | ✅ |
| 02 Merambat dalam gelap | Majukan waktu sampai dua hari | 5 + 2 | ✅ |
| 03 Tak terlihat dari atas | Siram, lalu bandingkan dengan termal | 1 + 1 | ✅ |
| 04 Basahi kembali | Naikkan muka air sampai bara padam | 2 | ✅ |

Modul ini sudah memenuhi aturan pembimbing sepenuhnya. Kekuatannya ada pada
tiga hal yang harus ditiru modul lain:

1. **Babak terkunci** — babak berikutnya baru terbuka setelah tugasnya selesai.
   Pembaca tidak bisa melewati aksi.
2. **Pembaca dibuat salah dulu** — Babak 03 membuat pembaca menyiram dan merasa
   berhasil, lalu tampilan termal membongkar bahwa itu keliru. Pelajaran yang
   didapat dari kesalahan sendiri jauh lebih melekat daripada yang dibaca.
3. **Akibat tak terbalik** — gambut yang jadi abu tidak kembali. Ada yang
   dipertaruhkan.

### Modul 01 — Anatomi Gambut ⚠️ **perlu ditambal**

| Tahap | Ajakan | Tingkat | 5A lengkap? |
|---|---|---|---|
| 1 Hutan di atas spons | *(tidak ada)* | 0 | ❌ Gagal uji hapus-aksi |
| 2 Lapis demi lapis | "Klik salah satu lapisan" | 3 | ✅ |
| 3 Menyimpan air | *(tidak ada)* | 0 | ❌ Gagal uji hapus-aksi |
| 4 Saat air surut | "Geser pengatur di bawah" | 2 | ✅ |

Dua dari empat tahapnya berjalan sendiri mengikuti gulir. Bila pembimbing
memeriksa modul ini dengan aturannya sendiri, dua tahap itu akan dinilai
sebagai animasi biasa.

**Tambalan yang disarankan** (kecil, tidak membongkar modul):

| Tahap | Tambahkan aksi | Animasi yang muncul | Angka |
|---|---|---|---|
| 1 | **Seret pengatur waktu** 0 → 5.000 tahun | Bongkahan gambut tumbuh naik lapis demi lapis dari dasar mineral; serasah jatuh dan tertimbun | "± 1 mm / tahun — laju penumpukan gambut" |
| 3 | **Tekan dan tahan "Peras spons"** | Air terperas keluar dari bongkahan ke gelas ukur di sisi layar; gelas terisi sampai ± 90% volume | "± 90% — bagian volume gambut alami yang berupa air" |

Tahap 1 sekaligus memperbaiki masalah lain: sekarang tidak ada apa pun yang
menunjukkan bahwa gambut **butuh ribuan tahun untuk terbentuk** — padahal itu
fondasi pesan Modul 04.

---

## 4. Peta Cerita Seluruh Situs

Empat bagian dengan satu alur tunggal: **kenali → saksikan → kendalikan →
tanggung akibatnya → cegah.**

```
BERANDA
  "Sebelum bara menjadi bencana"
  Aksi: gerakkan kursor — hutan sehat tersingkap menjadi hutan terbakar
        │
        ▼
BAGIAN 01 — GAMBUT                              [ KENALI ]
  Modul 01  Anatomi Gambut        apa itu gambut      ✅ selesai
  Modul 02  Bara di Bawah Tanah   mengapa sulit padam ✅ selesai
  Modul 03  Kanal & Pengeringan   mengapa jadi kering ⬜
  Modul 04  Gudang Karbon         apa yang hilang     ⬜
        │
        ▼
BAGIAN 02 — SIMULASI                            [ KENDALIKAN ]
  Satu lanskap, api nyata, sumber daya terbatas.
  Pembaca memakai semua yang dipelajari untuk menghentikan kebakaran.
        │
        ▼
BAGIAN 03 — DAMPAK                              [ TANGGUNG AKIBATNYA ]
  Asap tidak berhenti di batas lahan. Ikuti perjalanannya ke kota.
        │
        ▼
BAGIAN 04 — PENCEGAHAN                          [ CEGAH ]
  Semua yang tadi dilihat, dibalik menjadi tindakan.
```

**Alasan urutannya begitu:** pembaca tidak boleh diberi tahu cara mencegah
sebelum ia merasakan sendiri betapa sulitnya memadamkan. Bagian 04 hanya terasa
penting kalau Bagian 02 sudah membuatnya gagal sekali.

---

## 5. Storyboard Tiap Bagian

Format tiap babak mengikuti Pola 5A. Kolom **Tingkat** merujuk tabel di
bagian 2.

---

### 5.1 Modul 03 — Kanal & Pengeringan

> *"Saat air dialirkan keluar"*

> **Keadaan: sudah dikerjakan** (28 Oktober 2026) — `components/gambut/kanal/`,
> model di `lib/drainage.ts`. Pesan utama, keempat babak, dan tugas tiap babak
> di bawah ini tetap seperti rencana. Panggungnya berubah: bukan satu petak
> ± 500 m, melainkan **dua gambar berdampingan** — bongkahan isometrik
> puluhan meter di dekat kanal, dan grafik muka air sepanjang 1 km. Kerucut
> penurunannya tidak dapat dibaca pada satu gambar saja.

**Pesan utama:** kebakaran gambut hampir tidak pernah bermula dari api. Ia
bermula dari **air yang dikeluarkan**, bertahun-tahun sebelumnya.

**Panggung:** pandangan lanskap dari samping-atas — petak gambut selebar
± 500 m dengan hutan di satu sisi dan lahan terbuka di sisi lain. Lebih luas
daripada bongkahan 4,4 m di Modul 01–02, supaya pembaca melihat bahwa satu
kanal memengaruhi wilayah jauh di luar tepinya.

| Babak | Judul | Ajakan (A1) | Aksi (A2) | Tingkat | Animasi (A3) | Akibat (A4) | Angka (A5) |
|---|---|---|---|---|---|---|---|
| **01** | Alasan kanal digali | "Seret dari tepi lahan ke sungai untuk menggali kanal." | Menyeret garis melintasi lanskap | **4** | Tanah terbelah mengikuti seretan; air mulai mengalir keluar menuju sungai; muka air tanah turun sebagai garis biru yang melandai | Kanal permanen; lahan jadi "bisa ditanami" — panel hasil panen menyala | Luas gambut Indonesia yang sudah berkanal *(perlu rujukan)* |
| **02** | Lebih dalam, lebih luas | "Atur kedalaman kanal dan perhatikan sampai sejauh mana tanah ikut mengering." | Pengatur geser kedalaman 0–3 m | **2** | Kerucut penurunan muka air melebar dari kanal ke kiri-kanan; warna permukaan berubah hijau → coklat mengikuti kekeringan; garis "batas 0,4 m" ikut bergeser | Wilayah kering meluas jauh melewati tepi kanal | "Kanal sedalam 1 m dapat menurunkan muka air sampai ratusan meter dari tepinya" *(perlu rujukan)* |
| **03** | Tanah yang tidak kembali | "Jalankan waktu lima tahun." | Menekan tombol waktu, menonton, menghentikan | **5** | Permukaan tanah melesak turun tiap tahun; tiang ukur di tengah lanskap menunjukkan angka turun; jejak tinggi awal tertinggal sebagai garis putus-putus di udara | **Tidak dapat dibatalkan.** Tombol "kembalikan" ada, tetapi hanya mengembalikan air — tanahnya tetap rendah | "3–5 cm per tahun — laju penurunan permukaan gambut yang dikeringkan" *(perlu rujukan)* |
| **04** | Menutup kembali | "Pasang sekat kanal, lalu jalankan waktu lagi." | Mengeklik titik-titik di sepanjang kanal untuk menaruh sekat | **3** | Air tertahan di tiap sekat menjadi anak tangga; muka air tanah naik bertahap; warna permukaan pulih sebagian | Muka air kembali aman, tetapi permukaan tanah **tetap** di ketinggian yang sudah turun | "Memulihkan butuh puluhan tahun; menurunkannya butuh lima." |

**Penutup modul:** dua gambar bersanding — lanskap sebelum digali dan sesudah
dipulihkan. Air sama tingginya, tanahnya tidak. Kalimat penutup:
*"Air bisa dikembalikan. Tanahnya tidak."*

**Yang bisa dipakai ulang dari kode yang ada:** `getWaterStatus`,
`getSurfaceDryness`, dan `getFireDanger` dari `lib/peat.ts`; `getAtmosphere`
dari `lib/atmosphere.ts`; pola `PerformanceGuard` dan `QUALITY_PROFILE`.

**Logika baru yang perlu berkas sendiri di `lib/`:** `canal.ts` — kerucut
penurunan muka air terhadap jarak dari kanal, dan laju subsiden per tahun.
Murni, dapat diuji.

---

### 5.2 Modul 04 — Gudang Karbon

> *"Apa yang lepas saat gambut terbakar"*

> **Keadaan: sudah dikerjakan** (28 Oktober 2026) — `components/gambut/karbon/`,
> model di `lib/carbon.ts`. Pesan utamanya tetap ketimpangan waktu. Panggungnya
> berubah: bukan satu tiang gambut 1 m × 1 m, melainkan **bidang potong yang
> sama** yang sudah dikenal pembaca sejak Modul 01, dibaca ulang sebagai
> kalender dan sebagai gudang. Satu babak ditambahkan di luar rencana —
> "Hektare bukan ukurannya" — karena luas tanpa kedalaman adalah justru
> kekeliruan yang dibawa pembaca dari berita.

**Pesan utama:** ketimpangan waktu. Gambut menabung karbon selama ribuan tahun,
dan kebakaran menghabiskannya dalam hitungan hari.

**Panggung:** satu tiang gambut (1 m × 1 m) berdiri tegak di tengah layar,
dengan sumbu tahun di sisi kiri dan penghitung karbon di sisi kanan.

| Babak | Judul | Ajakan (A1) | Aksi (A2) | Tingkat | Animasi (A3) | Akibat (A4) | Angka (A5) |
|---|---|---|---|---|---|---|---|
| **01** | Menabung ribuan tahun | "Putar pengatur tahun ke depan." | Memutar / menyeret pengatur 0 → 5.000 tahun | **4** | Tiang gambut tumbuh naik satu lapis tipis tiap ratusan tahun; penghitung karbon di kanan naik perlahan; warna lapisan berubah matang dari bawah ke atas | Tiang penuh setinggi 5 m; karbon tersimpan penuh | "± 1 mm per tahun" dan total karbon tersimpan per hektar *(perlu rujukan)* |
| **02** | Habis dalam hitungan hari | "Sulut tiang gambut." | Satu klik pada tiang | **3** | Bara turun cepat; tiang menyusut dari atas; **penghitung karbon berbalik turun**, dan angka yang hilang naik ke langit sebagai kabut gelap; sumbu tahun di kiri ikut tergerus mundur — 5.000 tahun terhapus dalam beberapa detik | Tiang habis. Penghitung nol | "Terbentuk 5.000 tahun · Habis 3 hari" — dua angka disandingkan |
| **03** | Sebesar apa itu | "Pilih pembanding yang paling mudah kamu bayangkan." | Menekan kartu pembanding (mobil setahun / penerbangan / rumah tangga) | **1** | Ikon pembanding memenuhi layar satu per satu sampai jumlahnya setara karbon yang barusan lepas; berhenti dengan angka besar | Pembaca punya pegangan nyata atas besaran abstrak | Jumlah setara *(perlu rujukan dan perhitungan sendiri)* |
| **04** | Menabung ulang | "Coba kembalikan karbonnya." | Memutar pengatur tahun ke depan lagi, sekuat apa pun | **4** | Tiang tumbuh **sangat lambat** — pengatur diputar penuh, tiang hanya naik beberapa sentimeter. Bilah pemulihan nyaris tidak bergerak | Pembaca merasakan sendiri ketimpangannya; tidak bisa menang | "Butuh ribuan tahun untuk mengembalikan apa yang hilang dalam tiga hari." |

**Kekuatan babak 04:** ini aksi yang **sengaja dibuat gagal**. Pembaca diberi
kendali penuh dan tetap tidak bisa memperbaiki keadaan. Itu menyampaikan
ketidakterbalikan jauh lebih kuat daripada kalimat mana pun.

**Logika baru di `lib/`:** `carbon.ts` — penumpukan gambut per tahun, kandungan
karbon per volume, dan konversi ke satuan setara.

---

### 5.3 Bagian 02 — Simulasi

> *"Atur angin, kelembapan, dan kekeringan, lalu coba hentikan api sebelum meluas."*

Ini **puncak** seluruh situs: ruang bebas tempat pembaca memakai semua yang
sudah dipelajari. Berbeda dari modul yang mengajar satu hal, bagian ini
**menguji**.

**Panggung:** lanskap dari atas (peta miring), ± 2 km × 2 km, berisi hutan
gambut, kanal, kebun warga, dan satu permukiman di tepi.

**Bentuk:** bukan babak berurutan, melainkan **satu putaran percobaan** yang
bisa diulang berkali-kali dengan pengaturan berbeda.

#### Tahap A — Menyiapkan keadaan *(sebelum api)*

| Kendali | Tingkat | Yang berubah saat digeser |
|---|---|---|
| Muka air tanah | 2 | Warna lahan, dan wilayah yang mungkin terbakar |
| Musim / kekeringan | 2 | Kekeringan permukaan, warna langit |
| Arah dan kecepatan angin | 2 + 3 | Panah angin di peta; kelak menentukan arah rambat |
| Jumlah dan letak kanal | 4 | Kekeringan di sekitarnya |

Setiap geseran **langsung** mengubah peta — belum ada api, tetapi pembaca sudah
melihat lahannya berubah menjadi merah rawan atau biru aman. Ini memenuhi 5A
sebelum permainan dimulai.

#### Tahap B — Api muncul

Pembaca menaruh titik api, **atau** menekan "Mulai musim kemarau" dan titik api
muncul sendiri di tempat yang paling rawan. Waktu mulai berjalan.

#### Tahap C — Menanggapi *(inti permainan)*

Sumber daya **terbatas** — inilah yang membuat pembaca berpikir, bukan sekadar
menekan semua tombol:

| Tindakan | Aksi | Biaya | Hasil sebenarnya |
|---|---|---|---|
| Siram dari darat | Klik titik | Murah | Asap hilang, bara **tidak** padam *(pelajaran Modul 02)* |
| Bom air helikopter | Klik titik | Mahal, ada jeda isi ulang | Padam di permukaan saja |
| Sekat kanal | Seret di kanal | Sedang, **lambat** | Muka air naik → satu-satunya yang benar-benar memadamkan |
| Sekat bakar | Seret garis | Sedang | Menahan api permukaan, **tidak** menahan bara bawah tanah |

#### Tahap D — Hasil

Percobaan berakhir saat api padam atau mencapai permukiman. Kartu hasil:

```
Hari ke-     hektar terbakar     biaya      karbon lepas     ISPU tertinggi
```

Lalu satu kalimat penilaian yang berubah mengikuti hasil, dan tombol
**"Coba lagi dengan muka air 0,3 m"** — mengajak pembaca menemukan sendiri
bahwa **kemenangan ditentukan sebelum api menyala**, bukan sesudahnya.

> Inilah pelajaran terbesar seluruh situs, dan pembaca menemukannya lewat
> kegagalan berulang, bukan lewat kalimat.

**Yang dipakai ulang:** `SmolderSim` — tetapi perlu diperluas ke bidang datar
(x–y, tampak atas) selain bidang penampang (x–kedalaman). Pertimbangkan
menjadikan kelasnya bersifat umum, atau menulis `spread.ts` terpisah yang
memakai aturan yang sama.

---

### 5.4 Bagian 03 — Dampak

**Pesan utama:** asap tidak berhenti di batas lahan.

**Panggung:** satu pemandangan kota Pontianak dari kejauhan, dengan lahan
gambut terbakar di kaki langit.

**Kendali utama:** satu **pengatur hari** (hari 1 → 30) yang menggerakkan
seluruh halaman sekaligus. Ini kendali paling sederhana namun paling kuat:
satu aksi, banyak akibat serentak.

| Hari | Yang berubah saat pengatur digeser |
|---|---|
| 1–3 | Langit masih biru, asap tipis di kaki langit. ISPU 40 (Baik) |
| 4–10 | Jarak pandang menurun, gedung jauh menghilang. ISPU 120 (Tidak Sehat) |
| 11–20 | Langit jingga pekat, lampu jalan menyala siang hari. ISPU 250 (Sangat Tidak Sehat). Kartu "sekolah diliburkan" muncul |
| 21–30 | Jingga gelap. ISPU 350+ (Berbahaya). Kartu penerbangan dibatalkan, kunjungan ISPA melonjak, kerugian ekonomi |

**Aksi tambahan di tiap tingkat** (supaya tidak hanya satu pengatur):

| Babak | Ajakan | Tingkat | Animasi |
|---|---|---|---|
| 01 | "Geser hari dan perhatikan langit." | 2 | Seluruh pemandangan berubah; `getAtmosphere` sudah menyediakan ini |
| 02 | "Tekan untuk bernapas seperti hari itu." | 1 | Bilah paru-paru terisi partikel sesuai ISPU hari terpilih; hitungan partikel per napas |
| 03 | "Pilih siapa dirimu hari itu." | 1 | Ganti sudut pandang: anak sekolah / pedagang / petugas pemadam — tiap pilihan menampilkan akibat yang berbeda dari hari yang sama |
| 04 | "Lacak asapnya." | 3 | Peta menjauh; asap terbawa angin melewati batas provinsi dan negara |

Bagian ini **tidak boleh** jadi halaman penuh grafik. Angka tetap ada, tetapi
selalu menempel pada sesuatu yang berubah di layar.

---

### 5.5 Bagian 04 — Pencegahan

**Pesan utama:** setiap hal yang tadi dilihat rusak, punya pasangan tindakan.

**Bentuk:** halaman ini **membalik** bagian sebelumnya. Tiap babak dibuka
dengan cuplikan masalah yang sudah dialami pembaca, lalu memintanya
memperbaiki.

| Babak | Masalah yang diingatkan | Ajakan | Tingkat | Animasi |
|---|---|---|---|---|
| **01** Jaga airnya | Modul 03: kanal mengeringkan lahan | "Pasang sekat sampai seluruh lahan kembali aman." | 3 | Sekat dipasang; peta berubah merah → biru; penghitung "luas aman" naik sampai 100% |
| **02** Buka lahan tanpa bakar | Modul 02: satu sulutan cukup | "Pilih cara membuka lahan." | 1 | Dua jalur bersanding: dengan api → bara menjalar; tanpa api → lahan bersih, bara nol |
| **03** Temukan lebih awal | Bagian 02: api menyebar saat terlambat | "Periksa titik panas hari ini." | 3 | Peta titik panas; klik untuk memverifikasi; yang ditemukan hari ke-1 padam dengan satu regu, hari ke-7 butuh helikopter |
| **04** Kita yang menjaga | Bagian 03: asap mencapai kota | "Susun regu pemadaman desamu." | 3 + 2 | Menaruh anggota MPA, menara pantau, dan embung di peta desa; menjalankan satu musim kemarau untuk melihat hasilnya |

**Penutup situs:** ringkasan seluruh perjalanan pembaca — berapa kali ia gagal
memadamkan di Bagian 02, berapa karbon yang lepas di Modul 04, berapa hari
kotanya berasap di Bagian 03 — lalu satu kalimat terakhir:

> *"Semua itu bermula dari air yang dikeluarkan. Dan berhenti di tempat yang sama."*

---

## 6. Kontrak Babak untuk Pemrograman

Supaya keempat modul tidak memakai bentuk data yang berbeda-beda, seluruh babak
memakai satu tipe yang sama. `BaraAct` di `config/bara-content.ts` sudah hampir
tepat; tinggal diangkat menjadi tipe bersama:

```ts
// config/act.ts — tipe bersama seluruh modul
export type Act = {
  /** Nomor babak yang tampil di antarmuka, mis. "01". */
  number: string;
  title: string;
  /** Kalimat pengantar babak. */
  body: string;
  /** A1 — tugas yang harus diselesaikan agar babak berikutnya terbuka. */
  task: string;
  /** A5 — angka kunci babak ini. */
  fact: { value: string; caption: string };
};
```

Dan satu aturan pemrograman yang berlaku di semua modul:

> **Babak berikutnya hanya terbuka setelah syaratnya terpenuhi**, dan syarat itu
> dibaca dari **keadaan simulasi**, bukan dari "tombol sudah ditekan".

Modul 02 sudah menerapkannya lewat larik `ACT_HINT` dan pemeriksaan keadaan.
Bedanya besar: memeriksa `sim.stats.frontDepth > 1.0` berarti pembaca benar-benar
membuat baranya turun sedalam satu meter, sedangkan memeriksa "tombol ditekan"
hanya berarti ia menekan tombol.

---

## 7. Format Papan Cerita untuk Naskah Skripsi

Untuk dimasukkan ke naskah, tiap babak digambar sebagai satu panel dengan
susunan tetap berikut. Buat satu halaman per babak.

```
┌──────────────────────────────────────────────────────────┐
│  MODUL 03 · BABAK 02                    Panel 3.2 / 16   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│         [ sketsa tampilan layar di sini ]                │
│                                                          │
│   - letak kanvas 3D                                      │
│   - letak panel teks                                     │
│   - letak kendali (pengatur/tombol)                      │
│   - panah yang menunjukkan arah gerak animasi            │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Judul      : Lebih dalam, lebih luas                     │
│ Ajakan     : "Atur kedalaman kanal dan perhatikan…"      │
│ Aksi       : pengatur geser, 0–3 m                       │
│ Animasi    : kerucut penurunan melebar; warna permukaan  │
│              hijau → coklat                              │
│ Akibat     : wilayah kering meluas melewati tepi kanal   │
│ Angka      : "kanal 1 m → pengaruh ratusan meter"        │
│ Durasi     : ± 40 detik                                  │
│ Syarat     : kedalaman ≥ 1 m ditahan 3 detik             │
└──────────────────────────────────────────────────────────┘
```

Jumlah panel seluruh situs: **1 beranda + 16 babak modul + 4 tahap simulasi +
4 babak dampak + 4 babak pencegahan = 29 panel.**

Baris **Aksi** dan **Animasi** itulah yang menjawab pertanyaan pembimbing, dan
sebaiknya dicetak tebal di naskah.

---

## 8. Urutan Pengerjaan yang Disarankan

Diurutkan berdasarkan **manfaat dibagi kesulitan**, bukan berdasarkan nomor.

| Urutan | Pekerjaan | Kesulitan | Alasan didahulukan |
|---|---|---|---|
| ~~1~~ | ~~Selesaikan Babak 04 Modul 02~~ | Kecil | **Selesai** |
| 2 | Tambal Tahap 1 dan 3 Modul 01 | Kecil | Menutup satu-satunya celah terhadap aturan pembimbing — masih tertunda, lihat bagian 3 |
| ~~3~~ | ~~**Modul 03 — Kanal**~~ | Sedang | **Selesai** |
| ~~5~~ | ~~Modul 04 — Gudang Karbon~~ | Sedang | **Selesai** — dikerjakan mendahului Pencegahan karena sepenuhnya memakai ulang bidang potong yang sudah ada |
| 4 | **Bagian 04 — Pencegahan** | Sedang | Menutup alur cerita. Skripsi berjudul *pencegahan* sebaiknya memiliki bagian pencegahan sebelum memiliki bagian permainan. **Pekerjaan berikutnya** |
| 6 | Bagian 03 — Dampak | Sedang | Sebagian besar sudah tersedia lewat `getAtmosphere` |
| 7 | Bagian 02 — Simulasi | **Besar** | Perlu perluasan `SmolderSim` ke bidang datar. Kerjakan terakhir, saat pola kerja sudah mapan |

**Catatan penting:** bila waktu skripsi menipis, berhenti setelah urutan ke-4.
Empat modul Gambut + Pencegahan sudah merupakan produk yang utuh dan bercerita
penuh. Bagian Simulasi lebih baik ditulis sebagai *saran pengembangan
selanjutnya* pada bab penutup daripada dikerjakan setengah jadi.

---

## 9. Daftar Periksa Sebelum Menulis Kode Satu Babak

- [ ] Kelima unsur 5A sudah tertulis, tidak ada yang kosong
- [ ] Lolos uji hapus-aksi — babak ini tidak berarti tanpa aksi pembaca
- [ ] Lolos uji balik — aksinya bisa diulang dengan nilai berbeda
- [ ] Lolos uji pelajaran — pelajarannya datang dari yang terlihat, bukan dari teks
- [ ] Tingkat aksinya berbeda dari babak sebelumnya
- [ ] Syarat pembuka babak berikutnya dibaca dari keadaan simulasi
- [ ] Angka pada A5 sudah punya rujukan, atau ditandai *(perlu rujukan)*
- [ ] Logika ilmiahnya ditempatkan di `lib/` tanpa impor React atau Three.js
- [ ] Seluruh teksnya berada di `config/`, bukan tertanam di komponen

---

## 10. Catatan tentang Angka

Setiap angka yang ditandai *(perlu rujukan)* pada dokumen ini **wajib**
diverifikasi sebelum masuk ke antarmuka, dan sumbernya dicatat di naskah.

Dua sumber yang sudah dipakai dan dapat dilanjutkan:

- **PP No. 71 Tahun 2014** — ketebalan minimum 50 cm untuk disebut gambut
- **PP No. 57 Tahun 2016** — batas muka air tanah 0,4 m

Untuk laju subsiden, kandungan karbon, dan luas kanal, gunakan jurnal yang
sudah dikumpulkan di `docs/Jurnal Reference/` atau data resmi BRGM dan KLHK.

Sikap yang dipakai proyek ini — sebagaimana tertulis pada `lib/smolder.ts` —
adalah menyatakan terus terang bahwa nilai tetapan bersifat **ilustratif**,
dipilih agar sesuai urutan besar pengamatan lapangan, bukan hasil kalibrasi
terhadap satu lokasi tertentu. Pertahankan kejujuran itu di seluruh modul baru.
