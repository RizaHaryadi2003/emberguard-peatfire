# Acuan Kuis

Status: **draf pedoman** (23 November 2026). Soal belum ditulis. Dokumen ini
mengatur *cara* soal dirumuskan, sama seperti acuan modul mengatur isi modul.
Setelah pedoman disetujui, soal disusun di §8 lalu divalidasi ahli (§6).

## 0. Keputusan pengguna

| Hal | Keputusan |
|---|---|
| Sifat kuis | Sederhana, jelas, akurat, cepat. Tanpa animasi berat atau rumit |
| Yang utama | Memberi dan mengukur pemahaman. Skor tetap ada (Bab III) |
| Tingkat soal | Bukan soal gaya anak-anak; mengukur penalaran untuk pengguna media sosial, fokus usia 17 tahun |
| Jawaban salah | Selalu diberi jawaban perbaikan dan penjelasan yang tuntas |
| Dasar soal | Cara merumuskan soal harus berdasar pedoman yang diakui, bukan karangan sendiri |
| Kartu bagikan hasil | **Tidak dibuat** |
| Cek singkat per bagian | **Dibuat** |

Ketentuan Bab III yang tetap berlaku: kuis utama 10 soal pilihan ganda, 4 pilihan,
tiap soal dijawab sekali, benar = 10 poin, pembahasan langsung beserta modul yang
membahasnya, skor ≥ 70 = "Paham", di bawahnya "Coba lagi" dengan daftar modul
yang disarankan, lalu tombol Ulangi kuis dan Daftar modul.

## 1. Acuan

| # | Acuan | Dipakai untuk | Yang terbaca |
|---|---|---|---|
| A | Haladyna, T. M., Downing, S. M., & Rodriguez, M. C. (2002). A review of multiple-choice item-writing guidelines for classroom assessment. *Applied Measurement in Education*, 15(3), 309–333. doi:10.1207/S15324818AME1503_5 (**DOI belum terverifikasi**) | Cara menulis soal: 31 pedoman, disarikan dari kesepakatan 27 buku ajar pengukuran pendidikan | Daftar 31 pedoman lewat rangkuman sekunder (bookdown "manualesitems"); **naskah asli belum dibaca** |
| B | Krathwohl, D. R. (2002). A revision of Bloom's taxonomy: An overview. *Theory Into Practice*, 41(4), 212–218. doi:10.1207/s15430421tip4104_2 | Menentukan tingkat berpikir tiap soal | Abstrak dan salinan; revisi dari Anderson, Krathwohl dkk. (2001) |
| C | Treagust, D. F. (1988). Development and use of diagnostic tests to evaluate students' misconceptions in science. *International Journal of Science Education*, 10(2), 159–169. doi:10.1080/0950069880100204 | Pengecoh diambil dari salah kaprah | Data pustaka saja |
| C′ | Kaltakci Gurel, D., Eryilmaz, A., & McDermott, L. C. (2015). A review and comparison of diagnostic instruments to identify students' misconceptions in science. *Eurasia Journal of Mathematics, Science & Technology Education*, 11(5), 989–1008 | Kelebihan dan batas soal pilihan ganda diagnostik, termasuk dua tingkat (*two-tier*) | **Teks lengkap terbaca** |
| D | Shute, V. J. (2008). Focus on formative feedback. *Review of Educational Research*, 78(1), 153–189. doi:10.3102/0034654307313795 | Jenis dan bentuk umpan balik (Tabel 1–5) | **Teks lengkap terbaca** |
| E | Mertens, U., Finn, B., & Lindner, M. A. (2022). Effects of computer-based feedback on lower- and higher-order learning outcomes: A network meta-analysis. *Journal of Educational Psychology*, 114(8), 1743–1772 | Umpan balik terelaborasi paling mungkin efektif | Sudah dikutip di Bab II naskah |
| F | Aiken, L. R. (1985). Three coefficients for analyzing the reliability and validity of ratings. *Educational and Psychological Measurement*, 45(1), 131–142. doi:10.1177/0013164485451012 | Validasi isi soal oleh ahli (indeks V) | Abstrak; rumus dari pengetahuan umum, **cocokkan dengan naskah asli** |
| — | `docs/md/acuan-modul/*.md` | **Isi** setiap soal | Sudah ada |

Pembagian tugasnya: acuan modul menentukan **apa yang benar**, acuan A–F
menentukan **bagaimana kebenaran itu ditanyakan dan dijelaskan**.

## 2. Bentuk soal (acuan A)

Pedoman A yang paling menentukan bagi kuis ini, dengan penerapannya:

| No. A | Pedoman | Penerapan |
|---|---|---|
| 1 | Tiap soal menguji satu isi dan satu perilaku berpikir, mengikuti kisi-kisi | Kisi-kisi di §7; satu soal = satu konsep modul |
| 2 | Isi penting, hindari yang remeh | Hanya konsep inti tema modul ([[aksi-harus-membawa-ilmu]]), bukan angka hiasan |
| 3 | Pakai bahan baru untuk menguji tingkat lebih tinggi; parafrasa, jangan menyalin kalimat ajar | Situasi baru (berita, unggahan, dua lahan pembanding), bukan kalimat yang sama dengan layar modul |
| 4 | Soal saling bebas | Jawaban satu soal tidak membocorkan soal lain |
| 6–7 | Hindari soal opini dan soal jebakan | Kunci harus bisa dilacak ke acuan; tidak ada pilihan yang benar "tergantung tafsir" |
| 8 | Kosakata sederhana untuk kelompok yang diuji | Bahasa 17 tahun, tanpa istilah teknis yang tidak dipakai modul ([[tanpa-kutipan-di-layar]]) |
| 13, 16 | Bacaan sesingkat mungkin, tanpa kalimat hiasan | Batang soal ≤ ± 40 kata |
| 15 | Gagasan pokok ada di batang soal | Pembaca sudah tahu yang ditanyakan sebelum membaca pilihan |
| 17, 27 | Hindari kalimat negatif (BUKAN, KECUALI) | Bila terpaksa, ditulis kapital tebal |
| 18 | Pilihan sebanyak yang efektif; tiga dinilai cukup | Bab III menetapkan **4**. Dipertahankan hanya bila keempatnya masuk akal; bila tidak, usulkan revisi Bab III menjadi 3 |
| 19 | Hanya satu jawaban benar | Diperiksa ahli (§6) |
| 20–21 | Letak kunci bervariasi; pilihan diurutkan secara logis atau angka | Pilihan angka urut naik; letak kunci tersebar merata di 10 soal |
| 22–24 | Pilihan tidak tumpang tindih, sejenis, panjangnya setara | Kunci tidak boleh paling panjang atau paling rinci |
| 25–26 | "Tak satu pun" hati-hati; hindari "semua benar" | Tidak dipakai |
| 28 | Jangan beri petunjuk: kata mutlak (selalu, tidak pernah), kata yang sama dengan batang, pilihan yang mencolok atau konyol | Pilihan konyol dilarang |
| 29–30 | Semua pengecoh masuk akal; tulis dari kesalahan khas | Lihat §4 |

## 3. Tingkat berpikir (acuan B)

Taksonomi revisi memakai dua sumbu: **proses** (mengingat, memahami,
menerapkan, menganalisis, mengevaluasi, mencipta) dan **jenis pengetahuan**
(faktual, konseptual, prosedural, metakognitif).

Ketentuan kuis:

- **Tidak ada soal mengingat murni.** Angka yang dibutuhkan ditulis di soal.
- Sasaran: **memahami, menerapkan, menganalisis, mengevaluasi**, pada
  pengetahuan **konseptual** (sebab-akibat gambut, air, api) dan sedikit
  **prosedural** (tindakan pencegahan).
- Mencipta tidak dipakai, karena pilihan ganda tidak dapat mengukurnya.

Bentuk situasi yang dipakai, dipetakan ke proses:

| Bentuk | Proses | Contoh kerangka |
|---|---|---|
| Menjelaskan sebab | Memahami | Mengapa X terjadi pada keadaan Y? |
| Menghitung atau memprediksi dari data yang diberikan | Menerapkan | Muka air awal a, turun b per hari; kapan melewati batas? |
| Membandingkan dua keadaan | Menganalisis | Lahan P luas-dangkal, lahan Q sempit-dalam; mana yang… dan mengapa? |
| Menilai klaim berita atau unggahan | Mengevaluasi | Penilaian mana yang paling tepat atas pernyataan ini? |
| Memilih tindakan beserta alasannya | Mengevaluasi | Tindakan mana yang benar-benar menghentikan…? |

## 4. Pengecoh dari salah kaprah (acuan C, C′, A-30)

- Soal pilihan ganda diagnostik menyusun pengecohnya dari salah kaprah yang
  dikumpulkan lewat pustaka, wawancara, dan tes jawaban terbuka (C′).
- **Format dua tingkat tidak dipakai.** Tingkat kedua (memilih alasan)
  menggandakan waktu, padahal kuis harus cepat. C′ juga mencatat batasnya:
  dua tingkat tetap tidak bisa membedakan tebakan dari salah kaprah, dan bisa
  melebih-lebihkan jumlah salah kaprah.
- **Gantinya: setiap pilihan berisi jawaban beserta alasannya** dalam satu
  kalimat. Alasan yang dipilih pembaca langsung menunjukkan cara berpikirnya,
  tanpa langkah kedua.
- Sumber salah kaprah, berurutan menurut kekuatannya:
  1. Salah kaprah yang **dibantah langsung** oleh modul (hook dan babaknya),
     misalnya "asap hilang berarti padam" (Bara Babak 03), "hektare
     menentukan karbon" (Karbon Babak 02), "sekat kanal memulihkan tanah"
     (Kanal Babak 04).
  2. Kejadian nyata yang dicatat naskah, misalnya lahan Jl. Sepakat 2 yang
     menyala lagi tiga hari setelah dipadamkan (BPBD Kota Pontianak, 2023).
  3. **Uji coba** pada beberapa pengguna dengan pertanyaan terbuka sebelum
     pilihan dibakukan. Bisa digabung dengan wawancara tambahan 5–8 orang
     yang memang sudah direncanakan.

## 5. Umpan balik (acuan D, E)

Jenis yang dipakai (D, Tabel 1): **elaborasi menurut jawaban** (*response
contingent*). Isinya menjelaskan mengapa jawaban yang dipilih salah dan
mengapa kuncinya benar, disertai jawaban benar. E mendukung umpan balik
terelaborasi dibanding sekadar benar atau salah.

### Yang dilakukan (D, Tabel 2, 4, 5)

| Pedoman D | Penerapan |
|---|---|
| Fokus pada tugas, bukan orangnya | Bahas jawabannya, bukan pembacanya ("pilihan ini keliru karena…", bukan "kamu salah") |
| Jelaskan apa, bagaimana, dan mengapa | Susunan pembahasan di bawah |
| Elaborasi dalam **potongan yang terkelola**; terlalu banyak informasi menimbulkan beban berlebih | Pembahasan pendek dan bertahap, muat tanpa gulir ([[tanpa-gulir-panel]]) |
| Sesederhana mungkin, tetapi tidak lebih sederhana | Hanya yang dibutuhkan untuk membetulkan salah kaprah itu; sisanya lewat tautan ke modul |
| Spesifik, jelas, terkait tujuan | Setiap pengecoh punya penjelasan sendiri |
| Beri umpan balik **sesudah** pembaca mencoba | Pembahasan baru tampil setelah memilih; pilihan lalu terkunci |
| Tugas sulit, pemula, dan retensi konsep: umpan balik **langsung** | Pembahasan langsung muncul, sesuai Bab III |
| Pemula: umpan balik korektif yang tegas, jawaban benar ditambah elaborasi | Kunci selalu ditampilkan; tanpa petunjuk berantai |

### Yang dihindari (D, Tabel 3)

| Pedoman D | Penerapan |
|---|---|
| Jangan membandingkan dengan orang lain | Tanpa papan peringkat, tanpa "lebih baik dari 80% pemain" |
| Hati-hati dengan nilai keseluruhan | Skor tetap ada (Bab III), tetapi halaman hasil menonjolkan **pemahaman per bagian dan konsep yang masih keliru**, bukan angkanya saja |
| Hemat pujian | Tanpa "Hebat!", "Luar biasa!"; jawaban benar cukup diberi konfirmasi dan penguatan konsep |
| Jangan menjatuhkan | Akui logika yang membuat pengecoh terdengar benar |
| Hindari analisis kesalahan yang berlebihan | Cukup satu salah kaprah per pengecoh |

D juga menyarankan agar umpan balik tidak hanya berupa teks. Bila sebuah
konsep jauh lebih jelas dengan gambar, boleh dipakai **satu gambar diam
kecil** dari modulnya. Animasi tidak dipakai (§0).

### Susunan pembahasan

Jawaban salah:

1. **Mengapa pilihan ini terdengar benar**: satu kalimat.
2. **Di mana kelirunya**: tepat pada salah kaprahnya.
3. **Yang benar**: rantai sebab-akibat 2–4 langkah.
4. **Angka kunci**, bila soalnya memakai angka.
5. **Pegangan**: satu kalimat untuk diingat.
6. **Pelajari lagi**: modul · babak, berupa tautan.

Jawaban benar: langkah 3–6 saja, lebih ringkas. Yang menebak pun tetap
mendapat penjelasannya.

Batas panjang: ± 90 kata untuk langkah 1–5, supaya tetap terkelola (D) dan
tidak bergulir.

## 6. Validasi isi oleh ahli (acuan F)

Penulis soal bukan pakar gambut, jadi kebenaran soal tidak diklaim sendiri.
Setiap soal dinilai ahli.

- **Penilai:** sedikitnya 3 orang, misalnya dosen gambut atau kehutanan,
  dosen evaluasi pendidikan, dan satu praktisi (BPBD atau Manggala Agni).
  Komposisinya diputuskan bersama dosen pembimbing.
- **Yang dinilai per soal**, skala 1–5:
  1. Kesesuaian dengan materi modul
  2. Kebenaran kunci jawaban
  3. Kejelasan bahasa bagi usia 17 tahun
  4. Pengecoh masuk akal dan pasti salah
  5. Kebenaran pembahasan
- **Indeks Aiken:** V = Σs / [n(c − 1)], dengan s = r − lo, r skor penilai,
  lo skor terendah (1), n jumlah penilai, c jumlah kategori (5). Rentang 0–1.
  Batas layak diambil dari tabel peluang pada naskah Aiken (1985) sesuai
  jumlah penilai. Soal di bawah batas direvisi atau diganti.
- Hasilnya masuk Bab III atau IV sebagai tahap validasi isi. Ini berbeda dari
  pengujian black box: black box menguji fungsi website, validasi menguji
  kebenaran soal.

## 7. Kisi-kisi

### Kuis utama: 10 soal, 2 per bagian

| Bagian | Modul tersedia | Soal | Sebaran proses |
|---|---|---|---|
| Gambut | Sekitarmu, Anatomi, Hutan Rawa | 2 | Memahami, Menganalisis |
| Kering | Kanal, Musim Api | 2 | Menerapkan, Menganalisis |
| Api | Bara (Siapa yang Menyalakan? belum ada) | 2 | Memahami, Mengevaluasi |
| Dampak | Karbon (Kabut Asap, Yang Hilang dari Hutan belum ada) | 2 | Menerapkan, Menganalisis |
| Mencegah | belum ada modul; sementara Kanal Babak 04 dan Bara Babak 04 | 2 | Mengevaluasi ×2 |

Jumlahnya: memahami 2, menerapkan 2, menganalisis 3, mengevaluasi 3. Soal
untuk modul yang belum ada **ditukar** setelah modul dan acuannya jadi.

### Cek singkat: 3 soal per bagian

- Tampil sesudah modul terakhir sebuah bagian selesai.
- Format dan umpan baliknya sama dengan kuis utama, **tanpa skor**.
- Soalnya berbeda dari kuis utama, supaya kuis utama tetap menguji.
- Ditulis hanya untuk bagian yang semua modulnya sudah ada. Saat ini baru
  **Gambut** dan **Kering**.
- Bab III belum memuatnya, jadi naskah perlu satu paragraf tambahan.

## 8. Lembar soal

Satu blok per soal. Belum diisi.

```
ID          : U-01  (U = utama, C-GAM-01 = cek singkat Gambut)
Bagian      : Gambut
Modul·babak : Sekitarmu · 02
Proses      : Menganalisis · konseptual
Konsep      : <satu kalimat yang diuji>
Fakta kunci : <fakta> — <acuan modul, §>
Batang soal : ...
Pilihan     : A ... | B ... | C ... | D ...   (kunci: X)
Salah kaprah: A = ..., B = ..., D = ...  (sumber: modul/naskah/uji coba)
Pembahasan  : per pilihan, susunan §5
Periksa A   : 1 2 3 4 6 7 8 13 15 17 19 22–24 28 29  ✓/✗
Validasi F  : V = ...
```

## 9. Batas yang harus ditulis

- Pedoman A dibaca lewat rangkuman sekunder, bukan naskah aslinya. A sendiri
  sebagian besar berupa kesepakatan buku ajar, dan tidak semua pedomannya
  diuji secara eksperimen.
- D menegaskan bahwa temuan riset umpan balik tidak konsisten. Pedomannya
  titik berangkat, bukan jaminan.
- Kuis memeriksa pemahaman secara deskriptif. Bab I membatasi penelitian ini
  **tanpa mengukur peningkatan pemahaman secara statistik**, jadi hasil kuis
  tidak dipakai sebagai bukti efektivitas.
- Rumus V perlu dicocokkan dengan naskah asli F sebelum dikutip di naskah.
- C (1988) baru diperiksa data pustakanya. Uraian dua tingkat diambil dari C′,
  yang menyebut Treagust (1986) sebagai karya perintisnya.

## 10. Urutan kerja

1. Pengguna menyetujui pedoman ini.
2. Menyusun 10 soal utama, serta 6 soal cek singkat untuk Gambut dan Kering, di §8.
3. Pengguna memeriksa; uji coba pertanyaan terbuka bila memungkinkan.
4. Validasi ahli, lalu revisi.
5. Membangun halaman: `config/kuis.ts`, `lib/quiz.ts` beserta uji, dan `app/kuis/page.tsx`.
