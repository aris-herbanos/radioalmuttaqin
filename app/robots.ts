import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    // 🟢 SINKRONISASI DOMAIN UTAMA: Mengarahkan mesin pencari langsung ke peta situs domain kustom produksi
    sitemap: "https://www.radioalmuttaqin.com/sitemap.xml",
  }
}