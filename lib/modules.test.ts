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
    expect(nextAvailableModule("/modul/kanal")?.href).toBe("/modul/musim-api");
    // Tujuan panah lanjut babak terakhir (NextModuleAdvance).
    expect(nextAvailableModule("/modul/anatomi")?.href).toBe("/modul/hutan-rawa");
    expect(nextAvailableModule("/modul/bara")?.href).toBe("/modul/karbon");
    // Sesudah Musim Api langsung Forensik Api, lalu Bara.
    expect(nextModule("/modul/musim-api")?.available).toBe(true);
    expect(nextAvailableModule("/modul/musim-api")?.href).toBe("/modul/forensik-api");
    expect(nextAvailableModule("/modul/forensik-api")?.href).toBe("/modul/bara");
  });

  it("menolak alamat yang tidak terdaftar", () => {
    expect(() => moduleAt("/modul/tidak-ada")).toThrow();
  });
});
