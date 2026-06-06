"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CommentSection from "@/components/CommentSection";
import {
  Loader2,
  Calendar,
  Clock,
  Share2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

type BloggerPost = {
  id: string;
  title: string;
  content?: string;
  url?: string;
  labels?: string[];
  published?: string;
  author?: {
    displayName?: string;
  };
};

const extractFirstImage = (htmlContent?: string) => {
  const match = htmlContent?.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
};

const extractSlugFromUrl = (url?: string) => {
  if (!url) return "";

  const parts = url.split("/");
  const lastPart = parts[parts.length - 1];

  return lastPart.replace(".html", "");
};

const getPostHref = (post: BloggerPost) => {
  const postSlug = extractSlugFromUrl(post.url) || post.id;
  return `/blog/${postSlug}`;
};

const getPostCategory = (post: BloggerPost) => {
  return post.labels?.[0] || "Artikel";
};

const normalizeBloggerContent = (htmlContent?: string) => {
  if (!htmlContent) return "";

  return htmlContent
    .replace(/<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, "")
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<span class="block h-3"></span>');
};

export default function DetailWartaPage() {
  const params = useParams();
  const router = useRouter();

  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const [post, setPost] = useState<BloggerPost | null>(null);
  const [bloggerPosts, setBloggerPosts] = useState<BloggerPost[]>([]);
  const [loadingPost, setLoadingPost] = useState(true);
  const [errorPost, setErrorPost] = useState<string | null>(null);

  useEffect(() => {
    const currentSlug = typeof slug === "string" ? slug : "";

    if (!currentSlug) {
      setErrorPost("Slug URL artikel tidak valid.");
      setLoadingPost(false);
      return;
    }

    async function fetchDetailPost() {
      const apiKey = process.env.NEXT_PUBLIC_BLOGGER_API_KEY;
      const blogId = process.env.NEXT_PUBLIC_BLOGGER_BLOG_ID;

      try {
        setLoadingPost(true);
        setErrorPost(null);

        if (!apiKey || !blogId) {
          throw new Error("Missing API Key atau Blog ID.");
        }

        const [detailRes, postsRes] = await Promise.all([
          fetch(
            `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/search?q=${encodeURIComponent(
              currentSlug
            )}&key=${apiKey}`
          ),
          fetch(
            `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=12`
          ),
        ]);

        if (!detailRes.ok) {
          throw new Error(
            "Artikel tidak ditemukan atau sudah dihapus dari Blogger."
          );
        }

        const detailData = await detailRes.json();
        const postsData = postsRes.ok ? await postsRes.json() : { items: [] };

        const matchedPost = detailData.items?.find((item: BloggerPost) => {
          return extractSlugFromUrl(item.url) === currentSlug;
        });

        if (!matchedPost) {
          throw new Error("Artikel dengan slug tersebut tidak ditemukan.");
        }

        setPost(matchedPost);
        setBloggerPosts(postsData.items || []);
      } catch (err: any) {
        console.error("Error Detail Fetch:", err);
        setErrorPost(err.message || "Gagal memuat detail artikel.");
      } finally {
        setLoadingPost(false);
      }
    }

    fetchDetailPost();
  }, [slug]);

  const otherPosts = useMemo(() => {
    return bloggerPosts.filter((item) => item.id !== post?.id);
  }, [bloggerPosts, post?.id]);

  const relatedPosts = useMemo(() => {
    const currentLabels = post?.labels || [];

    const sameLabelPosts = otherPosts.filter((item) =>
      item.labels?.some((label) => currentLabels.includes(label))
    );

    const fallbackPosts = otherPosts.filter(
      (item) => !sameLabelPosts.some((related) => related.id === item.id)
    );

    return [...sameLabelPosts, ...fallbackPosts].slice(0, 6);
  }, [otherPosts, post?.labels]);

  // --- MODIFIKASI DISINI: BIKIN WIDGET POPULER JADI RANDOM ---
  const popularPosts = useMemo(() => {
    if (otherPosts.length === 0) return [];
    
    // Melakukan kloning array agar tidak memutasi array asli, lalu diacak secara random
    return [...otherPosts]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  }, [otherPosts]);

  const latestPosts = otherPosts.slice(0, 5);

  const renderContentWithBacaJuga = (htmlContent: string) => {
    if (!htmlContent) return null;

    let splitIndex = -1;
    let currentPosP = 0;
    let pCount = 0;
    let lastPEnd = -1;

    while (pCount < 5) {
      const idx = htmlContent.indexOf("</p>", currentPosP);
      if (idx === -1) break;

      lastPEnd = idx;
      pCount++;
      currentPosP = idx + 4;
    }

    if (pCount === 5 && lastPEnd !== -1) {
      splitIndex = lastPEnd + 4;
    }

    if (splitIndex === -1) {
      return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    }

    const paragraphGroupOne = htmlContent.substring(0, splitIndex);
    const paragraphGroupTwo = htmlContent.substring(splitIndex);
    const targetLink = relatedPosts[1] || relatedPosts[0] || latestPosts[0];

    if (!targetLink) {
      return (
        <>
          <div dangerouslySetInnerHTML={{ __html: paragraphGroupOne }} />
          <div dangerouslySetInnerHTML={{ __html: paragraphGroupTwo }} />
        </>
      );
    }

    return (
      <>
        <div dangerouslySetInnerHTML={{ __html: paragraphGroupOne }} />

        <div className="my-6 p-5 bg-orange-50/50 border-l-4 border-orange-500 rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm not-prose">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">
              Baca Juga
            </span>

            <Link
              href={getPostHref(targetLink)}
              className="text-slate-900 font-extrabold text-sm sm:text-base hover:text-orange-600 transition-colors line-clamp-2 leading-snug"
            >
              {targetLink.title}
            </Link>
          </div>

          <Link
            href={getPostHref(targetLink)}
            className="text-orange-600 text-xs font-bold shrink-0 flex items-center gap-1 hover:underline uppercase tracking-wider"
          >
            Selengkapnya <ChevronRight size={14} strokeWidth={2.5} />
          </Link>
        </div>

        <div dangerouslySetInnerHTML={{ __html: paragraphGroupTwo }} />
      </>
    );
  };

  if (loadingPost) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-orange-600" size={36} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Memuat Artikel Liputan Al Muttaqin...
        </p>
      </div>
    );
  }

  if (errorPost || !post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl max-w-md">
          <p className="text-red-500 font-black uppercase text-xs tracking-wider mb-4">
            ERROR TERJADI
          </p>

          <p className="text-slate-600 text-sm font-medium mb-6 leading-relaxed">
            {errorPost}
          </p>

          <button
            onClick={() => router.push("/blog")}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} /> Kembali ke Blog
          </button>
        </div>
      </div>
    );
  }

  const contentHtml = normalizeBloggerContent(post.content);

  return (
    <main className="min-h-screen bg-white text-left font-sans text-slate-900 antialiased pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-2">
        <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          <Link
            href="/"
            className="text-slate-400 hover:text-orange-600 transition-colors"
          >
            Home
          </Link>

          <ChevronRight
            size={12}
            strokeWidth={3}
            className="text-slate-300 shrink-0"
          />

          <Link
            href="/blog"
            className="text-slate-400 hover:text-orange-600 transition-colors"
          >
            Blog Pondok
          </Link>

          {post.labels && post.labels.length > 0 && (
            <>
              <ChevronRight
                size={12}
                strokeWidth={3}
                className="text-slate-300 shrink-0"
              />

              <span className="text-orange-600 font-bold">
                {post.labels[0]}
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-3 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <article className="lg:col-span-2">
          <h1 className="text-2xl md:text-4xl font-extrabold text-zinc-700 tracking-tight leading-tight mb-4 text-left">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between border-y border-slate-100 py-3 mb-5 text-slate-500 text-xs gap-4">
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

                <span>
                  Diterbitkan{" "}
                  {post.published
                    ? new Date(post.published).toLocaleDateString("id-ID", {
                        dateStyle: "long",
                      })
                    : "-"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Clock size={13} />

                <span>
                  {post.published
                    ? new Date(post.published).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}{" "}
                  WIB
                </span>
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
              <Share2 size={13} />

              <span className="uppercase text-[10px] font-bold tracking-wider">
                Bagikan
              </span>
            </button>
          </div>

          <div
            className="prose prose-slate max-w-none text-slate-800 text-base font-normal text-left
              prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
              prose-p:mb-5 prose-p:leading-relaxed prose-p:text-left
              [&_p]:mb-5 [&_p]:leading-relaxed [&_p]:text-left
              [&_img]:aspect-video [&_img]:w-full [&_img]:object-cover [&_img]:rounded-xl [&_img]:shadow-md [&_img]:!my-3 [&_img]:mx-auto
              [&_.separator]:!my-3 [&_.separator]:!text-left
              [&_a]:break-words
              prose-a:text-orange-600 prose-a:font-semibold hover:prose-a:text-slate-900"
          >
            {renderContentWithBacaJuga(contentHtml)}
          </div>

          <CommentSection infoId={post.id} />

          {relatedPosts.length > 0 && (
            <div className="mt-16 pt-12 border-t border-slate-100">
              <h3 className="text-slate-900 font-black text-sm uppercase tracking-wider mb-6">
                Rekomendasi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                {relatedPosts.map((item) => (
                  <Link
                    href={getPostHref(item)}
                    key={item.id}
                    className="group block space-y-2.5"
                  >
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                      <img
                        src={extractFirstImage(item.content) || "/bg-player.png"}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/bg-player.png";
                        }}
                      />
                    </div>

                    <h4 className="text-slate-900 font-bold text-xs md:text-sm leading-snug line-clamp-3 group-hover:text-orange-600 transition-colors">
                      {item.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        <aside className="aside lg:col-span-1 space-y-8 sticky top-6">
          <div className="bg-white rounded-xl p-2">
            <h3 className="text-orange-600 font-extrabold text-xs uppercase tracking-wider mb-3">
              Topik Populer
            </h3>

            <ul className="space-y-2">
              {(post.labels && post.labels.length > 0
                ? post.labels
                : ["WARTA_PONDOK", "INFO_KAMPUS"]
              ).map((topic, idx) => (
                <li
                  key={`${topic}-${idx}`}
                  className="border-b border-slate-100 pb-2 flex items-center gap-2 last:border-0"
                >
                  <span className="text-orange-500 font-extrabold text-sm">
                    #
                  </span>

                  <span className="text-slate-800 font-bold text-xs uppercase tracking-wide hover:text-orange-600 cursor-pointer transition-colors">
                    {topic.replace(/\s+/g, "_")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {popularPosts.length > 0 && (
            <div className="bg-white rounded-xl p-2">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <h3 className="text-slate-900 font-black text-sm uppercase tracking-tight">
                  Populer
                </h3>

                <Link
                  href="/blog"
                  className="text-orange-600 text-[10px] font-bold hover:underline flex items-center gap-0.5 uppercase"
                >
                  Lihat Semua <ChevronRight size={10} strokeWidth={3} />
                </Link>
              </div>

              {popularPosts[0] && (
                <Link
                  href={getPostHref(popularPosts[0])}
                  className="relative w-full overflow-hidden rounded-xl mb-4 group cursor-pointer shadow-md block"
                >
                  <div className="relative w-full aspect-[16/9] bg-slate-100">
                    <img
                      src={
                        extractFirstImage(popularPosts[0].content) ||
                        "/bg-player.png"
                      }
                      alt={popularPosts[0].title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = "/bg-player.png";
                      }}
                    />
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent flex flex-col justify-end p-4">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider mb-1">
                      {getPostCategory(popularPosts[0])}
                    </span>

                    <p className="text-white font-bold text-sm leading-snug line-clamp-2">
                      {popularPosts[0].title}
                    </p>
                  </div>
                </Link>
              )}

              <div className="space-y-3.5">
                {popularPosts.slice(1, 5).map((item, idx) => (
                  <Link
                    href={getPostHref(item)}
                    key={item.id}
                    className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 group"
                  >
                    <span className="text-4xl font-black text-slate-400 tracking-tighter leading-none w-7 text-center shrink-0">
                      {idx + 2}
                    </span>

                    <div className="space-y-0.5 flex-1">
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest block">
                        {getPostCategory(item)}
                      </span>

                      <p className="text-slate-800 font-bold text-xs leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                        {item.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {latestPosts.length > 0 && (
            <div className="bg-white rounded-xl p-2">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <h3 className="text-slate-900 font-black text-sm uppercase tracking-tight">
                  Berita Terkini
                </h3>

                <Link
                  href="/blog"
                  className="text-orange-600 text-[10px] font-bold hover:underline flex items-center gap-0.5 uppercase"
                >
                  Lihat Semua <ChevronRight size={10} strokeWidth={3} />
                </Link>
              </div>

              {latestPosts[0] && (
                <Link
                  href={getPostHref(latestPosts[0])}
                  className="mb-4 group cursor-pointer block"
                >
                  <div className="w-full aspect-video rounded-xl overflow-hidden mb-2 bg-slate-100 shadow-sm">
                    <img
                      src={
                        extractFirstImage(latestPosts[0].content) ||
                        "/bg-player.png"
                      }
                      alt={latestPosts[0].title}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      onError={(e) => {
                        e.currentTarget.src = "/bg-player.png";
                      }}
                    />
                  </div>

                  <h4 className="text-slate-900 font-extrabold text-xs md:text-sm leading-snug hover:text-orange-600 transition-colors">
                    {latestPosts[0].title}
                  </h4>
                </Link>
              )}

              <div className="space-y-3">
                {latestPosts.slice(1, 5).map((news) => (
                  <Link
                    href={getPostHref(news)}
                    key={news.id}
                    className="flex gap-3 items-center border-b border-slate-50 pb-2.5 last:border-0 last:pb-0 group"
                  >
                    <div className="w-16 aspect-video object-cover rounded-lg bg-slate-100 shrink-0 shadow-sm overflow-hidden">
                      <img
                        src={
                          extractFirstImage(news.content) || "/bg-player.png"
                        }
                        alt={news.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/bg-player.png";
                        }}
                      />
                    </div>

                    <h5 className="text-slate-800 font-bold text-xs leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {news.title}
                    </h5>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}