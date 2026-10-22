"use client";

import { Html } from "@react-three/drei";
import {
  floorY,
  surfaceY,
  xOfDistance,
  CANAL_LEFT_X,
  DEPTH_TICKS,
  DISTANCE_TICKS,
  V_SCALE,
} from "./transect";

// Penggaris jarak dan kedalaman pada penampang.
//
// Tanpa keduanya modul ini tidak dapat mengerjakan tugasnya: babak 02 meminta
// pembaca menemukan sampai jarak berapa muka airnya masih melewati batas 40
// cm, dan pertanyaan itu mustahil dijawab dari gambar yang tidak punya
// penggaris. Angkanya ditulis sebagai DOM lewat `Html`, bukan sebagai
// geometri teks, supaya tetap tajam pada resolusi berapa pun dan dapat dibaca
// pembaca layar.

/** Jarak penanda dari tepi bawah bongkahan (satuan adegan). */
const TICK_GAP = 0.3;

export default function SceneLabels() {
  return (
    <group>
      {/* Penanda jarak di bawah penampang.
          Penanda 0 m sengaja dilewati: ia jatuh tepat di bawah kanal, tempat
          panel kendali berada, dan kedudukan nol itu sudah ditandai oleh
          label "Kanal" di atasnya. */}
      {DISTANCE_TICKS.filter((m) => m > 0).map((m) => (
        <group key={m} position={[xOfDistance(m), floorY(m) - TICK_GAP, 0]}>
          <Html center distanceFactor={undefined} zIndexRange={[20, 10]}>
            <div className="pointer-events-none -translate-y-1/2 whitespace-nowrap text-center">
              <div className="mx-auto h-3 w-px bg-white/25" />
              <span className="mt-1 block text-[10px] tabular-nums text-white/55">
                {m === 0 ? "0" : m.toLocaleString("id-ID")}
                {m === DISTANCE_TICKS[DISTANCE_TICKS.length - 1] && <span className="text-white/35"> m</span>}
              </span>
            </div>
          </Html>
        </group>
      ))}

      {/* Keterangan sumbu jarak */}
      <group position={[xOfDistance(500), floorY(500) - TICK_GAP - 0.5, 0]}>
        <Html center zIndexRange={[20, 10]}>
          <span className="pointer-events-none whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-white/40">
            Jarak dari kanal
          </span>
        </Html>
      </group>

      {/* Penanda kedalaman di tepi kiri, diukur dari permukaan asal.
          Sengaja diikatkan ke permukaan asal (y = 0 pada tepi kanal), bukan ke
          permukaan yang sedang melesak: justru selisih keduanya yang menjadi
          pelajaran babak 03. */}
      {DEPTH_TICKS.map((d) => (
        <group key={d} position={[CANAL_LEFT_X - 0.22, -d * V_SCALE, 0]}>
          <Html center zIndexRange={[20, 10]}>
            <span className="pointer-events-none whitespace-nowrap text-[10px] tabular-nums text-white/45">
              {d} m
            </span>
          </Html>
        </group>
      ))}

      {/* Nama kanal */}
      <group position={[CANAL_LEFT_X / 2, surfaceY(0) + 0.42, 0]}>
        <Html center zIndexRange={[20, 10]}>
          <span className="pointer-events-none whitespace-nowrap rounded-full border border-white/15 bg-black/55 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
            Kanal
          </span>
        </Html>
      </group>
    </group>
  );
}
