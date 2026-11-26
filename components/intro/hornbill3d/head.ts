import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { HORNBILL_HEAD } from "../hornbillShape";

/**
 * Kepala, paruh, dan balung 3D dari siluet CC0 (lihat hornbillShape.ts):
 * garis tepi siluet asli dicuplik, hanya bagian kepala yang diambil (di atas
 * batas potong), dipindah ke posisi kepala pada badan, lalu ditebalkan
 * (extrude) dengan tepi membulat. Dari samping hasilnya persis siluet asli;
 * dari sudut lain paruh dan balung tampak bervolume.
 */
export function headGeometry(): THREE.BufferGeometry {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${HORNBILL_HEAD.d}"/></svg>`);
  const sub = data.paths[0].subPaths[0];
  // Koordinat potrace → koordinat gambar (translate(0 1536) scale(0.1 −0.1)).
  const pts = sub.getSpacedPoints(900).map((p) => new THREE.Vector2(p.x * 0.1, 1536 - p.y * 0.1));

  // Ambil satu rangkaian titik di atas batas potong (kepala), mulai dari titik di bawahnya.
  const cutY = HORNBILL_HEAD.clip.y + HORNBILL_HEAD.clip.h;
  const start = pts.findIndex((p) => p.y >= cutY);
  const ordered = [...pts.slice(start), ...pts.slice(0, start)];
  const head: THREE.Vector2[] = [];
  let inside = false;
  for (const p of ordered) {
    if (p.y < cutY && p.x > HORNBILL_HEAD.clip.x) {
      inside = true;
      head.push(p);
    } else if (inside) {
      break;
    }
  }

  // Pindahkan ke koordinat profil (y ke bawah), lalu ke koordinat badan (y ke atas).
  const P = HORNBILL_HEAD.place;
  const rad = (P.rotate * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const local = head.map((p) => {
    const x = (p.x - P.ox) * P.scale;
    const y = (p.y - P.oy) * P.scale;
    const px = P.x + x * c - y * s;
    const py = P.y + x * s + y * c;
    return new THREE.Vector2(px, -py);
  });

  const shape = new THREE.Shape(local);
  const depth = 7;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 2.5,
    bevelSize: 1.2,
    bevelSegments: 3,
    curveSegments: 4,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}
