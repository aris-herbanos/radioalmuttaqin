// ✅ 1. ANTI-CACHE MUTLAK: Paksa API selalu ambil data terbaru dari Supabase
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    /**
     * ✅ 2. FIX MODEL NAME: 
     * Mengambil data dari skema model 'infoCategory' asli kita.
     */
    const categories = await prisma.infoCategory.findMany({
      orderBy: { 
        name: "asc" 
      },
    });

    // ✅ SAKELAR PENGAMAN 1: Jika tabel di Supabase baru masih kosong murni,
    // langsung suplai data cadangan lokal agar dropdown admin tidak membeku kosong!
    if (!categories || categories.length === 0) {
      return NextResponse.json(getFallbackCategories(), {
        status: 200,
        headers: getAntiCacheHeaders(),
      });
    }

    // ✅ 3. RETURN DATA ASLI SUPABASE: Pakai header Anti-Cache super ketat
    return NextResponse.json(categories, {
      status: 200,
      headers: getAntiCacheHeaders(),
    });
  } catch (error: any) {
    // Log error di terminal Vercel agar bisa dipantau jika ada kendala koneksi
    console.error("❌ API CATEGORY ERROR, BERALIH KE JALUR AMBULANS:", error.message);
    
    /**
     * ✅ SAKELAR PENGAMAN 2 (ANTI-FREEZE):
     * Kita balikkan data lokal dengan STATUS 200 (Bukan 500), agar frontend 
     * menganggap proses sukses, menghentikan teks loading, dan dropdown bisa dipilih!
     */
    return NextResponse.json(getFallbackCategories(), { 
      status: 200, 
      headers: getAntiCacheHeaders(),
    });
  }
}

// 🟩 FUNGSI DATA CADANGAN (Menyuplai dropdown jika Supabase baru kosong/error)
function getFallbackCategories() {
  return [
    { id: "fallback-cat-1", name: "Literasi", slug: "literasi" },
    { id: "fallback-cat-2", name: "Info Pondok", slug: "info-pondok" },
    { id: "fallback-cat-3", name: "Kajian", slug: "kajian" },
    { id: "fallback-cat-4", name: "Warta Utama", slug: "warta-utama" }
  ];
}

// 🟩 FUNGSI HEADER ANTI-CACHE
function getAntiCacheHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };
}