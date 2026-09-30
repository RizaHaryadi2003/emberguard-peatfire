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
}: {
  stateRef: RefObject<AtmosphereState>;
  quality?: Quality;
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
    const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), domeMat);
    dome.renderOrder = -1;
    return { sky, skyScene, pmrem: new THREE.PMREMGenerator(gl), fog: new THREE.FogExp2(0xffffff, 0.016), dome, domeMat };
  }, [gl]);

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
    res.fog.density = atm.fogDensity;
    scene.environmentIntensity = atm.environmentIntensity;
    scene.backgroundIntensity = atm.backgroundIntensity;
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

  const sunPos = sunDir.clone().multiplyScalar(22);

  return (
    <>
      <primitive object={res.dome} />
      <directionalLight
      ref={sunRef}
      position={sunPos}
      castShadow
      shadow-mapSize={[profile.shadowSize, profile.shadowSize]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-left={-6}
      shadow-camera-right={6}
      shadow-camera-top={6}
      shadow-camera-bottom={-6}
      shadow-camera-near={5}
      shadow-camera-far={45}
      />
    </>
  );
}
