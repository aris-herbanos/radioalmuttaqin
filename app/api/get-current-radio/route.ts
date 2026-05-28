// app/api/get-current-radio/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const currentTrack = await prisma.radioStream.findFirst();

    if (!currentTrack) {
      return NextResponse.json({ active: false });
    }

    const startTime = new Date(currentTrack.start_time).getTime();
    const now = new Date().getTime();
    const elapsedSeconds = (now - startTime) / 1000;

    // Jika durasi audio sudah habis, berarti radio sedang kosong/silence
    if (elapsedSeconds >= currentTrack.duration) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      title: currentTrack.title,
      audio_url: currentTrack.audio_url,
      elapsed_seconds: elapsedSeconds
    });
  } catch (error: any) {
    return NextResponse.json({ active: false, error: error.message }, { status: 500 });
  }
}