"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, BookOpen, Calendar, ArrowRight, Newspaper } from "lucide-react";

export default function WartaJemaahPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBloggerPosts() {
      const apiKey = process.env.NEXT_PUBLIC_BLOGGER_API_KEY;
      const blogId = process.env.NEXT_PUBLIC_BLOGGER_BLOG_ID;

      if (!apiKey || !blogId) {
        setError("Missing API Key atau Blog ID di file .env antum, Fal!");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=12`
        );

        if (!res.ok) {
          const rawErrorText = await res.text();
          console.error("💥 Detail JSON Error Google:", rawErrorText);
          throw new Error(
            `Google API Error (Status: ${res.status}). Pastikan Blog ID benar, API Key aktif, dan setelan blog tidak Private!`
          );
        }

        const data = await res.json();
        setPosts(data.items || []);
      } catch (err: any) {
        console.error("💥 Error Blogger Fetch:", err);
        setError(err.message || "Gagal memuat berita.");
      } finally {
        setLoading(false);
      }
    }

    fetchBloggerPosts();
  }, []);

  const extractFirstImage = (htmlContent: string) => {
    const match = htmlContent.match(/<img[^>]+src="([^">]+)"/);
    return match ? match[1] : null;
  };

  const cleanSnippet = (htmlContent: string) => {
    return htmlContent
      .replace(/<[^>]*>/g, "")
      .substring(0, 100) + "...";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-orange-500" size={36} />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
          Memperbarui Berita Utama...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24 pt-8 text-left font-sans antialiased">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* HEADER PORTAL ALA LIPUTAN6 */}
        <div className="border-b border-slate-200 pb-5 mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-orange-500 text-white text-[10px] font-black uppercase px-2.5 py-1 tracking-wider rounded mb-3">
              <Newspaper size={12} /> Live Update
            </div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight md:text-4xl">
              Warta <span className="text-orange-500">Pondok</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Sinergi Informasi Suara Al Muttaqin Purwokerto
            </p>
          </div>
          <div className="text-xs text-slate-500 font-semibold border-l-2 border-orange-500 pl-3 bg-slate-100/60 py-1.5 px-3 rounded-r hidden md:block">
            {new Date().toLocaleDateString("id-ID", { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded shadow-sm mb-8">
            {error}
          </div>
        )}

        {/* UTAMA / GRID BERITA */}
        {posts.length === 0 && !error ? (
          <div className="bg-white border border-slate-200 rounded-xl py-24 text-center shadow-sm">
            <BookOpen className="mx-auto text-slate-300 mb-3" size={44} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Belum ada warta terbaru yang diterbitkan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const coverImage = extractFirstImage(post.content);
              return (
                <article 
                  key={post.id} 
                  className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group"
                >
                  
                  {/* Thumbnail Berita */}
                  <div className="w-full aspect-[16/10] bg-slate-100 overflow-hidden relative">
                    <span className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                      Kabar Jemaah
                    </span>
                    {coverImage ? (
                      <img 
                        src={coverImage} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <BookOpen size={36} />
                      </div>
                    )}
                  </div>

                  {/* Konten Berita */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                        <Calendar size={13} className="text-orange-500" />
                        {new Date(post.published).toLocaleDateString("id-ID", { 
                          dateStyle: "medium" 
                        })}
                      </div>
                      
                      <h2 className="text-base font-bold text-slate-900 group-hover:text-orange-500 transition-colors duration-200 tracking-tight leading-snug line-clamp-2">
                        <Link href={`/blog/${post.id}`}>
                          {post.title}
                        </Link>
                      </h2>
                      
                      <p className="text-slate-600 text-xs font-normal leading-relaxed line-clamp-3">
                        {cleanSnippet(post.content)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Link 
                        href={`/blog/${post.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-500 group-hover:text-orange-600 transition-colors uppercase tracking-wider"
                      >
                        Lihat Detail <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>

                </article>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}