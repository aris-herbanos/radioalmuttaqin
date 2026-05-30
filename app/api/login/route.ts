import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Menggunakan instance default sesuai perbaikan sebelumnya
import bcrypt from "bcryptjs";
import { SignJWT } from "jose"; // Memanfaatkan library jose untuk enkripsi cookie session
import { cookies } from "next/headers";

// 🟢 MANTRA KEAMANAN NEXT.JS: Mencegah pembekuan statis rute API otentikasi pas build Vercel
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Inisialisasi variabel penampung data admin
    let adminId = "";
    let adminEmail = "";
    let adminRole = "admin";

    // 🚀 BYPASS JALUR UTAMA: Jika kredensial cocok, langsung loloskan tanpa menyentuh tabel database
    if (email === "admin@radio.com" && password === "password123") {
      adminId = "admin-darurat-uuid-sah";
      adminEmail = "admin@radio.com";
      adminRole = "admin";
    } else {
      // Jika yang login bukan akun admin@radio.com, baru jalankan pengecekan database biasa
      // Menggunakan try-catch internal agar tidak merusak siklus respon utama
      try {
        const dbAdmin = await prisma.admin.findUnique({
          where: { email },
        });

        if (!dbAdmin) {
          return NextResponse.json({ error: "Admin tidak ditemukan" }, { status: 401 });
        }

        const valid = await bcrypt.compare(password, dbAdmin.password);
        if (!valid) {
          return NextResponse.json({ error: "Password salah" }, { status: 401 });
        }

        adminId = dbAdmin.id;
        adminEmail = dbAdmin.email;
        adminRole = dbAdmin.role;
      } catch (dbError) {
        console.error("💥 Database Supabase sibuk/error:", dbError);
        return NextResponse.json({ error: "Koneksi database terputus, gunakan akun utama" }, { status: 500 });
      }
    }

    // --- LOGIKA EMAS: BUAT TOKEN SESSION (SAMA SEPERTI SETELAN ASLI) ---
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "rsm-secret-key-123");
    const token = await new SignJWT({ id: adminId, email: adminEmail, role: adminRole })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h") // Token hangus dalam 2 jam
      .sign(secret);

    // Simpan di Cookie browser secara aman (HttpOnly) agar dikenali oleh Middleware admin antum
    const cookieStore = await cookies();
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2, // 2 jam
      path: "/",
    });

    return NextResponse.json({ success: true, message: "Selamat Datang Admin!" });
  } catch (error) {
    console.error("LOGIN ERROR UTAMA:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}