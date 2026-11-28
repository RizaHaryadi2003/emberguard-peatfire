import type { CSSProperties, Ref } from "react";
import { factorPoint, squarePath } from "@/lib/factorSquare";

/** Jarak label dari tepi titik (px). */
const LABEL_GAP = 14;

/**
 * Letak label terhadap titiknya: di luar persegi, menjauhi pusat.
 * Label di atas/bawah dipusatkan mendatar, label di kiri/kanan dipusatkan
 * tegak, sisanya menyudut seperti pada acuan.
 */
function labelStyle(angle: number): CSSProperties {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const off = `calc(var(--dot) / 2 + ${LABEL_GAP}px)`;
  const style: CSSProperties = {};
  const tx = Math.abs(cos) < 0.3 ? "-50%" : "0";
  const ty = Math.abs(sin) < 0.3 ? "-50%" : "0";
  if (Math.abs(cos) < 0.3) style.left = 0;
  else if (cos > 0) style.left = off;
  else {
    style.right = off;
    style.textAlign = "right";
  }
  if (Math.abs(sin) < 0.3) style.top = 0;
  else if (sin > 0) style.top = off;
  else style.bottom = off;
  style.transform = `translate(${tx}, ${ty})`;
  return style;
}

type Props = {
  factors: string[];
  rootRef: Ref<HTMLDivElement>;
  ringRef: Ref<SVGPathElement>;
  markerRefs: { current: (HTMLDivElement | null)[] };
};

/**
 * Roda faktor: persegi garis rambut dan satu titik + label per faktor di
 * kelilingnya (tengah sisi dan sudut). Tampil-sembunyinya digerakkan
 * useHeroScroll; komponen ini hanya menata letak.
 */
export default function FactorWheel({ factors, rootRef, ringRef, markerRefs }: Props) {
  return (
    <div ref={rootRef} className="factor-wheel" aria-label={`Faktor karhutla: ${factors.join(", ")}`}>
      {/* Persegi (lib/factorSquare.ts), digambar searah jarum jam mulai dari
          faktor pertama di tengah sisi atas. */}
      <svg viewBox="0 0 1000 1000" className="factor-ring" aria-hidden>
        <path ref={ringRef} d={squarePath(1000)} pathLength={1000} />
      </svg>
      {factors.map((name, i) => {
        const point = factorPoint(i, factors.length);
        const angle = Math.atan2(point.y, point.x);
        return (
          <div
            key={name}
            ref={(el) => {
              markerRefs.current[i] = el;
            }}
            className="factor-marker"
            style={{
              left: `calc(50% + ${point.x} * var(--radius))`,
              top: `calc(50% + ${point.y} * var(--radius))`,
            }}
          >
            <span className="factor-dot" />
            <span className="factor-label font-marcellus" style={labelStyle(angle)}>
              {name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
