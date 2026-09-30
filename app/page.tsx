import HeroSection from "@/components/hero/HeroSection";

// Beranda: hanya hero. Setiap section materi berada di halamannya sendiri.
export default function Home() {
  return (
    <main className="bg-black">
      <HeroSection />
    </main>
  );
}
