# Sumber tekstur Modul Gambut

Semua tekstur berasal dari [ambientCG](https://ambientcg.com) dengan lisensi
**CC0 1.0 (Public Domain)**, jadi bebas dipakai tanpa atribusi. Berkas asli
berukuran 1K JPG, lalu dikompres menjadi WebP (warna 1024 px, normal 512 px).

| Berkas | Aset ambientCG | Dipakai untuk |
|---|---|---|
| `fibrik_*` | Ground082S | Lapisan gambut fibrik (serat kasar) |
| `hemik_*` | Ground048 | Lapisan gambut hemik |
| `saprik_*` | Ground036 | Lapisan gambut saprik (diberi rona coklat gelap) |
| `mineral_*` | Ground026 | Tanah mineral / lempung (diberi rona abu) |
| `permukaan_*` | Ground037 | Lantai hutan lembap berlumut |
| `permukaan_kering_*` | Ground071 | Lantai hutan saat kering |

Pohon dan tumbuhan memakai model 3D (lihat `public/models/gambut/SUMBER.md`).
Bara, percikan api, asap, dan genangan tidak memakai berkas gambar:
semuanya digambar lewat kanvas 2D di `components/gambut/anatomi/scene/proceduralTextures.ts`.

## Latar belakang

| Berkas | Sumber | Keterangan |
|---|---|---|
| `latar_hutan.webp` | [Pexels #10233787](https://www.pexels.com/photo/tree-trunks-in-the-forest-10233787/) (Lisensi Pexels, bebas pakai) | Hutan rawa berkabut; dipotong, diburamkan, dan diredupkan agar tidak menonjol |
