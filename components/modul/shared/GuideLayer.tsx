"use client";

import { useEffect, useRef, useState } from "react";
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
  // tengahnya; di ponsel (sempit) selalu di atas atau di bawah.
  const narrow = vw < 768;
  const side: "right" | "left" | "top" | "bottom" = large
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

  const clampX = (x: number) => Math.min(vw - BUBBLE_W - 12, Math.max(12, x));
  const bubbleStyle: React.CSSProperties =
    side === "right"
      ? { left: box.left + box.width + GAP, top: Math.min(vh - 24, Math.max(24, cy)), transform: "translateY(-50%)" }
      : side === "left"
        ? { left: box.left - GAP - BUBBLE_W, top: Math.min(vh - 24, Math.max(24, cy)), transform: "translateY(-50%)" }
        : side === "top"
          ? { left: clampX(cx - BUBBLE_W / 2), bottom: vh - (large ? cy - 36 : box.top) + GAP }
          : { left: clampX(cx - BUBBLE_W / 2), top: box.top + box.height + GAP };

  // Panah kecil di tepi gelembung yang menghadap target.
  const arrowStyle: React.CSSProperties =
    side === "right"
      ? { left: -5, top: "50%", marginTop: -5 }
      : side === "left"
        ? { right: -5, top: "50%", marginTop: -5 }
        : side === "top"
          ? { bottom: -5, left: Math.min(BUBBLE_W - 20, Math.max(14, cx - clampX(cx - BUBBLE_W / 2) - 5)) }
          : { top: -5, left: Math.min(BUBBLE_W - 20, Math.max(14, cx - clampX(cx - BUBBLE_W / 2) - 5)) };

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
