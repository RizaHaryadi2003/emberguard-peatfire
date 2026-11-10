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

  useImperativeHandle(
    ref,
    () => ({
      show(hint, clientX, clientY) {
        const box = boxRef.current;
        const text = textRef.current;
        const parent = box?.offsetParent;
        if (!box || !text || !parent) return;
        if (text.textContent !== hint.text) text.textContent = hint.text;
        box.dataset.tone = hint.tone;
        box.dataset.shown = "true";
        const bounds = parent.getBoundingClientRect();
        const { left, top } = placeHint(
          clientX - bounds.left,
          clientY - bounds.top,
          box.offsetWidth,
          box.offsetHeight,
          bounds.width,
          bounds.height,
        );
        box.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      },
      hide() {
        if (boxRef.current) boxRef.current.dataset.shown = "false";
      },
    }),
    [],
  );

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      data-shown="false"
      data-tone="plain"
      className="group pointer-events-none absolute left-0 top-0 z-30 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-black/75 px-2.5 py-1 text-[11px] font-medium text-white/85 opacity-0 backdrop-blur-md transition-opacity duration-150 data-[shown=true]:opacity-100 data-[tone=ember]:border-[#f0a060]/45 data-[tone=ember]:bg-[#2a1405]/85 data-[tone=ember]:text-[#ffd9b0] motion-reduce:transition-none"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/70 group-data-[tone=ash]:bg-[#6b6257] group-data-[tone=ember]:bg-[#ff7a24]" />
      <span ref={textRef} />
    </div>
  );
}
