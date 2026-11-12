import type { Metadata } from "next";
import ModuleList from "@/components/modul/ModuleList";

export const metadata: Metadata = { title: "Modul — Emberguard" };

// Halaman daftar modul: pengantar dan semua modul, dikelompokkan per bagian.
export default function ModulPage() {
  return (
    <main className="bg-black">
      <ModuleList />
    </main>
  );
}
