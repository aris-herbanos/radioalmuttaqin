import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

// 🟢 MANTRA PENYELAMAT MUTLAK: Mengunci sitemap ke mode dinamis penuh 
// Supaya Turbopack meloloskan build-nya tanpa mencekik koneksi Supabase pas build time!
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://radioalmuttaqin.com";

  try {
    // Ambil semua daftar slug artikel dari database Supabase baru
    const articles = await prisma.info.findMany({
      where: {
        status: { in: ["publish", "published"] },
        is_active: true,
      },
      select: {
        slug: true,
        created_at: true,
      },
    });

    // Petakan halaman statis utama
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
      {
        url: `${baseUrl}/jadwal`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      },
    ];

    // Gabungkan dengan halaman blog dinamis dari database
    const dynamicPages: MetadataRoute.Sitemap = articles.map((art) => ({
      url: `${baseUrl}/blog/${art.slug}`,
      lastModified: new Date(art.created_at),
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [...staticPages, ...dynamicPages];

  } catch (error) {
    console.error("💥 Gagal merakit sitemap Next.js:", error);
    
    // Fallback darurat jika database sempat sibuk saat diakses bot agar build / runtime TIDAK CRASH
    return [
      { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
      { url: `${baseUrl}/jadwal`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
      { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    ];
  }
}