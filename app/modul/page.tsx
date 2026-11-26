import type { Metadata } from "next";
import SectionBackdrop from "@/components/layout/SectionBackdrop";
import ModuleList from "@/components/modul/ModuleList";

export const metadata: Metadata = { title: "Modul — Emberguard" };

// Halaman daftar modul: pengantar dan semua modul, dikelompokkan per bagian.
export default function ModulPage() {
  return (
    <main className="relative isolate">
      <SectionBackdrop />
      <ModuleList />
    </main>
  );
}
