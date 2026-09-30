import type { Metadata } from "next";
import AnatomiModule from "@/components/gambut/anatomi/AnatomiModule";
import ModuleFooter from "@/components/gambut/ModuleFooter";

export const metadata: Metadata = { title: "Anatomi Gambut — Emberguard" };

// Halaman Modul 01: diorama interaktif, lalu navigasi antarmodul.
export default function AnatomiPage() {
  return (
    <main className="bg-black">
      <AnatomiModule />
      <ModuleFooter current="01" />
    </main>
  );
}
