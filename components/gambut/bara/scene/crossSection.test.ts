import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { PROFILE_DEPTH } from "@/lib/peat";
import { BLOCK_WIDTH } from "@/components/gambut/scene/dioramaConstants";
import { interfaceY, radiusAt } from "@/components/gambut/scene/terrain";
import {
  createFaceGrid,
  createSurfaceGrid,
  faceBounds,
  profileY,
  surfaceRelief,
  surfaceYAt,
  updateFaceGrid,
  updateSurfaceGrid,
  SURFACE_COLS,
  SURFACE_ROWS,
} from "./crossSection";

/** Deret kedalaman uji dari permukaan sampai dasar profil. */
const depths = Array.from({ length: 81 }, (_, i) => (i / 80) * PROFILE_DEPTH);

/** Deret posisi x uji yang merentang selebar bidang potong. */
function spanX(y = 0): number[] {
  const { left, right } = faceBounds(y);
  return Array.from({ length: 121 }, (_, i) => left + ((right - left) * i) / 120);
}

describe("faceBounds", () => {
  it("menjaga tepi bidang potong tetap di dalam badan bongkahan", () => {
    // Bila tepi potongan menyembul keluar, ia tampak sebagai lidah tipis yang
    // menggantung di luar silhuet bongkahan.
    for (const d of depths) {
      const y = -d;
      const { left, right } = faceBounds(y);
      expect(right).toBeLessThan(radiusAt(0, y));
      expect(left).toBeGreaterThan(-radiusAt(Math.PI, y));
    }
  });

  it("membuat garis tepi berkelok, bukan lurus sempurna", () => {
    const rights = depths.map((d) => faceBounds(-d).right);
    expect(Math.max(...rights) - Math.min(...rights)).toBeGreaterThan(0.02);
  });

  it("masih diukur dari dinding bongkahan, bukan dari jari-jari tapak saja", () => {
    // `faceBounds` tidak lagi memanggil `radiusAt`, melainkan `radiusFrom`
    // dengan jari-jari tapak kedua ujung yang dihitung sekali saat berkas
    // dimuat — `footprintRadius` memakai tiga pemangkatan dan dipanggil
    // ribuan kali tiap kali permukaan dibentuk ulang.
    //
    // Yang dijaga di sini: kedua tepi tetap disisipkan sedalam yang sama dari
    // dinding bongkahan. Lupa menyertakan relief dinding, atau memakai
    // jari-jari ujung yang keliru, akan membuat kedua sisipan ini berbeda —
    // dan di situlah dahulu muncul celah hitam setinggi bongkahan.
    for (const d of depths) {
      const y = -d;
      const { left, right } = faceBounds(y);
      const insetRight = radiusAt(0, y) - right;
      const insetLeft = radiusAt(Math.PI, y) + left;
      expect(insetLeft).toBeCloseTo(insetRight, 12);
      // Sisipannya beberapa milimeter saja: cukup untuk jaminan di atas,
      // tetapi tidak sampai menganga bila kamera berdiri serong.
      expect(insetRight).toBeGreaterThan(0.002);
      expect(insetRight).toBeLessThan(0.012);
    }
  });
});

describe("updateFaceGrid", () => {
  it("tidak menyimpan normal titik, karena peneduhnya tidak membacanya", () => {
    // Peneduh bidang potong menyusun normalnya sendiri dari peta normal
    // lapisan dan kemiringan rongga abu. Bila `computeVertexNormals` kembali
    // dipanggil di sini, tiap pembentukan ulang — tiap setengah detik selama
    // gambut terbakar — menghitung dan mengunggah 12.513 normal yang tidak
    // pernah dipakai.
    const geom = createFaceGrid();
    updateFaceGrid(geom);
    expect(geom.attributes.normal).toBeUndefined();
    expect(geom.boundingSphere).not.toBeNull();
    geom.dispose();
  });

  it("menurunkan baris teratas saat permukaan melesak, dan membiarkan dasarnya", () => {
    const drop = (x: number) => (Math.abs(x) < 1 ? 0.4 : 0);
    const flat = createFaceGrid();
    const sunk = createFaceGrid();
    updateFaceGrid(flat);
    updateFaceGrid(sunk, drop);
    const a = flat.attributes.position as THREE.BufferAttribute;
    const b = sunk.attributes.position as THREE.BufferAttribute;

    // Titik tengah baris teratas berada di atas rongga, jadi harus turun;
    // titik tengah baris terbawah sudah di tanah mineral, jadi harus diam.
    const mid = Math.floor(121 / 2);
    expect(b.getY(mid)).toBeLessThan(a.getY(mid) - 0.3);
    const lastRow = a.count - 121 + mid;
    expect(b.getY(lastRow)).toBeCloseTo(a.getY(lastRow), 10);

    flat.dispose();
    sunk.dispose();
  });
});

describe("surfaceRelief", () => {
  it("bergundukan dalam batas yang wajar untuk permukaan gambut", () => {
    const h = spanX().map((x) => surfaceRelief(x, 0));
    expect(Math.max(...h) - Math.min(...h)).toBeGreaterThan(0.05);
    expect(Math.max(...h.map(Math.abs))).toBeLessThan(0.1);
  });
});

describe("profileY", () => {
  it("menyambung dengan permukaan di atas dan batas tanah mineral di bawah", () => {
    for (const x of spanX()) {
      expect(profileY(0, x)).toBeCloseTo(surfaceRelief(x, 0), 10);
      expect(profileY(PROFILE_DEPTH, x)).toBeCloseTo(interfaceY(PROFILE_DEPTH, x, 0), 10);
    }
  });

  it("selalu menurun terhadap kedalaman", () => {
    for (const x of spanX()) {
      for (let i = 1; i < depths.length; i++) {
        expect(profileY(depths[i], x)).toBeLessThan(profileY(depths[i - 1], x));
      }
    }
  });

  it("menjaga garis muka air tetap mendatar di rentang yang menjadi pelajaran", () => {
    // Inti Modul 02 berada pada muka air 30 cm ke bawah — batas 40 cm menurut
    // PP No. 57 Tahun 2016 ada di dalamnya. Di rentang itu titik bidang potong
    // harus hampir setia pada kedalaman nominal, supaya garis muka air tidak
    // tampak bergelombang; di alam permukaan air selalu datar.
    for (const water of [0.3, 0.4, 0.6, 0.8, 1]) {
      const dev = spanX().map((x) => Math.abs(profileY(water, x) + water));
      expect(Math.max(...dev)).toBeLessThan(0.02);
    }
  });

  it("membiarkan muka air yang sangat dangkal mengikuti gundukan permukaan", () => {
    // Pada muka air 0 cm, permukaan air sejajar permukaan tanah. Di situ garis
    // air memang seharusnya mengikuti gundukan, seperti air yang menggenang
    // mengikuti bentuk tanahnya, bukan memotongnya dengan garis lurus.
    const dev = spanX().map((x) => Math.abs(profileY(0, x)));
    expect(Math.max(...dev)).toBeGreaterThan(0.03);
  });
});

describe("updateSurfaceGrid", () => {
  it("membentangkan lembar permukaan selebar bongkahan", () => {
    // Uji pencegah cacat: pernah terjadi kolom dinding ke-i dipasangkan dengan
    // titik garis potong di ujung yang berlawanan. Lembar permukaan terpelintir
    // dan mengerut menjadi pita sempit di tengah, sehingga bongkahan kehilangan
    // tutup atasnya dan hanya tampak sebagai balok.
    const geom = createSurfaceGrid();
    updateSurfaceGrid(geom);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const cols = SURFACE_COLS + 1;
    const row = Math.floor(SURFACE_ROWS / 2);

    const xs = Array.from({ length: cols }, (_, i) => pos.getX(row * cols + i));
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(BLOCK_WIDTH * 0.9);

    // Urutan x harus searah sepanjang baris; arah yang berbalik berarti
    // segitiga-segitiganya saling menyilang.
    const rising = xs[1] > xs[0];
    for (let i = 1; i < cols; i++) {
      expect(xs[i] > xs[i - 1]).toBe(rising);
    }
    geom.dispose();
  });

  it("ikut melesak saat permukaan turun akibat rongga abu", () => {
    const drop = (x: number) => (Math.abs(x) < 1 ? 0.3 : 0);
    expect(surfaceYAt(0, 0, drop)).toBeCloseTo(surfaceRelief(0, 0) - 0.3, 10);
    expect(surfaceYAt(2, 0, drop)).toBeCloseTo(surfaceRelief(2, 0), 10);
  });
});
