import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Host LAN yang boleh mengambil sumber daya dev Next.js (/_next/*, HMR).
  // Tanpa ini, pengujian dari ponsel hanya memuat HTML: berkas JS ditolak,
  // hidrasi gagal, sehingga navigasi dan tombol tidak merespons.
  // Sesuaikan/tambahkan alamat bila IP laptop berubah (cek `ipconfig`).
  allowedDevOrigins: ["192.168.66.26", "192.168.1.*", "192.168.0.*"],
};

export default nextConfig;
