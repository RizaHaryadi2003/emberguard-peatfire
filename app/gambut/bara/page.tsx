import type { Metadata } from "next";
import BaraModule from "@/components/gambut/bara/BaraModule";
import ModuleFooter from "@/components/gambut/ModuleFooter";

export const metadata: Metadata = { title: "Bara di Bawah Tanah — Emberguard" };

// Halaman Modul 02: ruang uji perambatan bara, lalu navigasi antarmodul.
export default function BaraPage() {
  return (
    <main className="bg-black">
      <BaraModule />
      <ModuleFooter current="02" />
    </main>
  );
}
