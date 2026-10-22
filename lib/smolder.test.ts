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
