# Sumber data peta

## pontianak-map.json

Batas enam kecamatan Kota Pontianak dan badan Sungai Kapuas Kecil serta
Sungai Landak, disederhanakan menjadi lintasan SVG (viewBox 1000 × 1218,
satu satuan = 0,01238 km).

- Data © kontributor OpenStreetMap, lisensi ODbL 1.0
  (https://www.openstreetmap.org/copyright). Atribusi wajib ditampilkan di
  halaman yang memakai peta ini.
- Diambil 12 November 2026 lewat Overpass API:
  - kecamatan: relasi 10617570–10617575 (`boundary=administrative`,
    `admin_level=6`, di dalam Kota Pontianak `admin_level=5`), `out geom`;
  - sungai: `natural=water` + `water=river` dan `waterway=river` bernama
    Kapuas/Landak dalam kotak (-0.12, 109.25, 0.06, 109.42), `out geom`.
- Diolah dengan `scripts/build-pontianak-map.py` (proyeksi ekuirektangular di
  lintang -0,03°, Douglas-Peucker 20 m).

Pemeriksaan: luas hasil olahan cocok dengan luas kecamatan yang tersirat dari
Parabi dkk. (2026) — Pontianak Utara 41,24 km² (Parabi: 17,320 km² ÷ 42,14%
= 41,10 km²) dan Pontianak Tenggara 16,15 km² (5,798 ÷ 35,95% = 16,13 km²).

Batasan: peta ini memuat batas kecamatan, bukan batas gambut. Parabi dkk.
(2026) melaporkan luas gambut per kecamatan, bukan poligonnya, jadi modul
tidak boleh mewarnai seluruh kecamatan seolah-olah seluruhnya gambut.
