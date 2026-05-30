"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Send, RefreshCcw, Radio, Zap, Users, CheckCheck, LogIn } from "lucide-react";
import { sendChatMessage, getChatMessages } from "@/app/actions/chatActions";
import Link from "next/link";

// Inisialisasi Supabase Client dengan jaminan Non-Crash
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 🟢 MANTRA KEAMANAN NEXT.JS: Menjamin Turbopack meloloskan komponen interaksi tanpa optimasi kaku pas build
export const dynamic = "force-dynamic";

export default function RadioInteractionHub() {
  const [currentPlaylist, setCurrentPlaylist] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Data jadwal internal diselaraskan dengan Purwokerto / Banyumas Hub
  const scheduleData = [
    { time: "06:00", title: "Nasyid Pagi", icon: "☀️" },
    { time: "07:00", title: "Taujih Pagi Ust. Sartono", icon: "📖" },
    { time: "10:00", title: "Kajian Keluarga Sakinah", icon: "🏠" },
    { time: "13:00", title: "Kajian Tematik", icon: "💡" },
    { time: "16:00", title: "Taujih Sore Ust. Sartono", icon: "🌇" },
    { time: "17:00", title: "Murottal Anak", icon: "🌙" },
    { time: "19:30", title: "Tazkiyatun Nafs", icon: "💎" },
    { time: "21:00", title: "Kajian Parenting", icon: "👨‍👩‍👧" },
    { time: "22:00", title: "Nasyid Lawas", icon: "🎵" },
  ];

  const syncVirtualRadioName = useCallback(async () => {
    try {
      const res = await fetch("/api/get-current-radio", { cache: "no-store" });
      const data = await res.json();
      if (data && data.active) {
        setCurrentPlaylist(data.title);
      } else {
        setCurrentPlaylist("");
      }
    } catch (e) {
      console.error("Gagal sinkronisasi nama playlist virtual:", e);
    }
  }, []);

  useEffect(() => {
    syncVirtualRadioName();
    
    const load = async () => {
      const data = await getChatMessages();
      setMessages(data || []);
    };
    load();

    // 🟢 SINKRONISASI AUTENTIKASI: Mengambil data identitas nama jemaah asli dari Supabase Auth
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

    // REALTIME HUB: Sinkronisasi alur data pesan baru tanpa refresh
    const channel = supabase.channel("live_chat_radio")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
        setMessages((prev) => {
          if (prev.find(m => m.id === p.new.id)) return prev;
          return [...prev, p.new];
        });
      }).subscribe();

    const interval = setInterval(syncVirtualRadioName, 30000);

    return () => { 
      subscription.unsubscribe();
      supabase.removeChannel(channel); 
      clearInterval(interval);
    };
  }, [syncVirtualRadioName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !username.trim() || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();

    try {
      // 🚀 KIRIM KE SERVER ACTION BENAR-BENAR BYPASS VIA SERVICE ROLE KEY
      const result = await sendChatMessage(username, messageContent);
      
      // 🟢 PERBAIKAN STRUKTUR: Mendeteksi kelolosan data secara akurat tanpa terjebak status .success lama
      if (result && (result.success || !result.error)) {
        setNewMessage("");
        const freshData = await getChatMessages();
        setMessages(freshData || []);
      } else {
        // Tampilkan error asli server jika ada kegagalan riil
        alert(`Gagal kirim pesan: ${result?.error || "Terjadi kendala interaksi server."}`);
      }
    } catch (err) {
      console.error("💥 Eror pengiriman pesan dakwah:", err);
      alert("Gagal kirim pesan, silakan segarkan halaman dan coba lagi.");
    } finally {
      // 🟢 FIX STRUKTUR SINTAKS: Memperbaiki skema kurung tutup liar kemarin menjadi block finally yang sah
      setIsSending(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto my-6 px-6 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-auto lg:h-[700px]">
        
        {/* =========================================================
            JADWAL SIARAN (Panel Kiri)
            ========================================================= */}
        <div className="lg:col-span-4 bg-slate-900 rounded-3xl shadow-2xl border-b-4 border-slate-950 flex flex-col overflow-hidden border border-white/5">
          <div className="p-5 bg-emerald-950 flex items-center justify-between border-b border-emerald-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <Radio className="text-emerald-400" size={18} />
              </div>
              <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Jadwal Siaran</h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {scheduleData.map((prog, index) => {
              const isLive = currentPlaylist && (
                currentPlaylist.toLowerCase().includes(prog.title.toLowerCase()) ||
                prog.title.toLowerCase().includes(currentPlaylist.toLowerCase())
              );

              return (
                <div key={index} className={`flex items-center justify-between p-4 border transition-all rounded-2xl ${
                  isLive ? "bg-emerald-600 border-emerald-400 shadow-xl scale-[1.01]" : "bg-white/5 border-white/5"
                }`}>
                  <div className="flex items-center gap-4 text-left text-white">
                    <span className="text-xl">{prog.icon}</span>
                    <div>
                      <p className="text-[9px] font-mono font-black uppercase tracking-widest opacity-50">{prog.time}</p>
                      <h4 className="text-xs font-black uppercase italic tracking-tight">{prog.title}</h4>
                    </div>
                  </div>
                  {isLive && <Zap size={14} className="text-white animate-pulse" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================
            LIVE CHAT (Panel Kanan - Gaya WhatsApp Premium)
            ========================================================= */}
        <div className="lg:col-span-8 bg-[#efeae2] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 relative">
          
          {/* Header Chat Ruang Komunitas */}
          <div className="p-4 bg-[#075e54] flex items-center justify-between shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-800 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                <Users className="text-emerald-400" size={18} />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold text-white leading-none tracking-tight">Komunitas Penggemar Radio Al Muttaqin</h2>
                <p className="text-[10px] text-emerald-300 font-medium mt-1 animate-pulse">● Online Sekarang</p>
              </div>
            </div>
          </div>

          {/* Area Isi Pesan Chat */}
          <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar text-left relative bg-opacity-40"
            style={{ 
              backgroundColor: "#efeae2",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23b4b4b4' fill-opacity='0.08'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 9c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm1 57c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM25 29c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm52-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM21 44c0 5.523-4.477 10-10 10S1 49.523 1 44s4.477-10 10-10 10 4.477 10 10zm61 21c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9zM42 29c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zm0 22c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zm24-25c0 3.314-2.686 6-6 6s-6-2.686-6-6 2.686-6 6-6 6 2.686 6 6zm-6 44c0 3.314-2.686 6-6 6s-6-2.686-6-6 2.686-6 6-6 6 2.686 6 6z'/%3E%3C/g%3E%3C/svg%3E")`
            }}
          >
            {messages.map((msg, i) => {
              const sender = msg.username || msg.user_name || msg.name || "Hamba Allah";
              const text = msg.message || msg.content || msg.text || "";
              const isMe = sender.toLowerCase() === username.toLowerCase() && username !== "";

              return (
                <div key={msg.id || i} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`relative max-w-[85%] px-3 py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] transition-all ${
                    isMe ? "bg-[#dcf8c6] rounded-l-2xl rounded-br-2xl rounded-tr-none" : "bg-white rounded-r-2xl rounded-bl-2xl rounded-tl-none"
                  }`}>
                    <div className={`absolute top-0 w-0 h-0 border-t-[8px] border-t-transparent ${
                      isMe ? "left-full border-l-[8px] border-l-[#dcf8c6]" : "right-full border-r-[8px] border-r-white"
                    }`} />
                    {!isMe && <p className="text-[11px] font-black text-emerald-800 mb-0.5 tracking-tight text-left">{sender}</p>}
                    <div className="flex items-end gap-3 justify-between">
                      <p className="text-[14px] text-[#111b21] leading-relaxed break-words min-w-[50px] text-left">{text}</p>
                      <div className="flex items-center gap-1 shrink-0 pb-0.5">
                        <span className="text-[9px] text-[#667781] font-medium">
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                        </span>
                        {isMe && <CheckCheck size={12} className="text-sky-500" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Input Chat & Nama */}
          <div className="p-3 bg-[#f0f2f5] border-t border-slate-200">
            {!user ? (
              <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-emerald-50/60 border border-emerald-100/30 rounded-xl gap-3 w-full">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide text-left">
                  Silakan masuk akun terlebih dahulu untuk mengirim pesan komunitas.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#06cf9c] text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl shadow-md transition-all whitespace-nowrap active:scale-95"
                >
                  <LogIn size={12} /> Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSendChat} className="flex gap-2 items-center">
                <input
                  type="text" 
                  value={username} 
                  disabled
                  title="Nama Anda terkunci otomatis oleh sistem login"
                  className="w-1/4 px-4 py-3 bg-slate-100 border-none rounded-xl text-[12px] font-bold text-slate-500 outline-none cursor-not-allowed select-none shadow-inner"
                />
                <input
                  type="text" 
                  placeholder="Tulis pesan dakwah di sini..." 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending}
                  className="flex-1 px-4 py-3 bg-white border-none rounded-xl text-[13px] text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                  required
                />
                <button 
                  type="submit" 
                  disabled={isSending || !newMessage.trim()} 
                  className="bg-[#00a884] hover:bg-[#06cf9c] text-white w-12 h-12 rounded-full shadow-md transition-all active:scale-90 flex items-center justify-center shrink-0 cursor-pointer select-none disabled:bg-slate-300"
                >
                  {isSending ? <RefreshCcw size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}