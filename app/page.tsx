import HeroSection from "@/components/hero/HeroSection";
import IntroSplash from "@/components/intro/IntroSplash";

// Beranda: pembuka (sekali per sesi) lalu hero. Setiap section materi berada di halamannya sendiri.
export default function Home() {
  return (
    <main className="bg-black">
      <IntroSplash />
      <HeroSection />
    </main>
  );
}
