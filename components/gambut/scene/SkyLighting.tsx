"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { getAtmosphere } from "@/lib/atmosphere";
import { QUALITY_PROFILE, SUN_DIRECTION, type AtmosphereState, type Quality } from "./dioramaConstants";

/**
 * Langit fisik (model hamburan Rayleigh & Mie) yang sekaligus menjadi sumber
 * cahaya lingkungan: langit dirender ke peta lingkungan (PMREM) lalu dipakai
 * sebagai latar tak berbatas dan pantulan semua material PBR.
 * Saat bahaya naik, langit menguning-jingga oleh kabut asap.
 *
 * Membuat ulang peta lingkungan (PMREM) adalah operasi termahal di seluruh
 * adegan, jadi frekuensinya dibatasi: warna kabut dan matahari tetap berubah
 * mulus tiap bingkai, hanya pantulan lingkungannya yang menyusul berkala.
 */
export default function SkyLighting({
  stateRef,
  quality = "high",
  worldScale = 1,
  backgroundDim = 1,
}: {
  stateRef: RefObject<AtmosphereState>;
  quality?: Quality;
  /**
   * Berapa kali lebih besar adegan ini dibanding diorama 4,4 m Modul 01 & 02.
   *
   * Seluruh angka di berkas ini — kerapatan kabut, jarak matahari, jangkauan
   * peta bayangan — dipilih untuk bongkahan selebar beberapa meter. Modul 03
   * memakai petak selebar delapan puluh meter, dan angka yang sama di sana
   * berarti kabut setebal susu pada jarak sepuluh meter dan peta bayangan
   * yang hanya menutupi sepersepuluh gambarnya.
   *
   * Jadi skalanya dinyatakan, bukan angkanya disalin dan diubah satu per satu:
   * dengan begitu memperbaiki suasana di satu modul tetap memperbaikinya di
   * semua modul. Nilai 1 menghasilkan angka yang persis sama seperti sebelum
   * parameter ini ada.
   */
  worldScale?: number;
  /**
   * Pengali kecerahan latar langit/foto (1 = seperti semula).
   *
   * Modul 01 dan 02 memotret dioramanya dari dekat, sehingga latar hanya
   * mengintip di sela-sela bongkahan dan kecerahannya tidak pernah menjadi
   * soal. Modul 03 memperlihatkan petak selebar delapan puluh meter dari
   * jauh, dan latar yang sama di sana mengisi lebih dari separuh layar —
   * terang benderang di belakang antarmuka yang gelap, sehingga teksnya sulit
   * dibaca dan bongkahannya tenggelam.
   */
  backgroundDim?: number;
}) {
  const profile = QUALITY_PROFILE[quality];
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const sunDir = useMemo(() => new THREE.Vector3(...SUN_DIRECTION).normalize(), []);

  const res = useMemo(() => {
    const sky = new Sky();
    sky.scale.setScalar(50);
    const skyScene = new THREE.Scene();
    skyScene.add(sky);
    const domeMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(300 * worldScale, 32, 16), domeMat);
    dome.renderOrder = -1;
    return { sky, skyScene, pmrem: new THREE.PMREMGenerator(gl), fog: new THREE.FogExp2(0xffffff, 0.016), dome, domeMat };
  }, [gl, worldScale]);

  const envTarget = useRef<THREE.WebGLRenderTarget | null>(null);
  const lastBucket = useRef(-1);
  const envCooldown = useRef(0);

  useEffect(() => {
    scene.fog = res.fog;
    return () => {
      scene.fog = null;
      scene.background = null;
      scene.environment = null;
      envTarget.current?.dispose();
      res.pmrem.dispose();
      res.sky.geometry.dispose();
      (res.sky.material as THREE.Material).dispose();
      res.dome.geometry.dispose();
      res.domeMat.dispose();
    };
  }, [scene, res]);

  useFrame((_, delta) => {
    const s = stateRef.current;
    if (!s) return;

    // Peta lingkungan dibuat ulang hanya bila bahaya berubah ≥ 12,5% dan jeda
    // minimum sejak pembuatan terakhir sudah lewat. Tanpa dua rem ini, satu
    // kebakaran yang menaikkan bahaya perlahan memicu belasan pembuatan ulang
    // per detik — penyebab utama bingkai tersendat di perangkat lemah.
    envCooldown.current -= delta;
    const bucket = Math.round(s.danger * 8) / 8;
    if (bucket !== lastBucket.current && envCooldown.current <= 0) {
      lastBucket.current = bucket;
      envCooldown.current = 1 / profile.envHz;
      const atm = getAtmosphere(bucket);
      const u = (res.sky.material as THREE.ShaderMaterial).uniforms;
      u.turbidity.value = atm.turbidity;
      u.rayleigh.value = atm.rayleigh;
      u.mieCoefficient.value = atm.mieCoefficient;
      u.mieDirectionalG.value = atm.mieDirectionalG;
      u.sunPosition.value.copy(sunDir);

      const target = res.pmrem.fromScene(res.skyScene, 0, 0.1, 100);
      envTarget.current?.dispose();
      envTarget.current = target;
      // Langit hanya menjadi sumber cahaya; latar gambar diurus komponen Backdrop.
      scene.environment = target.texture;
    }

    // Kabut & matahari diperbarui halus tiap bingkai.
    const atm = getAtmosphere(s.danger);
    res.fog.color.setRGB(...atm.fogColor, THREE.SRGBColorSpace);
    // Kabut eksponensial diukur per satuan jarak, jadi kerapatannya dibagi
    // skala dunia: pada adegan yang sepuluh kali lebih besar, kabut setebal
    // itu baru tercapai pada jarak sepuluh kali lebih jauh.
    res.fog.density = atm.fogDensity / worldScale;
    scene.environmentIntensity = atm.environmentIntensity;
    scene.backgroundIntensity = atm.backgroundIntensity * backgroundDim;
    // Kubah asap menutup langit dengan warna kabut yang sama sehingga cakrawala menyatu.
    res.domeMat.color.copy(res.fog.color);
    res.domeMat.opacity = atm.smokeCover;
    res.dome.visible = atm.smokeCover > 0.005;
    const sun = sunRef.current;
    if (sun) {
      sun.color.setRGB(...atm.sunColor, THREE.SRGBColorSpace);
      sun.intensity = atm.sunIntensity;
    }
  });

  const sunPos = sunDir.clone().multiplyScalar(22 * worldScale);
  const shadowSpan = 6 * worldScale;

  return (
    <>
      <primitive object={res.dome} />
      <directionalLight
      ref={sunRef}
      position={sunPos}
      castShadow
      shadow-mapSize={[profile.shadowSize, profile.shadowSize]}
      shadow-bias={-0.0004 * worldScale}
      shadow-normalBias={0.02 * worldScale}
      shadow-camera-left={-shadowSpan}
      shadow-camera-right={shadowSpan}
      shadow-camera-top={shadowSpan}
      shadow-camera-bottom={-shadowSpan}
      shadow-camera-near={5 * worldScale}
      shadow-camera-far={45 * worldScale}
      />
    </>
  );
}
