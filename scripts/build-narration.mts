// Membangkitkan berkas audio narator dari naskah di config/narasi/<modul>.ts
// lewat ElevenLabs (model eleven_v3, Bahasa Indonesia).
//
//   node scripts/build-narration.mts anatomi
//
// Kunci API dibaca dari ELEVENLABS_API_KEY di .env.local (tidak ikut
// di-commit). Hasilnya public/audio/narasi/<modul>/<kunci>.mp3, ikut
// di-commit, jadi situs tidak memanggil ElevenLabs saat berjalan.
//
// Kuota dihemat: manifest.json mencatat sidik tiap klip (teks + suara +
// model). Klip yang sidiknya sama dilewati; hanya klip yang naskahnya
// berubah yang dibangkitkan ulang.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MODEL = "eleven_v3";
const FORMAT = "mp3_44100_64";

const modul = process.argv[2];
if (!modul || !/^[a-z-]+$/.test(modul)) {
  console.error("Pakai: node scripts/build-narration.mts <modul>, mis. anatomi");
  process.exit(1);
}

const env = readFileSync(join(process.cwd(), ".env.local"), "utf8");
const key = env.match(/^ELEVENLABS_API_KEY=["']?([^"'\r\n]+)/m)?.[1];
if (!key) {
  console.error("ELEVENLABS_API_KEY tidak ditemukan di .env.local");
  process.exit(1);
}

const naskah: Record<string, unknown> = await import(join(process.cwd(), "config/narasi", `${modul}.ts`));
const pick = (suffix: string) => Object.entries(naskah).find(([name]) => name.endsWith(suffix))?.[1];
const clips = pick("_NARRATION") as Record<string, { text: string }>;
const voice = pick("_VOICE") as { name: string; id: string };

const outDir = join(process.cwd(), "public/audio/narasi", modul);
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, "manifest.json");
const manifest: Record<string, string> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

// Buang klip lama yang kuncinya sudah tidak ada di naskah.
for (const f of readdirSync(outDir)) {
  const k = f.replace(/\.mp3$/, "");
  if (f.endsWith(".mp3") && !(k in clips)) {
    rmSync(join(outDir, f));
    delete manifest[k];
  }
}

let spent = 0;
for (const [k, clip] of Object.entries(clips)) {
  const sig = createHash("sha256").update(`${voice.id}|${MODEL}|${FORMAT}|${clip.text}`).digest("hex").slice(0, 16);
  const file = join(outDir, `${k}.mp3`);
  if (manifest[k] === sig && existsSync(file)) {
    console.log(`= ${k} (tidak berubah)`);
    continue;
  }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=${FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text: clip.text, model_id: MODEL, language_code: "id", voice_settings: { stability: 0.5 } }),
  });
  if (!res.ok) {
    console.error(`✗ ${k}: ${res.status} ${(await res.text()).slice(0, 300)}`);
    process.exitCode = 1;
    continue;
  }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  manifest[k] = sig;
  spent += clip.text.length;
  console.log(`✓ ${k}`);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Suara ${voice.name}, ± ${spent} huruf terpakai.`);
