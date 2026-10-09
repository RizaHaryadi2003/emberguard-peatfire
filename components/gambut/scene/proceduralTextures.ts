import * as THREE from "three";

// Tekstur yang dibuat lewat kanvas 2D (bukan berkas gambar), untuk efek
// yang tidak tersedia di pustaka tekstur foto: bara, percikan, dan asap.

/** Bilangan acak semu yang dapat diulang (hasil sama setiap kali dimuat). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kanvas 2D tidak tersedia");
  return { canvas, ctx };
}

/**
 * Peta pijar bara: latar hitam dengan bercak jingga-kuning yang tersebar.
 * Dipakai sebagai `emissiveMap` pada gambut kering; bagian hitam tidak berpijar.
 */
export function createEmberTexture(size = 512): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size);
  const rand = mulberry32(7);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "lighter";

  // Bercak besar redup lalu titik kecil terang, digambar berulang di tepi agar
  // tekstur tetap mulus saat diulang (tileable).
  const blobs = 70;
  for (let i = 0; i < blobs; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = size * (0.015 + rand() * 0.05);
    const hot = rand();
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        g.addColorStop(0, hot > 0.7 ? "rgba(255,220,140,0.95)" : "rgba(255,120,40,0.8)");
        g.addColorStop(0.45, "rgba(200,50,10,0.45)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Retakan tipis berpijar yang menghubungkan beberapa bercak.
  ctx.strokeStyle = "rgba(255,110,30,0.35)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) {
    let x = rand() * size;
    let y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (rand() - 0.5) * 40;
      y += (rand() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Titik cahaya bulat lembut untuk partikel percikan api. */
export function createSparkTexture(size = 64): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,200,120,0.9)");
  g.addColorStop(0.6, "rgba(255,90,20,0.25)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Peta alfa genangan air: bercak putih (air) di atas hitam (kering).
 * Dipakai sebagai `alphaMap` bidang air tipis di permukaan gambut.
 */
export function createPuddleTexture(size = 512): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size);
  const rand = mulberry32(23);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 38; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = size * (0.04 + rand() * 0.12);
    const g = ctx.createRadialGradient(x, y, r * 0.35, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    // Elips miring agar bentuk genangan tidak bulat sempurna.
    ctx.ellipse(x, y, r, r * (0.45 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/** Gumpalan asap lembut bertepi tak rata. */
export function createSmokeTexture(size = 128): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size);
  const rand = mulberry32(11);
  for (let i = 0; i < 14; i++) {
    const x = size * (0.3 + rand() * 0.4);
    const y = size * (0.3 + rand() * 0.4);
    const r = size * (0.15 + rand() * 0.25);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Siluet orang berdiri, dipakai sebagai patokan ukuran di dalam diorama.
 *
 * Angka "4,4 m" pada naskah tidak berarti apa-apa bagi pembaca yang sedang
 * menatap gambar; sosok setinggi 1,7 m di sebelahnya langsung menjawabnya
 * tanpa satu kata pun. Digambar di kanvas, bukan dimuat sebagai model, karena
 * yang dibutuhkan memang hanya bayangannya.
 */
export function createFigureTexture(width = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = width * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kanvas 2D tidak tersedia");
  const k = width / 256;
  ctx.fillStyle = "#ffffff";

  const limb = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x * k, y * k, w * k, h * k, r * k);
    ctx.fill();
  };

  // Kepala, badan, kedua lengan, lalu kedua tungkai. Tinggi seluruhnya
  // 458 piksel dari 512, menyisakan ruang kosong di atas dan di bawah.
  //
  // Anggota badannya sengaja gempal dengan sela yang lebar. Pada percobaan
  // pertama tungkainya ramping dan selanya sempit, dan di layar — sosok ini
  // hanya setinggi sekitar 150 piksel — keduanya melebur menjadi satu garis
  // tipis sehingga tidak lagi terbaca sebagai orang.
  ctx.beginPath();
  ctx.arc(128 * k, 66 * k, 28 * k, 0, Math.PI * 2);
  ctx.fill();
  limb(94, 98, 68, 150, 26); // badan
  limb(66, 110, 24, 132, 12); // lengan kiri
  limb(166, 110, 24, 132, 12); // lengan kanan
  limb(94, 240, 28, 258, 14); // tungkai kiri
  limb(134, 240, 28, 258, 14); // tungkai kanan

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
