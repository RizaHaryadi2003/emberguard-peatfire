import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Host LAN yang boleh mengambil sumber daya dev Next.js (/_next/*, HMR).
  // Tanpa ini, pengujian dari ponsel hanya memuat HTML: berkas JS ditolak,
  // hidrasi gagal, sehingga navigasi dan tombol tidak merespons.
  //
  // Pola ditulis luas agar tetap cocok saat laptop berpindah jaringan dan
  // mendapat alamat baru. Ketiga rentang di bawah adalah blok IP privat
  // (RFC 1918), yaitu satu-satunya alamat yang mungkin dipakai di LAN:
  //   192.168.*.*  — jaringan rumah
  //   172.16–31.*  — jaringan kantor/kampus, mis. "UPZ SPACE" (172.25.x.x)
  //   10.*.*.*     — tethering ponsel dan jaringan besar
  allowedDevOrigins: ["192.168.*.*", "172.*.*.*", "10.*.*.*"],
};

export default nextConfig;
