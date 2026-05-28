// app/api/get-current-radio/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 📥 1. DAFTAR AUDIO CADANGAN (Isi dengan banyak file MP3 terpisah dari Supabase Storage)
// Catatan: Wajib sertakan durasi masing-masing file dalam satuan detik (seconds)
const FILLER_PLAYLIST = [
  {
    title: "Murottal Jeda - Surah Al-Mulk",
    url: "https://zkxokackzppkxjrvqgka.supabase.co/storage/v1/object/public/radio/Surah%20Al%20Mulk%20-%20Saad%20Al%20Ghamdi.mp3",
    duration: 180, // 3 menit
  },
  {
    title: "Murottal Jeda - Surah Al-Waqiah",
    url: "https://xxxx.supabase.co/storage/v1/object/public/radio-audio/al_waqiah.mp3",
    duration: 300, // 5 menit
  },
  {
    title: "Nasyid Jeda - Thola'al Badru",
    url: "https://xxxx.supabase.co/storage/v1/object/public/radio-audio/tholaal.mp3",
    duration: 240, // 4 menit
  },
  // 💡 Antum bisa tambah sebanyak mungkin file MP3 cadangan ke bawah sini...
];

// Helper untuk menghitung total durasi seluruh playlist cadangan
const TOTAL_FILLER_DURATION = FILLER_PLAYLIST.reduce((acc, item) => acc + item.duration, 0);

/**
 * HELPER FUNCTION: Menghitung lagu cadangan mana yang harus berputar secara serempak
 * berdasarkan total detik kekosongan (gap_seconds)
 */
function getVirtualFillerTrack(gapSeconds: number) {
  // Gunakan rumus modulus (sisa bagi) agar playlist terus berputar berantai (looping) tanpa putus
  const virtualTimeline = gapSeconds % TOTAL_FILLER_DURATION;
  
  let accumulatedTime = 0;

  for (const track of FILLER_PLAYLIST) {
    if (virtualTimeline >= accumulatedTime && virtualTimeline < accumulatedTime + track.duration) {
      return {
        title: track.title,
        audio_url: track.url,
        elapsed_seconds: virtualTimeline - accumulatedTime
      };
    }
    accumulatedTime += track.duration;
  }

  // Fallback jika terjadi anomali perhitungan, balikkan lagu pertama
  return {
    title: FILLER_PLAYLIST[0].title,
    audio_url: FILLER_PLAYLIST[0].url,
    elapsed_seconds: 0
  };
}

export async function GET() {
  try {
    const currentTrack = await prisma.radioStream.findFirst();

    // SITUASI A: JIKA TIDAK ADA JADWAL CRON JOB SAMA SEKALI DI DATABASE
    if (!currentTrack) {
      const now = new Date().getTime() / 1000;
      // Gunakan timestamp waktu dunia saat ini sebagai basis detik jeda virtual
      const currentFiller = getVirtualFillerTrack(now);
      
      return NextResponse.json({
        active: true,
        title: currentFiller.title,
        audio_url: currentFiller.audio_url,
        elapsed_seconds: currentFiller.elapsed_seconds
      });
    }

    const startTime = new Date(currentTrack.start_time).getTime();
    const now = new Date().getTime();
    const elapsedSeconds = (now - startTime) / 1000;

    // 🚀 SITUASI B: LOGIKA PENYELAMAT KEKOSONGAN (Misal materi siaran utama sudah habis duluan)
    if (elapsedSeconds >= currentTrack.duration) {
      const gapSeconds = elapsedSeconds - currentTrack.duration;
      
      // Ambil lagu cadangan yang pas secara otomatis sesuai detik kekosongan saat ini
      const currentFiller = getVirtualFillerTrack(gapSeconds);

      return NextResponse.json({
        active: true,
        title: currentFiller.title,
        audio_url: currentFiller.audio_url,
        elapsed_seconds: currentFiller.elapsed_seconds // Tetap lompat serempak!
      });
    }

    // SITUASI C: KONDISI NORMAL (Audio utama masih bersiaran)
    return NextResponse.json({
      active: true,
      title: currentTrack.title,
      audio_url: currentTrack.audio_url,
      elapsed_seconds: elapsedSeconds
    });
  } catch (error: any) {
    // Jika database drop/stun, langsung putar lagu pertama dari playlist cadangan agar radio gak hening
    return NextResponse.json({
      active: true,
      title: FILLER_PLAYLIST[0].title,
      audio_url: FILLER_PLAYLIST[0].url,
      elapsed_seconds: 0
    });
  }
}