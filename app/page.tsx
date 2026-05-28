import prisma from "@/lib/prisma";
import Hero from "@/components/Hero";
import LiveSection from "@/components/LiveSection";
import InfoSection from "@/components/InfoSection"; 

// 1. Panggil komponen gabungan baru (Double Lane - Jadwal & Chat)
import RadioInteractionHub from "@/components/RadioInteractionHub";
// 2. Tetap panggil DonasiSection dari wrapper client
import { DonasiSection } from "@/components/ClientSections"; 

// Set ISR revalidation rate selama 60 detik
export const revalidate = 60; 

async function getLatestWarta() {
  try {
    return await prisma.info.findMany({
      where: { 
        // ✅ GANTI DISINI: Gunakan OR agar status "publish" atau "published" tetap kena gank
        OR: [
          { status: "published" },
          { status: "publish" }
        ],
        // ✅ PASTIKAN INI: Sesuai skema prisma terbaru antum, is_active bernilai true
        is_active: true 
      }, 
      orderBy: { created_at: "desc" },
      take: 4,
      // ✅ AMAN & COCOK: Memanggil field relasi 'category' yang terhubung ke InfoCategory
      include: { category: true }
    });
  } catch (error) {
    console.error("Gagal farming data warta:", error);
    return []; // Return array kosong jika database drop agar page tidak langsung crash (White Screen)
  }
}

export default async function Home() {
  const latestWarta = await getLatestWarta();

  return (
    <main className="relative min-h-screen bg-white">
      {/* 🚀 LAYER 1: Hero Banner & Player Utama */}
      <Hero />
      
      {/* 🚀 PLAYER UTAMA: Mengatur putar/stop radio beserta visualisator spektrum canvas neon */}
      <LiveSection />

      {/* 🚀 LAYER 2: Jadwal Siaran (Kiri) & Live Chat Komunitas (Kanan) */}
      {/* Sekarang bersih 100% tanpa membawa player dobel gundal-gandul lagi */}
      <RadioInteractionHub />

      {/* 🚀 LAYER 3: Warta/Berita Pondok Pesantren & Informasi Donasi */}
      <InfoSection articles={latestWarta} />
      
      <DonasiSection 
        bsi="7120202043" 
        bri="0022 01 028443 53 3"
        an="Baitul Maal Al Muttaqin"
      />
    </main>
  );
}