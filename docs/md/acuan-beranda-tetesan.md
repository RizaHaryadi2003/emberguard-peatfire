# Acuan Animasi Tetesan Beranda

Status: **DIBATALKAN** (28 November 2026). Pengguna memutuskan animasi air
tidak dipakai: realisme yang diinginkan tidak tercapai dalam batas web. Roda
faktor kini dibentuk logo yang turun lalu menggambar persegi searah jarum jam
(`lib/factorSquare.ts`). Kode air terakhir tersimpan di riwayat git, commit
8b10137. Dokumen ini disimpan sebagai catatan riset.

Status sebelumnya: draf (diperbarui 28 November 2026: percikan mahkota). Animasi
pembuka roda faktor: logo navigasi jatuh sebagai tetesan air, dilihat dari
depan, membuat percikan mahkota, lalu kamera naik ke atas dan riaknya menjadi
lingkaran faktor. Kode: `lib/waterRipple.ts`, `lib/waterCrown.ts`,
`lib/waterSplash.ts`, `components/hero/WaterDrop.tsx`.

## 0. Keputusan pengguna

| Hal | Keputusan |
|---|---|
| Gaya | 3D realistis, hitam-putih senada latar, dengan bayangan, suasana, dan pencahayaan |
| Sudut | Dari depan (bukan dari atas) |
| Gerak (27 Nov) | Tetesan kecil "plong": kawah, air memantul naik, lalu turun; tanpa percikan berantakan |
| Gerak (28 Nov, menggantikan) | Percikan mahkota seperti gambar acuan pengguna (`docs/screenshots/Screenshot 2026-11-28 at 10.46.47.png`, ilustrasi "clear transparent water splash"), diturunkan dari fisika, sasaran "mendekati sempurna" |
| Pedoman | Dokumen "Master Technical Reference — Realistic 3D Water Droplet & Splash Animation" dari pengguna: daftar periksa aspek fisika, geometri, optik, partikel, dan waktu; rumus dipilih Claude sesuai kebutuhan web |
| Pemutaran | Gulir memicu; percikan berjalan sendiri ±5 detik dalam gerak lambat; kamera dan riak sesudahnya kembali mengikuti gulir |

## 1. Acuan

| # | Acuan | Dipakai untuk | Yang terbaca |
|---|---|---|---|
| A | Lamb, H. (1932). *Hydrodynamics* (ed. 6), §255–256 (gelombang Cauchy–Poisson) dan §266–268 (gelombang kapiler) | Riak dari gangguan setempat di air dalam: η = ∫ Φ(k)(k/ω) sin(ωt) J₀(kr) k dk; relasi dispersi ω² = gk + (σ/ρ)k³; redaman kekentalan e^(−2νk²t) | Dari ingatan; **naskah belum dibaca ulang** |
| B | Worthington, A. M. (1908). *A Study of Splashes*. Longmans, Green & Co. | Urutan percikan tetesan milimeter: kawah, kolom naik, butir lepas di ujung, kolom surut | Disebut di hasil pencarian; **buku belum dibaca** |
| C | Hasil pencarian 27 November 2026: "Initiation of the Worthington jet on the droplet impact" (arXiv:1712.06800) dan Gordillo & Gekle, "Singular jets during the collapse of drop-impact craters" (*J. Fluid Mech.*, 2018) | Kolom terbentuk saat kawah runtuh; energinya dibawa gelombang kapiler yang memusat di dasar kawah | Hanya ringkasan di hasil pencarian; **naskah belum dibaca** |
| D | Laporan mahasiswa Flow Visualization, Univ. of Colorado (flowvis.org), dengan tautan video gerak lambat https://www.youtube.com/watch?v=LJqbieTvGcY | Gambaran visual jet Worthington | Hanya keterangan laporan; **video belum ditonton** |
| F | Michon, G.-J., Josserand, C., & Séon, T. (2017). Jet dynamics post drop impact on a deep pool. *Physical Review Fluids*, 2, 023601. doi:10.1103/PhysRevFluids.2.023601 | Laju jet sebanding laju kapiler √(σ/ρD), tidak bergantung kekentalan dan laju jatuh; Froude kecil → jet tipis cepat, Froude besar → jet tebal lambat | Abstrak lewat hasil pencarian 27 Nov 2026; **naskah belum dibaca** |
| G | Engel, O. G. (1966); Bisighini, A. dkk. (2010). Crater evolution after the impact of a drop onto a semi-infinite liquid target. *Phys. Rev. E*, 82, 036319 | Kawah dimodelkan setengah bola; jari-jari kawah ∝ Fr^¼ | Ringkasan lewat hasil pencarian; **naskah belum dibaca** |
| H | Panduan fotografi tetesan makro (Nikon, Canon, PetaPixel, DIYPhotography; hasil pencarian 27 Nov 2026) | Tetesan memantulkan sekelilingnya (sekitar gelap → tepi gelap); difuser besar di belakang/atas; tetesan bekerja seperti bola kristal | Ringkasan hasil pencarian |
| I | Lherm, V., & Deguen, R. (2023). Velocity field and cavity dynamics in drop impact experiments. *J. Fluid Mech.* (arXiv:2305.03709) | Urutan kawah → mahkota → kawah runtuh → kolom; jari-jari kawah ∝ Fr^¼ dari kekekalan energi; bentuk kawah (R₁/R₀: pipih ±−0,2 di awal, memanjang +0,08 pada t/t_maks 0,5, setengah bola pada 1, pipih lagi saat runtuh); kolom mulai pada t/t_maks ±1,5; We ±30–140 = daerah gelombang kapiler | **Teks lengkap dibaca** 28 Nov 2026 (rumus 3.1–3.2 rusak saat diambil, jadi koefisien φ disetel) |
| J | Deegan, R. D., Brunet, P., & Eggers, J. (2008). Rayleigh–Plateau instability causes the crown splash. arXiv:0806.3050 | Bibir mahkota pecah menjadi jari karena ketidakstabilan Rayleigh–Plateau; jumlah butir = keliling bibir / panjang gelombang puncak; jarak tidak seragam karena gangguan acak; waktu tumbuh 0,6–1,1 ms | **Teks lengkap dibaca** 28 Nov 2026; rumus N tertutup tidak ada di naskah |
| K | Rayleigh (1878); Culick (1960) | Panjang gelombang paling tumbuh tabung cair 2π/0,697 ≈ 9,02 a; laju tarik bibir lembar √(2σ/ρh) | Rumus baku buku teks, dari ingatan |
| L | Michon, Josserand & Séon (2017), lihat F | Pada Fr besar kolom tebal dan lambat | Situs HAL tidak terjangkau; **hanya ringkasan** |
| E | Numerical Recipes (Press dkk.), bab 6.5 | Pendekatan rasional fungsi Bessel J₀ dan J₁ | Rumus diuji terhadap nilai baku di `lib/waterRipple.test.ts` |

## 2. Besaran yang dipakai

| Besaran | Nilai | Dasar |
|---|---|---|
| g, σ/ρ, ν | 9,81 m/s²; 7,2·10⁻⁵ m³/s²; 1,0·10⁻⁶ m²/s | Nilai baku air ±25 °C |
| Laju fase terkecil riak | ±23 cm/s pada λ ±1,7 cm | Diuji; sesuai nilai baku air |
| Jari-jari tetesan | 1,8 mm | Tetesan kecil dari ujung pipet |
| Lingkaran faktor | 12 cm; muka riak tiba ±0,28 s | Dihitung model A |
| Kolom air | puncak ±1,3 cm, butir 1,5 mm lepas pada ±0,05 s, butir mendarat ±0,14 s, kolom kedua ±5 mm | **Disetel**, bukan diukur; agar mirip rekaman gerak lambat (B, D) |
| Kawah | dalam 2,6 mm, jari-jari 3 mm, terdalam 12 ms, runtuh 28 ms | Neraca energi (±35% energi gerak) dengan skala waktu √(ρR³/σ); acuan G |
| Laju jet | 0,75 m/s | Sebanding laju kapiler (acuan F); **disetel** |
| Tumbukan | tetesan 1,8 mm pada 3 m/s (jatuh ±46 cm): Fr ±510, We ±220 (jari-jari) | Dipilih agar sama dengan kasus B acuan I (Fr 444) dan di atas daerah kapiler |
| Kawah | jari-jari terbesar ±6,4 mm (±3,5 R), terbesar ±16 ms, habis ±27 ms | Kekekalan energi acuan I: φE = ξπρR³Ṙ² + ¼πρgR⁴ + πσR², ξ = 0,34; φ = 0,2 **disetel**; dasar kawah dibatasi U/2 di awal; runtuh 1,55× lebih cepat (**disetel**) |
| Mahkota | tinggi ±5,5 mm pada ±7 ms, tenggelam ±24 ms; dinding condong 10° (bawah) dan 38° (atas) | dH/dt = 1,35·dR/dt − g·t − tarikan Taylor–Culick; pengali dan sudut **disetel** dari foto |
| Lembar | tebal 0,36 mm di pangkal, 0,14 mm di bibir; tabung bibir 0,12→0,22 mm | **Disetel**; laju Taylor–Culick ±1 m/s |
| Jari | ±19 jari, mulai 0,14 t_maks, waktu tumbuh 0,9 ms (×0,75–1,25), lepas pada panjang 2–4,4 mm | N = keliling / (9,02 a) (acuan J, K); sebaran acak (benih tetap) |
| Butir | jari-jari ±0,3–0,55 mm, 45% jari melepas butir kedua; total volume < volume tetesan | (4/3)πr³ = λπa² (acuan K); jatuh bebas |

## 3. Optik yang ditiru

- Pembiasan sungguhan (n = 1,333) di tetesan, butir, dan kolom: sinar dilacak
  masuk dan keluar air lalu ke latar beranda (gradasi abu-abu yang diketahui),
  sehingga latar tampak terbalik di dalam tetesan (acuan H).
- Sinar yang terbelok jauh dari arah pandang melihat studio gelap → tepi air
  gelap alami.
- Pantulan Fresnel (F₀ = 0,02); softbox bertepi lembut seperti difuser besar.
- Fokus lensa makro: riak dekat percikan tajam, riak jauh melembut.
- Rona biru tipis (keputusan pengguna 28 Nov 2026, mengikuti foto acuan):
  ruang studio di tepi air biru-baja gelap, bayang di permukaan biru-gelap,
  dan penyerapan Beer–Lambert di badan air (merah diserap paling banyak).
  Penyerapannya dibesarkan demi gaya; air setebal beberapa milimeter
  sesungguhnya hampir tak berwarna.
- Lingkungan studio diperkaya (softbox kecil kiri-depan, pita cakrawala).
  Pelajaran dari demo air WebGL (Evan Wallace, ditinjau 28 Nov 2026): air
  tampak nyata bila ada lingkungan berdetail untuk dibiaskan dan dipantulkan.

## 4. Penyederhanaan yang disengaja

- Percikan dihitung dari waktu t dengan rumus dan tabel (model kinematik
  berdasar fisika), **bukan** simulasi aliran Navier–Stokes. Alasannya:
  berjalan di peramban laptop menengah dan bisa diputar dari awal kapan saja.
- Butir tidak membuat riak saat jatuh kembali dan tidak diperlambat udara
  (hambatan udara pada butir 0,5 mm di bawah 1 m/s kecil). Butir yang
  menyentuh air tenggelam di balik permukaan.
- Kabut halus, dispersi warna, dan kaustik dari mahkota tidak digambar (gaya
  hitam-putih, beban GPU).
- Pemutaran gerak lambat dipercepat bertahap (speed ramp) seperti rekaman
  kamera kecepatan tinggi: separuh pertama (±2,5 s) untuk ±28 ms mahkota,
  separuh kedua untuk kolom dan butir.

- Riak memakai teori linear. Kolom dan butir digerakkan dengan kinematika
  sederhana (perlambatan tetap, jatuh bebas), bukan simulasi aliran.
- Tinggi riak dibesarkan 2× di dekat titik jatuh (kawah tidak dibesarkan) dan kemiringannya 9× di
  tempat lain agar tampak di layar. Bentuk, jarak, dan waktunya tetap hasil model.
- Pencahayaan studio (softbox, lampu jalur) bersifat artistik, tetapi
  pantulannya mengikuti hukum Fresnel untuk air (F₀ = 0,02).
