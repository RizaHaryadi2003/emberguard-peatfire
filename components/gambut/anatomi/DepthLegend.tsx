"use client";

import { formatMeters, formatWaterDepth, PEAT_LAYERS, PROFILE_DEPTH, type PeatLayerId } from "@/lib/peat";

type Props = {
  waterCm: number;
  hovered: PeatLayerId | null;
  /** Lapisan terpilih (tahap lapisan terurai). */
  focused: PeatLayerId | null;
  onHover: (id: PeatLayerId | null) => void;
  /** Ada bila lapisan boleh dipilih lewat klik. */
  onSelect?: (id: PeatLayerId | null) => void;
};

/**
 * Penggaris kedalaman di sisi kanan: lapisan sesuai proporsi tebalnya,
 * lengkap dengan penanda muka air tanah. Menyorot lapisan di sini juga
 * menyorot lapisan yang sama pada model 3D, dan sebaliknya.
 */
export default function DepthLegend({ waterCm, hovered, focused, onHover, onSelect }: Props) {
  const waterPct = (waterCm / 100 / PROFILE_DEPTH) * 100;

  return (
    <div className="relative flex h-full w-[260px] gap-4">
      {/* Batang penggaris */}
      <div className="relative w-2.5 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
        {PEAT_LAYERS.map((l) => (
          <div
            key={l.id}
            className="absolute inset-x-0 bg-cover bg-center transition-[filter] duration-300"
            style={{
              top: `${(l.top / PROFILE_DEPTH) * 100}%`,
              height: `${((l.bottom - l.top) / PROFILE_DEPTH) * 100}%`,
              backgroundImage: `url(/textures/gambut/${l.id}_color.webp)`,
              filter: hovered && hovered !== l.id ? "brightness(0.45)" : "none",
            }}
          />
        ))}
      </div>

      {/* Penanda muka air tanah */}
      <div
        className="pointer-events-none absolute right-[calc(100%-14px)] flex -translate-y-1/2 flex-row-reverse items-center gap-2 transition-[top] duration-700 ease-out"
        style={{ top: `${waterPct}%` }}
        aria-hidden="true"
      >
        <span className="h-px w-5 bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.9)]" />
        <span className="whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium tracking-wide text-sky-200 ring-1 ring-sky-300/40 backdrop-blur-sm">
          Muka air {formatWaterDepth(waterCm)}
        </span>
      </div>

      {/* Daftar lapisan */}
      <ul className="relative flex-1">
        {PEAT_LAYERS.map((l) => {
          const active = hovered === l.id || focused === l.id;
          const dimmed = (hovered && hovered !== l.id) || (focused && focused !== l.id);
          return (
            <li
              key={l.id}
              className="absolute inset-x-0 flex flex-col justify-start"
              style={{
                top: `${(l.top / PROFILE_DEPTH) * 100}%`,
                height: `${((l.bottom - l.top) / PROFILE_DEPTH) * 100}%`,
              }}
            >
              <button
                type="button"
                onMouseEnter={() => onHover(l.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(l.id)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect?.(focused === l.id ? null : l.id)}
                aria-pressed={onSelect ? focused === l.id : undefined}
                className={`group -mt-0.5 cursor-pointer text-left transition-opacity duration-300 ${
                  dimmed ? "opacity-40" : "opacity-100"
                }`}
              >
                <span className="block text-[10px] tabular-nums tracking-wider text-white/40">
                  {formatMeters(l.top)}–{formatMeters(l.bottom)} m
                </span>
                <span className="block text-sm font-medium text-white">{l.name}</span>
                <span
                  className={`grid text-xs leading-relaxed text-white/65 transition-[grid-template-rows,opacity] duration-300 ${
                    active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <span className="overflow-hidden">{l.summary}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
