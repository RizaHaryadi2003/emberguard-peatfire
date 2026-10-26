"use client";

import { Html } from "@react-three/drei";
import {
  floorY,
  surfaceY,
  xOfDistance,
  BLOCK_DEPTH,
  CANAL_HALF_M,
  DEPTH_TICKS,
  DISTANCE_TICKS,
  HALF_WIDTH,
  V_SCALE,
} from "./transect";

// Penggaris pada bongkahan.
//
// Tugasnya di sini berbeda dari rancangan sebelumnya. Dahulu penggaris jarak
// harus menjawab pertanyaan babak 02 — sampai jarak berapa muka airnya
// melewati batas 40 cm — dan untuk itu ia harus membentang satu kilometer.
// Pertanyaan itu sekarang dijawab grafik di panel kanan, yang memang bentuk
// yang benar untuk mengukur.
//
// Yang tersisa di sini tugas yang lebih sederhana dan lebih penting: memberi
// ukuran pada gambarnya. Pembaca harus tahu bahwa kanal itu selebar delapan
// meter dan sedalam tiga, dan bahwa petak yang dilihatnya hanya beberapa
// puluh meter — bukan seluruh lanskap. Tanpa itu, ia akan mengira sudah
// melihat seluruh kerusakan, padahal yang terlihat baru tepinya.
//
// Angkanya ditulis sebagai DOM lewat `Html`, bukan sebagai geometri teks,
// supaya tetap tajam pada resolusi berapa pun dan dapat dibaca pembaca layar.

// Di layar sempit penggarisnya disembunyikan. Pada lebar ponsel, gambar
// bongkahannya mengecil sampai keempat penanda kedalaman jatuh dalam ruang
// setinggi dua baris teks dan saling bertindihan — yang tersisa bukan
// penggaris, melainkan gumpalan angka yang menutupi tepi gambar. Keterangan
// skalanya tetap ada di panel kanan, dan lebar kanal tetap tertulis pada
// gambarnya sendiri.

/** Jarak penanda dari tepi bawah bongkahan (satuan adegan). */
const TICK_GAP = 2.4;

const FRONT_Z = BLOCK_DEPTH / 2;

export default function SceneLabels() {
  const base = floorY();

  return (
    <group>
      {/* Penanda jarak di bawah bidang potong, hanya pada sayap kanan.
          Dipasang di satu sisi saja: bongkahannya setangkup, jadi penggaris
          kedua tidak menambah keterangan apa pun — ia hanya menambah tulisan
          yang harus dilewati mata. */}
      {DISTANCE_TICKS.map((m) => (
        <group key={m} position={[xOfDistance(m), base - TICK_GAP, FRONT_Z]}>
          <Html center zIndexRange={[20, 10]}>
            <div className="pointer-events-none hidden -translate-y-1/2 whitespace-nowrap text-center md:block">
              <div className="mx-auto h-3 w-px bg-white/25" />
              <span className="mt-1 block text-[10px] tabular-nums text-white/55">
                {m}
                {m === DISTANCE_TICKS[DISTANCE_TICKS.length - 1] && (
                  <span className="text-white/35"> m dari kanal</span>
                )}
              </span>
            </div>
          </Html>
        </group>
      ))}

      {/* Penanda kedalaman di tepi kiri, diukur dari permukaan asal.
          Sengaja diikatkan ke permukaan asal, bukan ke permukaan yang sedang
          melesak: justru selisih keduanya yang menjadi pelajaran babak 03. */}
      {DEPTH_TICKS.map((d) => (
        <group key={d} position={[-HALF_WIDTH - 4.5, -d * V_SCALE, FRONT_Z]}>
          <Html center zIndexRange={[20, 10]}>
            <span className="pointer-events-none hidden whitespace-nowrap text-[10px] tabular-nums text-white/45 md:inline">
              {d} m
            </span>
          </Html>
        </group>
      ))}

      {/* Nama kanal, berikut lebarnya: lebar itu yang memberi ukuran pada
          seluruh gambar, jadi ia ditulis di tempat yang paling dilihat. */}
      <group position={[0, surfaceY(0) + 7.5, FRONT_Z]}>
        <Html center zIndexRange={[20, 10]}>
          <span className="pointer-events-none whitespace-nowrap rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] text-white/75 backdrop-blur-sm">
            Kanal · lebar {CANAL_HALF_M * 2} m
          </span>
        </Html>
      </group>
    </group>
  );
}
