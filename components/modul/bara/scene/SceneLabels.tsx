"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { PROFILE_DEPTH } from "@/lib/model/peat";
import { CELL_ASH, CELL_SMOLDER, GRID_COLS, GRID_ROWS, type SmolderSim } from "@/lib/model/smolder";
import { faceBounds, profileY, sinkAt, surfaceRelief, FACE_Z } from "./crossSection";
import { BLOCK_WIDTH, type BaraState, type Subsidence } from "./baraState";
import { isTouchOnly } from "./layerHint";
import { readingArea } from "./viewFit";

// Keterangan yang menempel pada bendanya di dalam adegan.
//
// Sebelum ini semua nama berada di panel kanan, terpisah dari yang dinamainya:
// garis biru tidak pernah disebut muka air tanah, pita terang tidak pernah
// disebut bara, dan angka "kedalaman bara 94 cm" tidak pernah terhubung ke
// titik mana pun pada gambar. Pembaca harus menebak sendiri pasangannya.
//
// Letak keterangan dihitung dari keadaan simulasi, bukan dari daftar tetap:
// titik beratnya diambil dari sel yang sedang membara dan sel yang sudah
// menjadi abu, sehingga penunjuknya selalu jatuh di tempat yang benar.

/** Jarak label di depan bidang potong (m), supaya tidak tertimbun bongkahan. */
const LABEL_Z = FACE_Z + 0.08;

/** Jeda penyegaran letak label (detik). Mata tidak membutuhkan lebih cepat. */
const REFRESH = 0.3;

type Tone = "ember" | "ash" | "water" | "plain" | "depth";

type Marker = {
  id: string;
  x: number;
  y: number;
  text: string;
  tone: Tone;
  /** Label yang menamai sebuah garis; letaknya tidak boleh digeser. */
  pinned?: boolean;
};

/** Jarak tegak terkecil antar label yang berdekatan (m). */
const MIN_GAP = 0.36;

/** Dua label dianggap bertumpuk bila jarak mendatarnya kurang dari ini (m). */
const NEAR_X = 1.4;

/**
 * Urutan kepentingan. Bila dua keterangan tetap bertabrakan di layar setelah
 * saling didorong, yang di bawah dalam daftar inilah yang disembunyikan —
 * lebih baik satu keterangan hilang daripada dua-duanya tidak terbaca.
 */
const PRIORITY = [
  "bara",
  "nyala",
  "muncul",
  "runtuh",
  "abu",
  "air",
  "siram",
  "padam",
  "permukaan",
  "petunjuk",
  "lebar",
  "d1",
  "d2",
  "d3",
];

/** Letak petunjuk keterangan lapisan: lebar bidang potong (0–1) dan kedalaman (m). */
const HOVER_PROMPT_AT = 0.5;
const HOVER_PROMPT_DEPTH = 2.2;

/**
 * Kedalaman yang diberi angka pada penggaris di tepi kiri (m).
 *
 * Penggaris itu sudah ada sejak awal berupa goresan tiap 0,5 m, tetapi tanpa
 * angka ia hanya deretan garis kecil tanpa arti. Dengan angka, pembaca dapat
 * menyebut sendiri kedalaman baranya alih-alih menebak dari tinggi gambar.
 */
const DEPTH_MARKS = [1, 2, 3];

/** Perkiraan ukuran satu label di layar (piksel). */
const CHAR_WIDTH = 5.9;
const PADDING = 36;
const LABEL_HEIGHT = 26;

/**
 * Dorong label yang saling menutupi ke bawah.
 *
 * Titik berat bara dan titik berat rongga abu hampir selalu berdekatan —
 * rongga memang terbentuk tepat di atas baranya — sehingga tanpa ini kedua
 * keterangan bertumpuk dan keduanya menjadi tidak terbaca. Label yang menamai
 * garis (muka air tanah) dikecualikan, karena ia harus tetap duduk di
 * garisnya.
 */
function spread(list: Marker[]): Marker[] {
  const movable = list.filter((m) => !m.pinned).sort((a, b) => b.y - a.y);
  for (let i = 1; i < movable.length; i++) {
    const above = movable[i - 1];
    const here = movable[i];
    if (Math.abs(here.x - above.x) > NEAR_X) continue;
    if (above.y - here.y < MIN_GAP) here.y = above.y - MIN_GAP;
  }
  return list;
}

const TONE_CLASS: Record<Tone, string> = {
  // Alasnya pekat tanpa pengaburan: label bergeser tiap bingkai saat bongkahan
  // diputar, dan mengaburkan kanvas di belakangnya tiap bingkai sangat mahal.
  ember: "border-[#f0a060]/45 bg-[#2a1405]/95 text-[#ffd9b0]",
  ash: "border-white/20 bg-black/85 text-white/80",
  water: "border-sky-300/40 bg-[#07202e]/95 text-sky-100",
  plain: "border-white/20 bg-black/85 text-white/85",
  depth: "",
};

const DOT_CLASS: Record<Tone, string> = {
  ember: "bg-[#ff7a24]",
  ash: "bg-[#6b6257]",
  water: "bg-[#6fc7f0]",
  plain: "bg-white/70",
  depth: "",
};

type Props = {
  sim: SmolderSim;
  stateRef: RefObject<BaraState>;
  subsidence: Subsidence;
};

export default function SceneLabels({ sim, stateRef, subsidence }: Props) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const timer = useRef(0);
  /** Ringkasan isi label terakhir, agar tidak memicu render ulang sia-sia. */
  const signature = useRef("");
  const groupRef = useRef<THREE.Group>(null);
  const probe = useMemo(() => new THREE.Vector3(), []);
  const faceNormal = useMemo(() => new THREE.Vector3(), []);
  const toCamera = useMemo(() => new THREE.Vector3(), []);
  const center = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const s = stateRef.current;
    if (!s) return;
    timer.current -= Math.min(delta, 0.05);
    if (timer.current > 0) return;
    timer.current = REFRESH;

    // Layar pembuka hanya bertanya; semua keterangan menunggu sampai ia ditutup.
    if (groupRef.current) groupRef.current.visible = !s.hookOpen;
    if (s.hookOpen) {
      if (signature.current !== "") {
        signature.current = "";
        setMarkers([]);
      }
      return;
    }

    // Layar sempit perlu diperlakukan berbeda sejak label disusun, bukan hanya
    // saat disaring: pil selebar 260 piksel tidak muat pada layar 390 piksel,
    // sehingga teksnya diringkas dan label muka air dipindah ke dalam
    // bongkahan — di luar tepi kanan sudah tidak ada ruang tersisa.
    const narrow = state.size.width < 768;
    const stats = sim.stats;
    const drop = subsidence.fn;
    /** Ketinggian sebenarnya satu titik penampang, setelah tanahnya melesak. */
    const yAt = (depth: number, x: number) => profileY(depth, x) - sinkAt(depth, x, drop);

    // Titik berat sel yang membara dan sel yang sudah menjadi abu.
    let emberX = 0;
    let emberD = 0;
    let emberN = 0;
    let ashX = 0;
    let ashD = 0;
    let ashN = 0;
    for (let row = 0; row < GRID_ROWS; row++) {
      const d = sim.depthOfRow(row);
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = sim.state[sim.index(col, row)];
        if (cell === CELL_SMOLDER) {
          emberX += sim.xOfCol(col);
          emberD += d;
          emberN++;
        } else if (cell === CELL_ASH) {
          ashX += sim.xOfCol(col);
          ashD += d;
          ashN++;
        }
      }
    }

    const list: Marker[] = [];
    const wetDepth = sim.dousedDepth();
    const doused = wetDepth > 0.02;
    const bounds = faceBounds(0);

    // Sebelum disulut, yang perlu dikenali hanya permukaannya.
    if (s.act === 0 && stats.consumed < 0.001 && emberN === 0) {
      list.push({
        id: "permukaan",
        x: bounds.left + (bounds.right - bounds.left) * 0.32,
        y: surfaceRelief(0, 0) + (narrow ? 0.16 : 0.34),
        text: narrow ? "Klik untuk menyulut" : "Permukaan gambut — klik untuk menyulut",
        tone: "plain",
      });
    }

    // Garis biru yang selama ini tidak pernah diberi nama.
    const water = sim.getWaterTable();
    if (water < PROFILE_DEPTH - 0.2) {
      list.push({
        // Duduk di dekat tepi kanan penampang, sebab bongkahan yang dibesarkan
        // sudah mengisi ruang sampai kolom teks di sebelahnya.
        id: "air",
        x: narrow ? bounds.right - 0.15 : bounds.right - 0.85,
        y: -water,
        text: narrow ? `Muka air −${Math.round(water * 100)} cm` : `Muka air tanah −${Math.round(water * 100)} cm`,
        tone: "water",
        pinned: true,
      });
    }

    if (emberN > 0) {
      const x = emberX / emberN;
      const d = emberD / emberN;
      list.push({
        id: "bara",
        x,
        // Sedikit di bawah titik beratnya, supaya tidak menutupi pijarnya.
        y: yAt(d, x) - 0.2,
        // Selama lapisan atas masih basah oleh siraman, label ini menegaskan
        // bahwa yang padam hanya bagian atas.
        text: doused
          ? narrow
            ? "Masih membara di bawah"
            : `Masih membara di bawah · ${Math.round(stats.frontDepth * 100)} cm`
          : narrow
            ? `Bara ${Math.round(stats.frontDepth * 100)} cm`
            : `Bara sedalam ${Math.round(stats.frontDepth * 100)} cm`,
        tone: "ember",
      });
    }

    // Rongga abu baru diberi nama setelah cukup lebar untuk dikenali.
    // Selama siraman masih basah, label rongga abu disimpan dulu: sudut kiri
    // atas sudah diisi label siraman, bara, dan atap runtuh, sementara rongga
    // abu bukan bagian dari cerita siram–padam–muncul lagi.
    if (ashN > GRID_COLS * 0.5 && !doused) {
      const x = ashX / ashN;
      const d = ashD / ashN;
      list.push({
        id: "abu",
        x,
        // Sedikit di atas titik beratnya, menjauh dari label bara di bawahnya.
        y: yAt(d, x) + 0.24,
        text: narrow ? "Rongga abu" : "Rongga abu — gambut sudah habis",
        tone: "ash",
      });
    }

    // Dua kejadian dari catatan Usup dkk. (2004): atap tanah yang runtuh, dan
    // bara yang muncul lagi di tempat lain.
    if (stats.collapseX !== null) {
      list.push({
        id: "runtuh",
        x: stats.collapseX,
        y: yAt(0, stats.collapseX) + 0.22,
        text: narrow ? "Tanah amblas" : "Atap tanah runtuh",
        tone: "ash",
      });
    }
    // Sesudah disiram: titik tempat bara dari bawah menyalakan permukaan lagi.
    if (stats.rekindleX !== null && emberN > 0) {
      list.push({
        id: "nyala",
        x: stats.rekindleX,
        y: yAt(0, stats.rekindleX) + 0.5,
        text: narrow ? "Menyala lagi" : "Menyala lagi dari bawah",
        tone: "ember",
      });
    }
    // Penyeberangan atap yang terjadi sebelum disiram tidak diberi label lagi
    // sesudah siraman: ceritanya kini siram–padam–menyala lagi, dan dua label
    // "muncul" yang berdampingan terbaca sebagai satu kejadian yang sama.
    const afterDouse = sim.getDouse() > 0 || stats.rekindleX !== null;
    if (stats.resurfaceX !== null && emberN > 0 && !afterDouse) {
      list.push({
        id: "muncul",
        x: stats.resurfaceX,
        y: yAt(0, stats.resurfaceX) + 0.5,
        text: narrow ? "Muncul lagi" : "Bara muncul lagi di sini",
        tone: "ember",
      });
    }

    // Sesudah disiram: sejauh mana air benar-benar masuk. Label menempel pada
    // garis putus-putus batas lapisan basah, yang naik seiring air menguap.
    if (doused) {
      const x = bounds.left + 0.12;
      list.push({
        id: "siram",
        x,
        y: yAt(wetDepth, x),
        // Tanpa angka: kedalaman resapan siraman tidak dilaporkan oleh acuan.
        text: narrow ? "Batas siraman" : "Air siraman berhenti di sini",
        tone: "water",
      });
    }

    // Nama lapisan baru muncul saat tanahnya ditunjuk (lihat `layerHint.ts`).
    // Supaya pembaca tahu tanahnya bisa ditunjuk, ada satu petunjuk yang hilang
    // setelah dipakai sekali. Di layar sentuh ia menunggu sampai bara tersulut,
    // sebab pada babak pertama ketukan pada tanah berarti menyulut.
    const touch = isTouchOnly();
    if (!s.layerHinted && s.thermal < 0.5 && (!touch || s.act > 0)) {
      const x = bounds.left + (bounds.right - bounds.left) * HOVER_PROMPT_AT;
      list.push({
        id: "petunjuk",
        x,
        y: yAt(HOVER_PROMPT_DEPTH, x),
        text: touch ? "Ketuk tanah untuk nama lapisannya" : "Arahkan kursor ke tanah",
        tone: "plain",
        pinned: true,
      });
    }

    // Lebar bongkahan, menemani batang ukur di bawahnya.
    if (!narrow) {
      list.push({
        id: "lebar",
        x: (bounds.left + bounds.right) / 2,
        y: -PROFILE_DEPTH - 0.4,
        text: `${BLOCK_WIDTH.toLocaleString("id-ID")} m`,
        tone: "depth",
        pinned: true,
      });
    }

    // Angka pada penggaris kedalaman. Disembunyikan di layar sempit, tempat
    // satu label pun sudah sulit muat.
    if (!narrow) {
      for (const metre of DEPTH_MARKS) {
        const x = faceBounds(-metre).left + 0.46;
        list.push({
          id: `d${metre}`,
          x,
          y: yAt(metre, x),
          text: `${metre} m`,
          tone: "depth",
          pinned: true,
        });
      }
    }

    if (stats.extinguished) {
      list.push({
        id: "padam",
        x: 0,
        y: yAt(Math.max(0.3, stats.frontDepth), 0),
        text: narrow ? "Bara padam" : "Bara padam — gambut di sekelilingnya jenuh air",
        tone: "water",
      });
    }

    spread(list);

    // Penyaringan di ruang layar.
    //
    // Mendorong label di ruang tiga dimensi saja tidak cukup: jaraknya di
    // layar berubah mengikuti sudut pandang dan putaran bongkahan, dan di
    // tepi kiri maupun kanan ada panel teks yang menutupinya. Di sini tiap
    // label diproyeksikan dulu ke piksel, lalu yang keluar dari daerah aman
    // atau masih bertabrakan dengan label yang lebih penting dibuang.
    const group = groupRef.current;
    if (!group) return;
    const { camera, size } = state;

    // Di dekat batas putarannya, bidang potong berpaling dari kamera. Saat itu
    // keterangannya harus ikut hilang: label digambar sebagai elemen HTML di
    // atas kanvas, jadi ia tidak tertutup oleh bongkahan dan akan tetap
    // melayang di depan dinding samping bongkahan — menunjuk ke sesuatu yang
    // justru sedang tidak terlihat.
    group.getWorldPosition(center);
    faceNormal.set(0, 0, 1).transformDirection(group.matrixWorld);
    toCamera.copy(camera.position).sub(center).normalize();
    if (faceNormal.dot(toCamera) < 0.25) {
      if (signature.current !== "") {
        signature.current = "";
        setMarkers([]);
      }
      return;
    }

    // Daerah aman berbeda menurut lebar layar. Di layar lebar, teks cerita
    // menempati kolom kiri dan panel angka kolom kanan. Di layar sempit
    // keduanya melebar ke seluruh lebar, dan yang tersisa hanyalah pita
    // mendatar di antara teks pengantar dan panel kendali — kira-kira sejajar
    // badan bongkahan.
    //
    // Batas pita itu dahulu ditulis tetap, 38–62% tinggi layar. Uji di ponsel
    // sungguhan menunjukkan angka tetap itu tidak cukup: arahan dan panah
    // lanjut di atas panel kendali naik sampai sekitar 60% layar, sehingga
    // label muka air jatuh di belakang pil arahan. Kini pitanya diukur dari
    // tata letak yang sebenarnya (`labelBand`), dan angka tetap hanya menjadi
    // cadangan sebelum ukuran pertama tersedia.
    const area = readingArea(size.width, size.height);
    const band = narrow ? s.labelBand : null;
    const minX = area ? area.left : size.width * (narrow ? 0.04 : 0.27);
    const maxX = area ? area.right : size.width * (narrow ? 0.96 : 0.82);
    const minY = area ? area.top : band ? band.top : size.height * (narrow ? 0.38 : 0.1);
    const maxY = area ? area.bottom : band ? band.bottom : size.height * (narrow ? 0.62 : 0.84);

    const taken: { l: number; r: number; t: number; b: number }[] = [];
    const visible: Marker[] = [];
    const ranked = [...list].sort((a, b) => PRIORITY.indexOf(a.id) - PRIORITY.indexOf(b.id));

    for (const m of ranked) {
      probe.set(m.x, m.y, LABEL_Z);
      group.localToWorld(probe);
      probe.project(camera);
      // Titik di belakang kamera diproyeksikan ke tempat yang menyesatkan.
      if (probe.z > 1) continue;
      const half = m.tone === "depth" ? 14 : (m.text.length * CHAR_WIDTH + PADDING) / 2;
      const cx = (probe.x * 0.5 + 0.5) * size.width;
      const cy = (-probe.y * 0.5 + 0.5) * size.height;
      const box = { l: cx - half, r: cx + half, t: cy - LABEL_HEIGHT / 2, b: cy + LABEL_HEIGHT / 2 };
      if (box.l < minX || box.r > maxX || box.t < minY || box.b > maxY) continue;
      if (taken.some((o) => box.l < o.r + 6 && box.r > o.l - 6 && box.t < o.b + 6 && box.b > o.t - 6)) continue;
      taken.push(box);
      visible.push(m);
    }

    const next = visible.map((m) => `${m.id}|${m.text}|${m.x.toFixed(2)}|${m.y.toFixed(2)}`).join("//");
    if (next !== signature.current) {
      signature.current = next;
      setMarkers(visible);
    }
  });

  return (
    <group ref={groupRef}>
      <OriginalSurfaceLine subsidence={subsidence} />
      <WidthScaleBar />
      {markers.map((m) => (
        <Html
          key={m.id}
          position={[m.x, m.y, LABEL_Z]}
          center
          zIndexRange={[20, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {m.tone === "depth" ? (
            // Angka penggaris ditulis polos tanpa kapsul: ia menemani goresan
            // di tepi, bukan menamai benda, jadi tidak boleh ikut ramai.
            <span className="whitespace-nowrap text-[10px] font-medium tabular-nums text-white/55">{m.text}</span>
          ) : (
            <div
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_CLASS[m.tone]}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASS[m.tone]}`} aria-hidden="true" />
              {m.text}
            </div>
          )}
        </Html>
      ))}
    </group>
  );
}

/**
 * Batang ukur lebar bongkahan.
 *
 * Menggantikan siluet orang yang sempat dipakai sebagai patokan ukuran.
 * Sosok itu janggal di sini: bongkahannya melayang di ruang kosong, sehingga
 * orang yang berdiri di sebelahnya ikut melayang tanpa tanah yang dipijak.
 * Batang ukur sebahasa dengan penggaris kedalaman yang sudah ada di tepi
 * kiri, jadi keduanya terbaca sebagai satu sistem penandaan.
 */
function WidthScaleBar() {
  const res = useMemo(() => {
    const { left, right } = faceBounds(0);
    // Didekatkan dari 45 cm ke 22 cm di bawah dasar bongkahan. Dengan kamera
    // yang kini memandang serong, batang ini ikut miring mengikuti bidang
    // potong; berdiri sejauh itu dari bongkahannya, ia terbaca sebagai garis
    // yang melayang entah mengukur apa.
    const y = -PROFILE_DEPTH - 0.22;
    const cap = 0.11;
    // Satu garis mendatar ditambah dua kaki tegak di ujungnya.
    const points = [
      left, y, LABEL_Z, right, y, LABEL_Z,
      left, y - cap, LABEL_Z, left, y + cap, LABEL_Z,
      right, y - cap, LABEL_Z, right, y + cap, LABEL_Z,
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({
      color: "#cfd3d8",
      transparent: true,
      opacity: 0.4,
      toneMapped: false,
      depthTest: false,
    });
    return { geometry, material };
  }, []);

  useEffect(
    () => () => {
      res.geometry.dispose();
      res.material.dispose();
    },
    [res],
  );

  return <lineSegments geometry={res.geometry} material={res.material} frustumCulled={false} />;
}

/** Banyaknya ruas garis putus-putus sepanjang bongkahan. */
const DASHES = 46;

/**
 * Jejak permukaan tanah semula.
 *
 * Panel kanan menyebut "permukaan turun 53 cm", tetapi tanpa patokan tinggi
 * awal angka itu tidak pernah terlihat sebagai perubahan. Garis putus-putus
 * ini tertinggal di udara pada ketinggian tanah sebelum terbakar, dan hanya
 * digambar di tempat tanahnya memang sudah melesak.
 */
function OriginalSurfaceLine({ subsidence }: { subsidence: Subsidence }) {
  const res = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DASHES * 2 * 3), 3));
    const material = new THREE.LineBasicMaterial({
      color: "#ffcf9a",
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthTest: false,
    });
    return { geometry, material };
  }, []);

  useEffect(
    () => () => {
      res.geometry.dispose();
      res.material.dispose();
    },
    [res],
  );

  const built = useRef(-1);
  const lineRef = useRef<THREE.LineSegments>(null);

  useFrame((_, delta) => {
    if (built.current !== subsidence.version) {
      built.current = subsidence.version;
      const pos = res.geometry.attributes.position as THREE.BufferAttribute;
      const { left, right } = faceBounds(0);
      const span = right - left;
      let drawn = 0;
      for (let i = 0; i < DASHES; i++) {
        // Tiap ruas mengisi 60% petaknya; sisanya menjadi jeda.
        const a = left + (span * i) / DASHES;
        const b = a + (span / DASHES) * 0.6;
        // Hanya digambar di tempat tanahnya sudah turun lebih dari 4 cm.
        if (subsidence.fn((a + b) / 2) < 0.04) continue;
        pos.setXYZ(drawn * 2, a, surfaceRelief(a, 0), LABEL_Z);
        pos.setXYZ(drawn * 2 + 1, b, surfaceRelief(b, 0), LABEL_Z);
        drawn++;
      }
      pos.needsUpdate = true;
      res.geometry.setDrawRange(0, drawn * 2);
      res.geometry.computeBoundingSphere();
      if (lineRef.current) lineRef.current.visible = drawn > 0;
    }

    // Muncul perlahan, supaya tidak berkedip saat ruas pertama lahir.
    const want = res.geometry.drawRange.count > 0 ? 0.6 : 0;
    res.material.opacity = THREE.MathUtils.damp(res.material.opacity, want, 4, Math.min(delta, 0.05));
  });

  return (
    <lineSegments ref={lineRef} geometry={res.geometry} material={res.material} visible={false} frustumCulled={false} />
  );
}
