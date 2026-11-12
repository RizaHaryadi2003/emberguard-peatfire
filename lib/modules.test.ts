import { describe, expect, it } from "vitest";
import { MODULE_PARTS, MODULES, moduleAt, nextAvailableModule, nextModule } from "@/config/modules-content";

describe("daftar modul", () => {
  it("memuat sedikitnya 12 modul, bernomor urut tanpa celah", () => {
    expect(MODULES.length).toBeGreaterThanOrEqual(12);
    MODULES.forEach((m, i) => expect(m.number).toBe(String(i + 1).padStart(2, "0")));
  });

  it("menomori bagian sesuai urutannya", () => {
    expect(MODULES[0].partNumber).toBe("01");
    expect(MODULES[MODULES.length - 1].partNumber).toBe(String(MODULE_PARTS.length).padStart(2, "0"));
  });

  it("setiap alamat modul unik dan berada di bawah /modul/", () => {
    const hrefs = MODULES.flatMap((m) => (m.href ? [m.href] : []));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const h of hrefs) expect(h.startsWith("/modul/")).toBe(true);
  });

  it("menemukan modul tersedia berikutnya, melompati yang belum dibuat", () => {
    expect(moduleAt("/modul/sekitarmu").number).toBe("01");
    expect(nextAvailableModule("/modul/sekitarmu")?.href).toBe("/modul/anatomi");
    // Sesudah Kanal ada Musim Api dan Siapa yang Menyalakan? yang belum dibuat.
    expect(nextModule("/modul/kanal")?.available).toBe(false);
    expect(nextAvailableModule("/modul/kanal")?.href).toBe("/modul/bara");
  });

  it("menolak alamat yang tidak terdaftar", () => {
    expect(() => moduleAt("/modul/tidak-ada")).toThrow();
  });
});
