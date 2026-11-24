import { describe, expect, it } from "vitest";
import {
  birdRate,
  forensikMix,
  kabutAsapMix,
  crackleRate,
  hutanRawaMix,
  kanalMix,
  karbonMix,
  lifeUnderSmoke,
  musimApiMix,
  peatForestMix,
  sekitarmuMix,
  type AmbientMix,
} from "./soundscapes";

/** Semua takaran harus di rentang 0–1, apa pun masukannya. */
function inRange(mix: AmbientMix) {
  for (const v of Object.values(mix)) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  }
}

describe("laju peristiwa", () => {
  it("derak bara sunyi saat aman dan makin rapat saat api besar", () => {
    expect(crackleRate(0)).toBe(0);
    expect(crackleRate(0.5)).toBeGreaterThan(crackleRate(0.1));
    expect(crackleRate(1)).toBe(28);
    expect(crackleRate(5)).toBe(28);
  });

  it("burung berkicau saat aman dan diam saat asap tebal", () => {
    expect(birdRate(1)).toBeCloseTo(0.45);
    expect(lifeUnderSmoke(0)).toBe(1);
    expect(lifeUnderSmoke(0.2)).toBeGreaterThan(0);
    expect(lifeUnderSmoke(0.35)).toBe(0);
    expect(lifeUnderSmoke(1)).toBe(0);
  });
});

describe("racikan tiap modul", () => {
  it("kabut asap: makin pekat makin sunyi burungnya", () => {
    expect(kabutAsapMix({ act: 1, haze: 1 }).birds).toBeLessThan(kabutAsapMix({ act: 1, haze: 0 }).birds);
    inRange(kabutAsapMix({ act: 1, haze: 3 }));
  });

  it("kabut asap: kota ramai pagi, sepi dini hari; burung diam tengah malam", () => {
    const pagi = kabutAsapMix({ act: 1, haze: 0, hour: 7 });
    const dini = kabutAsapMix({ act: 1, haze: 0, hour: 3 });
    expect(pagi.city).toBeGreaterThan(dini.city!);
    expect(kabutAsapMix({ act: 1, haze: 0, hour: 0 }).birds).toBe(0);
    expect(dini.frogs).toBeGreaterThan(pagi.frogs);
    expect(kabutAsapMix({ act: 1, haze: 1, hour: 7 }).city).toBeLessThan(pagi.city!);
    for (const hour of [0, 6, 12, 18, 23.75]) inRange(kabutAsapMix({ act: 1, haze: 0.5, hour }));
  });

  it("forensik api: angin terdengar saat dinyalakan, api mengikuti kotak panas", () => {
    expect(forensikMix({ act: 0, windy: true, fire: 0 }).wind).toBeGreaterThan(forensikMix({ act: 0, windy: false, fire: 0 }).wind);
    expect(forensikMix({ act: 1, windy: false, fire: 1 }).fire).toBeGreaterThan(forensikMix({ act: 1, windy: false, fire: 0 }).fire);
    inRange(forensikMix({ act: 2, windy: false, fire: 5 }));
  });

  it("hutan gambut: aman terdengar hidup, bahaya terdengar api", () => {
    const safe = peatForestMix(0);
    const burning = peatForestMix(1);
    expect(safe.birds).toBe(1);
    expect(safe.fire).toBe(0);
    expect(burning.birds).toBe(0);
    expect(burning.fire).toBe(1);
    expect(burning.wind).toBeGreaterThan(safe.wind);
  });

  it("hutan rawa: banjir dan hujan menambah air dan katak", () => {
    const calm = hutanRawaMix({ flood: false, rain: false });
    expect(hutanRawaMix({ flood: true, rain: false }).water).toBeGreaterThan(calm.water);
    expect(hutanRawaMix({ flood: false, rain: true }).rain).toBeGreaterThan(0);
    expect(hutanRawaMix({ flood: false, rain: true }).frogs).toBeGreaterThan(calm.frogs);
  });

  it("kanal: makin dalam makin deras, sekat menenangkan airnya", () => {
    const base = { maxDepthCm: 300, blocked: false, dryness: 0 };
    expect(kanalMix({ ...base, canalDepthCm: 300 }).water).toBeGreaterThan(kanalMix({ ...base, canalDepthCm: 50 }).water);
    expect(kanalMix({ ...base, canalDepthCm: 300, blocked: true }).water).toBeLessThan(kanalMix({ ...base, canalDepthCm: 50 }).water);
    expect(kanalMix({ ...base, canalDepthCm: 100, dryness: 1 }).frogs).toBe(0);
  });

  it("musim api: hujan terdengar, kemarau panjang membawa api dan membungkam burung", () => {
    const wet = musimApiMix({ rainMmDay: 30, dryness: 0, fire: 0 });
    const dry = musimApiMix({ rainMmDay: 0, dryness: 1, fire: 1 });
    expect(wet.rain).toBe(1);
    expect(dry.rain).toBe(0);
    expect(dry.fire).toBe(1);
    expect(dry.birds).toBe(0);
  });

  it("karbon: hutan utuh, lalu api, lalu sunyi, lalu makhluknya kembali", () => {
    const intact = karbonMix({ burning: 0, burnt: false, recovery: 0 });
    const fire = karbonMix({ burning: 1, burnt: true, recovery: 0 });
    const after = karbonMix({ burning: 0, burnt: true, recovery: 0 });
    const healed = karbonMix({ burning: 0, burnt: true, recovery: 1 });
    expect(intact.birds).toBe(1);
    expect(fire.fire).toBe(1);
    expect(after.birds).toBe(0);
    expect(healed.birds).toBe(1);
  });

  it("takaran selalu di rentang 0–1", () => {
    for (const d of [-1, 0, 0.5, 2]) inRange(peatForestMix(d));
    for (const a of [0, 3]) inRange(sekitarmuMix(a));
    inRange(kanalMix({ canalDepthCm: 900, maxDepthCm: 300, blocked: false, dryness: 3 }));
    inRange(musimApiMix({ rainMmDay: 200, dryness: 5, fire: 5 }));
    inRange(karbonMix({ burning: 4, burnt: true, recovery: 4 }));
  });
});
