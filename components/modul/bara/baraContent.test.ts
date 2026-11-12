import { describe, expect, it } from "vitest";
import { BARA_ACTS } from "@/config/modul/bara";

describe("penjelasan singkat tiap babak", () => {
  it("tersedia pada semua babak", () => {
    for (const act of BARA_ACTS) expect(act.lead.length).toBeGreaterThan(0);
  });

  it("muat dalam dua baris agar tidak menyentuh panel kendali", () => {
    // Kolom teks selebar 404 piksel memuat sekitar 57 huruf per baris.
    for (const act of BARA_ACTS) expect(act.lead.length).toBeLessThanOrEqual(110);
  });
});
