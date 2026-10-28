"use client";

import { Html } from "@react-three/drei";
import { ageAtDepth, formatYearCount } from "@/lib/carbon";
import { AGE_RULER_GAP, AGE_TICKS_M, BLOCK_W, FACE_Z, originalTopY } from "./archive";

// Penggaris pada bongkahan Modul 04.
//
// Tugasnya satu, dan hanya satu: mengubah satuan yang dibaca pembaca dari
// meter menjadi tahun. Angka "2,8 m" tidak pernah membuat siapa pun berhenti;
// "2.800 tahun" membuatnya berhenti. Gambutnya sama persis — yang diganti
// hanya penggarisnya, dan pergantian itulah seluruh gagasan modul ini.
//
// Garis seratus tahunannya tidak ada di sini: ia digambar peneduh bidang
// potong sebagai alur halus pada tanahnya sendiri, tempat biayanya nol dan
// tempatnya memang di sana. Yang ditulis sebagai teks hanya angka tiap seribu
// tahun — sebab dua puluh delapan angka pada tepi gambar akan saling
// bertindihan menjadi gumpalan, dan pelajaran itu sudah dibayar mahal di
// Modul 03.
//
// Angkanya ditulis sebagai DOM lewat `Html`, bukan sebagai geometri teks,
// supaya tetap tajam pada resolusi berapa pun dan dapat dibaca pembaca layar.

/** Tepi kiri bongkahan (satuan adegan). */
const LEFT_X = -BLOCK_W / 2;

export default function SceneLabels() {
  return (
    <group>
      {/* Penggaris umur, ditulis di atas bidang potong — bukan di margin kiri
          gambar.

          Dua alasan, dan keduanya menentukan. Pertama kebenaran: penggaris
          umur pada penampang memang milik penampangnya, sebab angkanya hanya
          berarti bersama lapisan yang ditunjuknya. Kedua ruang: di margin,
          ketiga angka ini menempati pita selebar tujuh puluh piksel di luar
          bongkahan — pita yang harus dikosongkan kamera, dan karena itu
          diambil dari besar gambarnya — dan pita itu jatuh persis di atas
          panel kendali begitu panel itu tumbuh pada babak 04, sehingga
          angkanya tertimbun. Pelajaran yang sama sudah dibayar di Modul 03.
          Diikatkan ke permukaan asal, bukan ke permukaan yang sedang berlaku:
          umur suatu lapisan tidak berubah hanya karena lapisan di atasnya
          sudah habis terbakar. Justru itu yang membuat takik bekas bakar
          dapat dibaca langsung sebagai berapa abad yang hilang. */}
      {AGE_TICKS_M.map((d) => (
        <group key={d} position={[LEFT_X + AGE_RULER_GAP, originalTopY(LEFT_X, FACE_Z) - d, FACE_Z + 0.02]}>
          <Html center zIndexRange={[20, 10]}>
            <span className="pointer-events-none hidden whitespace-nowrap rounded-sm bg-black/45 px-1 text-[10px] tabular-nums leading-tight text-white/70 backdrop-blur-[2px] md:inline">
              {formatYearCount(ageAtDepth(d))}
            </span>
          </Html>
        </group>
      ))}

      {/* Lebar bongkahan: patokan ukuran, dan satu-satunya keterangan yang
          menyatakan bahwa petak ini petak yang sama dengan Modul 01 dan 02. */}
      <group position={[0, originalTopY(0, FACE_Z) + 0.72, FACE_Z]}>
        <Html center zIndexRange={[20, 10]}>
          <span className="pointer-events-none whitespace-nowrap rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] text-white/75 backdrop-blur-sm">
            Bongkahan · lebar {BLOCK_W} m
          </span>
        </Html>
      </group>
    </group>
  );
}
