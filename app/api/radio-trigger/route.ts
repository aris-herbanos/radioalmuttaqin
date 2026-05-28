// app/api/radio-trigger/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Sesuaikan dengan path instance prisma antum

export async function POST(req: Request) {
  try {
    const { title, mp3_url, duration_seconds } = await req.json();

    if (!title || !mp3_url || !duration_seconds) {
      return NextResponse.json({ success: false, error: "Data tidak lengkap" }, { status: 400 });
    }

    // Bersihkan track lama, masukkan program terjadwal yang baru
    await prisma.radioStream.deleteMany({});
    
    await prisma.radioStream.create({
      data: {
        title: title,
        audio_url: mp3_url,
        start_time: new Date(), // Detik mulai dihitung SEKARANG secara serempak
        duration: parseInt(duration_seconds)
      }
    });

    return NextResponse.json({ success: true, message: `Program ${title} berhasil mengudara!` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}