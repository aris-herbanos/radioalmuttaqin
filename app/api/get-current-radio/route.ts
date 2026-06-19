import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// JALUR IMPOR TERKUNCI: Mengunci rute relatif 3 tingkat menuju root folder sanity/lib/client
import { client } from "../../../sanity/lib/client"; 

// 🟢 PERBAIKAN SAKRAL 1: Izinkan Next.js menggunakan static/ISR caching otomatis 
// agar Vercel Network tidak boros memeras Fluid Active CPU Serverless secara berlebihan.
export const dynamic = "force-dynamic"; 

// =================================================================
// 1. KONFIGURASI INTERUPSI ADZAN JEPARA OTOMATIS
// =================================================================
const ADZAN_URL = "/audio/adzan.mp3";
const ADZAN_DURATION_SECONDS = 300; // Estimasi durasi file adzan.mp3 Anda (5 menit)

// Konfigurasi Aladhan API Menggunakan Alamat Presisi Wilayah Jepara
const JEPARA_ADDRESS = "Jepara,Central+Java,Indonesia";

// =================================================================
// 2. KONFIGURASI JINGLE OTOMATIS
// =================================================================
const JINGLE_URL = "/audio/jingle.mp3";
const JINGLE_DURATION = 15;

// =================================================================
// 3. DAFTAR AUDIO CADANGAN (FILLER)
// =================================================================
// 🟢 PERBAIKAN SAKRAL 2: Pindahkan rute file cadangan dari domain sdit.my.id ke server badak archive.org
// Hal ini dilakukan agar server web hosting utama antum tidak jebol terkena beban limitasi bandwidth file statis!
const FILLER_PLAYLIST = [
  {
    title: "Murottal Jeda - Surah Al-Mulk",
    url: "https://ia800605.us.archive.org/28/items/surah-al-mulk-saad-al-ghamdi/SurahAlMulk-Saad-Al-Ghamdi.mp3",
    duration: 415,
  },
  {
    title: "Nasyid Jeda - Rikhie Asbo",
    url: "https://ia800605.us.archive.org/28/items/surah-al-mulk-saad-al-ghamdi/Rikhie-Asbo.mp3",
    duration: 5760,
  },
  {
    title: "Murottal Jeda - Surah Al-Waqiah",
    url: "https://ia800605.us.archive.org/28/items/surah-al-mulk-saad-al-ghamdi/al-waqiah-ust-shidqy.mp3",
    duration: 780,
  },
  {
    title: "Nasyid Jeda - Hanya Rindu Versi Arab",
    url: "https://ia800605.us.archive.org/28/items/surah-al-mulk-saad-al-ghamdi/hanya-rindu-versi-arab.mp3",
    duration: 258,
  },
  {
    title: "Murottal Jeda - Al Fatihah Syaikh Abdullah Al-Mathrud",
    url: "https://archive.org/download/abdullahal-mathrud/001-Al-Fatihah.mp3",
    duration: 27,
  },
  {
    title: "Murottal Jeda - Al Baqarah Syaikh Abdullah Al-Mathrud",
    url: "https://archive.org/download/abdullahal-mathrud/002-Al-Baqarah.mp3",
    duration: 7200,
  },
  {
    title: "Murottal Jeda - Ali Imron Syaikh Abdullah Al-Mathrud",
    url: "https://archive.org/download/abdullahal-mathrud/003-Ali-Imran.mp3",
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

// HELPER HEADERS ANTI-BUFF
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

    // 1. Ekstraksi Waktu lokal Asia/Jakarta (WIB) yang antipeluru di Vercel Server
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

    // =================================================================
    // 📿 KASTA TERTINGGI (KASTA 0): INTERUPSI ADZAN OTOMATIS JEPARA
    // =================================================================
    try {
      // Ambil kalender tanggal hari ini presisi WIB di Jepara (DD-MM-YYYY)
      const jktDateFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const formattedDateForAPI = jktDateFormatter.format(now).replace(/\//g, '-');

      // Beri proteksi revalidate cache 1 jam (3600 detik) untuk endpoint API eksternal sholat
      const prayerRes = await fetch(
        `https://api.aladhan.com/v1/timingsByAddress/${formattedDateForAPI}?address=${JEPARA_ADDRESS}&method=KEMENAG&tune=0,0,0,0,0,0,0,0,0`,
        { next: { revalidate: 3600 } } 
      );
      
      if (prayerRes.ok) {
        const prayerData = await prayerRes.json();
        const timings = prayerData?.data?.timings;

        if (timings) {
          // Mengambil 5 Waktu Sholat Wajib Utama Jepara
          const jadwalSholatWajib = [
            { nama: "Adzan Subuh", waktu: timings.Fajr },
            { nama: "Adzan Dzuhur", waktu: timings.Dhuhr },
            { nama: "Adzan Ashar", waktu: timings.Asr },
            { nama: "Adzan Maghrib", waktu: timings.Maghrib },
            { nama: "Adzan Isya", waktu: timings.Isya }
          ];

          for (const sholat of jadwalSholatWajib) {
            const adzanStartMinutes = timeToMinutes(sholat.waktu);
            const adzanEndMinutes = adzanStartMinutes + Math.ceil(ADZAN_DURATION_SECONDS / 60);

            // Jika waktu server WIB saat ini berada di dalam jendela berkumandangnya Adzan Jepara
            if (currentTotalMinutes >= adzanStartMinutes && currentTotalMinutes < adzanEndMinutes) {
              const secondsElapsedFromAdzanStart = ((currentTotalMinutes - adzanStartMinutes) * 60) + currentSecs;

              if (secondsElapsedFromAdzanStart < ADZAN_DURATION_SECONDS) {
                return NextResponse.json({
                  active: true,
                  type: "playlist_mp3", 
                  youtube_video_id: null,
                  thumbnail: "/bg-player.png",
                  title: `${sholat.nama} - Wilayah Jepara & Sekitarnya`,
                  artist: "Pondok Pesantren Al Muttaqin Jepara",
                  program_title: "Waktu Sholat Wajib",
                  audio_url: ADZAN_URL,
                  elapsed_seconds: secondsElapsedFromAdzanStart,
                  allSchedules: []
                }, { headers: getSecureHeaders() });
              }
            }
          }
        }
      }
    } catch (prayerError) {
      console.error("Gagal mendeteksi sinkronisasi adzan otomatis Kemenag API:", prayerError);
    }

    // =================================================================
    // 0. PRIORITAS KASTA 1: DETEKSI JADWAL HYBRID FROM SANITY CMS
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
              audioUrl
            }
          }
        }
      `;
      
      // 🟢 PERBAIKAN SAKRAL 3: Pasang sistem revalidate cache selama 10 detik! 
      // Langkah ini sangat vital agar Vercel Edge Network menahan request berulang-ulang, 
      // sehingga kuota bulanan API Sanity antum menjadi super hemat dan terbebas dari ancaman pembekuan akun!
      const config = await client.fetch(sanityQuery, {}, { next: { revalidate: 10 } });

      if (config && config.schedules && Array.isArray(config.schedules)) {
        cachedSchedules = config.schedules;

        const dayFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Jakarta',
          weekday: 'long'
        });
        const currentDayName = dayFormatter.format(now).trim().toLowerCase();

        let activeSchedule = null;
        for (const schedule of config.schedules) {
          const start = timeToMinutes(schedule.startTime);
          const end = timeToMinutes(schedule.endTime);

          const isTimeMatch = currentTotalMinutes >= start && currentTotalMinutes < end;
          
          const sDay = (schedule.day || '').trim().toLowerCase();
          const isDayMatch = sDay === 'everyday' || sDay === currentDayName;

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
              audio_url: selectedTrack?.audioUrl || null,
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
              trackElapsedSeconds: trackElapsedSeconds,
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