"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Send, User, MessageSquare, Volume2, RefreshCcw, LogIn } from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import { sendChatMessage, getChatMessages } from "@/app/actions/chatActions";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LiveChat() {
  const { isPlaying } = useAudio();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Format waktu anti-Invalid Date
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "--:--";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) 
      ? "Baru saja" 
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await getChatMessages();
      setMessages(data || []);
    } catch (err) {
      console.error("💥 Gagal memuat pesan chat:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // 🟢 AMANKAN SESI USER: Ambil data profile jemaah langsung dari Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setUsername(session.user.user_metadata.full_name || session.user.user_metadata.name || "Jemaah Al Muttaqin");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setUsername(session.user.user_metadata.full_name || session.user.user_metadata.name || "Jemaah Al Muttaqin");
      } else {
        setUser(null);
        setUsername("");
      }
    });

    // REALTIME SUBSCRIPTION
    const channel = supabase.channel("live_chat_radio")
      .on("postgres_changes", 
        { event: "INSERT", schema: "public", table: "chat_messages" }, 
        (payload) => {
          setMessages((prev) => {
            const exists = prev.find(m => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
          if (audioRef.current && !isMuted) {
            audioRef.current.play().catch(() => {});
          }
        }
      ).subscribe();

    return () => { 
      subscription.unsubscribe();
      supabase.removeChannel(channel); 
    };
  }, [isMuted]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !username.trim() || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();

    // 🟢 INTEGRASI SERVER ACTION BERSAFETY TINGGI
    try {
      const result = await sendChatMessage(username, messageContent);

      if (result && result.success) {
        setNewMessage("");
        // Load data ulang secara pasif agar daftar chat tersinkron rapi dari pelayan DB
        const freshData = await getChatMessages();
        setMessages(freshData || []);
      } else {
        alert("Waduh Fal, gagal kirim pesan. Periksa RLS tabel chat_messages antum di Supabase!");
      }
    } catch (err) {
      console.error("💥 Kendala pengiriman chat:", err);
      alert("Gagal kirim pesan. Silakan coba beberapa saat lagi.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto my-20 overflow-hidden shadow-[0_30px_100px_-15px_rgba(0,0,0,0.08)] rounded-[3rem] bg-white border border-slate-100 grid grid-cols-1 lg:grid-cols-12 font-sans">
      <audio ref={audioRef} src="/notify.mp3" preload="auto" />

      {/* SIDEBAR - PROFESSIONAL DARK */}
      <div className="lg:col-span-4 bg-[#022c22] p-10 flex flex-col justify-between border-r border-slate-50 text-left">
        <div>
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></div>
              <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Live System</span>
            </div>
            <button onClick={() => setIsMuted(!isMuted)} className="text-emerald-500/50 hover:text-emerald-400 transition-colors">
              <Volume2 size={18} className={isMuted ? "opacity-20" : "opacity-100"} />
            </button>
          </div>
          
          <h2 className="text-2xl font-black text-white leading-tight mb-2 uppercase italic tracking-tighter">
            INTERAKSI <br /> <span className="text-emerald-400 text-3xl">JAMAAH</span>
          </h2>
          <div className="h-1 w-8 bg-emerald-400 mb-8 rounded-full"></div>
          
          <p className="text-emerald-100/30 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
            Radio Suara Al Muttaqin <br /> Jepara, Jawa Tengah
          </p>
        </div>
        
        <button onClick={loadMessages} className="flex items-center gap-2 text-[10px] font-bold text-emerald-500/30 uppercase tracking-widest hover:text-emerald-400 transition-all pt-8 lg:pt-0">
          <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />
          Sync Data Chat
        </button>
      </div>

      {/* CHAT AREA - CLEAN WHITE */}
      <div className="lg:col-span-8 flex flex-col bg-white">
        <div ref={scrollRef} className="h-[420px] overflow-y-auto p-10 space-y-6 scroll-smooth custom-scrollbar text-left">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10 italic">
              <MessageSquare size={48} className="mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-black">Belum ada percakapan</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={msg.id || i} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-2 mb-1.5 ml-1">
                  <span className="text-[11px] font-bold text-emerald-800">{msg.username}</span>
                  <span className="text-[9px] text-slate-300 font-medium italic">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 px-6 py-3 rounded-[1.8rem] rounded-tl-none shadow-sm max-w-[85%]">
                  <p className="text-[14px] font-medium text-slate-700 leading-relaxed break-words">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* INPUT AREA - SEKARANG DIKUNCI SESI AUTH SUPABASE */}
        <div className="p-8 bg-slate-50/30 border-t border-slate-50">
          {!user ? (
            <div className="py-2 text-center flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-50/50 border border-emerald-100/40 px-6 py-4 rounded-2xl">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">
                Mau ikut mengirimkan pesan salam atau doa dakwah, Fal?
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-[#022c22] hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest px-5 py-3 rounded-xl shadow-md transition-all whitespace-nowrap"
              >
                <LogIn size={12} /> Login via Google / GitHub
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSend}>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative sm:w-1/3 text-left">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={14} />
                  <input
                    type="text" 
                    value={username}
                    disabled
                    className="w-full pl-10 pr-4 py-4 bg-slate-100/80 border border-slate-200 rounded-2xl text-[12px] font-bold text-slate-600 outline-none cursor-not-allowed select-none"
                  />
                </div>
                <div className="flex-1 flex gap-3">
                  <input
                    type="text" 
                    placeholder="Tulis pesan dakwah antum di sini..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[12px] font-medium text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 transition-all placeholder:text-slate-300"
                    required
                    disabled={isSending}
                  />
                  <button
                    type="submit" 
                    disabled={isSending || !newMessage.trim()}
                    className="bg-[#022c22] text-white px-8 py-4 rounded-2xl font-black transition-all hover:bg-emerald-800 active:scale-95 disabled:bg-slate-200 shadow-xl shadow-emerald-950/10 flex items-center justify-center shrink-0"
                  >
                    {isSending ? <RefreshCcw size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}