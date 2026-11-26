import type { Ref } from "react";
import { HORNBILL_BODY, HORNBILL_HEAD, HORNBILL_VIEWBOX, HORNBILL_WING, WING_PIVOT } from "./hornbillShape";

const V = HORNBILL_VIEWBOX;

/** Transformasi sayap untuk satu bukaan: 1 = terangkat penuh, negatif = terkulai ke bawah. */
export const wingTransform = (open: number) =>
  `translate(${WING_PIVOT.x} ${WING_PIVOT.y}) scale(1 ${open.toFixed(3)}) translate(${-WING_PIVOT.x} ${-WING_PIVOT.y})`;

type Props = {
  /** Sayap jauh (di belakang badan) dan sayap dekat; atribut transform-nya diatur dari luar tiap bingkai. */
  farWingRef: Ref<SVGGElement>;
  nearWingRef: Ref<SVGGElement>;
  className?: string;
};

/**
 * Siluet rangkong badak hitam yang sedang terbang, menghadap ke kanan.
 * Kepakan sayap diatur pemanggil lewat `wingTransform` pada kedua ref.
 */
export default function Hornbill({ farWingRef, nearWingRef, className }: Props) {
  return (
    <svg viewBox={`${V.x} ${V.y} ${V.w} ${V.h}`} className={className} aria-hidden fill="#0a0a0a">
      <defs>
        <clipPath id="rangkong-kepala" clipPathUnits="userSpaceOnUse">
          <rect x={HORNBILL_HEAD.clip.x} y={HORNBILL_HEAD.clip.y} width={HORNBILL_HEAD.clip.w} height={HORNBILL_HEAD.clip.h} />
        </clipPath>
      </defs>
      <g ref={farWingRef} transform={wingTransform(0.85)}>
        <path d={HORNBILL_WING} transform="translate(12 -2) scale(0.9)" />
      </g>
      <path d={HORNBILL_BODY} />
      <g transform={HORNBILL_HEAD.transform}>
        <g clipPath="url(#rangkong-kepala)">
          <path d={HORNBILL_HEAD.d} transform={HORNBILL_HEAD.sourceTransform} />
        </g>
      </g>
      <g ref={nearWingRef} transform={wingTransform(1)}>
        <path d={HORNBILL_WING} />
      </g>
    </svg>
  );
}
