// Gelombang di latar beranda saat logo turun dan lingkaran faktor terbentuk:
// beberapa riak bulat melebar dari pusat roda seperti riak di permukaan air
// yang tenang, lalu memudar.
//
// Agar tampak timbul (sedikit 3D), tiap riak digambar sebagai paket gelombang
// kecil (puncak terang diapit lembah gelap) dan diterangi dari atas: bagian
// terang digeser sedikit ke arah cahaya, bayangan ke arah sebaliknya. Pada
// riak sungguhan, lereng yang menghadap cahaya memantulkan lebih terang dan
// lereng di baliknya lebih gelap; pergeseran kecil ini meniru kesan itu tanpa
// kabur, masker, atau WebGL, sehingga ringan di laptop menengah.

/**
 * Profil satu riak terhadap jarak dari puncaknya, dalam satuan lebar riak:
 * positif = puncak (terang), negatif = lembah (gelap). Puncak utama di 0,
 * lembah di kedua sisinya, lalu mendatar.
 */
export function rippleProfile(x: number): number {
  return Math.exp(-((x / 1.5) ** 2)) * Math.cos(2.3 * x);
}

/**
 * Keadaan satu riak pada kemajuannya p (0..1): melebar dengan laju yang
 * melambat (seperti riak yang kehilangan tenaga), muncul lembut lalu memudar,
 * dan makin landai (melebar) saat menjauh.
 */
export function waveAt(p: number, from: number, to: number): { radius: number; strength: number; width: number } {
  const c = Math.min(1, Math.max(0, p));
  const ease = 1 - Math.pow(1 - c, 2.2);
  const radius = from + (to - from) * ease;
  return {
    radius,
    strength: Math.sin(Math.PI * c) ** 1.5,
    width: 9 + 0.025 * radius,
  };
}

export type Ripple = { radius: number; strength: number; width: number };

const LIGHT = "242, 239, 233";
const SHADE = "38, 36, 33";
/** Kekuatan puncak terang dan lembah gelap (alfa maksimum). */
const LIGHT_ALPHA = 0.55;
const SHADE_ALPHA = 0.3;
/** Pergeseran cahaya/bayangan per lebar riak (arah cahaya: atas). */
const LIGHT_SHIFT = 0.28;
const STOPS = 14;
const SPAN = 3;

/** Satu lapisan (terang atau gelap) dari sebuah riak, berpusat di (cx, cy). */
function fillLayer(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: Ripple, light: boolean) {
  const inner = Math.max(r.radius - SPAN * r.width, 0);
  const outer = r.radius + SPAN * r.width;
  const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  for (let i = 0; i <= STOPS; i++) {
    const t = i / STOPS;
    const x = (inner + (outer - inner) * t - r.radius) / r.width;
    const f = rippleProfile(x);
    const a = light ? Math.max(f, 0) * LIGHT_ALPHA : Math.max(-f, 0) * SHADE_ALPHA + Math.max(f, 0) * 0.35 * SHADE_ALPHA;
    g.addColorStop(t, `rgba(${light ? LIGHT : SHADE}, ${(a * r.strength).toFixed(4)})`);
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, 2 * Math.PI);
  if (inner > 0) ctx.arc(cx, cy, inner, 0, 2 * Math.PI, true);
  ctx.fill();
}

/** Gambar semua riak; bayangan lebih dulu (bergeser ke bawah), cahaya di atasnya. */
export function drawRipples(ctx: CanvasRenderingContext2D, cx: number, cy: number, ripples: Ripple[]) {
  for (const r of ripples) {
    if (r.strength <= 0.002) continue;
    fillLayer(ctx, cx, cy + LIGHT_SHIFT * r.width, r, false);
  }
  for (const r of ripples) {
    if (r.strength <= 0.002) continue;
    fillLayer(ctx, cx, cy - LIGHT_SHIFT * r.width, r, true);
  }
}
