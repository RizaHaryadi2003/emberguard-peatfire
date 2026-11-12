import { describe, expect, it } from "vitest";
import { PEAT_LAYERS, type PeatLayerId } from "@/lib/model/peat";
import { BLOCK_WIDTH } from "@/components/modul/shared/scene/dioramaConstants";
import { createHalfBody, createHalfRibbon, updateHalfBody, updateHalfRibbon } from "./crossSection";
import { generateLayerContents, type ContentItem } from "./layerContents";

const items = generateLayerContents();

function of(layer: PeatLayerId): ContentItem[] {
  return items.filter((item) => item.layer === layer);
}

/** Panjang serat per meter persegi bidang potong. */
function fiberPerArea(layer: PeatLayerId): number {
  const info = PEAT_LAYERS.find((l) => l.id === layer)!;
  const total = of(layer)
    .filter((item) => item.kind === "fiber")
    .reduce(
      (sum, item) =>
        sum + item.points.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - item.points[i][0], p[1] - item.points[i][1]), 0),
      0,
    );
  return total / (BLOCK_WIDTH * (info.bottom - info.top));
}

describe("generateLayerContents", () => {
  it("selalu sama untuk benih yang sama", () => {
    expect(generateLayerContents()).toEqual(items);
  });

  it("menyimpan tiap benda di dalam lapisannya", () => {
    for (const item of items) {
      const layer = PEAT_LAYERS.find((l) => l.id === item.layer)!;
      for (const [x, d] of item.points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(BLOCK_WIDTH);
        expect(d).toBeGreaterThanOrEqual(layer.top);
        expect(d).toBeLessThanOrEqual(layer.bottom);
      }
    }
  });

  it("mengurangi serat dari fibrik ke saprik", () => {
    expect(fiberPerArea("fibrik")).toBeGreaterThan(fiberPerArea("hemik"));
    expect(fiberPerArea("hemik")).toBeGreaterThan(fiberPerArea("saprik"));
    expect(fiberPerArea("saprik")).toBeGreaterThan(0);
  });

  it("hanya mengisi tanah mineral dengan pasir dan kerikil", () => {
    expect(new Set(of("mineral").map((item) => item.kind))).toEqual(new Set(["grain", "pebble"]));
  });

  it("hanya fibrik yang masih punya akar utuh", () => {
    const withRoots = new Set(items.filter((item) => item.kind === "root").map((item) => item.layer));
    expect(withRoots).toEqual(new Set(["fibrik"]));
  });
});

describe("dinding separuh bongkahan", () => {
  it("melaporkan ketebalan irisan", () => {
    const flat = (y: number) => () => y;
    expect(updateHalfBody(createHalfBody(), flat(-1), flat(-0.4))).toBeCloseTo(0.6);
    expect(updateHalfBody(createHalfBody(), flat(-1), flat(-1))).toBe(0);
  });

  it("memasang pita muka air hanya di belakang bidang potong", () => {
    const geom = createHalfRibbon();
    updateHalfRibbon(geom, -0.8);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) expect(pos.getZ(i)).toBeLessThanOrEqual(1e-6);
  });
});
