import type { Metadata, Viewport } from "next";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LivePlayer from "@/components/LivePlayer";
import { Providers } from "@/components/Providers";

/* =================================================================
   1. VIEWPORT CONFIG (Dioptimalkan untuk PWA Standalone & Notch HP)
   ================================================================= */
export const viewport: Viewport = {
  themeColor: "#059669", // Disamakan dengan theme_color di manifest.json (#059669)
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Diizinkan zoom untuk aksesibilitas, tetapi tetap ramah UI PWA
  viewportFit: "cover", // Memaksimalkan tampilan PWA melewati batas notch layar ponsel
};

/* =================================================================
   2. SEO MASTER & PWA CONFIGURATION (OFFICIAL DOMAIN UPDATE)
   ================================================================= */
export const metadata: Metadata = {
  // 1. DIUBAH KE DOMAIN BARU (Sangat penting untuk generate sitemap & link kanonikal otomatis)
  metadataBase: new URL("https://radioalmuttaqin.com"), 
  manifest: "/manifest.json", 
  
  title: {
    default: "Radio Suara Al Muttaqin Jepara | Menginspirasi Hati Menguatkan Iman",
    template: "%s | Radio Suara Al Muttaqin Jepara",
  },
  description:
    "Radio dakwah resmi Pondok Pesantren Islam Al Muttaqin Jepara. Menyiarkan live streaming kajian Islam 24 jam, materi khutbah Jum'at tematik, serta warta Baitul Maal.",
  
  keywords: [
    "Radio Suara Al Muttaqin",
    "Pondok Pesantren Islam Al Muttaqin Jepara",
    "Radio Dakwah Jepara",
    "Materi Khutbah Jum'at Tematik",
    "Baitul Maal Al Muttaqin",
    "Kajian Islam Online",
    "Dakwah Sunnah Jawa Tengah",
    "Streaming Radio Islam Jepara",
    "Murottal Al-Quran Online",
  ],
  
  authors: [{ name: "Radio Suara Al Muttaqin", url: "https://radioalmuttaqin.com" }],
  creator: "Radio Suara Al Muttaqin",
  publisher: "Pondok Pesantren Islam Al Muttaqin Jepara",
  category: "Religious Radio & Education",

  alternates: {
    canonical: "/",
    languages: {
      "id-ID": "/id-ID",
    },
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Suara Al Muttaqin",
    startupImage: [
      {
        url: "/og-image.jpg",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/icon-512.png",
      },
    ],
  },

  // OpenGraph (DIUBAH KE DOMAIN BARU agar share link ke WA/FB tidak pecah)
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://radioalmuttaqin.com", 
    siteName: "Radio Suara Al Muttaqin Jepara",
    title: "Radio Suara Al Muttaqin Jepara - Menginspirasi Hati, Menguatkan Iman",
    description:
      "Streaming radio dakwah 24 jam dan pusat warta serta materi khutbah Pondok Pesantren Islam Al Muttaqin Jepara.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Radio Suara Al Muttaqin Jepara",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Radio Suara Al Muttaqin Jepara",
    description: "Streaming radio dakwah dan informasi program Pondok Pesantren Al Muttaqin.",
    images: ["/og-image.jpg"],
  },

  verification: {
    google: "kode-verifikasi-google-anda", 
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

/* =================================================================
   3. ROOT LAYOUT INTERFACE
   ================================================================= */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className="bg-slate-50 text-slate-900 antialiased font-sans selection:bg-emerald-100 selection:text-emerald-900">
        
        {/* ✅ Wrapper Global Providers (Audio State & Session) */}
        <Providers>
          <div className="flex flex-col min-h-screen">
            
            {/* NAVBAR (Header) */}
            <header className="fixed top-0 left-0 w-full z-50">
              <Navbar />
            </header>

            {/* CONTENT AREA */}
            <main className="flex-grow pt-24 md:pt-28">
              {children}
            </main>

            {/* FOOTER */}
            <Footer />

            {/* LIVE RADIO PLAYER (Tetap Berjalan Global Saat Pindah Halaman) */}
            <LivePlayer />

          </div>
        </Providers>

      </body>
    </html>
  );
}