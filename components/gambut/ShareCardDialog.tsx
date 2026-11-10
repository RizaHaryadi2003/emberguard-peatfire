"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Link2, Share2, X } from "lucide-react";

type Props = {
  imageSrc: string;
  imageAlt: string;
  fileName: string;
  link: string;
  shareText: string;
  onClose: () => void;
};

type Feedback = { kind: "ok" | "error"; text: string } | null;

/** Dibuat hanya setelah diklik di peramban, jadi `navigator` selalu tersedia. */
function browserCanShareFiles(): boolean {
  if (typeof navigator.canShare !== "function") return false;
  return navigator.canShare({ files: [new File([""], "kartu.png", { type: "image/png" })] });
}

const ACTION =
  "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60";
const ACTION_SECONDARY = `${ACTION} border border-white/20 text-white hover:bg-white/10`;

/** Dialog kartu hasil tiap modul: pratinjau gambar, lalu bagikan, unduh, atau salin tautan. */
export default function ShareCardDialog({ imageSrc, imageAlt, fileName, link, shareText, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [canShare] = useState(browserCanShareFiles);
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Selama dialog terbuka, halaman di belakangnya tidak boleh ikut bergulir,
  // karena guliran itulah yang menggerakkan tahap modul.
  useEffect(() => {
    dialogRef.current?.showModal();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  const fetchCard = async () => {
    const response = await fetch(imageSrc);
    if (!response.ok) throw new Error(`Kartu gagal dimuat (${response.status})`);
    return new File([await response.blob()], fileName, { type: "image/png" });
  };

  /** Jalankan satu aksi, dengan tombol terkunci selama berjalan. */
  const run = async (action: () => Promise<Feedback>, failure: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      setFeedback(await action());
    } catch (error) {
      // Pembaca membatalkan lembar bagikan: bukan kesalahan.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setFeedback({ kind: "error", text: failure });
      }
    } finally {
      setBusy(false);
    }
  };

  const share = () =>
    run(async () => {
      await navigator.share({ files: [await fetchCard()], text: shareText });
      return null;
    }, "Gagal membagikan. Coba unduh gambarnya.");

  const download = () =>
    run(async () => {
      const url = URL.createObjectURL(await fetchCard());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      return { kind: "ok", text: "Gambar sudah diunduh." };
    }, "Gambar gagal diunduh. Coba lagi.");

  const copyLink = () =>
    run(async () => {
      await navigator.clipboard.writeText(link);
      return { kind: "ok", text: "Tautan sudah disalin." };
    }, "Tautan gagal disalin. Salin manual dari kotak di atas.");

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
      aria-label="Kartu hasilmu"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(720px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0b0a] text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:p-6">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup"
          className="absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="relative mx-auto aspect-[9/16] h-[min(58dvh,520px)] shrink-0 overflow-hidden rounded-2xl bg-white/5">
          {imageState === "loading" && <div className="absolute inset-0 animate-pulse bg-white/5" />}
          {imageState === "error" && (
            <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-white/60">Pratinjau gagal dimuat.</p>
          )}
          {/* Gambar dibuat oleh rute kartu dengan ukuran tetap, jadi next/image tidak menambah apa pun. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageAlt}
            onLoad={() => setImageState("ready")}
            onError={() => setImageState("error")}
            className={`h-full w-full object-cover transition-opacity duration-500 ${imageState === "ready" ? "opacity-100" : "opacity-0"}`}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h2 className="font-playfair text-3xl italic" style={{ letterSpacing: "-0.02em" }}>
            Kartu hasilmu
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/70">Unggah ke Story atau kirim tautannya, lalu tantang temanmu mencoba.</p>

          <input
            readOnly
            value={link}
            aria-label="Tautan untuk dibagikan"
            onFocus={(e) => e.target.select()}
            className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
          />

          <div className="mt-4 flex flex-col gap-2.5">
            {canShare && (
              <button type="button" onClick={share} disabled={busy} className={`${ACTION} bg-white text-black hover:bg-[#f0a060]`}>
                <Share2 size={16} /> Bagikan
              </button>
            )}
            <button
              type="button"
              onClick={download}
              disabled={busy}
              className={canShare ? ACTION_SECONDARY : `${ACTION} bg-white text-black hover:bg-[#f0a060]`}
            >
              <Download size={16} /> Unduh gambar
            </button>
            <button type="button" onClick={copyLink} disabled={busy} className={ACTION_SECONDARY}>
              <Link2 size={16} /> Salin tautan
            </button>
          </div>

          <p role="status" className={`mt-3 min-h-5 text-xs ${feedback?.kind === "error" ? "text-orange-300" : "text-white/70"}`}>
            {feedback && (
              <span className="inline-flex items-center gap-1.5">
                {feedback.kind === "ok" && <Check size={13} />}
                {feedback.text}
              </span>
            )}
          </p>
        </div>
      </div>
    </dialog>
  );
}
