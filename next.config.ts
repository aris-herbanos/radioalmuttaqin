import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  /* =========================================================================
      🛡️ BENTENG DEFLEKSI ABSOLUT: DIRECT REDIRECT (ANTI-BONCOS BANDWIDTH VERCEL)
     ========================================================================= */
  async redirects() {
    return [
      {
        source: "/radio/stream.php",
        // 🟢 MENGUSIR REQUEST BINER AUDIO LANGSUNG KE BACKEND HAWKHOST ANTUM, FAL!
        // Ganti 'https://domain-laravel-hawkhost-antum.com' dengan url domain Laravel asli antum.
        destination: "https://ybmsaum.com/radio/stream.php",
        permanent: true, // Mengembalikan status 308 (Permanent Redirect) agar browser & Radio Garden kapok gedor Vercel
      },
    ];
  },

  /* =========================
      IMAGE CONFIG (The "Visa")
     ========================= */
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // ✅ Foto Profil Google
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com", // ✅ Foto Profil Facebook
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co", // ✅ Storage Supabase
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com", // ✅ Cloudinary
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // ✅ Cadangan GitHub
        pathname: "/**",
      },
    ],
  },

  /* =========================
      PERFORMANCE & TOOLS
     ========================= */
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Konfigurasi Turbopack untuk Next.js 16
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  /* =========================
      SECURITY HEADERS
     ========================= */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;