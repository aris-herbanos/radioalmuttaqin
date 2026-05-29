// app/api/get-current-radio/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// =================================================================
// 📻 1. KONFIGURASI JINGLE OTOMATIS (Masing-masing 10 Menit Sekali)
// =================================================================
const JINGLE_URL = "https://sdit.my.id/radio/jingle.MP3"; 
const JINGLE_DURATION = 15; // 💡 Durasi jingle wajib pas dalam hitungan detik

// =================================================================
// 📥 2. DAFTAR AUDIO CADANGAN (FILLER PLAYLIST)
// =================================================================
const FILLER_PLAYLIST = [
  {
    title: "Murottal Jeda - Surah Al-Mulk",
    url: "https://sdit.my.id/radio/SurahAlMulk-Saad-Al-Ghamdi.mp3",
    duration: 180, // 3 menit
  },
  {
    title: "Nasyid Jeda - Rikhie Asbo",
    url: "https://sdit.my.id/radio/Rikhie-Asbo.mp3",
    duration: 300, // 5 menit
  },
 
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

  return {
    title: FILLER_PLAYLIST[0].title,
    audio_url: FILLER_PLAYLIST[0].url,
    elapsed_seconds: 0
  };
}

export async function GET() {
  try {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    // =================================================================
    // ⚡ LAPISAN A: LOGIKA PENYELA JINGLE (Memicu Otomatis Tiap Kelipatan 10 Menit)
    // =================================================================
    // Contoh: Jam 10:00, 10:10, 10:20, 10:30, 10:40, 10:50 pada 15 detik pertama
    if (currentMinute % 10 === 0 && currentSecond < JINGLE_DURATION) {
      return NextResponse.json({
        active: true,
        title: "Jingle Suara Al Muttaqin",
        audio_url: JINGLE_URL,
        elapsed_seconds: currentSecond // Jika jemaah masuk di tengah jingle, jalurnya tetap lurus sinkron!
      });
    }

    // Ambil data jadwal siaran utama dari database Supabase
    const currentTrack = await prisma.radioStream.findFirst();

    // =================================================================
    // 📻 SITUASI B: JIKA TIDAK ADA JADWAL UTAMA SAMA SEKALI DI DATABASE
    // =================================================================
    if (!currentTrack) {
      const nowTimestampSeconds = Math.floor(Date.now() / 1000);
      const currentFiller = getVirtualFillerTrack(nowTimestampSeconds);
      
      return NextResponse.json({
        active: true,
        title: currentFiller.title,
        audio_url: currentFiller.audio_url,
        elapsed_seconds: currentFiller.elapsed_seconds
      });
    }

    const startTime = new Date(currentTrack.start_time).getTime();
    const nowTimestamp = Date.now();
    const elapsedSeconds = (nowTimestamp - startTime) / 1000;

    // =================================================================
    // 🚀 SITUASI C: LOGIKA PENYELAMAT KEKOSONGAN (Materi Kajian Utama Habis Duluan)
    // =================================================================
    if (elapsedSeconds >= currentTrack.duration) {
      const gapSeconds = elapsedSeconds - currentTrack.duration;
      const currentFiller = getVirtualFillerTrack(gapSeconds);

      return NextResponse.json({
        active: true,
        title: currentFiller.title,
        audio_url: currentFiller.audio_url,
        elapsed_seconds: currentFiller.elapsed_seconds
      });
    }

    // =================================================================
    // 🟢 SITUASI D: KONDISI NORMAL (Audio utama siaran Cron Job sedang mengudara)
    // =================================================================
    return NextResponse.json({
      active: true,
      title: currentTrack.title,
      audio_url: currentTrack.audio_url,
      elapsed_seconds: elapsedSeconds
    });

  } catch (error: any) {
    console.error("⚠️ Gagal memuat get-current-radio (Database Stun/Timeout):", error);
    // Jalur penyelamat instan jika database mengalami kendala koneksi agar radio tidak hening
    return NextResponse.json({
      active: true,
      title: FILLER_PLAYLIST[0].title,
      audio_url: FILLER_PLAYLIST[0].url,
      elapsed_seconds: 0
    });
  }
}