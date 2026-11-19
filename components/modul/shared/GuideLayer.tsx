"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Hand } from "lucide-react";

/**
 * Lapisan arahan: cincin berdenyut di sekeliling satu bagian layar dan
 * gelembung berpanah yang menjelaskan apa yang harus dilakukan di sana.
 *
 * Bagian yang ditunjuk dicari lewat atribut `data-guide="<target>"`. Bila ada
 * beberapa (mis. versi laptop dan versi ponsel), yang dipakai adalah yang
 * benar-benar terlihat. Letaknya diukur ulang tiap bingkai selama arahan
 * tampil, karena kotak di sekitarnya bisa sedang muncul bergerak.
 *
 * Lapisan ini tidak pernah menghalangi klik: hanya tombol "Oke" di
 * gelembung yang menangkapnya. Untuk target berukuran besar (gambar 3D),
 * cincin diganti tangan kecil berdenyut di tengahnya.
 */
type Props = {
  /** Nilai `data-guide` bagian yang ditunjuk. */
  target: string;
  text: string;
  /** Urutan arahan ini, untuk penanda "2 / 6". */
  index: number;
  total: number;
  /** Ditekan "Oke"; tidak diisi bila arahan ini terakhir. */
  onAck?: () => void;
  okLabel: string;
  /** Jeda sebelum arahan muncul (ms), memberi waktu kotaknya tampil dulu. */
  delayMs?: number;
};

/** Lebar gelembung (px) dan jaraknya dari target. */
const BUBBLE_W = 248;
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

export default function GuideLayer({ target, text, index, total, onAck, okLabel, delayMs = 250 }: Props) {
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

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-live="polite">
      {large ? (
        // Gambar 3D: tangan berdenyut di tengahnya mengajak mengeklik.
        <span className="guide-hand absolute grid h-11 w-11 place-items-center rounded-full bg-white/90 text-black shadow-lg" style={{ left: cx - 22, top: cy - 22 }}>
          <Hand size={20} />
        </span>
      ) : (
        <span
          className="guide-ring absolute rounded-2xl"
          style={{ left: box.left - 6, top: box.top - 6, width: box.width + 12, height: box.height + 12 }}
        />
      )}
      <div
        ref={bubbleRef}
        key={`${target}-${text}`}
        role="status"
        className="stage-in absolute rounded-2xl border border-[#8fd8ff]/40 bg-[#0b1820]/90 p-3 text-white shadow-2xl shadow-black/50"
        style={{ width: BUBBLE_W, ...bubbleStyle }}
      >
        <span className="absolute h-2.5 w-2.5 rotate-45 bg-[#0b1820]" style={arrowStyle} />
        <p className="text-[12.5px] leading-snug">{text}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[10px] tabular-nums text-white/45">
            {index} / {total}
          </span>
          {onAck && (
            <button
              type="button"
              onClick={onAck}
              className="pointer-events-auto cursor-pointer rounded-full bg-[#8fd8ff] px-3 py-1 text-[11px] font-semibold text-[#06121a] transition-colors hover:bg-white"
            >
              {okLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
