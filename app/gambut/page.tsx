import type { Metadata } from "next";
import GambutSection from "@/components/gambut/GambutSection";

export const metadata: Metadata = { title: "Gambut — Emberguard" };

// Halaman section Gambut: pengantar dan daftar modul.
export default function GambutPage() {
  return (
    <main className="bg-black">
      <GambutSection />
    </main>
  );
}
