import { Laptop } from "lucide-react";

/** Ajakan di layar sempit untuk mencoba versi lengkap modul di laptop. */
export default function LaptopNudge({ className = "" }: { className?: string }) {
  return (
    <p className={`items-center gap-1.5 text-[11px] text-white/55 md:!hidden ${className || "flex"}`}>
      <Laptop size={13} className="shrink-0" aria-hidden="true" />
      Buka di laptop untuk tampilan lengkap dan lebih besar.
    </p>
  );
}
