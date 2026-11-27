import type { CSSProperties, Ref } from "react";
import { factorAngle, ringPath } from "@/lib/factorRing";

/** Jarak label dari tepi titik (px). */
const LABEL_GAP = 14;

/**
 * Letak label terhadap titiknya: di luar lingkaran, menjauhi pusat.
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
  center: string;
  factors: string[];
  rootRef: Ref<HTMLDivElement>;
  centerRef: Ref<HTMLDivElement>;
  ringRef: Ref<SVGPathElement>;
  markerRefs: { current: (HTMLDivElement | null)[] };
};

/**
 * Roda faktor: lingkaran garis rambut yang bersegi halus, judul di tengah, dan satu titik +
 * label per faktor di keliling lingkaran. Tampil-sembunyinya digerakkan
 * useHeroScroll; komponen ini hanya menata letak.
 */
export default function FactorWheel({ center, factors, rootRef, centerRef, ringRef, markerRefs }: Props) {
  return (
    <div ref={rootRef} className="factor-wheel" aria-label={`${center}: ${factors.join(", ")}`}>
      {/* Lingkaran bersegi halus di tiap faktor (lib/factorRing.ts), digambar
          searah jarum jam mulai dari faktor pertama. */}
      <svg viewBox="0 0 1000 1000" className="factor-ring" aria-hidden>
        <path ref={ringRef} d={ringPath(factors.length, 1000)} pathLength={1000} />
      </svg>
      <div ref={centerRef} className="factor-center font-marcellus">
        {center}
      </div>
      {factors.map((name, i) => {
        const angle = factorAngle(i, factors.length);
        return (
          <div
            key={name}
            ref={(el) => {
              markerRefs.current[i] = el;
            }}
            className="factor-marker"
            style={{
              left: `calc(50% + ${Math.cos(angle).toFixed(4)} * var(--radius))`,
              top: `calc(50% + ${Math.sin(angle).toFixed(4)} * var(--radius))`,
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
