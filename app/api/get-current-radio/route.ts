import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 🟢 FIX JALUR IMPOR: Mengunci rute relatif 3 tingkat menuju root folder sanity/lib/client
import { client } from "../../../sanity/lib/client"; 

export const dynamic = "force-dynamic"; // Memaksa API selalu fresh tanpa membeku di cache Vercel
export const revalidate = 0; // Mematikan optimasi cache statis Vercel secara total demi suara real-time

// =================================================================
// 1. KONFIGURASI JINGLE OTOMATIS
// =================================================================
const JINGLE_URL = "/audio/jingle.mp3";
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

// Fungsi pembantu mengubah string "HH:MM" menjadi total menit
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const cleanTime = timeStr.replace('.', ':');
  const [hours, minutes] = cleanTime.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

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

  const virtualTimeline = Math.floor(Math.abs(gapSeconds)) % TOTAL_FILLER_DURATION;
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

// 🟢 HELPER HEADERS ANTI-BUFF: Memaksa HTTP response bebas sisa cache jaringan demi transmisi suara jernih
const getSecureHeaders = () => {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
  };
};

// =================================================================
// MAIN HANDLER GET
// =================================================================
export async function GET() {
  let cachedSchedules: any[] = [];

  try {
    const now = new Date();

    // =================================================================
    // 0. PRIORITAS UTAMA: DETEKSI JADWAL HYBRID + HARI DARI SANITY CMS
    // =================================================================
    try {
      const sanityQuery = `
        *[_type == "radioConfig"][0] {
          radioName,
          stationTagline,
          schedules[] {
            day,
            eventName,
            speaker,
            startTime,
            endTime,
            broadcastMode,
            youtubeVideoId,
            relayAudioUrl,
            playlist[] {
              trackTitle,
              speaker,
              "audioFileUrl": audioFile.asset->url
            }
          }
        }
      `;
      
      const config = await client.fetch(sanityQuery, {}, { cache: 'no-store' });

      if (config && config.schedules && Array.isArray(config.schedules)) {
        cachedSchedules = config.schedules;

        const timeFormatter = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        const timeParts = timeFormatter.formatToParts(now);
        const currentHours = Number(timeParts.find(p => p.type === 'hour')?.value || 0);
        const currentMinutes = Number(timeParts.find(p => p.type === 'minute')?.value || 0);
        const currentSecs = Number(timeParts.find(p => p.type === 'second')?.value || 0);
        
        const currentTotalMinutes = currentHours * 60 + currentMinutes;

        const dayFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Jakarta',
          weekday: 'long'
        });
        const currentDayName = dayFormatter.format(now);

        let activeSchedule = null;
        for (const schedule of config.schedules) {
          const start = timeToMinutes(schedule.startTime);
          const end = timeToMinutes(schedule.endTime);

          const isTimeMatch = currentTotalMinutes >= start && currentTotalMinutes < end;
          
          const sDay = (schedule.day || '').trim().toLowerCase();
          const cDay = currentDayName.trim().toLowerCase();
          const isDayMatch = sDay === 'everyday' || sDay === cDay;

          if (isTimeMatch && isDayMatch) {
            activeSchedule = schedule;
            break;
          }
        }

        if (activeSchedule) {
          const stationName = config.radioName || "Radio Suara Al Muttaqin";
          const startMinutes = timeToMinutes(activeSchedule.startTime);
          const secondsSinceScheduleStarted = ((currentTotalMinutes - startMinutes) * 60) + currentSecs;
          const ASSUMED_TRACK_DURATION = 3600; 

          // --- 🎥 CASE A: MODE TRANSMISI YOUTUBE LIVE ---
          if (activeSchedule.broadcastMode === 'youtube_live') {
            const videoId = activeSchedule.youtubeVideoId?.trim() || null;
            return NextResponse.json({
              active: true,
              type: "youtube_live",
              youtube_video_id: videoId,
              thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "/bg-player.png",
              title: activeSchedule.eventName || "Live Streaming YouTube",
              artist: activeSchedule.speaker || "Pondok Pesantren Al Muttaqin",
              program_title: stationName,
              audio_url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
              elapsed_seconds: 0,
              allSchedules: cachedSchedules
            }, { headers: getSecureHeaders() });
          }

          // --- 📻 CASE B: MODE TRANSMISI RELAY STREAM (RADIO FM LAIN) ---
          if (activeSchedule.broadcastMode === 'relay_stream') {
            const relayUrl = activeSchedule.relayAudioUrl?.trim() || null;
            return NextResponse.json({
              active: true,
              type: "relay_stream",
              youtube_video_id: null,
              thumbnail: "/bg-player.png",
              title: activeSchedule.eventName || "Relay Stasiun Luar",
              artist: activeSchedule.speaker || "Radio Mitra",
              program_title: stationName,
              audio_url: relayUrl,
              elapsed_seconds: 0,
              allSchedules: cachedSchedules
            }, { headers: getSecureHeaders() });
          }

          // --- 🎵 CASE C: MODE TRANSMISI PLAYLIST MP3 CLOUD ---
          if (activeSchedule.broadcastMode === 'playlist_mp3' && activeSchedule.playlist && activeSchedule.playlist.length > 0) {
            const totalPlaylistTracks = activeSchedule.playlist.length;
            const totalTrackIndexTimeline = Math.floor(secondsSinceScheduleStarted / ASSUMED_TRACK_DURATION);
            const currentTrackIndex = totalTrackIndexTimeline % totalPlaylistTracks;
            
            const selectedTrack = activeSchedule.playlist[currentTrackIndex];
            const trackElapsedSeconds = secondsSinceScheduleStarted % ASSUMED_TRACK_DURATION;

            return NextResponse.json({
              active: true,
              type: "playlist_mp3",
              youtube_video_id: null,
              thumbnail: "/bg-player.png",
              title: selectedTrack?.trackTitle || activeSchedule.eventName,
              artist: selectedTrack?.speaker || activeSchedule.speaker || "Pondok Pesantren Al Muttaqin",
              program_title: stationName,
              audio_url: selectedTrack?.audioFileUrl || null,
              elapsed_seconds: trackElapsedSeconds,
              allSchedules: cachedSchedules
            }, { headers: getSecureHeaders() });
          } else {
            const totalFillerTracks = FILLER_PLAYLIST.length;
            const totalTrackIndexTimeline = Math.floor(secondsSinceScheduleStarted / ASSUMED_TRACK_DURATION);
            const currentFillerIndex = totalTrackIndexTimeline % totalFillerTracks;
            
            const selectedFiller = FILLER_PLAYLIST[currentFillerIndex];
            const trackElapsedSeconds = secondsSinceScheduleStarted % ASSUMED_TRACK_DURATION;

            return NextResponse.json({
              active: true,
              type: "playlist_mp3",
              youtube_video_id: null,
              thumbnail: "/bg-player.png",
              title: selectedFiller.title,
              artist: activeSchedule.speaker || "Pondok Pesantren Al Muttaqin",
              program_title: activeSchedule.eventName || stationName,
              audio_url: selectedFiller.url,
              elapsed_seconds: trackElapsedSeconds,
              allSchedules: cachedSchedules
            }, { headers: getSecureHeaders() });
          }
        }
      }
    } catch (sanityError) {
      console.error("Gagal memproses otomatisasi jadwal Sanity CMS:", sanityError);
    }

    const freshNow = new Date();
    const currentMinute = freshNow.getMinutes();
    const currentSecond = freshNow.getSeconds();

    // =================================================================
    // A. JINGLE TIAP 5 MENIT (CRON BACKEND LAMA)
    // =================================================================
    if (currentMinute % 5 === 0 && currentMinute !== 0 && currentSecond < JINGLE_DURATION) {
      return NextResponse.json({
        active: true,
        title: titleFromAudioUrl(JINGLE_URL, "Jingle Suara Al Muttaqin"),
        program_title: "Jingle Suara Al Muttaqin",
        audio_url: JINGLE_URL,
        elapsed_seconds: currentSecond,
        type: "jingle",
        allSchedules: cachedSchedules
      }, { headers: getSecureHeaders() });
    }

    // =================================================================
    // B. JALUR CADANGAN (PRISMA DATABASE ENGINE LAMA)
    // =================================================================
    const currentTrack = await prisma.radioStream.findFirst({
      orderBy: {
        start_time: "desc",
      },
    });

    // =================================================================
    // C. JIKA TIDAK ADA JADWAL UTAMA SAMA SEKALI, PUTAR FILLER
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
        allSchedules: cachedSchedules
      }, { headers: getSecureHeaders() });
    }

    const startTime = new Date(currentTrack.start_time).getTime();
    const nowTimestamp = Date.now();
    const elapsedSeconds = (nowTimestamp - startTime) / 1000;
    const allowedDuration = currentTrack.duration;

    // =================================================================
    // D. JIKA AUDIO UTAMA MELEBIHI JATAH SLOT / SELESAI -> FILLER SEAMLESS
    // =================================================================
    if (elapsedSeconds >= allowedDuration) {
      const gapSeconds = elapsedSeconds - allowedDuration;
      const totalTimelineSeconds = Math.floor(startTime / 1000) + allowedDuration + gapSeconds;
      
      const currentFiller = getVirtualFillerTrack(totalTimelineSeconds);

      return NextResponse.json({
        active: true,
        title: currentFiller.title,
        program_title: "Audio Cadangan (Jeda)",
        audio_url: currentFiller.audio_url,
        elapsed_seconds: currentFiller.elapsed_seconds,
        type: "filler",
        allSchedules: cachedSchedules
      }, { headers: getSecureHeaders() });
    }

    // =================================================================
    // E. KONDISI NORMAL (MP3 PRISMA UTAMA SEDANG BERJALAN)
    // =================================================================
    return NextResponse.json({
      active: true,
      title: titleFromAudioUrl(currentTrack.audio_url, currentTrack.title),
      program_title: currentTrack.title,
      audio_url: currentTrack.audio_url,
      elapsed_seconds: elapsedSeconds,
      type: "main",
      allSchedules: cachedSchedules
    }, { headers: getSecureHeaders() });

  } catch (error: any) {
    console.error("Gagal membuat get-current-radio emergency block:", error);
    const fallbackSeconds = Math.floor(Date.now() / 1000);
    const emergencyFiller = getVirtualFillerTrack(fallbackSeconds);
    return NextResponse.json({
      active: true,
      title: emergencyFiller.title,
      program_title: "Audio Cadangan (Emergency)",
      audio_url: emergencyFiller.audio_url,
      elapsed_seconds: emergencyFiller.elapsed_seconds,
      type: "fallback",
      allSchedules: cachedSchedules
    }, { headers: getSecureHeaders() });
  }
}