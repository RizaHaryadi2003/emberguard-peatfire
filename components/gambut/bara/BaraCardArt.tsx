// Tampilan gambar kartu Modul 03, digambar di server oleh ImageResponse (Satori).
// Satori hanya mendukung sebagian CSS: semua tata letak memakai flexbox dan
// gaya sebaris, sama dengan kartu Modul 01.

import { BARA_CARD_RESURFACED, BARA_HOOK, type BaraCardZone } from "@/config/bara-content";
import { DEEP_LIMIT_CM, getBaraCard, MAX_SHARED_DEPTH_CM, SURFACE_LIMIT_CM, type BaraCard, type SharedBurn } from "@/lib/baraCard";
import type { CardFormat } from "@/lib/resultCard";

const ZONE_COLOR: Record<BaraCardZone, string> = {
  permukaan: "#fcd34d",
  dalam: "#f0a060",
  lebih: "#ff7a3c",
};

const BACKGROUND = "linear-gradient(160deg, #2a1208 0%, #0a0806 58%, #050505 100%)";
const BRAND = "EMBERGUARD · BARA DI BAWAH TANAH";
const DISPLAY = { fontFamily: "Playfair", fontStyle: "italic", fontWeight: 500 } as const;

/** Penampang gambut: daerah yang dilalui bara, dengan bara menyala di ujungnya. */
function DepthProfile({ card, height, labelSize }: { card: BaraCard; height: number; labelSize: number }) {
  const scale = height / MAX_SHARED_DEPTH_CM;
  const burnY = card.cm * scale;
  const line = (cm: number, text: string) => (
    <div key={cm} style={{ position: "absolute", left: 0, right: 0, top: cm * scale - 1, display: "flex", height: 2, background: "rgba(255,255,255,0.5)" }}>
      <div style={{ position: "absolute", right: 16, top: 4, fontSize: labelSize, color: "rgba(255,255,255,0.85)" }}>{text}</div>
    </div>
  );
  return (
    <div style={{ position: "relative", display: "flex", width: "100%", height, borderRadius: 24, overflow: "hidden", background: "linear-gradient(180deg, #7a4322 0%, #3a2214 100%)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: burnY, background: "linear-gradient(180deg, #1a1411 0%, #2c1a10 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: burnY - height * 0.05, height: height * 0.1, background: "linear-gradient(180deg, rgba(255,122,36,0) 0%, #ff7a24 50%, rgba(255,122,36,0) 100%)" }} />
      {line(SURFACE_LIMIT_CM, `${SURFACE_LIMIT_CM} cm`)}
      {line(DEEP_LIMIT_CM, `${DEEP_LIMIT_CM} cm`)}
    </div>
  );
}

function ZonePill({ card, size }: { card: BaraCard; size: number }) {
  const color = ZONE_COLOR[card.zone];
  return (
    <div style={{ display: "flex", alignSelf: "flex-start", padding: `${size * 0.4}px ${size * 0.9}px`, borderRadius: 999, border: `2px solid ${color}`, color, fontSize: size, fontWeight: 600 }}>
      {card.zoneLabel}
    </div>
  );
}

const headlineOf = (card: BaraCard) => (card.resurfaced ? `${card.headline} ${BARA_CARD_RESURFACED}` : card.headline);

function StoryCard({ card, host }: { card: BaraCard; host: string }) {
  return (
    // Bantalan atas dan bawah menghindari area antarmuka Story.
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "230px 90px 240px", background: BACKGROUND, color: "#ffffff", fontFamily: "Inter" }}>
      <div style={{ fontSize: 30, letterSpacing: 5, color: "rgba(255,255,255,0.6)" }}>{BRAND}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ ...DISPLAY, fontSize: 190, lineHeight: 1.05, letterSpacing: -6, color: ZONE_COLOR[card.zone] }}>{card.depth}</div>
        <div style={{ display: "flex", marginTop: 40 }}>
          <ZonePill card={card} size={34} />
        </div>
      </div>
      <div style={{ ...DISPLAY, fontSize: 70, lineHeight: 1.14, letterSpacing: -1 }}>{headlineOf(card)}</div>
      <DepthProfile card={card} height={300} labelSize={28} />
      <div style={{ fontSize: 40, lineHeight: 1.4, color: "rgba(255,255,255,0.86)" }}>{card.note}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.3 }}>{card.challenge}</div>
        <div style={{ marginTop: 18, fontSize: 32, color: ZONE_COLOR[card.zone] }}>{host}</div>
        <div style={{ marginTop: 14, fontSize: 24, color: "rgba(255,255,255,0.5)" }}>{`Sumber: ${card.source}`}</div>
      </div>
    </div>
  );
}

function LinkPreviewCard({ card, host }: { card: BaraCard; host: string }) {
  return (
    <div style={{ display: "flex", gap: 56, width: "100%", height: "100%", padding: 60, background: BACKGROUND, color: "#ffffff", fontFamily: "Inter" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <div style={{ fontSize: 20, letterSpacing: 3, color: "rgba(255,255,255,0.6)" }}>{BRAND}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ ...DISPLAY, fontSize: 112, lineHeight: 1.05, letterSpacing: -3, color: ZONE_COLOR[card.zone] }}>{card.depth}</div>
          <div style={{ ...DISPLAY, marginTop: 14, fontSize: 40, lineHeight: 1.16 }}>{headlineOf(card)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}>{card.challenge}</div>
          <div style={{ marginTop: 8, fontSize: 18, color: "rgba(255,255,255,0.5)" }}>{`${host} · ${card.source}`}</div>
        </div>
      </div>
      <div style={{ display: "flex", width: 280, alignItems: "center" }}>
        <DepthProfile card={card} height={510} labelSize={22} />
      </div>
    </div>
  );
}

/** Gambar untuk tautan tanpa nilai: pertanyaan pembuka modul. */
function HookCard({ host, tall }: { host: string; tall: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: tall ? 90 : 72, background: BACKGROUND, color: "#ffffff", fontFamily: "Inter" }}>
      <div style={{ fontSize: tall ? 30 : 20, letterSpacing: tall ? 5 : 3, color: "rgba(255,255,255,0.6)" }}>{BRAND}</div>
      <div style={{ ...DISPLAY, marginTop: 40, fontSize: tall ? 80 : 52, lineHeight: 1.15, color: "rgba(255,255,255,0.86)" }}>{BARA_HOOK.setup}</div>
      <div style={{ ...DISPLAY, marginTop: 12, fontSize: tall ? 150 : 104, lineHeight: 1.08, letterSpacing: -3, color: ZONE_COLOR.dalam }}>{BARA_HOOK.question}</div>
      <div style={{ marginTop: 40, fontSize: tall ? 32 : 22, color: "rgba(255,255,255,0.55)" }}>{host}</div>
    </div>
  );
}

type Props = { shared: SharedBurn | null; format: CardFormat; host: string };

export default function BaraCardArt({ shared, format, host }: Props) {
  if (!shared) return <HookCard host={host} tall={format === "story"} />;
  const card = getBaraCard(shared);
  return format === "story" ? <StoryCard card={card} host={host} /> : <LinkPreviewCard card={card} host={host} />;
}
