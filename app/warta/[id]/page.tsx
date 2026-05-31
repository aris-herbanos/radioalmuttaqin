"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  Loader2, 
  Calendar, 
  User, 
  MessageSquare, 
  ArrowLeft, 
  Send, 
  LogOut, 
  Clock,
  Share2,
  ChevronRight
} from "lucide-react";

interface Comment {
  id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  created_at: string;
  user_id: string;
}

export default function DetailWartaPage() {
  const { id } = useParams();
  const router = useRouter();

  // State Berita Blogger
  const [post, setPost] = useState<any>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [errorPost, setErrorPost] = useState<string | null>(null);

  // State Supabase Auth & Komentar
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (!id) return;

    // 1. Ambil Data Detail Artikel dari Blogger API
    async function fetchDetailPost() {
      const apiKey = process.env.NEXT_PUBLIC_BLOGGER_API_KEY;
      const blogId = process.env.NEXT_PUBLIC_BLOGGER_BLOG_ID;

      try {
        const res = await fetch(
          `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${id}?key=${apiKey}`
        );
        if (!res.ok) throw new Error("Artikel tidak ditemukan atau sudah dihapus dari Blogger.");
        const data = await res.json();
        setPost(data);
      } catch (err: any) {
        console.error("💥 Error Detail Fetch:", err);
        setErrorPost(err.message || "Gagal memuat detail artikel.");
      } finally {
        setLoadingPost(false);
      }
    }

    // 2. Ambil Data Komentar dari Supabase
    async function fetchComments() {
      try {
        const { data, error } = await supabase
          .from("comments")
          .select("*")
          .eq("post_id", id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setComments(data || []);
      } catch (err: any) {
        console.error("💥 Gagal memuat komentar Supabase:", err.message);
      }
    }

    // 3. Cek Status Login Sesi User Saat Ini
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    fetchDetailPost();
    fetchComments();

    return () => subscription.unsubscribe();
  }, [id]);

  // Fungsi Kirim Komentar Baru ke Supabase
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmittingComment(true);

    const commentPayload = {
      post_id: id,
      user_id: user.id,
      user_name: user.user_metadata.full_name || user.user_metadata.name || "Jemaah Anonim",
      user_avatar: user.user_metadata.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      content: newComment.trim(),
    };

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert([commentPayload])
        .select();

      if (error) throw error;

      if (data) {
        setComments([...comments, data[0]]);
        setNewComment("");
      }
    } catch (err: any) {
      alert("Gagal mengirim komentar: " + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Fungsi Log Out Akun Jemaah
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (loadingPost) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-orange-600" size={36} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Memuat Artikel Liputan Al Muttaqin...</p>
      </div>
    );
  }

  if (errorPost || !post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl max-w-md">
          <p className="text-red-500 font-black uppercase text-xs tracking-wider mb-4">💥 ERROR TERJADI</p>
          <p className="text-slate-600 text-sm font-medium mb-6 leading-relaxed">{errorPost}</p>
          <button onClick={() => router.push("/warta")} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Kembali ke Warta
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-left font-sans text-slate-900 antialiased pb-24">
      
      {/* BREADCRUMBS (Remah Roti) */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Link href="/" className="hover:text-orange-600 transition-colors">Home</Link>
          <ChevronRight size={12} strokeWidth={3} />
          <Link href="/warta" className="hover:text-orange-600 transition-colors text-orange-600">Warta Pondok</Link>
        </nav>
      </div>

      {/* TWO-COLUMN MAIN LAYOUT GRID */}
      <div className="max-w-6xl mx-auto px-4 pt-4 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* KOLOM KIRI: KONTEN UTAMA ARTIKEL & KOMENTAR */}
        <article className="lg:col-span-2">
          
          {/* Judul Besar Utama */}
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            {post.title}
          </h1>

          {/* Sub-headline / Ringkasan Berita Singkat */}
          <p className="text-sm md:text-base text-slate-500 mb-6 font-medium leading-relaxed">
            Informasi terkini dan terpercaya mengenai aktivitas warta pondok pesantren yang dirangkum langsung oleh tim Media Center.
          </p>

          {/* Metadata Penulis & Tanggal Rilis */}
          <div className="flex flex-wrap items-center justify-between border-y border-slate-100 py-3 mb-6 text-slate-500 text-xs gap-4">
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Oleh</span>
                <span className="text-blue-600 font-bold hover:underline cursor-pointer">
                  {post.author?.displayName || "Admin Media Center"}
                </span>
              </div>
              <div className="text-slate-300 hidden sm:inline">|</div>
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Calendar size={13} className="text-slate-400" />
                <span>Diterbitkan {new Date(post.published).toLocaleDateString("id-ID", { dateStyle: "long" })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Clock size={13} />
                <span>{new Date(post.published).toLocaleTimeString("id-ID", { hour: '2-digit', minute:'2-digit' })} WIB</span>
              </div>
            </div>

            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Tautan artikel berhasil disalin!");
              }}
              className="text-slate-400 hover:text-orange-600 border border-slate-200 hover:border-orange-200 px-3 py-1 rounded-full transition-all flex items-center gap-1.5 bg-slate-50"
              title="Bagikan Tautan"
            >
              <Share2 size={13} /> <span className="uppercase text-[10px] font-bold tracking-wider">Bagikan</span>
            </button>
          </div>

          {/* ISI ARTIKEL HTML UTAMA */}
          <div 
            className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-base font-normal
              prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
              prose-p:mb-5 prose-p:leading-relaxed text-justify
              prose-img:rounded-xl prose-img:shadow-md prose-img:my-6 prose-img:mx-auto
              prose-a:text-orange-600 prose-a:font-semibold hover:prose-a:text-slate-900"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* SEKTOR RUANG DISKUSI JEMAAH */}
          <section className="mt-14 pt-10 border-t border-slate-100">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-6">
              <MessageSquare size={18} className="text-orange-600" /> Ruang Diskusi ({comments.length})
            </h3>

            {/* BOX KOORDINASI AUTENTIKASI */}
            {!user ? (
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center mb-6">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-3">
                  Mau ikut memberikan tanggapan atau berdiskusi?
                </p>
                <Link
                  href="/login"
                  className="inline-flex bg-slate-900 hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  Masuk Menggunakan Google / GitHub
                </Link>
              </div>
            ) : (
              <div className="bg-orange-50/40 border border-orange-100/50 p-4 rounded-xl flex items-center justify-between mb-6 text-xs font-bold">
                <div className="flex items-center gap-2.5">
                  <img src={user.user_metadata.avatar_url} alt="" className="w-6 h-6 rounded-full border border-white shadow-sm" />
                  <span className="text-slate-700">Masuk sebagai: <span className="text-orange-700">{user.user_metadata.full_name || user.user_metadata.name}</span></span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 uppercase text-[10px] tracking-widest font-black"
                >
                  <LogOut size={12} /> Keluar
                </button>
              </div>
            )}

            {/* FORM INPUT TULIS KOMENTAR */}
            {user && (
              <form onSubmit={handleSendComment} className="mb-8 space-y-3">
                <textarea
                  rows={3}
                  required
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Tuliskan masukan atau komentar yang santun di sini..."
                  className="w-full border border-slate-200 p-4 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all bg-white text-slate-800"
                />
                <div className="text-right">
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="bg-orange-600 hover:bg-slate-900 text-white font-bold uppercase tracking-widest text-[10px] px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 ml-auto disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {submittingComment ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    {submittingComment ? "Mengirim..." : "Kirim Komentar"}
                  </button>
                </div>
              </form>
            )}

            {/* RENDERING FEED KOTAK DAFTAR KOMENTAR */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-slate-400 text-xs italic font-medium text-center py-8 border border-dashed border-slate-200 rounded-xl">
                  Belum ada tanggapan pada warta ini. Jadilah yang pertama memberikan komentar!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex gap-3">
                    <img 
                      src={comment.user_avatar} 
                      alt={comment.user_name} 
                      className="w-8 h-8 rounded-full bg-slate-50 object-cover shrink-0" 
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{comment.user_name}</h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {new Date(comment.created_at).toLocaleDateString("id-ID", { dateStyle: "short" })}
                        </span>
                      </div>
                      <p className="text-slate-700 text-sm font-medium leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </article>

        {/* KOLOM KANAN: SIDEBAR POPULER & TERKINI */}
        <aside className="lg:col-span-1 space-y-8 sticky top-6">
          
          {/* SEKSI 1: TOPIK POPULER */}
          <div className="bg-white rounded-xl p-2">
            <h3 className="text-orange-600 font-extrabold text-xs uppercase tracking-wider mb-3">
              Topik Populer
            </h3>
            <ul className="space-y-2">
              {["KAJIAN_UTAMA", "IDUL_ADHA_1447H", "BURSA_SANTRI", "INFO_PONDOK"].map((topic, idx) => (
                <li key={idx} className="border-b border-slate-100 pb-2 flex items-center gap-2 last:border-0">
                  <span className="text-orange-500 font-extrabold text-sm">#</span>
                  <span className="text-slate-800 font-bold text-xs uppercase tracking-wide hover:text-orange-600 cursor-pointer transition-colors">
                    {topic}
                  </span>
                  {idx === 0 && (
                    <span className="w-3.5 h-3.5 bg-green-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
                      ✓
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* SEKSI 2: LIST ARTIKEL POPULER */}
          <div className="bg-white rounded-xl p-2">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-slate-900 font-black text-sm uppercase tracking-tight">
                Populer
              </h3>
              <Link href="/warta" className="text-orange-600 text-[10px] font-bold hover:underline flex items-center gap-0.5 uppercase">
                Lihat Semua <ChevronRight size={10} strokeWidth={3} />
              </Link>
            </div>
            
            {/* Headline Banner Populer #1 */}
            <div className="relative rounded-xl overflow-hidden mb-4 group cursor-pointer shadow-sm">
              <img 
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80" 
                alt="Warta Utama" 
                className="w-full h-36 object-cover group-hover:scale-103 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent p-3 flex flex-col justify-end">
                <span className="text-[9px] font-black text-orange-400 uppercase tracking-wider mb-1">SAHAM / WARTA</span>
                <p className="text-white font-bold text-xs line-clamp-2 leading-snug">
                  IHSG Sepekan Turun 0,56%, Rebalancing MSCI hingga Dampak Global
                </p>
              </div>
            </div>

            {/* List Item Populer (2 - 5) */}
            <div className="space-y-3.5">
              {[
                { cat: "SAHAM", title: "Daftar 10 Saham Top Gainers Sepekan, Ada BREN, GULA, BBHI hingga..." },
                { cat: "SAHAM", title: "Bursa Masukkan Saham TCPI Kategori Kepemilikan Saham Terkonsentrasi" },
                { cat: "SAHAM", title: "Daftar 10 Saham Top Losers pada Pekan Akhir Mei 2026" },
                { cat: "PONDOK", title: "DOID Raup Pendapatan USD 318 Juta di Kuartal I 2026" }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <span className="text-4xl font-black text-slate-400 tracking-tighter leading-none w-7 text-center shrink-0">
                    {idx + 2}
                  </span>
                  <div className="space-y-0.5 flex-1">
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest block">
                      {item.cat}
                    </span>
                    <p className="text-slate-800 font-bold text-xs leading-snug line-clamp-2 hover:text-orange-600 cursor-pointer transition-colors">
                      {item.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEKSI 3: BERITA TERKINI */}
          <div className="bg-white rounded-xl p-2">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-slate-900 font-black text-sm uppercase tracking-tight">
                Berita Terkini
              </h3>
              <Link href="/warta" className="text-orange-600 text-[10px] font-bold hover:underline flex items-center gap-0.5 uppercase">
                Lihat Semua <ChevronRight size={10} strokeWidth={3} />
              </Link>
            </div>

            {/* Big Thumbnail Berita Terkini Utama */}
            <div className="mb-4 group cursor-pointer">
              <img 
                src="https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=500&q=80" 
                alt="WHO Vape" 
                className="w-full h-40 object-cover rounded-xl mb-2 shadow-xs group-hover:opacity-90 transition-opacity"
              />
              <h4 className="text-slate-900 font-extrabold text-xs md:text-sm leading-snug hover:text-orange-600 transition-colors">
                WHO Soroti Makin Banyak Remaja Indonesia Pakai Vape
              </h4>
            </div>

            {/* Sub-list Terkini Kecil */}
            <div className="space-y-3">
              {[
                { img: "https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&w=100&h=100&q=80", title: "Kapan Mulai dan Berakhirnya Gema Takbir Idul Adha 2026?" },
                { img: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=100&h=100&q=80", title: "8 Tanaman Dapur yang Bisa Dipanen Berkali-kali di Rumah" },
                { img: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=100&h=100&q=80", title: "Harga Kripto Hari Ini 31 Mei 2026: Bitcoin Menguat Tajam" },
                { img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=100&h=100&q=80", title: "Uni Eropa Sebut Hubungan Perdagangan dengan China Memanas" }
              ].map((news, idx) => (
                <div key={idx} className="flex gap-3 items-center border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                  <img 
                    src={news.img} 
                    alt="" 
                    className="w-14 h-11 object-cover rounded-lg bg-slate-100 shrink-0 shadow-2xs"
                  />
                  <h5 className="text-slate-800 font-bold text-xs leading-snug line-clamp-2 hover:text-orange-600 cursor-pointer transition-colors">
                    {news.title}
                  </h5>
                </div>
              ))}
            </div>
          </div>

        </aside>

      </div>
    </main>
  );
}