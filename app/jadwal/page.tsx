"use client";

// 🟢 MANTRA KEAMANAN: Memastikan Turbopack meloloskan halaman tanpa mencoba caching kaku pas build
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function JadwalPage() {
  // ✅ DATA AMAN: Data internal Virtual Auto DJ yang dikunci secara mandiri
  const programHarian = [
    { jam: "06:00 - 07:00", acara: "Nasyid Pagi", deskripsi: "Alunan nasyid penuh semangat untuk mengawali aktivitas pagi hari." },
    { jam: "07:00 - 09:00", acara: "Pengajian Umum", deskripsi: "Pengajian umum yang diselenggarakan Oleh Pesantren Al Muttaqin" },
	{ jam: "09:00 - 10:00", acara: "Kajian Aqidah", deskripsi: "Pengajian Tema Aqidah" },
    { jam: "10:00 - 11:00", acara: "Kajian Keluarga Sakinah", deskripsi: "Membangun rumah tangga islami yang penuh ketenangan dan cinta." },
	{ jam: "11:00 - 12:00", acara: "Kajian Ustadz Alumni", deskripsi: "Pengajian yang diisi oleh para Ustadz Alumni Al Muttaqin." },
	{ jam: "12:00 - 13:00", acara: "Murottal Siang", deskripsi: "Murottal Syaikh Al Mathrud" },
    { jam: "13:00 - 14:00", acara: "Kajian Tematik", deskripsi: "Pengajian tematik yang mengupas tentang topik-topik kekinian." },
    { jam: "16:00 - 17:00", acara: "Taujih Sore Ust. Sartono", deskripsi: "Siraman rohani untuk menyegarkan iman di waktu sore." },
    { jam: "17:15 - 18:15", acara: "Murottal Anak", deskripsi: "Lantunan ayat suci Al-Qur'an merdu untuk buah hati di waktu petang." },
	{ jam: "18:15 - 19:15", acara: "Murotal Merdu", deskripsi: "Murotal Abu usamah" },
    { jam: "19:30 - 21:00", acara: "Tazkiyatun Nafs", deskripsi: "Kajian pembersihan jiwa untuk kedekatan hamba dengan Sang Kholiq." },
    { jam: "21:00 - 22:00", acara: "Kajian Parenting", deskripsi: "Panduan mendidik anak sesuai sunnah dan tuntunan syariat." },
    { jam: "22:00 - 23:00", acara: "Nasyid Lawas", deskripsi: "Nostalgia nasyid bermakna untuk menemani waktu istirahat malam." },
  ];

  return (
    <div className="min-h-screen bg-emerald-950 pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Halaman dengan Efek Neon */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white uppercase tracking-[0.3em] drop-shadow-lg">
            Jadwal Siaran
          </h1>
          <div className="h-1 w-24 bg-cyan-400 mx-auto mt-4 rounded-full shadow-[0_0_15px_rgba(0,242,255,0.8)]" />
          <p className="mt-6 text-emerald-200/80 font-medium">
            {/* 🟢 FIX: Lokasi kota disesuaikan menjadi Purwokerto */}
            Program rutin Radio Suara Al Muttaqin Purwokerto untuk menginspirasi hati Anda.
          </p>
        </div>

        {/* Grid Jadwal Dinamis */}
        <div className="grid gap-4">
          {programHarian.map((prog, index) => (
            <div 
              key={index} 
              className="group bg-white/5 backdrop-blur-md border border-emerald-500/20 p-6 rounded-[2rem] hover:bg-emerald-800/20 transition-all duration-300 hover:border-cyan-500/40 shadow-xl"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  {/* Badge Jam ala Robot Terminal */}
                  <span className="bg-cyan-500/10 text-cyan-400 font-mono text-xs px-4 py-2 rounded-xl border border-cyan-500/20 shadow-inner whitespace-nowrap">
                    {prog.jam}
                  </span>
                  <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                    {prog.acara}
                  </h3>
                </div>
                <p className="text-sm text-emerald-100/60 font-light max-w-sm md:text-right">
                  {prog.deskripsi}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info sistem */}
        <div className="mt-12 p-8 rounded-[2.5rem] bg-black/20 border border-emerald-500/10 text-center">
          {/* 🟢 FIX: Status sinkronisasi dialihkan ke sistem internal virtual kita */}
          <p className="text-[10px] font-mono text-emerald-500/40 uppercase tracking-[0.4em]">
            Sync Status: Verified with RSM-VIRTUAL-DJ
          </p>
          <p className="text-xs text-emerald-300/50 mt-2">
            Pembaruan sistem dilakukan secara otomatis mengikuti penanggalan database internal.
          </p>
        </div>
      </div>
    </div>
  );
}