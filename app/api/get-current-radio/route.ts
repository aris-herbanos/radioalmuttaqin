import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// =================================================================
// 1. KONFIGURASI JINGLE OTOMATIS
// =================================================================
const JINGLE_URL = "https://sdit.my.id/radio/jingle.MP3";
const JINGLE_DURATION = 15;

// =================================================================
// 2. DAFTAR AUDIO CADANGAN
// =================================================================
const FILLER_PLAYLIST = [
  {
    title: "Murottal Jeda - Surah Al-Mulk",
    url: "https://sdit.my.id/radio/SurahAlMulk-Saad-Al-Ghamdi.mp3",
    duration: 1800,
  },
  {
    title: "Nasyid Jeda - Rikhie Asbo",
    url: "https://sdit.my.id/radio/Rikhie-Asbo.mp3",
    duration: 3600,
  },
];

const TOTAL_FILLER_DURATION = FILLER_PLAYLIST.reduce(
  (acc, item) => acc + item.duration,
  0
);

function titleFromAudioUrl(audioUrl?: string, fallback = "Radio Suara Al Muttaqin") {
  if (!audioUrl) return fallback;
  try {
    const url = new URL(audioUrl);
    const rawFilename = url.pathname.split("/").pop() || "";
    const withoutExtension = rawFilename.replace(/\.[a-z0-9]+$/i, "");
    return decodeURIComponent(withoutExtension).replace(/[_-]+/g, " ").trim() || fallback;
  } catch {
    const rawFilename = audioUrl.split("/").pop() || "";
    return rawFilename.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim() || fallback;
  }
}

function getVirtualFillerTrack(gapSeconds: number) {
  if (TOTAL_FILLER_DURATION <= 0) return { title: "Radio Suara Al Muttaqin", audio_url: "", elapsed_seconds: 0 };
  const virtualTimeline = gapSeconds % TOTAL_FILLER_DURATION;
  let accumulatedTime = 0;
  for (const track of FILLER_PLAYLIST) {
    if (virtualTimeline >= accumulatedTime && virtualTimeline < accumulatedTime + track.duration) {
      return { title: track.title || titleFromAudioUrl(track.url), audio_url: track.url, elapsed_seconds: virtualTimeline - accumulatedTime };
    }
    accumulatedTime += track.duration;
  }
  return { title: FILLER_PLAYLIST[0].title || titleFromAudioUrl(FILLER_PLAYLIST[0].url), audio_url: FILLER_PLAYLIST[0].url, elapsed_seconds: 0 };
}

export async function GET() {
  try {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    // =================================================================
    // 0. DETEKSI YOUTUBE LIVE (opsional)
    // Bisa dari environment variable atau API eksternal
    // =================================================================
    const isYouTubeLive = process.env.YOUTUBE_LIVE === "1"; // contoh
    const YT_LIVE_URL = process.env.YOUTUBE_LIVE_URL || "";

    if (isYouTubeLive && YT_LIVE_URL) {
      return NextResponse.json({
        active: true,
        title: "YouTube Live Streaming",
        program_title: "YouTube Live",
        audio_url: YT_LIVE_URL,
        elapsed_seconds: 0,
        type: "youtube_live",
      });
    }

    // =================================================================
    // A. JINGLE TIAP 5 MENIT, TAPI TIDAK DI MENIT 00
    // =================================================================
    if (currentMinute % 5 === 0 && currentMinute !== 0 && currentSecond < JINGLE_DURATION) {
      return NextResponse.json({
        active: true,
        title: titleFromAudioUrl(JINGLE_URL, "Jingle Suara Al Muttaqin"),
        program_title: "Jingle Suara Al Muttaqin",
        audio_url: JINGLE_URL,
        elapsed_seconds: currentSecond,
        type: "jingle",
      });
    }

    // =================================================================
    // B. AMBIL JADWAL UTAMA DARI DATABASE
    // =================================================================
    const currentTrack = await prisma.radioStream.findFirst();

    // =================================================================
    // C. JIKA TIDAK ADA JADWAL UTAMA, PUTAR FILLER
    // =================================================================
    if (!currentTrack) {
      const nowTimestampSeconds = Math.floor(Date.now() / 1000);
      const currentFiller = getVirtualFillerTrack(nowTimestampSeconds);
      return NextResponse.json({
        active: true,
        title: currentFiller.title,
        program_title: "Audio Cadangan",
        audio_url: currentFiller.audio_url,
        elapsed_seconds: currentFiller.elapsed_seconds,
        type: "filler",
      });
    }

    const startTime = new Date(currentTrack.start_time).getTime();
    const nowTimestamp = Date.now();
    const elapsedSeconds = (nowTimestamp - startTime) / 1000;

    // =================================================================
    // D. JIKA AUDIO UTAMA SUDAH HABIS, LANJUT FILLER
    // =================================================================
    if (elapsedSeconds >= currentTrack.duration) {
      const gapSeconds = elapsedSeconds - currentTrack.duration;
      const currentFiller = getVirtualFillerTrack(gapSeconds);
      return NextResponse.json({
        active: true,
        title: currentFiller.title,
        program_title: "Audio Cadangan",
        audio_url: currentFiller.audio_url,
        elapsed_seconds: currentFiller.elapsed_seconds,
        type: "filler",
      });
    }

    // =================================================================
    // E. KONDISI NORMAL: TAMPILKAN NAMA FILE AUDIO YANG SEDANG DIPUTAR
    // =================================================================
    return NextResponse.json({
      active: true,
      title: titleFromAudioUrl(currentTrack.audio_url, currentTrack.title),
      program_title: currentTrack.title,
      audio_url: currentTrack.audio_url,
      elapsed_seconds: elapsedSeconds,
      type: "main",
    });
  } catch (error: any) {
    console.error("Gagal memuat get-current-radio:", error);
    return NextResponse.json({
      active: true,
      title: FILLER_PLAYLIST[0].title,
      program_title: "Audio Cadangan",
      audio_url: FILLER_PLAYLIST[0].url,
      elapsed_seconds: 0,
      type: "fallback",
    });
  }
}