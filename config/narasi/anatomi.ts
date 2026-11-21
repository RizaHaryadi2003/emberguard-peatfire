/**
 * Naskah narator Modul Anatomi Gambut.
 *
 * Fakta dan urutannya mengikuti teks layar (`config/modul/anatomi.ts`:
 * ANATOMI_HOOK, ANATOMI_STEPS, ANATOMI_GUIDE), tetapi ditulis seperti orang
 * BERCERITA kepada pembaca ±17 tahun: ada reaksi ("Eh", "Nah", "Wah"),
 * pertanyaan, dan jeda ("..."), supaya nadanya naik-turun dan tidak terdengar
 * dibacakan. Angka dan satuan dieja ("40 cm" → "empat puluh sentimeter").
 * Bila teks layar berubah, ubah juga klip yang sesuai di sini.
 *
 * Kunci klip:
 *   hook      layar pembuka, bernada bertanya;
 *   t<n>      penjelasan tahap n (0–3), diputar saat tahap dibuka;
 *   t<n>-g<k> arahan ke-k tahap n (k ≥ 1), diputar sesudah penjelasan.
 *             Arahan pertama (k = 0) tidak dibacakan karena isinya sudah
 *             ada di kalimat terakhir penjelasan.
 *
 * Teks dalam kurung siku ("[curious]", "[whispers]") adalah penanda emosi
 * model ElevenLabs v3: tidak diucapkan, tetapi mengarahkan nadanya.
 * `direction` adalah catatan arahan nada untuk manusia, tidak dikirim. File ini sengaja tanpa impor, supaya skrip pembangkit audio
 * dapat membacanya langsung dengan Node.
 */

export type NarrationClip = {
  /** Teks yang diucapkan. */
  text: string;
  /** Arahan nada dan emosi untuk pengisi suara. */
  direction: string;
};

/**
 * Audio narator Anatomi sudah dibangkitkan dan ada di
 * public/audio/narasi/anatomi/. Selama false, tombol Narator tidak tampil.
 * Dimatikan 21 November 2026: suara Damayanti (macOS) dan "Lily"
 * (ElevenLabs) sama-sama dinilai pengguna kurang bagus, dan klipnya dihapus.
 * Naskah, skrip pembangkit, dan pemutarnya tetap disimpan untuk dicoba lagi.
 */
export const ANATOMI_NARRATION_READY = false;

/** Suara ElevenLabs untuk narator modul ini. */
export const ANATOMI_VOICE = { name: "Lily", id: "pFZP5JQG7iQjIQuC4Bku" };

export const ANATOMI_NARRATION: Record<string, NarrationClip> = {
  hook: {
    text: "[curious] Eh, coba lihat tanah ini... [surprised] Sebagian besar isinya air, lho. [thoughtful] Tapi... [curious] kok bisa terbakar, ya?",
    direction: "Akrab dan penasaran. Pelan di awal, sedikit heran di 'lho', berhenti sejenak, lalu nada naik jelas di 'kok bisa terbakar, ya?'",
  },

  // Tahap 1 · Hutan di atas spons
  t0: {
    text: "[warmly] Kita mulai dari awal, ya. Dulu, di sini ada rawa yang selalu tergenang. Batang, akar, dan daun jatuh ke air... dan karena kekurangan oksigen, semuanya tidak membusuk sempurna. Jadi, mereka menumpuk. [slowly] Sedikit... demi sedikit. [excited] Sekarang giliran kamu. Seret pengatur waktu di bawah, dan tumbuhkan gambutnya sendiri!",
    direction: "Bercerita, tenang dan hangat. Melambat di 'sedikit... demi sedikit'. Lebih bersemangat dan mengajak di kalimat terakhir.",
  },
  "t0-g1": {
    text: "[happy] Nah, jadi deh! Gambutnya sudah terbentuk. Yuk, lanjut ke tahap berikutnya.",
    direction: "Senang dan puas, seperti memuji. Ringan dan cepat.",
  },

  // Tahap 2 · Lapis demi lapis
  t1: {
    text: "[warmly] Sekarang, kita kupas lapisannya satu per satu. Gambut di tepi Sungai Kapuas ini punya pola yang menarik: makin ke bawah, makin matang. Paling atas ada fibrik, seratnya masih utuh, masih mentah. Di tengah, hemik, setengah matang. Dan paling bawah... [softly] saprik. Halus sekali. Coba klik salah satu lapisan, dan lihat dari dekat.",
    direction: "Seperti pemandu yang menunjuk satu per satu. Beri tekanan pada nama fibrik, hemik, saprik. Jeda singkat sebelum 'saprik'. Mengajak di kalimat terakhir.",
  },
  "t1-g1": {
    text: "Itu dia ciri lapisannya. [playfully] Penasaran sama yang lain? Klik lapisan lainnya, terus bandingkan seratnya.",
    direction: "Ramah, sedikit menggoda di 'Penasaran sama yang lain?', nada naik di tanda tanya.",
  },
  "t1-g2": {
    text: "[cheerfully] Oke! Lanjut ke tahap berikutnya.",
    direction: "Singkat dan ceria.",
  },

  // Tahap 3 · Menyimpan air
  t2: {
    text: "[excited] Nah, ini bagian yang paling bikin kaget. Gambut itu... seperti spons. Sebagian besar isinya pori, dan di alam, pori itu penuh berisi air. [amazed] Bayangkan: satu kilogram gambut fibrik kering, bisa menahan delapan setengah, sampai lebih dari tiga puluh kilogram air! Saprik yang lebih rapat memang lebih sedikit, kurang dari empat setengah kilogram. Karena muka air tanahnya dekat permukaan, gambut tetap basah sepanjang tahun. [softly] Bahkan... saat kemarau.",
    direction: "Antusias, seperti membagikan fakta mengejutkan. Kagum dan naik di 'lebih dari tiga puluh kilogram air!'. Lebih datar di kalimat saprik. Jeda dan pelan di 'Bahkan... saat kemarau.'",
  },
  "t2-g1": {
    text: "[cheerfully] Keren, kan? Yuk, lanjut ke tahap berikutnya.",
    direction: "Ceria, nada naik di 'kan?'.",
  },

  // Tahap 4 · Saat air surut
  t3: {
    text: "[serious] Tapi... gimana kalau airnya hilang? Kanal dan kemarau panjang bisa menurunkan muka air tanah. Gambut di atasnya mengering, dan berubah jadi bahan bakar. Coba geser muka airnya turun, melewati batas empat puluh sentimeter. [softly] Perhatikan apa yang terjadi.",
    direction: "Berubah serius dan sedikit cemas. Pertanyaan pembuka pelan dan menggantung. Tegas tetapi tenang di bagian 'bahan bakar'. Kalimat terakhir pelan, mengajak memperhatikan.",
  },
  "t3-g1": {
    text: "[whispers] Lihat itu... Gambut di atas air mulai mengering, dan berpijar. [relieved] Sementara di bawah garis biru, ia masih basah.",
    direction: "Pelan, prihatin, setengah berbisik di 'berpijar'. Sedikit lega di kalimat kedua.",
  },
  "t3-g2": {
    text: "[sincerely] Ingat ini, ya. Tiga puluh sentimeter gambut butuh empat ratus tahun untuk terbentuk... tapi bisa hilang dalam kurang dari sepuluh tahun. [warmly] Sampai jumpa di modul berikutnya!",
    direction: "Hangat tetapi sungguh-sungguh, seperti pesan penting. Jeda panjang sebelum 'tapi'. Penutup ramah dan ringan.",
  },
};
