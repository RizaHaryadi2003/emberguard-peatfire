# Acuan Modul 09 · Kabut Asap

Status: **diriset dan dibangun** 24 November 2026 atas permintaan pengguna
("riset → teks → implementasi", konsep boleh berbeda dari modul lain).
Teks: `config/modul/kabut-asap.ts`; model: `lib/model/haze.ts` (+ uji).
Nomor modul mengikuti `config/modules-content.ts` (Bagian 4 · Dampak, modul kedua).

## 0. Penentuan tema

1. **Celah pada rantai.** Modul Karbon menjawab *apa yang lepas ke udara*
   (karbon dioksida). Yang dirasakan langsung oleh warga Pontianak bukan
   karbonnya, melainkan **asap yang dihirup**. Modul ini menjawab mata rantai
   itu: dari udara ke paru-paru.
2. **Salah kaprah pembaca.** Bagi pembaca 17 tahun: *asap hanya mengganggu
   pemandangan dan bau; masker apa pun sudah melindungi.* Keduanya bisa
   dibantah lewat aksi: memperbesar partikelnya, dan menguji masker.
3. **Konsep berbeda.** Modul lain memakai bongkahan atau lanskap. Modul ini
   memakai **tiga skala**: mikroskop (partikel), jendela kota (udara Pontianak),
   dan napas (masker). Pembaca berpindah dari yang terkecil ke yang terdekat
   dengan tubuhnya.

## 1. Pertanyaan modul

> **Apa yang sebenarnya kita hirup saat Pontianak berkabut asap, dan apa yang
> bisa menahannya?**

Pengetahuan "sebelum → sesudah": *asap hanya gangguan pandangan; masker apa
pun cukup* → *yang berbahaya adalah partikel halus PM2.5, tiga puluh kali lebih
kecil dari sehelai rambut; angka ISPU memberi tahu kapan harus berlindung; dan
hanya masker yang rapat ke wajah yang benar-benar menahannya.*

## 2. Sumber utama

| # | Sumber | Dipakai untuk | Teks dibaca |
|---|---|---|---|
| A | US EPA. *Particulate Matter (PM) Basics*. epa.gov/pm-pollution/particulate-matter-pm-basics | PM2.5 = partikel berdiameter ≤ 2,5 µm; rambut rata-rata **±70 µm**, "30 kali lebih besar dari partikel halus terbesar"; partikel < 10 µm dapat masuk jauh ke paru-paru, dan PM2.5 paling berisiko bagi kesehatan | Kutipan halaman lewat hasil pencarian |
| B | Peraturan Menteri LHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020 tentang Indeks Standar Pencemar Udara (BN 774/2020) | **Lampiran I**: konversi PM2.5 24 jam ↔ ISPU: 15,5 µg/m³ = 50; 55,4 = 100; 150,4 = 200; 250,4 = 300; 500 = >300; rumus interpolasi lurus (1). **Lampiran II**: kategori Baik (hijau, 1–50), Sedang (biru, 51–100), Tidak Sehat (kuning, 101–200), Sangat Tidak Sehat (merah, 201–300), Berbahaya (hitam, ≥ 301), beserta "apa yang harus dilakukan" | **Lengkap** (PDF peraturan.go.id) |
| C | Pontianak Post (9 Agustus 2026). "Kabut Asap Ganggu Pontianak, Warga Diminta Waspada" | 8 Agustus 2026 pukul 09.00: **AQMS Pontianak Tenggara**, satu-satunya stasiun KLH di Kota Pontianak, mencatat **ISPU PM2.5 88 (Sedang)**; asap "berasal dari kebakaran lahan di sejumlah kabupaten sekitar" | Lengkap |
| D | RRI Pontianak (27 Agustus 2026). "Udara Pontianak Berbahaya, ISPU Tembus Angka 312" | **Hook.** 27 Agustus 2026 pukul 08.00 WIB, ISPUnet: **ISPU 312, Berbahaya**; PM2.5 parameter dominan | Lengkap |
| E | CNN Indonesia & Pontianak Post/Antara (30 Agustus 2026), pernyataan Wali Kota Pontianak | TK–SMP belajar daring sepekan lagi; pembelajaran daring di bulan Agustus sudah **tiga pekan**; **ISPA ±300 kasus per hari** | Lengkap |
| F | Kodros, J. K., O'Dell, K., Samet, J. M., L'Orange, C., Pierce, J. R., & Volckens, J. (2021). Quantifying the health benefits of face masks and respirators to mitigate exposure to severe air pollution. *GeoHealth*, 5(9), e2021GH000482. doi:10.1029/2021GH000482 | **Babak 03.** Faktor perlindungan untuk sebaran ukuran asap kebakaran (Tabel 2): kain alami **1,4**, sintetis **2,2**, masker medis **1,9**, N95 **16,2**. Kebocoran bawaan (Tabel 1): N95 5 %, medis **50 %**, kain 5 %. N95 menahan sedikitnya 97 % partikel; medis menyaring baik tetapi bocor di tepinya. Kunjungan rumah sakit karena gangguan napas turun: kain ±6 %, sintetis 13 %, medis 17 %, N95 **30 %** | **Lengkap** (Europe PMC) |
| G | Hu, Y., Fernandez-Anez, N., Smith, T. E. L., & Rein, G. (2018). Review of emissions from smouldering peat fires and their contribution to regional haze episodes. *International Journal of Wildland Fire*, 27(5), 293–312. doi:10.1071/WF17084 | Asap gambut yang membara **tetap dekat permukaan** dan menimbulkan kabut berhari-hari sampai berminggu-minggu | Ringkasan lewat hasil pencarian |
| H | Jayarathne, T., Stockwell, C. E., dkk. (2018). Chemical characterization of fine particulate matter emitted by peat fires in Central Kalimantan, Indonesia, during the 2015 El Niño. *Atmospheric Chemistry and Physics*, 18, 2585–2600 | Faktor emisi PM2.5 gambut Kalteng 2015: rata-rata **17,3 ± 6,0 g per kg** gambut terbakar | Abstrak |

## 3. Keterbatasan

- F mengukur masker buatan Amerika Serikat dengan sebaran ukuran asap
  kebakaran hutan Washington 2012, bukan asap gambut Kalimantan. Yang dipakai
  di layar adalah **urutan dan besar kasarnya**, ditulis "kira-kira".
- Persentase "yang lolos" di babak 03 = 1 ÷ faktor perlindungan (F, Tabel 2),
  dihitung sendiri: kain 71 %, sintetis 45 %, medis 53 %, N95 6 %.
- Angka 20 Agustus (AQI 191, PM2.5 112 µg/m³) di Wikipedia tidak bersumber
  jelas, jadi **tidak dipakai**. Hanya dua hari yang terverifikasi (C, D).
- Konsentrasi µg/m³ untuk ISPU 312 tidak diberitakan; modul menampilkan ISPU
  apa adanya. Penggeser ISPU di babak 02 adalah pengandaian, dengan dua titik
  sungguhan sebagai penanda.
- Kalimat "masuk ke aliran darah" **tidak** dipakai: A menyebutnya untuk
  partikel < 10 µm secara umum, bukan khusus PM2.5.
- "ISPA 300 per hari" adalah pernyataan Wali Kota (E), bukan data dinas
  kesehatan yang diterbitkan.

## 4. Rancangan babak

| Babak | Tugas pembaca | Yang berubah | Sesudahnya pembaca tahu | Sumber |
|---|---|---|---|---|
| 01 · Sekecil apa | Memperbesar mikroskop dari 1× sampai sehelai rambut tampak seperti batang kayu, lalu menemukan butir PM2.5 | Rambut 70 µm membesar; butir PM10 dan PM2.5 muncul; 28 butir PM2.5 berjajar selebar rambut | Partikel asap terlalu kecil untuk dilihat dan disaring hidung; yang terkecil paling berbahaya | A |
| 02 · Jendela Pontianak | Menggeser ISPU dari udara bersih sampai berbahaya, lalu membuka dua hari sungguhan Agustus 2026 | Pemandangan Sungai Kapuas dan kota dari jendela memudar ke jingga-kelabu; kategori, warna, dan anjuran resmi berganti | ISPU dibaca dari PM2.5; tiap kategori punya anjuran; 8 Agustus masih Sedang, 27 Agustus Berbahaya | B, C, D, E, G |
| 03 · Satu tarikan napas | Memilih masker (kain, sintetis, medis, N95 rapat) lalu menarik napas | Seratus butir asap mengalir ke masker; sebagian tertahan, sebagian lolos lewat kain atau lewat celah tepi | Masker medis menyaring baik tetapi separuh udara bocor di tepinya; hanya N95 yang rapat menahan ±94 % | F |

**Arahan terakhir:** "Saat ISPU berbahaya, anjurannya tetap di dalam ruangan.
Bila harus keluar, pakai masker yang rapat ke wajah. Asap ini datang dari
gambut yang terbakar, dan hanya berhenti bila gambutnya tidak terbakar."
→ panah ke Modul Yang Hilang dari Hutan.

## 5. Model (`lib/model/haze.ts`)

- `ispuFromPm25(µg/m³)` dan `pm25FromIspu(ispu)`: interpolasi lurus Lampiran I
  B (rumus 1). Di atas ISPU 300 dipakai pasangan (300, 250,4)–(500, 500).
- `ispuCategory(ispu)`: Lampiran II B.
- `MASKS`: faktor perlindungan asap kebakaran (F, Tabel 2) dan kebocoran
  bawaan (F, Tabel 1); `passThrough(mask)` = 1 ÷ faktor.
- `breath(mask, n, seed)`: butir mana yang lolos lewat kain, lewat celah, atau
  tertahan, berbenih tetap. Pembagian lolos-lewat-celah vs lewat-kain
  **ilustratif**: sebanding dengan kebocoran bawaan.

## 6. Jendela siang–malam (`lib/model/daylight.ts`)

Penggeser **Waktu** di Babak 02 mengubah cahaya pemandangan; tidak mengubah
ISPU. Semua takarannya **ilustratif**, bukan pengukuran:

- Pontianak berada di garis khatulistiwa, jadi panjang siang hampir tetap
  sepanjang tahun (±12 jam): terbit ±05.50 WIB, terbenam ±17.55 WIB. Ketinggian
  matahari didekati gelombang sinus.
- Keramaian kota (`cityActivity`), paduan kicau burung (`birdChorus`), dan
  lampu menyala (`lightsOn`) adalah kurva perkiraan untuk suara dan cahaya.
- Malam berkabut tampak jingga karena cahaya lampu kota dipantulkan butir
  asap; makin pekat kabutnya, bintang makin hilang.
- Tombol hari sungguhan juga memindahkan jam ke waktu pengukurannya
  (8 Agustus 09.00, 27 Agustus 08.00).
- Suara Babak 02 berganti ke suara kota (dengung lalu lintas, motor lewat,
  klakson jauh, mesin klotok); makin pekat kabutnya, makin lengang kotanya.
