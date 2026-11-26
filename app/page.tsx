import HeroSection from "@/components/hero/HeroSection";
import IntroSplash from "@/components/intro/IntroSplash";
import { INTRO_GATE_SCRIPT } from "@/lib/introGate";

// Beranda: pembuka (sekali per sesi) lalu hero. Setiap section materi berada di halamannya sendiri.
export default function Home() {
  return (
    <main className="bg-black">
      {/* Menentukan tayang-tidaknya pembuka sebelum halaman digambar (lihat lib/introGate.ts). */}
      <script dangerouslySetInnerHTML={{ __html: INTRO_GATE_SCRIPT }} />
      <IntroSplash />
      <HeroSection />
    </main>
  );
}
