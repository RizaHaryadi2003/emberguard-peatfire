/**
 * ============================================================================
 *  DAFTAR BAGIAN DAN MODUL — GANTI DI SINI
 * ============================================================================
 *  Seluruh materi Emberguard dibagi menjadi bagian-bagian, dan tiap bagian
 *  berisi beberapa modul. Urutannya mengikuti pokok materi pada ruang lingkup
 *  penelitian: pengertian, penyebab, dampak, pencegahan, dan penanggulangan
 *  kebakaran hutan dan lahan gambut.
 *
 *  Modul yang belum dibuat ditulis dengan `href: null`; kartunya tampil
 *  sebagai "Segera hadir". Menambah modul cukup menambah satu baris di bagian
 *  yang sesuai; nomornya dihitung otomatis dari urutannya.
 * ============================================================================
 */

export type ModuleEntry = {
  /** Alamat halaman modul; `null` bila belum tersedia. */
  href: string | null;
  title: string;
  caption: string;
};

export type ModulePart = {
  /** Penanda bagian, dipakai sebagai jangkar alamat (#gambut, #kering, ...). */
  id: string;
  title: string;
  /** Satu kalimat: pertanyaan yang dijawab bagian ini. */
  lead: string;
  modules: readonly ModuleEntry[];
};

/** Pengantar halaman daftar modul. */
export const MODULE_LIST_INTRO = {
  eyebrow: "Modul",
  title: "Belajar dari tanahnya",
  lead: "Dari tanah gambut di sekitar kita, bagaimana ia mengering dan terbakar, apa yang ditanggung, sampai yang bisa kita lakukan. Pilih modul mana pun, atau ikuti urutannya dari awal.",
};

export const MODULE_PARTS: readonly ModulePart[] = [
  {
    id: "gambut",
    title: "Gambut",
    lead: "Tanah apa yang kita pijak, dan mengapa ia menyimpan begitu banyak air.",
    modules: [
      { href: null, title: "Gambut di Sekitarmu", caption: "Ternyata kotamu berdiri di atasnya" },
      { href: "/modul/anatomi", title: "Anatomi Gambut", caption: "Kupas lapisannya satu per satu" },
      { href: null, title: "Hutan Rawa Gambut", caption: "Yang hidup dan menjaga airnya" },
    ],
  },
  {
    id: "kering",
    title: "Kering",
    lead: "Bagaimana tanah yang basah berubah menjadi bahan bakar.",
    modules: [
      { href: "/modul/kanal", title: "Kanal & Pengeringan", caption: "Saat air dialirkan keluar" },
      { href: null, title: "Musim Api", caption: "Kemarau panjang dan El Niño" },
    ],
  },
  {
    id: "api",
    title: "Api",
    lead: "Dari mana api datang, dan mengapa ia sulit dipadamkan.",
    modules: [
      { href: null, title: "Siapa yang Menyalakan?", caption: "Sampah, puntung, dan api pembuka lahan" },
      { href: "/modul/bara", title: "Bara di Bawah Tanah", caption: "Api yang merambat tanpa terlihat" },
    ],
  },
  {
    id: "dampak",
    title: "Dampak",
    lead: "Apa yang ditanggung udara, tubuh kita, dan hutan setelah gambut terbakar.",
    modules: [
      { href: "/modul/karbon", title: "Gudang Karbon", caption: "Apa yang lepas saat gambut terbakar" },
      { href: null, title: "Kabut Asap", caption: "Dari lahan yang terbakar ke napas kita" },
      { href: null, title: "Yang Hilang dari Hutan", caption: "Satwa dan hutan yang tidak kembali" },
    ],
  },
  {
    id: "mencegah",
    title: "Mencegah",
    lead: "Yang bisa dilakukan sebelum api menyala, dan saat tanah mulai berasap.",
    modules: [
      { href: null, title: "Membasahi Kembali", caption: "Sekat kanal dan sumur bor" },
      { href: null, title: "Tanpa Api", caption: "Membersihkan lahan tanpa membakar" },
      { href: null, title: "Saat Tanah Berasap", caption: "Apa yang kamu lakukan, dan yang jangan" },
    ],
  },
];

export type NumberedModule = ModuleEntry & {
  /** Nomor modul dua digit, dihitung dari urutannya di seluruh bagian. */
  number: string;
  available: boolean;
  /** Nomor bagian dua digit. */
  partNumber: string;
  partTitle: string;
};

/** Semua modul berurutan, lengkap dengan nomor modul dan bagiannya. */
export const MODULES: readonly NumberedModule[] = MODULE_PARTS.flatMap((part, p) =>
  part.modules.map((m) => ({
    ...m,
    available: m.href !== null,
    partNumber: String(p + 1).padStart(2, "0"),
    partTitle: part.title,
  })),
).map((m, i) => ({ ...m, number: String(i + 1).padStart(2, "0") }));

/** Modul di alamat `href`. Melempar galat bila tidak ada, supaya salah ketik ketahuan saat membangun. */
export function moduleAt(href: string): NumberedModule {
  const found = MODULES.find((m) => m.href === href);
  if (!found) throw new Error(`Modul ${href} tidak terdaftar di MODULE_PARTS`);
  return found;
}

/** Modul tersedia pertama sesudah `href`, atau `null` bila tidak ada lagi. */
export function nextAvailableModule(href: string): NumberedModule | null {
  const index = MODULES.findIndex((m) => m.href === href);
  return MODULES.slice(index + 1).find((m) => m.available) ?? null;
}

/** Modul sesudah `href`, tersedia atau belum. */
export function nextModule(href: string): NumberedModule | null {
  const index = MODULES.findIndex((m) => m.href === href);
  return index >= 0 ? (MODULES[index + 1] ?? null) : null;
}

/** Tujuan panah pada tahap terakhir: pembaca kembali memilih sendiri modulnya. */
export const BACK_TO_MODULE_LIST = {
  nextTitle: "Daftar modul",
  label: "Kembali ke daftar modul",
  href: "/modul",
};
