# Sumber data peta

Atribusi wajib: peta yang memakai data OpenStreetMap harus menampilkan
"© kontributor OpenStreetMap" di halamannya.

## sekitarmu-map.json

Peta berlapis Modul 01 dalam satu proyeksi (km, ekuirektangular di lintang
-0,03°): negara di Asia Tenggara maritim, Provinsi Kalimantan Barat,
kecamatan dan sungai Kota Pontianak, serta tiga titik lokasi penelitian.

- Negara: Natural Earth 1:50m Admin 0 Countries v5.1.2 (domain publik),
  disederhanakan 4 km.
- Kalimantan Barat: relasi OpenStreetMap `boundary=administrative`,
  `admin_level=4`, `name=Kalimantan Barat` (ODbL), disederhanakan 0,8 km.
  Batas ini memuat laut wilayah provinsi; di halaman isiannya dipotong
  dengan daratan Indonesia (clipPath).
- Kecamatan dan sungai: data © kontributor OpenStreetMap (ODbL 1.0), diambil
  12 November 2026 lewat Overpass API:
  - kecamatan: relasi 10617570–10617575 (`boundary=administrative`,
    `admin_level=6`, di dalam Kota Pontianak `admin_level=5`), `out geom`;
  - sungai: `natural=water` + `water=river` dan `waterway=river` bernama
    Kapuas/Landak dalam kotak (-0.12, 109.25, 0.06, 109.42), `out geom`.
  Disederhanakan 20 m. Luas hasil olahan cocok dengan luas kecamatan yang
  tersirat dari Parabi dkk. (2026): Pontianak Utara 41,24 km² (17,320 km² ÷
  42,14% = 41,10 km²) dan Pontianak Tenggara 16,15 km² (5,798 ÷ 35,95% =
  16,13 km²).
- Titik penelitian: titik tengah ruas jalan di OpenStreetMap — Jalan
  Reformasi Untan, Jalan Sepakat II, Jalan Perdana. Ketiganya diperiksa
  berada di dalam batas Kecamatan Pontianak Tenggara.
- Diolah dengan `scripts/build-sekitarmu-map.py`.

## public/images/sekitarmu/*.jpg

Citra satelit di bawah peta Modul 01: **EOxCloudless / Sentinel-2 cloudless
2024** oleh EOX IT Services GmbH (memuat data Copernicus Sentinel 2024
yang dimodifikasi), lisensi **CC BY-NC-SA 4.0**. Hanya untuk penggunaan
non-komersial; turunan citra ini tunduk pada lisensi yang sama. Diunduh
13 November 2026 lewat WMS `https://tiles.maps.eox.at/wms`, lapisan
`s2cloudless-2024`, EPSG:4326, lalu dikompres ulang (JPEG):

| Berkas | Kotak (barat, selatan, timur, utara) | Piksel |
|---|---|---|
| indonesia.jpg | 92, −13, 144, 9 | 1600 × 676 |
| kalbar.jpg | 107,5, −3,5, 115, 2,6 | 1200 × 976 |
| pontianak.jpg | 109,22, −0,13, 109,44, 0,07 | 1700 × 1545 |

Karena proyeksi peta ekuirektangular, citra EPSG:4326 cukup ditempel
sebagai persegi panjang pada koordinat yang sama.
