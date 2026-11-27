# Acuan Animasi Tetesan Beranda

Status: **draf** (27 November 2026). Animasi pembuka roda faktor: logo navigasi
jatuh sebagai tetesan air, dilihat dari depan, lalu kamera naik ke atas dan
riaknya menjadi lingkaran faktor. Kode: `lib/waterRipple.ts`,
`lib/waterSplash.ts`, `components/hero/WaterDrop.tsx`.

## 0. Keputusan pengguna

| Hal | Keputusan |
|---|---|
| Gaya | 3D realistis, hitam-putih senada latar, dengan bayangan, suasana, dan pencahayaan |
| Sudut | Dari depan (bukan dari atas) |
| Gerak | Tetesan kecil "plong": kawah, air memantul naik, lalu turun; tanpa percikan berantakan |

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
| Laju jet | 0,8 m/s ≈ 5,7 × √(σ/ρD) | Sebanding laju kapiler (acuan F); faktor pengali **disetel** |

## 3. Optik yang ditiru

- Pembiasan sungguhan (n = 1,333) di tetesan, butir, dan kolom: sinar dilacak
  masuk dan keluar air lalu ke latar beranda (gradasi abu-abu yang diketahui),
  sehingga latar tampak terbalik di dalam tetesan (acuan H).
- Sinar yang terbelok jauh dari arah pandang melihat studio gelap → tepi air
  gelap alami.
- Pantulan Fresnel (F₀ = 0,02); softbox bertepi lembut seperti difuser besar.
- Fokus lensa makro: riak dekat percikan tajam, riak jauh melembut.

## 4. Penyederhanaan yang disengaja

- Riak memakai teori linear. Kolom dan butir digerakkan dengan kinematika
  sederhana (perlambatan tetap, jatuh bebas), bukan simulasi aliran.
- Tinggi riak dibesarkan 3× di dekat titik jatuh dan kemiringannya 9× di
  tempat lain agar tampak di layar. Bentuk, jarak, dan waktunya tetap hasil model.
- Pencahayaan studio (softbox, lampu jalur) bersifat artistik, tetapi
  pantulannya mengikuti hukum Fresnel untuk air (F₀ = 0,02).
