import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Mematikan cache statis Vercel secara total demi real-time penayangan

// Fungsi pembantu mengubah string "HH:MM" atau "HH.MM" menjadi total menit (Antipeluru)
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const cleanTime = timeStr.replace('.', ':');
  const [hours, minutes] = cleanTime.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export async function GET() {
  const now = new Date();
  let targetAudioUrl = '';
  let broadcastMode = 'playlist_mp3';
  let secondsSinceStarted = 0;

  try {
    const sanityQuery = `*[_type == "radioConfig"][0] {
      schedules[] {
        day,
        startTime,
        endTime,
        broadcastMode,
        playlist[] { "audioFileUrl": audioFile.asset->url }
      }
    }`;
    
    const config = await client.fetch(sanityQuery, {}, { cache: 'no-store' });

    if (config?.schedules && Array.isArray(config.schedules)) {
      // 1. Ekstraksi Waktu lokal Asia/Jakarta (WIB) presisi untuk serverless
      const timeFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
      const timeParts = timeFormatter.formatToParts(now);
      const currentHours = Number(timeParts.find(p => p.type === 'hour')?.value || 0);
      const currentMinutes = Number(timeParts.find(p => p.type === 'minute')?.value || 0);
      const currentSecs = Number(timeParts.find(p => p.type === 'second')?.value || 0);
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      // 2. Ambil nama hari WIB dan paksa menjadi huruf kecil total (contoh: "thursday")
      const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', weekday: 'long' });
      const currentDayName = dayFormatter.format(now).trim().toLowerCase(); 

      for (const schedule of config.schedules) {
        const start = timeToMinutes(schedule.startTime);
        const end = timeToMinutes(schedule.endTime);
        const isTimeMatch = currentTotalMinutes >= start && currentTotalMinutes < end;
        
        // 🟢 FIX UTAMA: Menyamakan huruf kecil nama hari dari Sanity agar pencocokan berhasil 100%
        const sDay = (schedule.day || '').trim().toLowerCase();
        const isDayMatch = sDay === 'everyday' || sDay === currentDayName;

        if (isTimeMatch && isDayMatch) {
          broadcastMode = schedule.broadcastMode;
          
          if (broadcastMode === 'playlist_mp3' && schedule.playlist?.length > 0) {
            const playlist = schedule.playlist;
            const totalSecondsTimeline = ((currentTotalMinutes - start) * 60) + currentSecs;
            
            const trackDuration = 3600; 
            const currentTrackIndex = Math.floor(totalSecondsTimeline / trackDuration) % playlist.length;
            
            targetAudioUrl = playlist[currentTrackIndex]?.audioFileUrl || '';
            secondsSinceStarted = totalSecondsTimeline % trackDuration;
          }
          break;
        }
      }
    }
  } catch (sanityError) {
    console.error('Sanity Error:', sanityError);
  }

  // OPER PARAMETER MATANG LANGSUNG KE CORE LARAVEL HAWKHOST
  const HAWKHOST_CORE_URL = `http://ybmsaum.com/radio/stream.php?mode=${broadcastMode}&stream_url=${encodeURIComponent(targetAudioUrl)}&current_seconds=${secondsSinceStarted}`;

  try {
    const response = await fetch(HAWKHOST_CORE_URL, {
      cache: 'no-store',
      headers: { 'Accept': 'audio/mpeg' },
    });

    if (!response.ok || !response.body) {
      return new NextResponse('Radio Offline (Hawkhost Unreachable)', { status: 503 });
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}