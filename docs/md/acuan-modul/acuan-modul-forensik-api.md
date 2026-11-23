# Acuan Modul 06 · Forensik Api

Status: **acuan dan teks layar ditulis** (24 November 2026). Judul semula
"Siapa yang Menyalakan?" diganti pengguna menjadi **Forensik Api**. Teks:
`config/modul/forensik-api.ts`; model: `lib/model/ignition.ts` (+ uji).
Animasi belum dibangun, menunggu persetujuan teks.
Nomor modul mengikuti `config/modules-content.ts` (Bagian 3 · Api, modul
pertama; modul kedua adalah Bara di Bawah Tanah).

## 0. Penentuan tema

Tema ditentukan dengan empat langkah, berurutan:

1. **Celah pada rantai sebab-akibat.** Kelima bagian modul disusun sebagai
   rantai: Gambut (tanahnya) → Kering (mengapa ia kering) → **Api (dari mana
   api datang)** → Dampak → Mencegah. Modul Kanal dan Musim Api sudah menjawab
   "mengapa gambut kering", Modul Bara menjawab "bagaimana api merambat di
   bawah tanah". Yang belum terjawab adalah mata rantai di antaranya: *dari
   mana percikan pertama datang*. Tema modul ini adalah celah itu.
2. **Salah kaprah pembaca.** Yang perlu dibantah bagi pembaca 17 tahun:
   gambut terbakar sendiri karena panas, dan kebakaran bermula di hutan.
   Tema dipilih supaya pengetahuan "sebelum → sesudah" (§1) bisa ditunjukkan
   lewat aksi, bukan hanya dikatakan.
3. **Acuan riset yang menentukan sudut pandang.** Cattau dkk. (2016) adalah
   satu-satunya studi yang ditemukan yang memisahkan *tempat api menyala* dari
   *tempat api terlihat menjalar*, dengan menelusuri titik api satelit mundur
   ke deteksi paling awal. Cara kerja itu sejenis forensik kebakaran
   (penulisnya sendiri menyebut *fire forensics* sebagai cara memastikan
   sumber sulut). Karena itu modul tidak bertanya "siapa pelakunya", yang
   tidak bisa dijawab satelit, melainkan "di mana dan bagaimana api lahir".
4. **Judul.** Usulan awal "Siapa yang Menyalakan?" dan judul polos lain
   (Titik Sulut, Asal Mula Api, Percikan Pertama, Sumber Penyulutan) ditolak
   pengguna karena terdengar seperti tema pelajaran SD. **Forensik Api**
   dipilih karena (a) memakai istilah bidang ilmu yang sungguh dipakai, (b)
   langsung menyebut cara kerja modul, yaitu menelusuri kebakaran mundur ke
   titik sulutnya, dan (c) menjadi pola cerita yang berbeda dari modul lain:
   pembaca berperan sebagai penyelidik, bukan pengubah keadaan.
   Keterangan di daftar modul: "Merekonstruksi titik sulut kebakaran gambut".

## 1. Pertanyaan modul

Modul Kanal dan Musim Api menjelaskan mengapa gambut menjadi kering. Modul ini
menjawab pertanyaan sesudahnya:

> **Kalau gambut sudah kering, dari mana apinya datang?**

Pengetahuan "sebelum → sesudah": *gambut terbakar sendiri karena panas
kemarau, dan api bermula di hutan* → *gambut tidak menyala sendiri. Percikan
datang dari manusia, dan cukup sekecil puntung bila gambutnya kering. Api
hampir selalu lahir di lahan terbuka yang sudah rusak, bukan di hutan. Satu
api kecil yang lolos dari pengawasan menjadi api terbesar.*

## 2. Sumber utama

Polanya sama seperti modul lain: **mekanisme** (riset dasar) + **riset
Kalimantan** + **keadaan Pontianak tahun ini**.

| # | Sumber | Jenis data | Dipakai untuk | Teks dibaca |
|---|---|---|---|---|
| A | Cattau, M. E., Harrison, M. E., Shinyo, I., Tungau, S., Uriarte, M., & DeFries, R. (2016). Sources of anthropogenic fire ignitions on the peat-swamp landscape in Kalimantan, Indonesia. *Global Environmental Change*, 39, 205–219. doi:10.1016/j.gloenvcha.2016.05.005 | Titik api MODIS 2000–2010, 2,5 juta ha gambut Kalteng (Sebangau–Katingan + eks-PLG), dikelompokkan menjadi kejadian api; deteksi paling awal = titik sulut | **Inti modul.** Letak titik sulut (Tabel 1, metode ketetanggaan): **lahan terbuka 71,2 %**, kebun sawit 17,0 %, hutan 8,8 %, dalam 5 km dari kampung 9,1 %. Kerapatan sulut: lahan terbuka **0,060/km²**, sawit 0,055, hutan **0,006** (±10×). **80 %** api hanya menyala 1 hari. Api yang lolos dari kebun sawit: **10,5 %**, menyala rata-rata **6,7 hari** dibanding 1,6 hari (Tabel 3–4). Api di hutan yang berdampak besar **56,7 %** berasal dari lahan terbuka di luarnya (Tabel 2) | **Lengkap** (PDF lab Uriarte, Columbia) |
| B | Lin, S., Zhang, T., Huang, X., & Gollner, M. J. (2024). The initiation of smouldering peat fire by a glowing firebrand. *International Journal of Wildland Fire*, 33(4), WF23116. doi:10.1071/WF23116 | Uji laboratorium: satu bara kayu kecil (Ø 6 mm × 3 cm) dijatuhkan ke gambut, kadar air 5–100 %, angin 0–1 m/s | **Ambang sulut**: kadar air **< 35 %** selalu menyala walau tanpa angin; **35–85 %** perlu angin, makin basah makin kencang; **> 85 %** tidak pernah menyala walau angin > 1 m/s. Pendahuluannya: di Asia Tenggara pembukaan lahan dengan api adalah penyulut utama kebakaran gambut | Teks HTML sampai Kesimpulan; persamaan 2 belum dicocokkan dengan PDF |
| C | Usup, A., Hashimoto, Y., Takahashi, H., & Hayasaka, H. (2004). Combustion and thermal characteristics of peat fire in tropical peatland in Central Kalimantan. *Tropics*, 14(1), 1–19. doi:10.3759/tropics.14.1 | Pengamatan kebakaran sungguhan, 9 petak, 2002 | Pembukaan lahan dengan api adalah penyebab utama; titik sulut hanya berkembang bila panas bertahan **1–2 jam** (hlm. 10–11). Sudah dipakai Modul Bara | **Lengkap** (lihat acuan Bara) |
| D | Dennis, R. A., Mayer, J., Applegate, G., dkk. (2005). Fire, people and pixels: Linking social science and remote sensing to understand underlying causes and impacts of fires in Indonesia. *Human Ecology*, 33(4), 465–504. doi:10.1007/s10745-005-5156-z | 8 lokasi Borneo–Sumatra, gabungan wawancara dan citra | Penyebab **selalu lebih dari satu** dan berbeda antarlokasi; perusahaan dan petani sama-sama memakai api | Abstrak |
| E | InfoPublik (18 September 2026) dan RRI Pontianak (27 Juli 2026), pernyataan Wali Kota Pontianak | Berita resmi pemerintah kota | **Hook.** Agustus 2026: lahan terbakar di **Siantan Hilir** (±1 ha, 22/8) dan **Siantan Hulu** (±1 ha, 24/8), Pontianak Utara; laporan lain di Parit Demang (±2 ha), **Jl. Sepakat 2** (±2 ha), Jl. Perdana (±1 ha), Batu Layang (±6 ha). Sebagian besar tanah kosong tanpa penjaga. Polisi menyelidiki unsur kesengajaan | Lengkap |
| F | Peraturan Wali Kota Pontianak No. 55/2018 tentang Larangan Pembakaran Lahan, diubah Perwa No. 114/2021; Surat Edaran Wali Kota No. 50/2026 | Peraturan | Penutup: membuka lahan dengan membakar **dilarang** di Pontianak; lahan yang terbakar dapat disegel | Judul dan isi pokok lewat berita; teks penuh belum dibaca |

### Kekuatan tiap sumber

- **A** adalah satu-satunya studi yang memisahkan *tempat api menyala* dari
  *tempat api menjalar*. Studi titik api lain hanya menunjukkan di mana api
  terlihat. Inilah dasar ilmiah pertanyaan "siapa yang menyalakan". Para
  penulis bekerja bersama CIMTROP Universitas Palangka Raya.
- **B** adalah uji laboratorium terbaru tentang bara kecil sebagai penyulut
  gambut (Berkeley dan Hong Kong PolyU), memakai metode peluang sulut Frandsen
  yang juga dipakai Modul Bara.
- **C** menghubungkan modul ini dengan Modul Bara secara langsung.
- **E** bukan riset; dipakai hanya untuk hook "tahun ini, di kotamu". Siantan
  dan Jl. Sepakat 2 berada di Pontianak Utara dan Tenggara, dua kecamatan yang
  menurut Parabi dkk. (2026, acuan Sekitarmu) memang bergambut, dan Jl.
  Sepakat 2 adalah lokasi penelitian lahan bekas terbakar 2018 (Rahsia dkk.
  2020, acuan Sekitarmu).

## 3. Keterbatasan

- A diukur di **Kalimantan Tengah**, bukan Kalbar. Di layar ditulis "di
  lahan gambut Kalimantan". Riset sejenis untuk Kalbar yang ditemukan hanya
  makalah kecil (72 titik api 2020, jarak ke jalan dan sungai berpengaruh;
  Debataraja dkk., *Barekeng*), belum dibaca dan tidak dipakai.
- A memakai satelit, jadi **tidak bisa menyebut orangnya**. Penulis sendiri
  melarang metodenya dipakai untuk menyalahkan pemilik lahan tertentu. Modul
  karena itu bertanya "di mana api lahir", bukan "siapa pelakunya".
- Kelas "lahan terbuka" di A campuran: pakis, semak, gambut gundul, kebun muda,
  dan hutan sangat rusak. Kelas sawit hanya mencakup konsesi resmi, sehingga
  penulis menduga porsi sawit sebenarnya lebih besar.
- B memakai gambut lumut (*sphagnum*) dari Amerika Serikat dan bara kayu,
  bukan puntung rokok. "Seukuran puntung" di layar adalah **perbandingan
  ukuran** (bara uji Ø 6 mm × 3 cm, kira-kira sebesar puntung), bukan hasil uji
  puntung. Belum ditemukan uji puntung pada gambut tropis.
- Kadar air di B dihitung terhadap berat kering, bukan muka air tanah, jadi
  **tidak disambungkan** ke garis 40/60 cm Modul Musim Api.
- Kalimat Wali Kota "99,9 persen ulah manusia" (RRI) adalah pendapat, bukan
  data, dan tidak dipakai di layar.
- Pasal 69 ayat 2 UU 32/2009 (kearifan lokal membakar ≤ 2 ha) sengaja tidak
  dibahas: masih diperdebatkan, dan aturan kota Pontianak sudah melarang.

## 4. Rancangan babak (usulan, 3 babak)

**Pola cerita yang berbeda.** Modul lain mengajak pembaca *mengubah keadaan*
(menggeser muka air, memutar kalender). Modul ini mengajak pembaca
**menyelidiki mundur**: pembaca menjadi penyelidik api yang memutar waktu ke
belakang, dari lahan yang sudah hangus ke percikan pertama. Tata cara modul
tetap sama (ActModuleShell, tuntunan GuideLayer, kolom kanan, diorama 3D),
hanya alur ceritanya yang berbeda.

**Hook.** "Agustus 2026. Enam lahan terbakar di Pontianak Utara dan Tenggara."
Lalu: "Gambut tidak bisa menyalakan dirinya sendiri. Jadi, siapa?" (E)

| Babak | Tugas pembaca | Yang berubah di diorama | Sesudahnya pembaca tahu | Sumber |
|---|---|---|---|---|
| 01 · Percikan | Menjatuhkan satu bara seukuran puntung ke petak gambut, lalu mengubah kebasahan gambut (basah · lembap · kering) dan angin | Gambut basah: bara padam. Lembap: hanya menyala bila ada angin. Kering: bara masuk, asap tipis keluar, tanpa nyala | Percikan sekecil itu cukup bila gambut kering; tanpa percikan, gambut kering pun tidak terbakar | B, C |
| 02 · Titik pertama | Memutar waktu ke belakang pada peta satelit sebuah lanskap (hutan, lahan terbuka, kebun, kampung, kanal) sampai menemukan titik api paling awal; sebelumnya menebak di mana api bermula | Titik panas menyala hari demi hari; saat diputar mundur, titik menyusut ke satu sel pertama. Sesudah tebakan dibuka: tally 71 % lahan terbuka, 17 % kebun, 9 % hutan | Api hampir tidak pernah lahir di hutan basah; ia lahir di lahan terbuka yang sudah rusak, tempat orang datang dan bekerja | A |
| 03 · Api yang lolos | Menyalakan api pembersih lahan kecil di tepi lahan terbuka dekat hutan, lalu melihat ke mana api itu pergi (sepuluh kali) | Kebanyakan api padam dalam sehari dan tinggal di petaknya; sesekali satu api lolos, menyeberang ke hutan, dan menyala berhari-hari | Puluhan api kecil padam sendiri, tetapi satu yang lolos menyala ±4× lebih lama dan menjadi kebakaran hutan; hutan terbakar oleh api yang datang dari luar | A |

**Arahan terakhir** (tanpa kartu, sesuai keputusan 21 November 2026): "Gambut
tidak menyala sendiri. Percikan dari tangan manusia ditambah gambut kering,
itulah awal asap. Di Pontianak, membuka lahan dengan membakar dilarang." (F)
→ panah ke Modul Bara ("lalu ke mana api itu pergi di bawah tanah?").

### Sumber tiap angka di layar

| Letak di layar | Angka / klaim | Sumber |
|---|---|---|
| Hook | enam lahan, Pontianak Utara dan Tenggara, Agustus 2026 | E |
| Babak 01 | kering selalu menyala, lembap perlu angin, basah tidak pernah | B |
| Babak 01 | bara seukuran puntung | B (ukuran bara uji; lihat §3) |
| Babak 01 | api pembuka lahan adalah penyulut utama | B (pendahuluan), C |
| Babak 02 | 71 % lahan terbuka, 17 % kebun sawit, 9 % hutan | A, Tabel 1 |
| Babak 02 | lahan terbuka ±10× lebih sering tersulut daripada hutan | A, Tabel 1 (0,060 vs 0,006/km²) |
| Babak 03 | 8 dari 10 api padam dalam sehari | A, §3.1 |
| Babak 03 | api yang lolos menyala ±7 hari, yang tidak lolos ±2 hari | A, Tabel 4 (6,7 vs 1,6) |
| Babak 03 | lebih dari separuh api besar di hutan datang dari lahan terbuka | A, Tabel 2 (56,7 %) |
| Arahan terakhir | membakar lahan dilarang di Pontianak | F |

### Yang sengaja tidak dibuat

- Daftar pelaku (perusahaan, petani, pemburu): A sendiri tidak bisa
  menunjuknya, dan modul ini bukan soal siapa yang disalahkan.
- Faktor ekonomi (biaya membakar vs alat berat): sesuai kesepakatan sebelumnya,
  modul tidak membahas faktor ekonomi.
- Jarak titik sulut dari kampung (puncak ±7,2 km, A): benar, tetapi bedanya
  jumlah dan kerapatan terlalu halus untuk pembaca 17 tahun.

## 5. Model (usulan, `lib/model/ignition.ts`)

- **Peluang sulut (babak 01):** aturan tiga wilayah dari B: kadar air < 35 %
  → menyala; 35–85 % → menyala bila angin ≥ ambang yang naik lurus dari
  ±0,1 m/s (40 %) ke ±0,9 m/s (80 %); > 85 % → padam. Pilihan di layar
  dibulatkan ke tiga keadaan (basah 100 %, lembap 60 %, kering 25 %) dan dua
  angin (tenang, berangin 1 m/s).
- **Lanskap (babak 02):** kisi 24 × 16 sel, **1 sel = 1 km²** (sebesar satu
  piksel titik api MODIS di A). Tata letak ilustratif: sungai dan kampung di
  kiri, kebun sawit kiri bawah, lahan terbuka berkanal di tengah, hutan di
  kanan. Titik sulut kasus di lahan terbuka tepi kanal, **8 km** dari kampung.
  Api menyeberang ke empat tetangganya tiap hari dengan peluang **ilustratif**
  (lahan terbuka 0,4, kebun 0,3, hutan 0,3; sungai dan kampung 0), benih acak
  tetap (2026) supaya kebakarannya selalu sama. Hasil: 72 km² dalam 10 hari,
  masuk hutan hari ke-4. Angka persentase di layar **tidak** berasal dari
  simulasi ini, melainkan langsung dari Tabel 1 A.
- **Sepuluh api (babak 03):** urutan **tetap**, bukan acak: 8 padam dalam
  sehari (= 80 %, A §3.1), 1 padam setelah 2 hari, 1 lolos ke hutan dan
  menyala 7 hari (A Tabel 4: 6,7 hari; lolos ±10 %, A Tabel 3). Api yang lolos
  diletakkan ketujuh agar pembaca melihat api padam lebih dulu.
- Diuji di `lib/model/ignition.test.ts` (19 uji).
