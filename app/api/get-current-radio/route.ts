import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// =================================================================
// 1. KONFIGURASI JINGLE OTOMATIS
// =================================================================
const JINGLE_URL = "https://sdit.my.id/radio/jingle.MP3";
const JINGLE_DURATION = 15;

// =================================================================
// 2. DAFTAR AUDIO CADANGAN (FILLER)
// =================================================================
const FILLER_PLAYLIST = [
  {
    title: "Murottal Jeda - Surah Al-Mulk",
    url: "https://sdit.my.id/radio/SurahAlMulk-Saad-Al-Ghamdi.mp3",
    duration: 415,
  },
  {
    title: "Nasyid Jeda - Rikhie Asbo",
    url: "https://sdit.my.id/radio/Rikhie-Asbo.mp3",
    duration: 5760,
  },
  {
    title: "Murottal Jeda - Surah Al-Waqiah",
    url: "https://sdit.my.id/radio/al-waqiah-ust-shidqy.mp3",
    duration: 780,
  },
  {
    title: "Nasyid Jeda - Hanya Rindu Versi Arab",
    url: "https://sdit.my.id/radio/hanya-rindu-versi-arab.mp3",
    duration: 258,
  },
  {
    title: "Murottal Jeda - Al Fatihah Syaikh Abdullah Al-Mathrud",
    url: "https://dn710102.ca.archive.org/0/items/abdullahal-mathrud/001-Al-Fatihah.mp3",
    duration: 27,
  },
  {
    title: "Murottal Jeda - Al Baqarah Syaikh Abdullah Al-Mathrud",
    url: "https://dn710102.ca.archive.org/0/items/abdullahal-mathrud/002-Al-Baqarah.mp3",
    duration: 7200,
  },
  {
    title: "Murottal Jeda - Ali Imron Syaikh Abdullah Al-Mathrud",
    url: "https://ia801406.us.archive.org/8/items/abdullahal-mathrud/003-Ali-Imran.mp3",
    duration: 4800,
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
  if (TOTAL_FILLER_DURATION <= 0) {
    return {
      title: "Radio Suara Al Muttaqin",
      audio_url: "",
      elapsed_seconds: 0,
    };
  }

  const virtualTimeline = Math.floor(gapSeconds) % TOTAL_FILLER_DURATION;
  let accumulatedTime = 0;

  for (const track of FILLER_PLAYLIST) {
    if (virtualTimeline >= accumulatedTime && virtualTimeline < accumulatedTime + track.duration) {
      return {
        title: track.title || titleFromAudioUrl(track.url),
        audio_url: track.url,
        elapsed_seconds: virtualTimeline - accumulatedTime,
      };
    }

    accumulatedTime += track.duration;
  }

  return {
    title: FILLER_PLAYLIST[0].title || titleFromAudioUrl(FILLER_PLAYLIST[0].url),
    audio_url: FILLER_PLAYLIST[0].url,
    elapsed_seconds: 0,
  };
}

async function getYouTubeLiveFromChannel() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID || process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || "";
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "";

  if (!channelId || !apiKey) return null;

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("channelId", channelId);
    url.searchParams.set("eventType", "live");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 30 } });
    if (!res.ok) return null;

    const data = await res.json();
    const item = data.items?.[0];
    const videoId = item?.id?.videoId;

    if (!videoId) return null;

    return {
      videoId,
      title: item.snippet?.title || "YouTube Live Streaming",
      thumbnail: item.snippet?.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    // =================================================================
    // 0. PRIORITAS UTAMA: DETEKSI YOUTUBE LIVE
    // =================================================================
    const youtubeLive = await getYouTubeLiveFromChannel();
    if (youtubeLive) {
      return NextResponse.json({
        active: true,
        title: youtubeLive.title,
        program_title: "YouTube Live",
        audio_url: youtubeLive.url,
        thumbnail: youtubeLive.thumbnail,
        elapsed_seconds: 0,
        type: "youtube_live",
      });
    }

    // Fallback Manual YouTube Live
    const isManualYouTubeLive = process.env.YOUTUBE_LIVE === "1";
    const manualYouTubeLiveUrl = process.env.YOUTUBE_LIVE_URL || "";
    if (isManualYouTubeLive && manualYouTubeLiveUrl) {
      return NextResponse.json({
        active: true,
        title: "YouTube Live Streaming",
        program_title: "YouTube Live",
        audio_url: manualYouTubeLiveUrl,
        elapsed_seconds: 0,
        type: "youtube_live",
      });
    }

    // =================================================================
    // A. JINGLE TIAP 5 MENIT
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
    // KUNCI PERBAIKAN: JALUR DURASI DINAMIS
    // =================================================================
    // Kita gunakan nilai limit durasi dari kolom database (misal: currentTrack.target_duration).
    // Jika kolom target_duration tidak ada, dia otomatis fallback ke durasi asli berkas MP3-nya.
    const allowedDuration = currentTrack.target_duration && currentTrack.target_duration > 0
      ? currentTrack.target_duration 
      : currentTrack.duration;

    // =================================================================
    // D. JIKA AUDIO UTAMA MELEBIHI JATAH SLOT (DINAMIS), LANJUT FILLER
    // =================================================================
    if (elapsedSeconds >= allowedDuration) {
      const gapSeconds = elapsedSeconds - allowedDuration;
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
    // E. KONDISI NORMAL
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