import { describe, expect, it } from "vitest";
import {
  CELL_ASH,
  CELL_INTACT,
  CELL_QUENCHED,
  CELL_SMOLDER,
  CAPILLARY_RISE,
  DOUSE_DEPTH,
  formatDay,
  formatElapsed,
  GRID_COLS,
  GRID_ROWS,
  MOISTURE_LIMIT,
  smoothField,
  SmolderSim,
} from "./smolder";

/** Bangun simulasi dengan muka air dalam (gambut kering) lalu sulut di tengah. */
function ignited(waterTableM = 1.6) {
  const sim = new SmolderSim(7);
  sim.setWaterTable(waterTableM);
  const lit = sim.ignite(0.5);
  return { sim, lit };
}

/**
 * Majukan simulasi sejumlah `hari`. `advance` membatasi jumlah langkah per
 * pemanggilan (sebagaimana saat dipanggil tiap bingkai), jadi di sini waktu
 * dimajukan sedikit-sedikit seperti di aplikasi. Ringkasan dihitung sekali di
 * akhir, sama seperti adegan 3D yang menyegarkannya secara berkala.
 */
function jalan(sim: SmolderSim, hari: number) {
  const akhir = sim.stats.hours + hari * 24;
  while (sim.stats.hours < akhir) sim.advance(6);
  sim.collect();
}

describe("kelembapan mengikuti muka air tanah", () => {
  it("jenuh tepat pada dan di bawah muka air tanah", () => {
    const sim = new SmolderSim();
    sim.setWaterTable(1);
    expect(sim.moistureAtDepth(1)).toBe(1);
    expect(sim.moistureAtDepth(2.5)).toBe(1);
  });

  it("kering penuh pada ketinggian air kapiler di atas muka air", () => {
    const sim = new SmolderSim();
    sim.setWaterTable(1);
    expect(sim.moistureAtDepth(1 - CAPILLARY_RISE)).toBeCloseTo(0, 6);
    expect(sim.moistureAtDepth(1 - CAPILLARY_RISE / 2)).toBeCloseTo(0.5, 6);
  });
});

describe("penyulutan", () => {
  it("gagal bila gambut basah (muka air di permukaan)", () => {
    const sim = new SmolderSim();
    sim.setWaterTable(0.05);
    expect(sim.ignite(0.5)).toBe(false);
    expect(sim.stats.active).toBe(0);
  });

  it("berhasil bila gambut atas sudah kering", () => {
    const { sim, lit } = ignited();
    expect(lit).toBe(true);
    expect(sim.stats.active).toBeGreaterThan(0);
    expect(sim.stats.alive).toBe(true);
  });
});

describe("perambatan bara", () => {
  it("merambat melebar dan makin dalam seiring waktu", () => {
    const { sim } = ignited();
    jalan(sim, 1);
    const hariPertama = { ...sim.stats };
    jalan(sim, 4);
    expect(sim.stats.frontDepth).toBeGreaterThan(hariPertama.frontDepth);
    expect(sim.stats.burnedWidth).toBeGreaterThan(hariPertama.burnedWidth);
    expect(sim.stats.consumed).toBeGreaterThan(hariPertama.consumed);
  });

  it("tidak pernah melewati muka air tanah", () => {
    const water = 1.2;
    const { sim } = ignited(water);
    jalan(sim, 20);
    expect(sim.stats.frontDepth).toBeLessThanOrEqual(water);
    // Tidak ada satu pun sel jenuh yang terbakar.
    for (let row = 0; row < GRID_ROWS; row++) {
      if (sim.depthOfRow(row) < water) continue;
      for (let col = 0; col < GRID_COLS; col++) {
        expect(sim.state[sim.index(col, row)]).toBe(CELL_INTACT);
      }
    }
  });

  it("makin dalam muka air tanah, makin banyak gambut yang habis", () => {
    const jalankan = (water: number) => {
      const sim = new SmolderSim(7);
      sim.setWaterTable(water);
      sim.ignite(0.5);
      jalan(sim, 12);
      return sim.stats.consumed;
    };
    expect(jalankan(2.2)).toBeGreaterThan(jalankan(1.2));
    expect(jalankan(1.2)).toBeGreaterThan(jalankan(0.7));
  });

  it("meninggalkan abu dan menurunkan permukaan di atas rongga", () => {
    const { sim } = ignited();
    jalan(sim, 8);
    const abu = [...sim.state].filter((s) => s === CELL_ASH).length;
    expect(abu).toBeGreaterThan(0);
    expect(sim.stats.maxSubsidence).toBeGreaterThan(0);
  });

  it("hasilnya sama untuk benih acak yang sama", () => {
    const jalankan = () => {
      const sim = new SmolderSim(99);
      sim.setWaterTable(1.6);
      sim.ignite(0.4);
      jalan(sim, 6);
      return [...sim.state].join("");
    };
    expect(jalankan()).toBe(jalankan());
  });
});

describe("pemadaman", () => {
  it("siraman permukaan tidak mematikan bara yang sudah dalam", () => {
    const { sim } = ignited();
    // Biarkan bara turun lebih dalam daripada jangkauan siraman.
    jalan(sim, 6);
    expect(sim.stats.frontDepth).toBeGreaterThan(DOUSE_DEPTH);

    sim.douseSurface();
    sim.advance(3);
    sim.collect();
    // Asap permukaan mereda, tetapi bara di bawah tetap hidup.
    expect(sim.stats.surfaceSmoke).toBeLessThan(0.5);
    expect(sim.stats.alive).toBe(true);

    // Setelah air menguap, bara kembali melebar.
    const sebelum = sim.stats.consumed;
    jalan(sim, 6);
    expect(sim.stats.alive).toBe(true);
    expect(sim.stats.consumed).toBeGreaterThan(sebelum);
  });

  it("pembasahan sampai atas titik bara memadamkan seluruhnya", () => {
    const { sim } = ignited();
    jalan(sim, 5);
    expect(sim.stats.alive).toBe(true);

    // Muka air dinaikkan sampai permukaan: seluruh profil menjadi jenuh.
    sim.setWaterTable(0);
    jalan(sim, 0.5);
    expect(sim.stats.active).toBe(0);
    expect(sim.stats.alive).toBe(false);
    expect(sim.stats.extinguished).toBe(true);
    expect([...sim.state].some((s) => s === CELL_QUENCHED)).toBe(true);

    // Dan tidak menyala lagi selama tetap basah.
    jalan(sim, 10);
    expect(sim.stats.active).toBe(0);
  });

  it("lama menyala berhenti bertambah setelah bara padam", () => {
    // Pada babak 04 pembaca memadamkan baranya lalu membiarkan waktu
    // berjalan untuk memastikan ia tidak hidup lagi. Kartu penutup dahulu
    // menampilkan waktu simulasi di bawah label "Lama menyala", sehingga
    // angka itu terus bertambah padahal tidak ada lagi yang menyala.
    const { sim } = ignited();
    jalan(sim, 5);
    expect(sim.stats.burningHours).toBeGreaterThan(0);
    // Selama masih menyala, keduanya berjalan bersama.
    expect(sim.stats.burningHours).toBeCloseTo(sim.stats.hours, 1);

    sim.setWaterTable(0);
    jalan(sim, 0.5);
    expect(sim.stats.extinguished).toBe(true);
    const menyala = sim.stats.burningHours;
    const berjalan = sim.stats.hours;

    jalan(sim, 20);
    expect(sim.stats.hours).toBeGreaterThan(berjalan + 400);
    expect(sim.stats.burningHours).toBe(menyala);
  });

  it("laju rambat tidak merosot sendiri setelah bara padam", () => {
    // Lebar daerah terbakar berhenti tumbuh begitu bara padam, jadi bila
    // pembaginya lama waktu berjalan, angkanya akan terus turun sesudahnya.
    const { sim } = ignited();
    jalan(sim, 5);
    sim.setWaterTable(0);
    jalan(sim, 0.5);
    expect(sim.stats.extinguished).toBe(true);
    const laju = sim.stats.spreadCmPerDay;
    expect(laju).toBeGreaterThan(0);

    jalan(sim, 20);
    expect(sim.stats.spreadCmPerDay).toBeCloseTo(laju, 6);
  });

  it("pembasahan setengah hanya memadamkan bara di bawah muka air baru", () => {
    const { sim } = ignited(2.2);
    jalan(sim, 10);
    expect(sim.stats.frontDepth).toBeGreaterThan(0.6);

    sim.setWaterTable(0.4);
    jalan(sim, 1);
    // Bara hanya mungkin bertahan di lapisan kering paling atas.
    for (let row = 0; row < GRID_ROWS; row++) {
      if (sim.moistureAtDepth(sim.depthOfRow(row)) < MOISTURE_LIMIT) continue;
      for (let col = 0; col < GRID_COLS; col++) {
        expect(sim.state[sim.index(col, row)]).not.toBe(CELL_SMOLDER);
      }
    }
  });
});

describe("tekstur data untuk peneduh", () => {
  it("menandai sel membara dengan panas dan sel abu dengan rongga", () => {
    const { sim } = ignited();
    jalan(sim, 4);
    const field = new Uint8Array(GRID_COLS * GRID_ROWS * 4);
    sim.writeField(field);

    let adaPanas = false;
    let adaRongga = false;
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      if (sim.state[i] === CELL_SMOLDER && field[i * 4 + 1] > 80) adaPanas = true;
      if (sim.state[i] === CELL_ASH && field[i * 4] === 255) adaRongga = true;
      // Sel utuh tidak boleh berpijar.
      if (sim.state[i] === CELL_INTACT) expect(field[i * 4 + 1]).toBe(0);
    }
    expect(adaPanas).toBe(true);
    expect(adaRongga).toBe(true);
  });
});

describe("perataan kisi untuk peneduh", () => {
  const buat = () => new Uint8Array(GRID_COLS * GRID_ROWS * 4);
  const di = (col: number, row: number) => (row * GRID_COLS + col) * 4;

  it("tidak mengubah kisi yang nilainya seragam, termasuk di tepi", () => {
    // Bobot kernelnya berjumlah tepat satu, dan tepinya dijepit ke sel
    // terluar seperti ClampToEdge pada teksturnya. Kalau salah satu dari dua
    // hal itu keliru, tepi penampang akan meredup sendiri.
    const src = buat();
    src.fill(200);
    const dst = buat();
    smoothField(src, dst);
    expect([...dst].every((v) => v === 200)).toBe(true);
  });

  it("menyebar satu sel panas ke tetangganya dengan bobot 4-2-1 per 16", () => {
    const src = buat();
    const dst = buat();
    src[di(40, 20) + 1] = 160;
    smoothField(src, dst);
    // Pusat 4/16, sisi 2/16, sudut 1/16 (dibulatkan ke bilangan terdekat).
    expect(dst[di(40, 20) + 1]).toBe(Math.round((160 * 4) / 16));
    expect(dst[di(41, 20) + 1]).toBe(Math.round((160 * 2) / 16));
    expect(dst[di(40, 21) + 1]).toBe(Math.round((160 * 2) / 16));
    expect(dst[di(41, 21) + 1]).toBe(Math.round((160 * 1) / 16));
    // Dua sel jauhnya sudah tidak tersentuh.
    expect(dst[di(42, 20) + 1]).toBe(0);
  });

  it("tidak mencampur antarkanal", () => {
    const src = buat();
    const dst = buat();
    // Hanya kanal abu (R) yang diisi; kanal lain harus tetap nol.
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) src[i * 4] = 255;
    smoothField(src, dst);
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      expect(dst[i * 4]).toBe(255);
      expect(dst[i * 4 + 1]).toBe(0);
      expect(dst[i * 4 + 2]).toBe(0);
      expect(dst[i * 4 + 3]).toBe(0);
    }
  });

  it("melembutkan tepi rongga abu, bukan membiarkannya melangkah", () => {
    const { sim } = ignited();
    jalan(sim, 4);
    const raw = buat();
    const rata = buat();
    sim.writeField(raw);
    smoothField(raw, rata);

    // Di kisi mentah, kanal abu hanya bernilai beberapa nilai yang berjauhan;
    // setelah diratakan muncul nilai-nilai peralihan di antaranya. Itulah
    // yang memecah garis kisi pada penampang.
    const nilaiMentah = new Set<number>();
    const nilaiRata = new Set<number>();
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      nilaiMentah.add(raw[i * 4]);
      nilaiRata.add(rata[i * 4]);
    }
    expect(nilaiRata.size).toBeGreaterThan(nilaiMentah.size);
  });
});

/**
 * Pembacaan tekstur seperti yang dilakukan WebGL: penyaringan linear dengan
 * pusat texel di (i + 0,5) / ukuran, dan tepi dijepit (ClampToEdge).
 */
function bacaBilinear(src: Uint8Array, u: number, v: number, ch: number): number {
  const jepit = (i: number, n: number) => (i < 0 ? 0 : i > n - 1 ? n - 1 : i);
  const tx = u * GRID_COLS - 0.5;
  const ty = v * GRID_ROWS - 0.5;
  const i0 = Math.floor(tx);
  const j0 = Math.floor(ty);
  const fx = tx - i0;
  const fy = ty - j0;
  const at = (i: number, j: number) =>
    src[(jepit(j, GRID_ROWS) * GRID_COLS + jepit(i, GRID_COLS)) * 4 + ch];
  const atas = at(i0, j0) * (1 - fx) + at(i0 + 1, j0) * fx;
  const bawah = at(i0, j0 + 1) * (1 - fx) + at(i0 + 1, j0 + 1) * fx;
  return atas * (1 - fy) + bawah * fy;
}

/** Rata-rata 3 x 3 seperti yang dahulu dikerjakan di dalam peneduh fragmen. */
function rataDiPeneduh(src: Uint8Array, u: number, v: number, ch: number): number {
  const tu = 1 / GRID_COLS;
  const tv = 1 / GRID_ROWS;
  let jumlah = 0;
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      const bobot = (di === 0 ? 2 : 1) * (dj === 0 ? 2 : 1);
      jumlah += bobot * bacaBilinear(src, u + di * tu, v + dj * tv, ch);
    }
  }
  return jumlah / 16;
}

describe("perataan di CPU sama dengan perataan di peneduh", () => {
  // Inti penghematannya: peneduh dahulu membaca kisi sembilan kali tiap
  // pemanggilan, dan memanggilnya tiga belas kali — 117 pembacaan tekstur
  // tiap fragmen. Sekarang kisinya datang sudah rata, jadi cukup sekali.
  // Yang harus dijaga: rupanya tidak berubah.
  const sim = new SmolderSim();
  sim.setWaterTable(2.2);
  sim.ignite(0.5);
  jalan(sim, 6);
  const raw = new Uint8Array(GRID_COLS * GRID_ROWS * 4);
  const rata = new Uint8Array(GRID_COLS * GRID_ROWS * 4);
  sim.writeField(raw);
  smoothField(raw, rata);

  /** Titik baca uji, termasuk yang jatuh di tengah-tengah antar sel. */
  const titik: [number, number][] = [];
  for (let a = 3; a < 40; a++) {
    for (let b = 3; b < 24; b++) titik.push([(a + 0.37) / 40, (b + 0.73) / 24]);
  }

  it("memberi nilai yang sama di bagian dalam kisi, bukan hampiran", () => {
    // Perataan kotak dan interpolasi bilinear keduanya linear, dan titik
    // kernelnya berjarak tepat satu texel — jadi urutannya boleh ditukar.
    // Selisih yang tersisa hanya pembulatan ke 8 bit saat kisi rata disimpan,
    // yaitu paling jauh setengah satuan.
    let terburuk = 0;
    for (const [u, v] of titik) {
      for (let ch = 0; ch < 4; ch++) {
        const lama = rataDiPeneduh(raw, u, v, ch);
        const baru = bacaBilinear(rata, u, v, ch);
        terburuk = Math.max(terburuk, Math.abs(lama - baru));
      }
    }
    // Dalam satuan 0–255. Setengah satuan di sini sama dengan 0,2% warna.
    // Dalam satuan 0–255; terukur 0,40. Setengah satuan di sini sama dengan
    // 0,2% warna, jadi tidak ada bedanya yang dapat dilihat.
    expect(terburuk).toBeLessThanOrEqual(0.5);
  });

  it("di tepi hanya menyimpang bila ada tepian tajam tepat di kolom terluar", () => {
    // Penjepitan terjadi pada tahap yang berbeda: peneduh lama menjepit titik
    // bacanya, sedangkan sekarang perataannya yang dijepit. Jadi di pita
    // setebal satu sel (4,6 cm) pada tepi kiri dan kanan penampang, kesamaan
    // di atas tidak berlaku lagi.
    //
    // Pada kebakaran sungguhan simpangannya 0,17 satuan — sama saja dengan
    // tidak ada. Yang membuatnya berarti hanyalah keadaan buatan: kolom
    // terluar penuh sementara kolom sebelahnya nol. Di situ selisihnya 32
    // satuan, atau 13% kecerahan, dan hanya pada pita 4,6 cm itu.
    let terburuk = 0;
    for (let j = 0; j < GRID_ROWS; j++) {
      for (const u of [0.001, 0.999]) {
        for (let ch = 0; ch < 4; ch++) {
          const v = (j + 0.5) / GRID_ROWS;
          terburuk = Math.max(terburuk, Math.abs(rataDiPeneduh(raw, u, v, ch) - bacaBilinear(rata, u, v, ch)));
        }
      }
    }
    expect(terburuk).toBeLessThan(1);

    const tajam = new Uint8Array(GRID_COLS * GRID_ROWS * 4);
    for (let j = 0; j < GRID_ROWS; j++) tajam[j * GRID_COLS * 4] = 255;
    const tajamRata = new Uint8Array(tajam.length);
    smoothField(tajam, tajamRata);
    let buatan = 0;
    for (let j = 2; j < GRID_ROWS - 2; j++) {
      for (let k = 0; k <= 20; k++) {
        const u = (k / 20) / GRID_COLS;
        const v = (j + 0.5) / GRID_ROWS;
        buatan = Math.max(buatan, Math.abs(rataDiPeneduh(tajam, u, v, 0) - bacaBilinear(tajamRata, u, v, 0)));
      }
    }
    expect(buatan).toBeGreaterThan(20);
    expect(buatan).toBeLessThan(40);
  });
});

describe("pemeriksaan titik dan format waktu", () => {
  it("suhu bara jauh di atas suhu gambut utuh", () => {
    const { sim } = ignited();
    jalan(sim, 1);
    let ditemukan = false;
    for (let row = 0; row < GRID_ROWS && !ditemukan; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (sim.state[sim.index(col, row)] !== CELL_SMOLDER) continue;
        const p = sim.probe(col, row);
        expect(p.temperature).toBeGreaterThan(400);
        expect(p.state).toBe(CELL_SMOLDER);
        ditemukan = true;
        break;
      }
    }
    expect(ditemukan).toBe(true);
    expect(sim.probe(0, GRID_ROWS - 1).temperature).toBeLessThan(200);
  });

  it("memberi label hari dan lama berjalan dalam Bahasa Indonesia", () => {
    expect(formatDay(0)).toBe("Hari ke-1");
    expect(formatDay(30)).toBe("Hari ke-2");
    expect(formatElapsed(6)).toBe("6 jam");
    expect(formatElapsed(48)).toBe("2 hari");
    expect(formatElapsed(54)).toBe("2 hari 6 jam");
  });
});
