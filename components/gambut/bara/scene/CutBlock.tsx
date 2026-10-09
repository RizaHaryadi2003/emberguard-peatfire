"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import { PEAT_LAYERS, type PeatLayerId } from "@/lib/peat";
import { GRID_COLS, GRID_ROWS, type SmolderSim } from "@/lib/smolder";
import { getAtmosphere } from "@/lib/atmosphere";
import { interfaceY } from "@/components/gambut/scene/terrain";
import {
  createFaceGrid,
  createHalfBody,
  sinkAt,
  surfaceRelief,
  updateFaceGrid,
  updateHalfBody,
  FACE_Z,
  UV_PER_METER,
} from "./crossSection";
import { CAVITY_DEPTH, createFaceMaterial } from "./faceMaterial";
import { SUN_DIRECTION, type BaraState, type Subsidence } from "./baraState";

// Bongkahan gambut yang sudah dipotong: badan lapisan di belakang (terlihat di
// tepi silhuet) dan satu bidang potong di depan yang menampilkan seluruh
// kejadian di bawah tanah lewat peneduhnya sendiri.

/**
 * Rona pengali warna tekstur tiap lapisan.
 *
 * Jaraknya dibuat lebih lebar daripada Modul 01. Di sana tiap lapisan dipisah
 * oleh jarak fisik saat bongkahan terurai, jadi beda warna tipis sudah cukup.
 * Di sini keempatnya bersinggungan langsung pada satu bidang, dan rona fibrik
 * dengan hemik yang hampir sama membuat profilnya terbaca sebagai satu massa
 * coklat. Urutannya kini jelas menurun: terang di atas, paling gelap di
 * saprik, lalu kelabu terang di tanah mineral.
 */
const LAYER_TINT: Record<PeatLayerId, [number, number, number]> = {
  fibrik: [1.06, 0.84, 0.62],
  hemik: [0.72, 0.56, 0.42],
  saprik: [0.34, 0.26, 0.21],
  mineral: [0.86, 0.86, 0.87],
};

/**
 * Batas bawah pencahayaan bidang potong.
 *
 * Langit boleh meredup dan menguning saat asap menebal — itu bagian dari
 * pesannya. Tetapi bidang potong adalah bagan yang harus tetap terbaca: bila
 * ia ikut meredup, justru pada saat kebakaran paling parah pembaca kehilangan
 * kemampuan membedakan bara, abu, dan lapisan gambut. Nilai matahari dan
 * cahaya langit karena itu ditahan di ambang ini, dan warna matahari ditarik
 * separuh kembali ke netral agar penampang tidak menguning seluruhnya.
 */
const READABLE_SUN = 2.9;
const READABLE_AMBIENT = 0.26;
const NEUTRAL_SUN: [number, number, number] = [1, 0.86, 0.68];

type Props = {
  sim: SmolderSim;
  stateRef: RefObject<BaraState>;
  /** Tekstur data hasil simulasi (diperbarui oleh komponen simulasi). */
  field: THREE.DataTexture;
  subsidence: Subsidence;
  /** Dipanggil saat pembaca mengklik satu titik pada penampang. */
  onProbe: (col: number, row: number) => void;
  /** Dipanggil bila klik terjadi pada babak penyulutan (dianggap menyulut). */
  onIgnite: (xFraction: number) => void;
};

export default function CutBlock({ sim, stateRef, field, subsidence, onProbe, onIgnite }: Props) {
  const urls = PEAT_LAYERS.flatMap((l) => [
    `/textures/gambut/${l.id}_color.webp`,
    `/textures/gambut/${l.id}_normal.webp`,
  ]);
  const textures = useLoader(THREE.TextureLoader, urls);
  const sunDir = useMemo(() => new THREE.Vector3(...SUN_DIRECTION).normalize(), []);

  const res = useMemo(() => {
    const colors: THREE.Texture[] = [];
    const normals: THREE.Texture[] = [];
    PEAT_LAYERS.forEach((_, i) => {
      const map = textures[i * 2];
      const normalMap = textures[i * 2 + 1];
      map.colorSpace = THREE.SRGBColorSpace;
      for (const t of [map, normalMap]) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
      }
      colors.push(map);
      normals.push(normalMap);
    });

    // Badan lapisan: hanya terlihat di tepi, jadi cukup material standar biasa.
    const bodies = PEAT_LAYERS.map((layer, i) => ({
      layer,
      geom: createHalfBody(),
      material: new THREE.MeshStandardMaterial({
        map: colors[i],
        normalMap: normals[i],
        color: new THREE.Color(...LAYER_TINT[layer.id]).multiplyScalar(layer.id === "mineral" ? 0.4 : 0.6),
        roughness: 0.95,
        normalScale: new THREE.Vector2(1.2, 1.2),
        vertexColors: true,
      }),
    }));

    const faceGeom = createFaceGrid();
    const faceMaterial = createFaceMaterial(colors, normals, field, sunDir);
    faceMaterial.uniforms.uUvScale.value = UV_PER_METER;

    // Lapisan penutup gelap di belakang bidang potong. Memakai geometri bidang
    // potong yang sama, jadi bentuk, lekuk tepi, dan permukaan yang melesak
    // selalu persis sama — ia tidak akan pernah menyembul keluar dari siluet.
    const backingMaterial = new THREE.MeshBasicMaterial({ color: "#080604" });

    return { colors, normals, bodies, faceGeom, faceMaterial, backingMaterial };
  }, [textures, field, sunDir]);

  useEffect(
    () => () => {
      res.bodies.forEach((b) => {
        b.geom.dispose();
        b.material.dispose();
      });
      res.faceGeom.dispose();
      res.faceMaterial.dispose();
      res.backingMaterial.dispose();
    },
    [res],
  );

  // Bentuk geometri mengikuti penurunan permukaan; dibentuk ulang hanya bila
  // nilai penurunannya berubah (bukan setiap bingkai).
  const built = useRef(-1);
  const rebuild = () => {
    const drop = subsidence.fn;
    res.bodies.forEach(({ layer, geom }, i) => {
      // Penurunan dititipkan langsung ke kedua batas lapisan, bukan diberikan
      // sebagai argumen terpisah. Dahulu hanya lapisan teratas yang melesak,
      // sehingga badan bongkahan masih memperlihatkan gambut utuh di tempat
      // yang pada bidang potong sudah menjadi rongga.
      updateHalfBody(
        geom,
        (x, z) => interfaceY(layer.bottom, x, z) - sinkAt(layer.bottom, x, drop),
        // Lapisan teratas memakai relief permukaan yang sama dengan bidang
        // potong (interfaceY(0, …) bernilai nol), supaya tepi atas keduanya
        // menyambung tanpa celah.
        (x, z) => (i === 0 ? surfaceRelief(x, z) : interfaceY(layer.top, x, z)) - sinkAt(layer.top, x, drop),
        // Dipakai untuk warna hangus per titik, bukan untuk menggeser bentuk:
        // pergeserannya sudah dititipkan ke kedua batas lapisan di atas.
        drop,
      );
    });
    updateFaceGrid(res.faceGeom, drop);
    built.current = subsidence.version;
  };

  // Bentuk pertama dibuat setelah geometri & material siap.
  useEffect(rebuild, [res, subsidence]);

  /** Warna badan lapisan saat tampilan termal (dihitung sekali). */
  const slate = useMemo(() => new THREE.Color(0.02, 0.03, 0.07), []);
  const water = useRef(-1);

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    const u = res.faceMaterial.uniforms;

    if (built.current !== subsidence.version) rebuild();

    // Muka air tanah bergerak halus ke nilai yang diminta pengguna.
    water.current = water.current < 0 ? s.waterM : THREE.MathUtils.damp(water.current, s.waterM, s.reducedMotion ? 30 : 2.6, dt);
    sim.setWaterTable(water.current);

    const atm = getAtmosphere(s.danger);
    u.uTime.value = state.clock.elapsedTime;
    u.uWaterDepth.value = water.current;
    u.uDouse.value = sim.getDouse();
    u.uThermal.value = s.thermal;
    u.uFlicker.value = s.reducedMotion ? 0 : 1;
    u.uHotspot.value = s.flame;
    u.uHotspotX.value = s.flameX;

    // Suasana tetap diikuti, tetapi tidak sampai menenggelamkan penampang.
    u.uSunColor.value.setRGB(
      (atm.sunColor[0] + NEUTRAL_SUN[0]) / 2,
      (atm.sunColor[1] + NEUTRAL_SUN[1]) / 2,
      (atm.sunColor[2] + NEUTRAL_SUN[2]) / 2,
      THREE.SRGBColorSpace,
    );
    u.uSunIntensity.value = Math.max(atm.sunIntensity, READABLE_SUN);
    const ambient = Math.max(0.3 * (0.35 + atm.environmentIntensity * 2.2), READABLE_AMBIENT);
    u.uAmbient.value.setRGB(ambient * 0.95, ambient, ambient * 1.05);

    // Badan lapisan diredupkan pada tampilan termal agar penampang menonjol.
    res.bodies.forEach(({ layer, material }) => {
      const tint = LAYER_TINT[layer.id];
      material.color
        .setRGB(tint[0], tint[1], tint[2])
        .multiplyScalar(layer.id === "mineral" ? 0.4 : 0.6)
        .lerp(slate, s.thermal);
    });
  });

  // Klik pada penampang: pada babak penyulutan berarti menyulut di titik itu,
  // pada babak lain berarti memeriksa keadaan sel yang diklik.
  const handleProbe = (e: ThreeEvent<MouseEvent>) => {
    if (!e.uv) return;
    e.stopPropagation();
    if (stateRef.current?.act === 0) {
      onIgnite(e.uv.x);
      return;
    }
    onProbe(
      Math.max(0, Math.min(GRID_COLS - 1, Math.floor(e.uv.x * GRID_COLS))),
      Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(e.uv.y * GRID_ROWS))),
    );
  };

  return (
    <group>
      {res.bodies.map(({ layer, geom, material }) => (
        <mesh key={layer.id} geometry={geom} material={material} castShadow receiveShadow />
      ))}

      {/* Bidang potong: seluruh cerita bawah tanah digambar di sini */}
      <mesh
        geometry={res.faceGeom}
        material={res.faceMaterial}
        position-z={FACE_Z}
        onClick={handleProbe}
        onPointerOver={() => void (document.body.style.cursor = "crosshair")}
        onPointerOut={() => void (document.body.style.cursor = "")}
      />

      {/* Penutup gelap di belakang penampang, supaya rongga abu tidak bolong ke
          latar saat titik-titiknya tertarik masuk ke dalam bongkahan.

          Dahulu ini sebuah bidang datar berukuran tetap. Bentuknya tidak ikut
          melesak bersama permukaan, sehingga begitu permukaan turun setengah
          meter, bidang itu muncul di atasnya sebagai balok hitam melintang di
          tengah bongkahan. Sekarang penutupnya memakai geometri bidang potong
          itu sendiri, digeser ke belakang sedikit lebih jauh daripada rongga
          terdalam: siluetnya selalu sama persis dengan penampang. */}
      <mesh geometry={res.faceGeom} material={res.backingMaterial} position-z={FACE_Z - CAVITY_DEPTH - 0.06} />
    </group>
  );
}
