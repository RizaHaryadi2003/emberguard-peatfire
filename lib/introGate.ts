// Penanda keadaan pembuka situs.
//
// Skrip kecil di <head> tata letak akar (app/layout.tsx) berjalan sekali saat
// halaman dimuat, sebelum digambar, dan memberi kelas pada <html>:
//   - `intro-playing` : pembuka akan diputar (beranda adalah halaman pertama
//                       yang dibuka dalam sesi ini);
//   - `intro-skip`    : pembuka dilewati (sudah pernah dilihat, halaman pertama
//                       bukan beranda, atau pengguna meminta gerak dikurangi).
// Berpindah ke beranda dari halaman lain di dalam situs tidak memutar pembuka.
// Selama `intro-playing`, animasi beranda ditahan; saat pembuka selesai,
// kelas itu dilepas dan peristiwa INTRO_DONE dikirim.

/** Kunci sessionStorage: pembuka sudah ditonton dalam sesi ini. */
export const INTRO_SEEN_KEY = "emberguard-pembuka";

/** Peristiwa jendela saat pembuka selesai dan beranda mulai tampil. */
export const INTRO_DONE = "emberguard:pembuka-selesai";

/** Skrip penentu sebelum halaman digambar (dijalankan apa adanya di <script>). */
export const INTRO_GATE_SCRIPT = `(function(){var d=document.documentElement;try{if(location.pathname==="/"&&sessionStorage.getItem("${INTRO_SEEN_KEY}")!=="1"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("intro-playing");return}}catch(e){}d.classList.add("intro-skip")})();`;

/** Apakah pembuka sedang ditayangkan (animasi beranda harus menunggu)? */
export function introPlaying(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("intro-playing");
}

/** Jalankan `fn` sekarang, atau setelah pembuka selesai bila sedang ditayangkan. */
export function afterIntro(fn: () => void): () => void {
  if (!introPlaying()) {
    fn();
    return () => {};
  }
  const handler = () => fn();
  window.addEventListener(INTRO_DONE, handler, { once: true });
  return () => window.removeEventListener(INTRO_DONE, handler);
}
