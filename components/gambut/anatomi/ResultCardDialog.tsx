"use client";

import ShareCardDialog from "@/components/gambut/ShareCardDialog";
import { cardImagePath, getResultCard, shareLink } from "@/lib/resultCard";

/** Kartu hasil Modul 01: muka air pilihan pembaca. */
export default function ResultCardDialog({ waterCm, onClose }: { waterCm: number; onClose: () => void }) {
  const card = getResultCard(waterCm);
  const link = shareLink(window.location.origin, card.cm);
  return (
    <ShareCardDialog
      imageSrc={cardImagePath(card.cm, "story")}
      imageAlt={`Kartu hasil: muka air ${card.depth}, ${card.statusLabel}. ${card.headline} ${card.note}`}
      fileName={`kartu-gambut-${card.cm}cm.png`}
      link={link}
      shareText={`${card.challenge} ${link}`}
      onClose={onClose}
    />
  );
}
