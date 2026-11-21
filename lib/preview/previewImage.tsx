// Gambar pratinjau tautan (Open Graph) yang muncul saat tautan dibagikan di
// media sosial. Satu gambar tetap per modul berisi pertanyaan pembukanya,
// dibuat sekali saat build oleh ImageResponse (Satori). Satori hanya
// mendukung sebagian CSS, jadi tata letaknya memakai flexbox dan gaya sebaris.

import { ImageResponse } from "next/og";
import { moduleAt } from "@/config/modules-content";
import { PREVIEW_FONTS } from "./fonts";

const PREVIEW_SIZE = { width: 1200, height: 630 };

const BACKGROUND = "linear-gradient(160deg, #24150c 0%, #0a0806 58%, #050505 100%)";
const DISPLAY = { fontFamily: "Playfair", fontStyle: "italic", fontWeight: 500 } as const;

type Preview = {
  /** Baris kecil di atas, mis. "Modul 08 · Gudang Karbon". */
  kicker: string;
  /** Kalimat pengantar pertanyaan. */
  setup: string;
  /** Pertanyaan pembuka, ditulis besar dengan warna aksen. */
  question: string;
};

/** Gambar pratinjau dengan pengantar dan pertanyaan pembuka. */
export function previewImage({ kicker, setup, question }: Preview): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: BACKGROUND,
          fontFamily: "Inter",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: 5, color: "rgba(255,255,255,0.55)" }}>
          {`EMBERGUARD · ${kicker.toUpperCase()}`}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ ...DISPLAY, fontSize: 50, lineHeight: 1.15, color: "rgba(255,255,255,0.85)" }}>{setup}</div>
          <div style={{ ...DISPLAY, marginTop: 18, fontSize: 92, lineHeight: 1.02, color: "#f0a060" }}>{question}</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.6)" }}>
          Animasi interaktif tentang gambut dan kebakarannya · Kalimantan Barat
        </div>
      </div>
    ),
    { ...PREVIEW_SIZE, fonts: [...PREVIEW_FONTS] },
  );
}

/** Gambar pratinjau sebuah modul, dari nama dan pertanyaan pembukanya. */
export function modulePreview(href: string, hook: { setup: string; question: string }): ImageResponse {
  const m = moduleAt(href);
  return previewImage({ kicker: `Modul ${m.number} · ${m.title}`, setup: hook.setup, question: hook.question });
}
