// Tampilan gambar kartu, digambar di server oleh ImageResponse (Satori).
// Satori hanya mendukung sebagian CSS: semua tata letak memakai flexbox dan
// gaya sebaris, jadi kelas Tailwind tidak dapat dipakai di sini.

import { ANATOMI_HOOK } from "@/config/anatomi-content";
import { getResultCard, type CardFormat, type ResultCard } from "@/lib/resultCard";
import { WATER_LIMIT_CM, WATER_MAX_CM, type WaterStatus } from "@/lib/peat";

const STATUS_COLOR: Record<WaterStatus, string> = {
  basah: "#7dd3fc",
  waspada: "#fcd34d",
  rawan: "#f0a060",
};

const BACKGROUND = "linear-gradient(160deg, #24150c 0%, #0a0806 58%, #050505 100%)";
const BRAND = "EMBERGUARD · ANATOMI GAMBUT";
const DISPLAY = { fontFamily: "Playfair", fontStyle: "italic", fontWeight: 500 } as const;

/** Penampang 0–100 cm: bagian kering di atas muka air, jenuh air di bawahnya. */
function WaterProfile({ card, height, labelSize }: { card: ResultCard; height: number; labelSize: number }) {
  const scale = height / WATER_MAX_CM;
  const color = STATUS_COLOR[card.status];
  const waterY = card.cm * scale;
  const limitY = WATER_LIMIT_CM * scale;
  // Kedua label selalu menjauhi garis lainnya agar tidak saling menimpa saat
  // muka air dekat batas, dan tetap di dalam penampang saat dekat tepi.
  const aboveLimit = card.cm < WATER_LIMIT_CM;
  const labelAbove = aboveLimit ? waterY > labelSize * 2 : waterY > height - labelSize * 2.2;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height,
        borderRadius: 24,
        overflow: "hidden",
        background: "linear-gradient(180deg, #123a4c 0%, #0a2230 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: waterY,
          background: "linear-gradient(180deg, #d08040 0%, #7a4322 100%)",
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: limitY - 1, height: 3, background: "rgba(255,255,255,0.75)" }} />
      <div
        style={{
          position: "absolute",
          right: 18,
          top: aboveLimit ? limitY + labelSize * 0.35 : limitY - labelSize * 1.5,
          fontSize: labelSize,
          color: "rgba(255,255,255,0.9)",
        }}
      >
        {`batas ${WATER_LIMIT_CM} cm`}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: waterY - 3, height: 6, background: color }} />
      <div
        style={{
          position: "absolute",
          left: 18,
          top: labelAbove ? waterY - labelSize * 1.7 : waterY + labelSize * 0.45,
          fontSize: labelSize,
          fontWeight: 600,
          color: "#ffffff",
        }}
      >
        muka air
      </div>
    </div>
  );
}

function StatusPill({ card, size }: { card: ResultCard; size: number }) {
  const color = STATUS_COLOR[card.status];
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        padding: `${size * 0.4}px ${size * 0.9}px`,
        borderRadius: 999,
        border: `2px solid ${color}`,
        color,
        fontSize: size,
        fontWeight: 600,
      }}
    >
      {card.statusLabel}
    </div>
  );
}

function StoryCard({ card, host }: { card: ResultCard; host: string }) {
  return (
    // Bantalan atas dan bawah menghindari area antarmuka Story.
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "230px 90px 240px", background: BACKGROUND, color: "#ffffff", fontFamily: "Inter" }}>
      <div style={{ fontSize: 30, letterSpacing: 5, color: "rgba(255,255,255,0.6)" }}>{BRAND}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ ...DISPLAY, fontSize: 190, lineHeight: 1.05, letterSpacing: -6, color: STATUS_COLOR[card.status] }}>{card.depth}</div>
        <div style={{ display: "flex", marginTop: 40 }}>
          <StatusPill card={card} size={34} />
        </div>
      </div>
      <div style={{ ...DISPLAY, fontSize: 70, lineHeight: 1.14, letterSpacing: -1 }}>{card.headline}</div>
      <WaterProfile card={card} height={300} labelSize={30} />
      <div style={{ fontSize: 40, lineHeight: 1.4, color: "rgba(255,255,255,0.86)" }}>{card.note}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.3 }}>{card.challenge}</div>
        <div style={{ marginTop: 18, fontSize: 32, color: STATUS_COLOR[card.status] }}>{host}</div>
        <div style={{ marginTop: 14, fontSize: 24, color: "rgba(255,255,255,0.5)" }}>{`Sumber: ${card.source}`}</div>
      </div>
    </div>
  );
}

function LinkPreviewCard({ card, host }: { card: ResultCard; host: string }) {
  return (
    <div style={{ display: "flex", gap: 56, width: "100%", height: "100%", padding: 60, background: BACKGROUND, color: "#ffffff", fontFamily: "Inter" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <div style={{ fontSize: 20, letterSpacing: 3, color: "rgba(255,255,255,0.6)" }}>{BRAND}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ ...DISPLAY, fontSize: 112, lineHeight: 1.05, letterSpacing: -3, color: STATUS_COLOR[card.status] }}>{card.depth}</div>
          <div style={{ ...DISPLAY, marginTop: 14, fontSize: 44, lineHeight: 1.16 }}>{card.headline}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}>{card.challenge}</div>
          <div style={{ marginTop: 8, fontSize: 18, color: "rgba(255,255,255,0.5)" }}>{`${host} · ${card.source}`}</div>
        </div>
      </div>
      <div style={{ display: "flex", width: 280, alignItems: "center" }}>
        <WaterProfile card={card} height={510} labelSize={22} />
      </div>
    </div>
  );
}

/** Gambar untuk tautan tanpa nilai muka air: pertanyaan pembuka modul. */
function HookCard({ host, tall }: { host: string; tall: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: tall ? 90 : 72, background: BACKGROUND, color: "#ffffff", fontFamily: "Inter" }}>
      <div style={{ fontSize: tall ? 30 : 20, letterSpacing: tall ? 5 : 3, color: "rgba(255,255,255,0.6)" }}>{BRAND}</div>
      <div style={{ ...DISPLAY, marginTop: 40, fontSize: tall ? 80 : 52, lineHeight: 1.15, color: "rgba(255,255,255,0.86)" }}>{ANATOMI_HOOK.setup}</div>
      <div style={{ ...DISPLAY, marginTop: 12, fontSize: tall ? 150 : 104, lineHeight: 1.08, letterSpacing: -3, color: STATUS_COLOR.rawan }}>{ANATOMI_HOOK.question}</div>
      <div style={{ marginTop: 40, fontSize: tall ? 32 : 22, color: "rgba(255,255,255,0.55)" }}>{host}</div>
    </div>
  );
}

type Props = { waterCm: number | null; format: CardFormat; host: string };

export default function ResultCardArt({ waterCm, format, host }: Props) {
  if (waterCm === null) return <HookCard host={host} tall={format === "story"} />;
  const card = getResultCard(waterCm);
  return format === "story" ? <StoryCard card={card} host={host} /> : <LinkPreviewCard card={card} host={host} />;
}
