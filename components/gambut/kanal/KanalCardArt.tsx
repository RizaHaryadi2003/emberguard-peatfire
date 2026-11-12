// Tampilan gambar kartu Modul 02, digambar di server oleh ImageResponse (Satori).
// Satori hanya mendukung sebagian CSS: semua tata letak memakai flexbox dan
// gaya sebaris, sama dengan kartu Modul 01 dan 03.

import { KANAL_CARD_TEXT, KANAL_HOOK } from "@/config/kanal-content";
import { TRANSECT_LENGTH_M } from "@/lib/drainage";
import { FIELD_LENGTH_M, FIELD_WIDTH_M, fieldsFor, getKanalCard, reachesBeyond, type KanalCard, type SharedCanal } from "@/lib/kanalCard";
import type { CardFormat } from "@/lib/resultCard";

const ORANGE = "#f0a35e";
const CANAL_BLUE = "#5fb0dc";
const BACKGROUND = "linear-gradient(160deg, #0d2230 0%, #0a0d0c 58%, #050505 100%)";
const DISPLAY = { fontFamily: "Playfair", fontStyle: "italic", fontWeight: 500 } as const;

/**
 * Peta lahan dari atas, sama dengan peta di modulnya: hutan gambut, kanal di
 * tengah, lahan rawan jingga di kiri-kanannya, dan lapangan bola menurut skala
 * yang sama. Seluruh lebarnya memuat 1 km ke tiap sisi.
 */
function ReachMapArt({ card, width, height }: { card: KanalCard; width: number; height: number }) {
  const perM = width / (TRANSECT_LENGTH_M * 2);
  const reach = Math.min(card.reachM, TRANSECT_LENGTH_M) * perM;
  const canal = Math.max(10, width * 0.012);
  const fieldW = FIELD_LENGTH_M * perM;
  const fieldH = FIELD_WIDTH_M * perM;
  const fields = Math.min(9, Math.max(1, Math.round(card.reachM / FIELD_LENGTH_M)));
  const cx = width / 2;
  return (
    <div style={{ position: "relative", display: "flex", width, height, borderRadius: 28, overflow: "hidden", background: "#1f3a22" }}>
      {/* Tajuk hutan: deretan bintik, cukup untuk terbaca sebagai pepohonan. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          backgroundImage: "radial-gradient(circle at 30% 30%, #2d5230 0, #2d5230 38%, transparent 40%)",
          backgroundSize: `${Math.round(width / 26)}px ${Math.round(width / 26)}px`,
        }}
      />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: cx - reach, width: reach * 2, display: "flex", background: "linear-gradient(90deg, rgba(232,160,80,0.55) 0%, rgba(232,130,58,0.92) 12%, rgba(232,130,58,0.92) 88%, rgba(232,160,80,0.55) 100%)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: cx - canal / 2, width: canal, display: "flex", background: CANAL_BLUE }} />
      {/* Lapangan bola dijejerkan dari tepi kanal, dengan celah tipis supaya
          tiap lapangan terhitung satu — tanpa garis tengah, yang membuat satu
          lapangan terbaca sebagai dua kotak. */}
      <div style={{ position: "absolute", left: cx + canal / 2 + 6, bottom: 24, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", marginBottom: 10, fontSize: Math.round(height * 0.055), color: "#ffffff", fontWeight: 600 }}>
          {`selebar ${fields}${reachesBeyond(card.reachM) ? "+" : ""} lapangan bola`}
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: fields }, (_, i) => (
            <div
              key={i}
              style={{ width: fieldW - 3, height: fieldH, display: "flex", border: "3px solid rgba(255,255,255,0.95)", background: "rgba(255,255,255,0.18)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Angka besar kartu. Bila jangkauannya melewati peta 1 km, angkanya batas
 * bawah: "lebih dari" ditulis kecil di atasnya, bukan sebagai bagian dari
 * angka — ditulis sebesar angkanya, ia memakan dua baris dan menindih merek.
 */
function BigNumber({ card, size }: { card: KanalCard; size: number }) {
  const beyond = reachesBeyond(card.reachM);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {beyond && <div style={{ ...DISPLAY, display: "flex", fontSize: size * 0.3, color: ORANGE }}>lebih dari</div>}
      <div style={{ ...DISPLAY, display: "flex", fontSize: size, lineHeight: 1, letterSpacing: -size * 0.03, color: ORANGE }}>
        {beyond ? String(Math.floor(fieldsFor(TRANSECT_LENGTH_M))) : card.fields}
      </div>
    </div>
  );
}

function StoryCard({ card, host }: { card: KanalCard; host: string }) {
  return (
    // Bantalan atas dan bawah menghindari area antarmuka Story.
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "220px 90px 230px", background: BACKGROUND, color: "#ffffff", fontFamily: "Inter" }}>
      <div style={{ fontSize: 30, letterSpacing: 5, color: "rgba(255,255,255,0.6)" }}>{KANAL_CARD_TEXT.brand}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <BigNumber card={card} size={210} />
        <div style={{ ...DISPLAY, marginTop: 10, fontSize: 64, color: ORANGE }}>{KANAL_CARD_TEXT.fieldsUnit}</div>
        <div style={{ marginTop: 18, fontSize: 38, lineHeight: 1.3, color: "rgba(255,255,255,0.86)" }}>{KANAL_CARD_TEXT.fieldsLead}</div>
      </div>
      <ReachMapArt card={card} width={900} height={420} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ ...DISPLAY, fontSize: 58, lineHeight: 1.15 }}>{card.guessLine ?? card.headline}</div>
        <div style={{ marginTop: 24, fontSize: 36, lineHeight: 1.4, color: "rgba(255,255,255,0.8)" }}>{card.note}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.3 }}>{card.challenge}</div>
        <div style={{ marginTop: 18, fontSize: 32, color: ORANGE }}>{host}</div>
        <div style={{ marginTop: 14, fontSize: 24, color: "rgba(255,255,255,0.5)" }}>{`Sumber: ${card.source}`}</div>
      </div>
    </div>
  );
}

function LinkPreviewCard({ card, host }: { card: KanalCard; host: string }) {
  return (
    <div style={{ display: "flex", gap: 48, width: "100%", height: "100%", padding: 56, background: BACKGROUND, color: "#ffffff", fontFamily: "Inter" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <div style={{ fontSize: 20, letterSpacing: 3, color: "rgba(255,255,255,0.6)" }}>{KANAL_CARD_TEXT.brand}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <BigNumber card={card} size={110} />
          <div style={{ ...DISPLAY, marginTop: 6, fontSize: 40, color: ORANGE }}>{KANAL_CARD_TEXT.fieldsUnit}</div>
          <div style={{ marginTop: 12, fontSize: 24, lineHeight: 1.3, color: "rgba(255,255,255,0.85)" }}>{KANAL_CARD_TEXT.fieldsLead}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}>{card.challenge}</div>
          <div style={{ marginTop: 8, fontSize: 18, color: "rgba(255,255,255,0.5)" }}>{`${host} · ${card.source}`}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <ReachMapArt card={card} width={500} height={518} />
      </div>
    </div>
  );
}

/** Gambar untuk tautan tanpa nilai: pertanyaan pembuka modul. */
function HookCard({ host, tall }: { host: string; tall: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: tall ? 90 : 72, background: BACKGROUND, color: "#ffffff", fontFamily: "Inter" }}>
      <div style={{ fontSize: tall ? 30 : 20, letterSpacing: tall ? 5 : 3, color: "rgba(255,255,255,0.6)" }}>{KANAL_CARD_TEXT.brand}</div>
      <div style={{ ...DISPLAY, marginTop: 40, fontSize: tall ? 72 : 46, lineHeight: 1.2, color: "rgba(255,255,255,0.86)" }}>{KANAL_HOOK.setup}</div>
      <div style={{ ...DISPLAY, marginTop: 16, fontSize: tall ? 140 : 96, lineHeight: 1.08, letterSpacing: -3, color: CANAL_BLUE }}>{KANAL_HOOK.question}</div>
      <div style={{ marginTop: 40, fontSize: tall ? 32 : 22, color: "rgba(255,255,255,0.55)" }}>{host}</div>
    </div>
  );
}

type Props = { shared: SharedCanal | null; format: CardFormat; host: string };

export default function KanalCardArt({ shared, format, host }: Props) {
  if (!shared) return <HookCard host={host} tall={format === "story"} />;
  const card = getKanalCard(shared);
  return format === "story" ? <StoryCard card={card} host={host} /> : <LinkPreviewCard card={card} host={host} />;
}
