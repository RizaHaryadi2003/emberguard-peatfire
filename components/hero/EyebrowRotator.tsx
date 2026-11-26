"use client";

import { useEffect, useState } from "react";

/** Lama satu kata tampil sebelum berganti (milidetik). */
const HOLD_MS = 3200;
/** Lama kata memudar keluar (milidetik); sama dengan kelas duration di bawah. */
const FADE_MS = 400;

type Props = { prefix: string; words: string[] };

/** Label kecil di atas judul: awalan tetap, kata terakhir berganti bergiliran. */
export default function EyebrowRotator({ prefix, words }: Props) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let swap: number | undefined;
    const timer = window.setInterval(() => {
      setShown(false);
      swap = window.setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setShown(true);
      }, FADE_MS);
    }, HOLD_MS);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(swap);
    };
  }, [words.length]);

  return (
    <p className="type-eyebrow text-white/90" aria-live="off">
      {prefix}{" "}
      <span
        className={`inline-block transition-[opacity,transform] duration-[400ms] ${
          shown ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
      >
        {words[index]}
      </span>
    </p>
  );
}
