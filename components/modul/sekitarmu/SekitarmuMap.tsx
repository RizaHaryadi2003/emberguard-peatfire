"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Check, Flame, X } from "lucide-react";
import mapData from "@/data/sekitarmu-map.json";
import { BORE_SITES, DISTRICT_PEAT, FIRE_SITES, ORGANIC_DISTRICTS, SEKITARMU_TEXT } from "@/config/modul/sekitarmu";

// Peta Modul 01: dari Indonesia sampai jalan-jalan di Pontianak Tenggara.
//
// Semua lapisan — negara, Kalimantan Barat, kecamatan, sungai, titik
// penelitian — memakai satu proyeksi dalam kilometer (lihat
// scripts/build-sekitarmu-map.py). Karena itu perbesaran cukup mengubah
// viewBox; tidak ada peta yang ditukar di tengah jalan, dan pembaca melihat
// sendiri bahwa titik kecil di Kalimantan itu adalah kota tempatnya tinggal.
//
// Garis memakai `vector-effect: non-scaling-stroke` supaya tetap setebal satu
// piksel pada perbesaran berapa pun. Label dan tombol ditulis sebagai DOM di
// atas peta, diletakkan dengan proyeksi yang sama dengan SVG-nya.

type Box = [number, number, number, number];

const VIEWS = mapData.views as Record<"indonesia" | "kalbar" | "pontianak", Box>;

/**
 * Kotak dekat titik-titik penelitian di Pontianak Tenggara, ±1,4 km. Ketiga
 * titik hanya terpaut beberapa ratus meter, jadi kotak yang lebih longgar
 * menumpuk penanda dan labelnya menjadi satu.
 */
const SITE_VIEW: Box = (() => {
  const xs = mapData.sites.map((s) => s.x);
  const ys = mapData.sites.map((s) => s.y);
  const pad = 1.4;
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2];
})();

/**
 * Citra satelit Sentinel-2 cloudless 2024 (EOX, CC BY-NC-SA 4.0), diunduh
 * lewat WMS dalam EPSG:4326. Proyeksi peta ini ekuirektangular, jadi citra
 * lintang–bujur cukup ditempel sebagai satu persegi panjang tanpa dilengkungkan.
 * Tiga tingkat, dari kasar ke halus; tiap citra baru diunduh saat peta sudah
 * mendekati tingkatnya, supaya halaman awal tetap ringan.
 */
const KX = mapData.projection.kmPerDegLon;
const KY = mapData.projection.kmPerDegLat;
function imageBox(west: number, south: number, east: number, north: number): Box {
  return [west * KX, -north * KY, (east - west) * KX, (north - south) * KY];
}
const IMAGERY = {
  indonesia: { href: "/images/sekitarmu/indonesia.jpg", box: imageBox(86, -11.5, 150, 14) },
  kalbar: { href: "/images/sekitarmu/kalbar.jpg", box: imageBox(107.5, -3.5, 115, 2.6) },
  pontianak: { href: "/images/sekitarmu/pontianak.jpg", box: imageBox(109.22, -0.13, 109.44, 0.07) },
};

/** 0 → 1 selama lebar tampilan menyusut dari `from` ke `to` (km). */
function mixBetween(width: number, from: number, to: number) {
  return Math.min(1, Math.max(0, (from - width) / (from - to)));
}

/** Titik yang labelnya diletakkan di kiri, supaya tidak menindih tetangganya. */
const LABEL_LEFT = new Set(["perdana"]);

/** Titik tengah Kota Pontianak, untuk penanda pada perbesaran jauh. */
const CITY: [number, number] = [VIEWS.pontianak[0] + VIEWS.pontianak[2] / 2, VIEWS.pontianak[1] + VIEWS.pontianak[3] / 2];

/**
 * Kotak perbesaran babak 01 pada `zoom` 0–2. Lebar diinterpolasi secara
 * logaritmik — perbesaran 400 kali yang dikerjakan lurus akan menghabiskan
 * hampir seluruh geseran di tingkat Indonesia — dan pusatnya mengikuti
 * seberapa jauh lebarnya sudah menyusut, supaya kota tidak bergeser keluar
 * layar di tengah perjalanan.
 */
function zoomBox(zoom: number): Box {
  const [a, b] = zoom <= 1 ? [VIEWS.indonesia, VIEWS.kalbar] : [VIEWS.kalbar, VIEWS.pontianak];
  const t = zoom <= 1 ? zoom : zoom - 1;
  const w = a[2] * Math.pow(b[2] / a[2], t);
  const h = a[3] * Math.pow(b[3] / a[3], t);
  const k = (a[2] - w) / (a[2] - b[2] || 1);
  const cx = a[0] + a[2] / 2 + (b[0] + b[2] / 2 - (a[0] + a[2] / 2)) * k;
  const cy = a[1] + a[3] / 2 + (b[1] + b[3] / 2 - (a[1] + a[3] / 2)) * k;
  return [cx - w / 2, cy - h / 2, w, h];
}

/** Kotak tampilan menyusul sasarannya, logaritmik pada lebar. */
function useAnimatedBox(target: Box, reducedMotion: boolean): Box {
  const [box, setBox] = useState<Box>(target);
  const ref = useRef<Box>(target);
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Gerak dikurangi: langsung ke sasaran dalam satu bingkai.
      const k = reducedMotion ? 1 : 1 - Math.exp(-7 * dt);
      const [x, y, w, h] = ref.current;
      const nw = Math.exp(Math.log(w) + (Math.log(target[2]) - Math.log(w)) * k);
      const nh = Math.exp(Math.log(h) + (Math.log(target[3]) - Math.log(h)) * k);
      const cx = x + w / 2 + (target[0] + target[2] / 2 - (x + w / 2)) * k;
      const cy = y + h / 2 + (target[1] + target[3] / 2 - (y + h / 2)) * k;
      const next: Box = [cx - nw / 2, cy - nh / 2, nw, nh];
      ref.current = next;
      setBox(next);
      if (Math.abs(nw / target[2] - 1) > 0.002 || Math.abs(cx - (target[0] + target[2] / 2)) > target[2] * 0.001) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, reducedMotion]);
  return box;
}

type Props = {
  act: number;
  zoom: number;
  selected: ReadonlySet<string>;
  revealed: boolean;
  /** Jumlah kecamatan yang hasilnya sudah dibuka, berurutan setelah Periksa. */
  revealCount: number;
  /** Bertambah setiap titik ditekan, untuk memutar ulang riak di peta. */
  tapKey: number;
  boresOpened: ReadonlySet<string>;
  activeBore: string | null;
  firesOpened: ReadonlySet<string>;
  activeFire: string | null;
  onToggleDistrict: (name: string) => void;
  onBore: (id: string) => void;
  onFire: (id: string) => void;
  reducedMotion: boolean;
};

export default function SekitarmuMap({
  act,
  zoom,
  selected,
  revealed,
  revealCount,
  tapKey,
  boresOpened,
  activeBore,
  firesOpened,
  activeFire,
  onToggleDistrict,
  onBore,
  onFire,
  reducedMotion,
}: Props) {
  const target = useMemo<Box>(() => (act === 0 ? zoomBox(zoom) : act === 1 ? VIEWS.pontianak : SITE_VIEW), [act, zoom]);
  const box = useAnimatedBox(target, reducedMotion);

  // Ukuran wadah, untuk meletakkan label DOM dengan proyeksi yang sama
  // dengan `preserveAspectRatio="xMidYMid meet"`.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(size.w / box[2], size.h / box[3]);
  const ox = (size.w - box[2] * scale) / 2;
  const oy = (size.h - box[3] * scale) / 2;
  const toScreen = (x: number, y: number) => ({ left: ox + (x - box[0]) * scale, top: oy + (y - box[1]) * scale });

  // Satu piksel layar dalam satuan peta, untuk tebal arsiran dan penanda.
  const px = 1 / scale;
  const detail = box[2] < 80; // kecamatan baru digambar saat kota sudah cukup besar
  // Garis pantai Natural Earth disederhanakan sampai 4 km — tepat untuk peta
  // Indonesia, tetapi pada skala kota ia muncul sebagai potongan laut bersudut
  // tajam di tempat yang sebenarnya daratan. Saat peta mendekat ke kota,
  // lapisan negara dan provinsi dipudarkan di bawah dasar daratan polos.
  const cityMix = mixBetween(box[2], 220, 60);
  // Citra Kalimantan Barat menggantikan citra Indonesia saat peta mendekat.
  const kalbarMix = mixBetween(box[2], 3200, 1400);
  // Citra kota mulai diunduh sedikit sebelum terlihat, supaya tidak muncul tiba-tiba.
  const loadCity = box[2] < 600;
  const loadKalbar = box[2] < 4200;
  const idn = mapData.countries.find((c) => c.code === "IDN")!;
  const districtClickable = act === 1 && !revealed;

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <svg
        viewBox={box.join(" ")}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="Peta Indonesia sampai Kota Pontianak"
      >
        <defs>
          {/* Tepi citra dipudarkan ke warna laut, supaya batas gambarnya tidak
              terlihat sebagai garis lurus saat tampilan lebih lebar dari citra. */}
          <linearGradient id="sekitarmu-fade-x">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.08" stopColor="#fff" />
            <stop offset="0.92" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sekitarmu-fade-y" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.14" stopColor="#fff" />
            <stop offset="0.86" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="sekitarmu-feather-x" maskContentUnits="objectBoundingBox">
            <rect width="1" height="1" fill="url(#sekitarmu-fade-x)" />
          </mask>
          <mask id="sekitarmu-feather-y" maskContentUnits="objectBoundingBox">
            <rect width="1" height="1" fill="url(#sekitarmu-fade-y)" />
          </mask>
          <clipPath id="sekitarmu-land">
            <path d={idn.d} />
          </clipPath>
          <pattern id="sekitarmu-hatch" patternUnits="userSpaceOnUse" width={px * 7} height={px * 7} patternTransform="rotate(45)">
            <rect width={px * 7} height={px * 7} fill="#e8823a" fillOpacity="0.16" />
            <rect width={px * 2} height={px * 7} fill="#f0a35e" fillOpacity="0.7" />
          </pattern>
          {/* Arsiran lembut untuk babak 03–04: gambutnya sudah diketahui, dan
              yang dibaca sekarang titik-titik di atasnya. */}
          <pattern id="sekitarmu-hatch-soft" patternUnits="userSpaceOnUse" width={px * 12} height={px * 12} patternTransform="rotate(45)">
            <rect width={px * 12} height={px * 12} fill="#e8823a" fillOpacity="0.12" />
            <rect width={px * 1.5} height={px * 12} fill="#f0a35e" fillOpacity="0.35" />
          </pattern>
        </defs>

        {/* Laut, dibentangkan jauh melewati kotak supaya tidak pernah ada tepi.
            Warnanya disamakan dengan laut pada citra yang sudah digelapkan. */}
        <rect x={box[0] - box[2] * 4} y={box[1] - box[3] * 4} width={box[2] * 9} height={box[3] * 9} fill="#0a1830" />

        {/* Citra satelit, dari kasar ke halus. */}
        {(
          [
            // Citra yang lebih halus menumpuk di atas yang kasar; citra di
            // bawahnya baru dilepas setelah tertutup penuh, supaya laut gelap
            // tidak tembus di tengah peralihan.
            ["indonesia", 1, kalbarMix < 1],
            ["kalbar", kalbarMix, loadKalbar && cityMix < 1],
            ["pontianak", cityMix, loadCity],
          ] as const
        ).map(([id, opacity, load]) => {
          if (!load || opacity <= 0) return null;
          const img = IMAGERY[id];
          return (
            <g key={id} mask="url(#sekitarmu-feather-x)" opacity={opacity}>
              <image
                href={img.href}
                x={img.box[0]}
                y={img.box[1]}
                width={img.box[2]}
                height={img.box[3]}
                preserveAspectRatio="none"
                mask="url(#sekitarmu-feather-y)"
              />
            </g>
          );
        })}

        {/* Peredup: citra asli terlalu terang untuk label putih dan arsiran. */}
        <rect
          x={box[0] - box[2] * 4}
          y={box[1] - box[3] * 4}
          width={box[2] * 9}
          height={box[3] * 9}
          fill="#050a08"
          fillOpacity={0.2}
          pointerEvents="none"
        />

        {/* Negara lain digelapkan supaya Indonesia menonjol; garis pantai Natural
            Earth disederhanakan 4 km, jadi garisnya dipudarkan saat mendekat. */}
        {cityMix < 1 &&
          mapData.countries.map((c) => (
            <path
              key={c.code}
              d={c.d}
              fill={c.code === "IDN" ? "none" : "#000"}
              fillOpacity={0.45 * (1 - cityMix)}
              stroke="rgba(255,255,255,0.4)"
              strokeOpacity={1 - kalbarMix}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ))}

        {cityMix < 1 && (
          <path
            d={mapData.kalbar}
            clipPath="url(#sekitarmu-land)"
            fill="#c9773a"
            fillOpacity={(act === 0 ? 0.14 : 0.06) * (1 - cityMix)}
            stroke="#f0a35e"
            strokeOpacity={0.85 * (1 - cityMix)}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

        {detail &&
          mapData.districts.map((d, i) => {
            const peat = DISTRICT_PEAT[d.name];
            const picked = selected.has(d.name);
            // Setelah Periksa, kecamatan dibuka satu per satu. Yang belum
            // dibuka tetap menampilkan tebakan pembaca.
            const shown = revealed && i < revealCount;
            // Kecamatan diisi tipis saja, supaya rumah, jalan, dan kebun pada
            // citra tetap terlihat di bawahnya.
            const fill = !shown && picked ? "rgba(111,182,216,0.45)" : "rgba(8,14,10,0.18)";
            return (
              <g key={d.name}>
                <path
                  d={d.d}
                  fill={fill}
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  className={districtClickable ? "cursor-pointer transition-[fill] hover:brightness-125" : undefined}
                  onClick={districtClickable ? () => onToggleDistrict(d.name) : undefined}
                />
                {/* Arsiran gambut ditumpuk di atas dasar dan dimunculkan
                    perlahan: isi pola tidak bisa dianimasikan langsung. */}
                {shown && peat && (
                  <path
                    d={d.d}
                    fill={act >= 2 ? "url(#sekitarmu-hatch-soft)" : "url(#sekitarmu-hatch)"}
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                    className="sekitarmu-fill"
                  />
                )}
              </g>
            );
          })}

        {/* Sungai sudah tampak pada citra; lapisan ini hanya menegaskannya. */}
        {detail && mapData.rivers.map((r, i) => <path key={i} d={r} fill="#3f88b0" fillOpacity={0.35} pointerEvents="none" />)}
      </svg>

      {/* Penanda kota pada perbesaran jauh. */}
      {!detail && (
        <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={toScreen(CITY[0], CITY[1])}>
          <span className="block h-2.5 w-2.5 animate-pulse rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.25)]" />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
            Pontianak
          </span>
        </span>
      )}

      {/* Nama kecamatan, dan hasilnya setelah diperiksa. */}
      {detail &&
        act <= 1 &&
        mapData.districts.map((d, i) => {
          const peat = DISTRICT_PEAT[d.name];
          const shown = revealed && i < revealCount;
          // Tebakan tepat bila pembaca memilih kecamatan bergambut, atau
          // tidak memilih kecamatan yang bukan gambut.
          const right = selected.has(d.name) === Boolean(peat);
          return (
            <span
              key={d.name}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-black/55 px-1.5 py-0.5 text-center text-[10px] leading-tight text-white/90 sm:text-[11px]"
              style={toScreen(d.label[0], d.label[1])}
            >
              <span className="inline-flex items-center gap-1">
                {shown && act === 1 && (
                  <span
                    className={`sekitarmu-reveal inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${right ? "bg-[#7bc47f] text-black" : "bg-[#e06a5a] text-white"}`}
                    aria-label={right ? SEKITARMU_TEXT.guessRight : SEKITARMU_TEXT.guessWrong}
                  >
                    {right ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} />}
                  </span>
                )}
                {d.name.replace("Pontianak ", "")}
              </span>
              {shown && (
                // Di ponsel petanya kecil: hanya kecamatan bergambut yang
                // diberi baris kedua, supaya labelnya tidak bertumpuk.
                <span className={`sekitarmu-reveal font-medium ${peat ? "block text-[#f0a35e]" : "hidden text-white/50 sm:block"}`}>
                  {peat
                    ? SEKITARMU_TEXT.peat(peat.percent)
                    : ORGANIC_DISTRICTS.has(d.name)
                      ? SEKITARMU_TEXT.organic
                      : SEKITARMU_TEXT.notPeat}
                </span>
              )}
            </span>
          );
        })}

      {/* Titik bor (babak 03) dan titik api (babak 04). */}
      {act >= 2 &&
        mapData.sites.map((s) => {
          const bore = BORE_SITES.find((b) => b.id === s.id)!;
          const fire = FIRE_SITES.find((f) => f.id === s.id);
          if (act === 3 && !fire) return null;
          // Urutan menyala di babak 04, supaya kedua titik tidak menyala serentak.
          const igniteDelay = act === 3 ? FIRE_SITES.findIndex((f) => f.id === s.id) * 0.35 : 0;
          const opened = act === 2 ? boresOpened.has(s.id) : firesOpened.has(s.id);
          const active = act === 2 ? activeBore === s.id : activeFire === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => (act === 2 ? onBore(s.id) : onFire(s.id))}
              className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={toScreen(s.x, s.y)}
              aria-label={act === 2 ? `Titik bor ${bore.title}` : `Titik api ${bore.title}`}
            >
              {/* Riak dari titik yang baru ditekan; `key` memutarnya ulang. */}
              {active && (
                <span
                  key={tapKey}
                  className={`sekitarmu-ripple pointer-events-none absolute inset-0 rounded-full border-2 ${act === 3 ? "border-[#ff9a5c]" : "border-white"}`}
                />
              )}
              <span
                className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-colors ${
                  act === 3
                    ? `sekitarmu-ignite ${active ? "border-[#ffd2b0] bg-[#ff7a3c] text-white" : "border-[#ff7a3c] bg-[#ff7a3c]/30 text-white"}`
                    : active
                      ? "border-white bg-white text-black"
                      : opened
                        ? "border-white/70 bg-black/60 text-white"
                        : "border-white bg-[#6fb6d8]/40 text-white"
                } ${!opened && act !== 3 ? "animate-pulse" : ""}`}
                style={act === 3 ? { animationDelay: `${igniteDelay}s, ${igniteDelay + 0.7}s` } : undefined}
              >
                {act === 3 ? <Flame size={13} /> : opened ? <Check size={13} /> : <ArrowDown size={13} />}
              </span>
              <span
                className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm bg-black/65 px-1.5 py-0.5 text-[10px] text-white/90 sm:text-[11px] ${
                  LABEL_LEFT.has(s.id) ? "right-8" : "left-8"
                }`}
              >
                {bore.title}
              </span>
            </button>
          );
        })}

      <p className="pointer-events-none absolute right-0 top-0 max-w-full rounded-sm bg-black/45 px-1.5 py-0.5 text-right text-[9px] leading-tight text-white/60">
        <span className="hidden sm:inline">{SEKITARMU_TEXT.attribution}</span>
        <span className="sm:hidden">{SEKITARMU_TEXT.attributionShort}</span>
      </p>
    </div>
  );
}
