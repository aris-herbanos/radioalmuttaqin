"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Send, Volume2, RefreshCcw, Radio, Zap, Users, CheckCheck } from "lucide-react";
import { sendChatMessage, getChatMessages } from "@/app/actions/chatActions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RadioInteractionHub() {
  const [currentPlaylist, setCurrentPlaylist] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const scheduleData = [
    { time: "06:00", title: "Nasyid Pagi", icon: "☀️" },
    { time: "07:00", title: "Taujih Pagi", icon: "📖" },
    { time: "10:00", title: "Keluarga Sakinah", icon: "🏠" },
    { time: "13:00", title: "Kajian Tematik", icon: "💡" },
    { time: "16:00", title: "Taujih Sore", icon: "🌇" },
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
      console.error(e);
    }
  }, []);

  useEffect(() => {
    syncVirtualRadioName();
    const load = async () => {
      const data = await getChatMessages();
      setMessages(data || []);
    };
    load();

    const channel = supabase.channel("live_chat_radio")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
        setMessages((prev) => {
          if (prev.find(m => m.id === p.new.id)) return prev;
          return [...prev, p.new];
        });
      }).subscribe();

    const interval = setInterval(syncVirtualRadioName, 30000);
    return () => { 
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

    const tempMsg = {
      id: Math.random().toString(),
      username: username,
      message: newMessage,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage("");

    setIsSending(true);
    const result = await sendChatMessage(username, newMessage);
    if (!result.success) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      alert("Gagal kirim pesan!");
    }
    setIsSending(false);
  };

  return (
    <section className="max-w-7xl mx-auto my-6 px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-auto lg:h-[700px]">
        
        {/* JADWAL SIARAN (Panel Kiri) */}
        <div className="lg:col-span-4 bg-slate-900 rounded-[4px] shadow-2xl flex flex-col overflow-hidden border border-white/5">
          <div className="p-5 bg-emerald-950 flex items-center justify-between border-b border-emerald-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-[4px]"><Radio className="text-emerald-400" size={18} /></div>
              <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Jadwal Siaran</h2>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {scheduleData.map((prog, index) => {
              const isLive = currentPlaylist.toLowerCase() === prog.title.toLowerCase();
              return (
                <div key={index} className={`flex items-center justify-between p-4 border transition-all rounded-[4px] ${
                  isLive ? "bg-emerald-600 border-emerald-400 shadow-lg scale-[1.02]" : "bg-white/5 border-white/5"
                }`}>
                  <div className="flex items-center gap-4 text-left text-white">
                    <span className="text-xl">{prog.icon}</span>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-50">{prog.time}</p>
                      <h4 className="text-xs font-black uppercase italic tracking-tight">{prog.title}</h4>
                    </div>
                  </div>
                  {isLive && <Zap size={14} className="text-white animate-pulse" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* LIVE CHAT (Panel Kanan) */}
        <div className="lg:col-span-8 bg-[#efeae2] rounded-[4px] shadow-2xl flex flex-col overflow-hidden border border-slate-300 relative">
          <div className="p-3 bg-[#075e54] flex items-center justify-between shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-800 rounded-full flex items-center justify-center border border-white/10">
                <Users className="text-emerald-400" size={18} />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold text-white leading-none">Komunitas Penggemar Radio Al Muttaqin</h2>
                <p className="text-[10px] text-emerald-300 mt-1">Online Sekarang</p>
              </div>
            </div>
          </div>

          <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 custom-scrollbar text-left relative"
            style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: "400px", backgroundBlendMode: 'overlay' }}
          >
            {messages.map((msg, i) => {
              const sender = msg.username || msg.user_name || msg.name || "Hamba Allah";
              const text = msg.message || msg.content || msg.text || "";
              const isMe = sender.toLowerCase() === username.toLowerCase() && username !== "";

              return (
                <div key={msg.id || i} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`relative max-w-[85%] px-3 py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] transition-all ${
                    isMe ? "bg-[#dcf8c6] rounded-l-lg rounded-br-lg rounded-tr-none" : "bg-white rounded-r-lg rounded-bl-lg rounded-tl-none"
                  }`}>
                    <div className={`absolute top-0 w-0 h-0 border-t-[8px] border-t-transparent ${
                      isMe ? "left-full border-l-[8px] border-l-[#dcf8c6]" : "right-full border-r-[8px] border-r-white"
                    }`} />
                    {!isMe && <p className="text-[11px] font-black text-emerald-800 mb-0.5 tracking-tight">{sender}</p>}
                    <div className="flex items-end gap-3 justify-between">
                      <p className="text-[14px] text-[#111b21] leading-relaxed break-words min-w-[50px]">{text}</p>
                      <div className="flex items-center gap-1 shrink-0 pb-0.5">
                        <span className="text-[9px] text-[#667781] font-medium uppercase">
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

          <form onSubmit={handleSendChat} className="p-3 bg-[#f0f2f5] border-t border-slate-200">
            <div className="flex gap-2 items-center">
              <input
                type="text" placeholder="Nama..." value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-1/4 px-4 py-3 bg-white border-none rounded-[4px] text-[12px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                required
              />
              <input
                type="text" placeholder="Tulis pesan dakwah..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border-none rounded-[4px] text-[13px] text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                required
              />
              <button type="submit" disabled={isSending} className="bg-[#00a884] hover:bg-[#06cf9c] text-white w-12 h-12 rounded-full shadow-md transition-all active:scale-90 flex items-center justify-center shrink-0">
                {isSending ? <RefreshCcw size={18} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
              </button>
            </div>
          </form>
        </div>

      </div>
    </section>
  );
}