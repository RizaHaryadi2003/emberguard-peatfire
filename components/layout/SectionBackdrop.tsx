/**
 * Latar halaman section (Modul, Simulasi, Kuis): abu-abu bergradasi yang sama
 * dengan beranda. Dipasang tetap di layar (fixed) supaya gradasinya selalu
 * selebar satu layar walau halamannya panjang, dan tidak ikut digambar ulang
 * saat digulir. Induknya perlu `isolate` agar lapisan ini tetap di belakang isi.
 */
export default function SectionBackdrop() {
  return <div aria-hidden className="section-backdrop pointer-events-none fixed inset-0 -z-10" />;
}
