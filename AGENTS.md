# Konteks Proyek

Tahap awal. Belum ada spesifikasi, belum ada nama produk, belum ada keputusan
rancangan. Jangan mengasumsikan apa pun dari isi proyek sebelumnya.

## Cara kerja

- Balasan ringkas. Baca berkas seperlunya, gabungkan panggilan alat yang tidak
  saling bergantung dalam satu giliran. Penghematan ini tidak boleh mengorbankan
  mutu kode maupun pengujian.
- Proyek memakai git sejak 30 September 2026. Sebelum mengubah banyak berkas,
  pastikan pohon kerja bersih agar perubahan mudah ditinjau dan dibatalkan.
- Dokumen skripsi, berkas administrasi, dan arsip pihak ketiga di dalam docs/
  tidak diikutsertakan ke repositori. Jangan mendaftarkannya secara paksa.

## Bahasa

- Teks yang dilihat pengguna: Bahasa Indonesia.
- Komentar kode: Bahasa Indonesia, karena akan dibaca dosen pembimbing dan penguji.
- Nama fungsi, tipe, dan variabel: Bahasa Inggris, kecuali bila nama itu harus
  muncul pada diagram alir atau tabel pengujian di naskah skripsi.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
