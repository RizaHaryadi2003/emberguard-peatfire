"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import { placeHint, type LayerHintHandle } from "./scene/layerHint";

/**
 * Keterangan lapisan yang mengikuti kursor.
 *
 * Isi dan letaknya ditulis langsung ke elemennya, tanpa keadaan React: gerakan
 * kursor datang puluhan kali per detik, dan ukuran teks yang baru harus sudah
 * bisa diukur saat letaknya dihitung.
 */
export default function LayerHint({ ref }: { ref: Ref<LayerHintHandle> }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  /** Ukuran keterangan; hanya diukur ulang saat tulisannya berganti. */
  const sizeRef = useRef({ width: 0, height: 0 });

  useImperativeHandle(
    ref,
    () => {
      const place = (clientX: number, clientY: number) => {
        const box = boxRef.current;
        const parent = box?.offsetParent;
        if (!box || !parent) return;
        const bounds = parent.getBoundingClientRect();
        const { width, height } = sizeRef.current;
        const { left, top } = placeHint(clientX - bounds.left, clientY - bounds.top, width, height, bounds.width, bounds.height);
        box.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      };
      return {
      show(hint, clientX, clientY) {
        const box = boxRef.current;
        const text = textRef.current;
        if (!box || !text) return;
        if (text.textContent !== hint.text) {
          text.textContent = hint.text;
          sizeRef.current = { width: box.offsetWidth, height: box.offsetHeight };
        }
        box.dataset.tone = hint.tone;
        box.dataset.shown = "true";
        place(clientX, clientY);
      },
      move(clientX, clientY) {
        if (boxRef.current?.dataset.shown === "true") place(clientX, clientY);
      },
      hide() {
        if (boxRef.current) boxRef.current.dataset.shown = "false";
      },
      };
    },
    [],
  );

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      data-shown="false"
      data-tone="plain"
      className="group pointer-events-none absolute left-0 top-0 z-30 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-black/85 px-2.5 py-1 text-[11px] font-medium text-white/85 opacity-0 transition-opacity duration-150 data-[shown=true]:opacity-100 data-[tone=ember]:border-[#f0a060]/45 data-[tone=ember]:bg-[#2a1405]/95 data-[tone=ember]:text-[#ffd9b0] motion-reduce:transition-none"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/70 group-data-[tone=ash]:bg-[#6b6257] group-data-[tone=ember]:bg-[#ff7a24]" />
      <span ref={textRef} />
    </div>
  );
}
