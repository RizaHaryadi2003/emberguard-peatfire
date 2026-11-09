"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import { PEAT_LAYERS } from "@/lib/peat";
import { GRID_COLS, GRID_ROWS, type SmolderSim } from "@/lib/smolder";
import { getAtmosphere } from "@/lib/atmosphere";
import { interfaceY } from "@/components/gambut/scene/terrain";
import {
  createFaceGrid,
  createHalfBody,
  createHalfRibbon,
  sinkAt,
  surfaceRelief,
  updateFaceGrid,
  updateHalfBody,
  updateHalfRibbon,
  FACE_Z,
  UV_PER_METER,
} from "./crossSection";
import { CAVITY_DEPTH, createFaceMaterial } from "./faceMaterial";
import { createLayerContentsTexture } from "./layerContents";
import {
  DRAG_THRESHOLD,
  PEAT_LAYER_TINT,
  QUALITY_PROFILE,
  SUN_DIRECTION,
  WET_DARKEN,
  type BaraState,
  type Quality,
  type Subsidence,
} from "./baraState";

// Bongkahan gambut yang sudah dipotong: badan lapisan di belakang (terlihat di
// tepi silhuet) dan satu bidang potong di depan yang menampilkan seluruh
// kejadian di bawah tanah lewat peneduhnya sendiri.

/** Rona lapisan: daftar yang sama persis dengan Modul 01. */
const LAYER_TINT = PEAT_LAYER_TINT;

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
/**
 * Penyusutan lapisan penutup di belakang bidang potong, dihitung terhadap
 * titik tengah profil. Cukup untuk menyembunyikan tepinya di balik dinding
 * bongkahan, tetapi tidak sampai membuka celah di belakang rongga abu.
 */
const BACKING_SCALE_X = 0.985;
const BACKING_SCALE_Y = 0.97;
const BACKING_CENTER_Y = -1.7;

const READABLE_SUN = 3.5;
const READABLE_AMBIENT = 0.38;
const NEUTRAL_SUN: [number, number, number] = [1, 0.86, 0.68];

/**
 * Pengganti eksposur 1,12 yang dahulu dipakai adegan ini. Adegan sekarang
 * memakai eksposur Modul 01 (0,9), dan bidang potong diberi cahaya lebih
 * sebanding supaya isi lapisannya tetap sama terangnya.
 */
const FACE_LIGHT_BOOST = 1.12 / 0.9;

/** Selisih ketinggian terbesar yang mungkin ditimbulkan gelombang batas lapisan (m). */
const INTERFACE_WOBBLE = 0.15;

/** Perubahan muka air terkecil yang membuat dinding dibentuk ulang (m). */
const WATER_STEP = 0.001;

/** Lebar kanvas gambar isi lapisan (piksel), menurut mutu grafis. */
const CONTENTS_WIDTH: Record<Quality, number> = { high: 2048, low: 1024 };

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
  quality: Quality;
};

export default function CutBlock({ sim, stateRef, field, subsidence, quality, onProbe, onIgnite }: Props) {
  const anisotropy = QUALITY_PROFILE[quality].anisotropy;
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
        t.anisotropy = anisotropy;
      }
      colors.push(map);
      normals.push(normalMap);
    });

    // Badan lapisan memakai resep Modul 01: tiap lapisan dipotong muka air
    // menjadi irisan kering (terang, kasar) dan irisan basah (gelap, berkilap).
    const bodies = PEAT_LAYERS.map((layer, i) => {
      const tint = new THREE.Color(...LAYER_TINT[layer.id]);
      return {
        layer,
        dryGeom: createHalfBody(),
        wetGeom: createHalfBody(),
        dry: new THREE.MeshStandardMaterial({
          map: colors[i],
          normalMap: normals[i],
          color: tint.clone(),
          roughness: 0.96,
          normalScale: new THREE.Vector2(1.4, 1.4),
          vertexColors: true,
        }),
        wet: new THREE.MeshStandardMaterial({
          map: colors[i],
          normalMap: normals[i],
          color: tint.clone().multiplyScalar(WET_DARKEN),
          roughness: 0.62,
          envMapIntensity: 0.45,
          normalScale: new THREE.Vector2(0.9, 0.9),
          vertexColors: true,
        }),
      };
    });

    const ribbon = {
      geom: createHalfRibbon(),
      material: new THREE.MeshBasicMaterial({
        color: "#8fd8ff",
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    };

    const contents = createLayerContentsTexture(CONTENTS_WIDTH[quality], anisotropy);
    const faceGeom = createFaceGrid();
    const faceMaterial = createFaceMaterial(colors, normals, field, contents, sunDir);
    faceMaterial.uniforms.uUvScale.value = UV_PER_METER;

    // Lapisan penutup gelap di belakang bidang potong. Memakai geometri bidang
    // potong yang sama, jadi bentuk, lekuk tepi, dan permukaan yang melesak
    // selalu persis sama — ia tidak akan pernah menyembul keluar dari siluet.
    // Warnanya tanah yang sangat teduh, bukan hitam: lapisan ini juga yang
    // terlihat dari sela tipis antara tepi potongan dan dinding bongkahan,
    // dan sela itu harus terbaca sebagai bayangan di dalam tanah.
    const backingMaterial = new THREE.MeshBasicMaterial({ color: "#1d150f" });

    return { colors, normals, bodies, ribbon, contents, faceGeom, faceMaterial, backingMaterial };
  }, [textures, field, sunDir, anisotropy, quality]);

  useEffect(
    () => () => {
      res.bodies.forEach((b) => {
        b.dryGeom.dispose();
        b.wetGeom.dispose();
        b.dry.dispose();
        b.wet.dispose();
      });
      res.ribbon.geom.dispose();
      res.ribbon.material.dispose();
      res.contents.dispose();
      res.faceGeom.dispose();
      res.faceMaterial.dispose();
      res.backingMaterial.dispose();
    },
    [res],
  );

  // Bentuk geometri mengikuti penurunan permukaan; dibentuk ulang hanya bila
  // nilai penurunannya berubah (bukan setiap bingkai).
  const built = useRef(-1);
  const water = useRef(-1);
  const dryMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const wetMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  /** Muka air terakhir yang dipakai membentuk tiap lapisan dan pita muka air. */
  const layerWater = useRef(PEAT_LAYERS.map(() => Number.NaN));
  const ribbonWater = useRef(Number.NaN);

  /**
   * Bentuk irisan kering & basah tiap lapisan pada muka air `waterM`.
   *
   * Tanpa `force`, hanya lapisan yang dipotong muka air yang dibentuk ulang,
   * sama seperti Modul 01. Setelah permukaan melesak, batas lapisan ikut turun,
   * jadi rentang penjepitan itu tidak lagi berlaku dan nilainya dipakai apa adanya.
   */
  const rebuildBody = useCallback((waterM: number, force: boolean) => {
    const drop = subsidence.fn;
    const w = -waterM;
    res.bodies.forEach(({ layer, dryGeom, wetGeom }, i) => {
      const key =
        subsidence.version > 0
          ? w
          : Math.min(Math.max(w, -layer.bottom - INTERFACE_WOBBLE), -layer.top + INTERFACE_WOBBLE);
      if (!force && Math.abs(key - layerWater.current[i]) < WATER_STEP) return;
      layerWater.current[i] = key;

      // Penurunan dititipkan langsung ke kedua batas lapisan, supaya semua
      // lapisan memampat bersama bidang potong.
      const bottom = (x: number, z: number) => interfaceY(layer.bottom, x, z) - sinkAt(layer.bottom, x, drop);
      // Lapisan teratas memakai relief permukaan yang sama dengan bidang potong,
      // supaya tepi atas keduanya menyambung tanpa celah.
      const top = (x: number, z: number) =>
        (i === 0 ? surfaceRelief(x, z) : interfaceY(layer.top, x, z)) - sinkAt(layer.top, x, drop);

      // `drop` di sini hanya untuk warna hangus per titik.
      const hasDry =
        updateHalfBody(dryGeom, (x, z) => Math.min(top(x, z), Math.max(bottom(x, z), w)), top, drop) > 0.002;
      const hasWet =
        updateHalfBody(wetGeom, bottom, (x, z) => Math.max(bottom(x, z), Math.min(top(x, z), w)), drop) > 0.002;
      const dryMesh = dryMeshRefs.current[i];
      const wetMesh = wetMeshRefs.current[i];
      if (dryMesh) dryMesh.visible = hasDry;
      if (wetMesh) wetMesh.visible = hasWet;
    });
  }, [res, subsidence]);

  const rebuild = useCallback(() => {
    rebuildBody(water.current < 0 ? (stateRef.current?.waterM ?? 0) : water.current, true);
    updateFaceGrid(res.faceGeom, subsidence.fn);
    built.current = subsidence.version;
  }, [rebuildBody, res, subsidence, stateRef]);

  // Bentuk pertama dibuat setelah geometri & material siap.
  useEffect(rebuild, [rebuild]);

  /** Warna badan lapisan saat tampilan termal (dihitung sekali). */
  const slate = useMemo(() => new THREE.Color(0.02, 0.03, 0.07), []);

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    const dt = Math.min(delta, 0.05);
    const u = res.faceMaterial.uniforms;

    // Muka air tanah bergerak halus ke nilai yang diminta pengguna.
    water.current = water.current < 0 ? s.waterM : THREE.MathUtils.damp(water.current, s.waterM, s.reducedMotion ? 30 : 2.6, dt);
    sim.setWaterTable(water.current);

    if (built.current !== subsidence.version) rebuild();
    else rebuildBody(water.current, false);

    if (Math.abs(water.current - ribbonWater.current) >= WATER_STEP || Number.isNaN(ribbonWater.current)) {
      ribbonWater.current = water.current;
      updateHalfRibbon(res.ribbon.geom, -water.current);
    }

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
    u.uSunIntensity.value = Math.max(atm.sunIntensity, READABLE_SUN) * FACE_LIGHT_BOOST;
    const ambient = Math.max(0.3 * (0.35 + atm.environmentIntensity * 2.2), READABLE_AMBIENT) * FACE_LIGHT_BOOST;
    u.uAmbient.value.setRGB(ambient * 0.95, ambient, ambient * 1.05);

    // Badan lapisan diredupkan pada tampilan termal agar penampang menonjol.
    res.bodies.forEach(({ layer, dry, wet }) => {
      const tint = LAYER_TINT[layer.id];
      dry.color.setRGB(tint[0], tint[1], tint[2]).lerp(slate, s.thermal);
      wet.color.setRGB(tint[0], tint[1], tint[2]).multiplyScalar(WET_DARKEN).lerp(slate, s.thermal);
    });
  });

  // Klik pada penampang: pada babak penyulutan berarti menyulut di titik itu,
  // pada babak lain berarti memeriksa keadaan sel yang diklik.
  const handleProbe = (e: ThreeEvent<MouseEvent>) => {
    if (!e.uv) return;
    // Seretan untuk memutar bongkahan tidak boleh ikut menyulut atau memeriksa.
    if ((stateRef.current?.dragMoved ?? 0) > DRAG_THRESHOLD) return;
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
      {res.bodies.map(({ layer, dryGeom, wetGeom, dry, wet }, i) => (
        <group key={layer.id}>
          <mesh ref={(el) => void (dryMeshRefs.current[i] = el)} geometry={dryGeom} material={dry} castShadow receiveShadow />
          <mesh ref={(el) => void (wetMeshRefs.current[i] = el)} geometry={wetGeom} material={wet} castShadow receiveShadow />
        </group>
      ))}

      {/* Pita garis muka air tanah di dinding, menyambung garis pada bidang potong */}
      <mesh geometry={res.ribbon.geom} material={res.ribbon.material} />

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
      {/* Dikecilkan sedikit terhadap pusat bongkahan. Siluetnya sama persis
          dengan penampang, padahal badan bongkahan menyempit ke belakang —
          jadi pada kedudukan yang mundur 22 cm, tepinya menyembul beberapa
          milimeter keluar dari dinding. Dilihat tegak lurus itu tidak tampak;
          dilihat serong seperti sekarang, tonjolan setipis itu terbaca
          sebagai celah gelap setinggi bongkahan. */}
      <mesh
        geometry={res.faceGeom}
        material={res.backingMaterial}
        position={[0, BACKING_CENTER_Y * (1 - BACKING_SCALE_Y), FACE_Z - CAVITY_DEPTH - 0.06]}
        scale={[BACKING_SCALE_X, BACKING_SCALE_Y, 1]}
      />
    </group>
  );
}
