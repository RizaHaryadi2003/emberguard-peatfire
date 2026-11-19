"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Eye, Hand, MousePointerClick } from "lucide-react";

/**
 * Lapisan arahan: cincin berdenyut di sekeliling satu bagian layar dan
 * gelembung berpanah yang menjelaskan apa yang harus dilakukan di sana.
 *
 * Bagian yang ditunjuk dicari lewat atribut `data-guide="<target>"`. Bila ada
 * beberapa (mis. versi laptop dan versi ponsel), yang dipakai adalah yang
 * benar-benar terlihat. Letaknya diukur ulang tiap bingkai selama arahan
 * tampil, karena kotak di sekitarnya bisa sedang muncul bergerak.
 *
 * Lapisan ini tidak pernah menghalangi klik: seluruhnya tembus klik. Ada
 * tiga jenis arahan:
 *   - Lakukan    : menunggu aksi pembaca (syaratnya dibaca induknya);
 *   - Perhatikan : penjelasan tanpa syarat, pindah sendiri setelah waktu
 *                  baca yang dihitung dari panjang teksnya, dengan garis
 *                  waktu tipis yang menunjukkan kapan ia pindah;
 *   - Lanjut     : arahan terakhir ke tombol lanjut.
 * Untuk target berukuran besar (gambar 3D), cincin diganti tangan berdenyut.
 */
type Props = {
  /** Nilai `data-guide` bagian yang ditunjuk. */
  target: string;
  text: string;
  /** Urutan arahan ini, untuk penanda "2 / 6". */
  index: number;
  total: number;
  /**
   * Diisi untuk arahan "Perhatikan": dipanggil setelah waktu baca habis
   * supaya tuntunan pindah sendiri. Kosong untuk arahan "Lakukan" dan untuk
   * arahan terakhir.
   */
  onAuto?: () => void;
  /** Jeda sebelum arahan muncul (ms), memberi waktu kotaknya tampil dulu. */
  delayMs?: number;
};

/** Lebar gelembung (px) dan jaraknya dari target. */
const BUBBLE_W = 264;

/** Waktu baca arahan "Perhatikan" (ms): ±55 ms per huruf, dijepit 3,5–7 detik. */
const readMs = (text: string) => Math.min(7000, Math.max(3500, text.length * 55));
const GAP = 14;
/** Target selebar ini dianggap "gambar": ditunjuk dengan tangan, bukan cincin. */
const LARGE_TARGET = 360;

type Box = { left: number; top: number; width: number; height: number };

function findVisible(target: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-guide="${target}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export default function GuideLayer({ target, text, index, total, onAuto, delayMs = 250 }: Props) {
  const [box, setBox] = useState<Box | null>(null);
  const [shown, setShown] = useState(false);
  const last = useRef("");
  // Tinggi gelembung yang sebenarnya, untuk menjepitnya di dalam layar.
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState(96);
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const h = el.offsetHeight;
    // Ukuran DOM baru diketahui sesudah gelembung tergambar.
    setBubbleH((prev) => (Math.abs(h - prev) > 1 ? h : prev));
  }, [text, shown]);

  // Muncul sesudah jeda singkat. Induknya memberi `key` per arahan, jadi
  // komponen ini dipasang ulang (dan jedanya diulang) tiap arahan berganti.
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);

  // Arahan "Perhatikan" pindah sendiri setelah waktu bacanya habis, dihitung
  // sejak gelembungnya tampil.
  // Fungsinya disimpan di ref: modul seperti Kanal dan Bara merender ulang
  // hampir tiap bingkai, dan bila pewaktu bergantung pada fungsi yang selalu
  // baru itu, pewaktunya terus diulang dan arahan tidak pernah pindah.
  const autoMs = readMs(text);
  const autoRef = useRef(onAuto);
  useEffect(() => {
    autoRef.current = onAuto;
  });
  const hasAuto = onAuto !== undefined;
  useEffect(() => {
    if (!shown || !hasAuto) return;
    const t = window.setTimeout(() => autoRef.current?.(), autoMs);
    return () => window.clearTimeout(t);
  }, [shown, hasAuto, autoMs]);

  // Ukur letak target tiap bingkai; state hanya diperbarui bila berubah.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const el = findVisible(target);
      if (!el) {
        if (last.current !== "") {
          last.current = "";
          setBox(null);
        }
        return;
      }
      const r = el.getBoundingClientRect();
      const key = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`;
      if (key !== last.current) {
        last.current = key;
        setBox({ left: r.left, top: r.top, width: r.width, height: r.height });
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  if (!box || !shown) return null;

  const vw = typeof window === "undefined" ? 1440 : window.innerWidth;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  const large = box.width >= LARGE_TARGET && box.height >= LARGE_TARGET * 0.6;
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;

  // Sisi gelembung: menjauh dari tepi layar terdekat. Target di kiri →
  // gelembung di kanannya; di kanan → di kirinya; gambar besar → di atas
  // tengahnya; di ponsel (sempit) di atas atau di bawah. Bila sisi itu tidak
  // muat, pindah ke sisi seberangnya.
  const M = 12;
  const narrow = vw < 768;
  let side: "right" | "left" | "top" | "bottom" = large
    ? "top"
    : narrow
      ? box.top > vh / 2
        ? "top"
        : "bottom"
      : cx < vw * 0.45
        ? "right"
        : cx > vw * 0.55
          ? "left"
          : "top";
  const fits = {
    right: box.left + box.width + GAP + BUBBLE_W <= vw - M,
    left: box.left - GAP - BUBBLE_W >= M,
    top: (large ? cy - 36 : box.top) - GAP - bubbleH >= M,
    bottom: box.top + box.height + GAP + bubbleH <= vh - M,
  };
  const opposite = { right: "left", left: "right", top: "bottom", bottom: "top" } as const;
  if (!fits[side] && fits[opposite[side]]) side = opposite[side];
  else if (!fits[side]) side = fits.top ? "top" : fits.bottom ? "bottom" : side;

  // Letak pojok kiri atas gelembung, dijepit seluruhnya di dalam layar.
  const clampX = (x: number) => Math.min(vw - BUBBLE_W - M, Math.max(M, x));
  const clampY = (y: number) => Math.min(vh - bubbleH - M, Math.max(M, y));
  const bx =
    side === "right" ? clampX(box.left + box.width + GAP) : side === "left" ? clampX(box.left - GAP - BUBBLE_W) : clampX(cx - BUBBLE_W / 2);
  const by =
    side === "right" || side === "left"
      ? clampY(cy - bubbleH / 2)
      : side === "top"
        ? clampY((large ? cy - 36 : box.top) - GAP - bubbleH)
        : clampY(box.top + box.height + GAP);
  const bubbleStyle: React.CSSProperties = { left: bx, top: by };

  // Panah kecil di tepi gelembung yang menghadap target, mengikuti letak
  // target walau gelembungnya sempat digeser agar muat.
  const arrowX = Math.min(BUBBLE_W - 18, Math.max(12, cx - bx - 5));
  const arrowY = Math.min(bubbleH - 18, Math.max(12, cy - by - 5));
  const arrowStyle: React.CSSProperties =
    side === "right"
      ? { left: -5, top: arrowY }
      : side === "left"
        ? { right: -5, top: arrowY }
        : side === "top"
          ? { bottom: -5, left: arrowX }
          : { top: -5, left: arrowX };

  const kind: "do" | "look" | "next" = index === total ? "next" : onAuto ? "look" : "do";
  const Icon = kind === "next" ? ArrowRight : kind === "look" ? Eye : large ? Hand : MousePointerClick;
  const label = kind === "next" ? "Lanjut" : kind === "look" ? "Perhatikan" : "Lakukan";

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-live="polite">
      {large ? (
        // Gambar 3D: tangan berdenyut di tengahnya, dengan riak yang memancar.
        <span className="absolute" style={{ left: cx - 26, top: cy - 26 }}>
          <span className="absolute inset-0 animate-ping rounded-full bg-[#8fd8ff]/40 motion-reduce:hidden" />
          <span className="guide-hand relative grid h-[52px] w-[52px] place-items-center rounded-full bg-gradient-to-br from-white to-[#cfefff] text-[#06121a] shadow-[0_6px_24px_rgba(143,216,255,0.55)]">
            <Hand size={22} />
          </span>
        </span>
      ) : (
        <span
          className="guide-spot absolute rounded-2xl"
          style={{ left: box.left - 6, top: box.top - 6, width: box.width + 12, height: box.height + 12 }}
        />
      )}
      <div ref={bubbleRef} key={`${target}-${text}`} role="status" className="stage-in absolute" style={{ width: BUBBLE_W, ...bubbleStyle }}>
        {/* Panah ke target. */}
        <span className="absolute h-3 w-3 rotate-45 border border-[#8fd8ff]/35 bg-[#0e2230]" style={arrowStyle} />
        <div className="relative overflow-hidden rounded-2xl border border-[#8fd8ff]/35 bg-gradient-to-br from-[#11293a]/95 to-[#0a141b]/95 p-3 text-white shadow-[0_14px_40px_rgba(0,0,0,0.55)]">
          {/* Kilau tipis di tepi atas. */}
          <span className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#8fd8ff]/70 to-transparent" />
          <div className="flex gap-2.5">
            <span className="guide-badge mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#8fd8ff]/15 text-[#bfe9ff] ring-1 ring-[#8fd8ff]/45">
              <Icon size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8fd8ff]">{label}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-white/95">{text}</p>
            </div>
          </div>
          {/* Kemajuan tuntunan babak ini: satu titik per arahan. */}
          <div className="mt-2.5 flex items-center gap-1 pl-[38px]" aria-label={`Arahan ${index} dari ${total}`}>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i + 1 === index ? "w-5 bg-[#8fd8ff]" : i + 1 < index ? "w-1.5 bg-[#8fd8ff]/55" : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>
          {/* Garis waktu arahan "Perhatikan": habis = pindah ke arahan berikutnya. */}
          {kind === "look" && (
            <span
              className="guide-timer absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#8fd8ff] to-[#f0a35e]"
              style={{ animationDuration: `${autoMs}ms` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
