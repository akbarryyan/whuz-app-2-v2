"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

interface Message {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  messages: Message[];
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: "Menunggu", color: "text-amber-700", bg: "bg-amber-50" },
  REPLIED: { label: "Dibalas", color: "text-green-700", bg: "bg-green-50" },
  CLOSED: { label: "Selesai", color: "text-slate-500", bg: "bg-slate-100" },
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTicket();
  }, [id]);

  function loadTicket() {
    setLoading(true);
    fetch(`/api/tickets/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTicket(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (ticket) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages.length]);

  async function sendReply() {
    if (!reply.trim() || !ticket) return;
    setSending(true);
    try {
      const r = await fetch(`/api/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        setReply("");
        loadTicket();
      }
    } catch { /* ignore */ }
    setSending(false);
  }

  async function closeTicket() {
    setClosing(true);
    try {
      await fetch(`/api/tickets/${id}`, { method: "PATCH" });
      loadTicket();
    } catch { /* ignore */ }
    setClosing(false);
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  const st = ticket ? (STATUS_MAP[ticket.status] ?? STATUS_MAP.OPEN) : STATUS_MAP.OPEN;

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-[#F5F5F5] shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        <AppHeader onBack={() => router.push("/tickets")} />
        <div className="h-[60px]" />

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#003D99] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !ticket ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-slate-400 lg:text-slate-300">Tiket tidak ditemukan</p>
          </div>
        ) : (
          <>
            {/* Ticket header */}
            <div className="border-b border-slate-100 bg-white px-4 py-3 lg:mx-auto lg:mt-6 lg:w-full lg:max-w-5xl lg:rounded-[28px] lg:border-white/10 lg:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-2">
                <h1 className="flex-1 text-sm font-bold text-slate-800 lg:text-white">{ticket.subject}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                  {st.label}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400 lg:text-slate-500">{formatTime(ticket.createdAt)}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-4 lg:mx-auto lg:w-full lg:max-w-5xl lg:px-0">
              {ticket.messages.map((msg) => {
                const isUser = msg.senderRole === "USER";
                return (
                  <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                        isUser
                          ? "bg-[#003D99] text-white rounded-br-md"
                          : "bg-white text-slate-800 border border-slate-200 rounded-bl-md lg:border-white/10 lg:bg-white/[0.04] lg:text-slate-100"
                      }`}
                    >
                      <p className="text-[11px] font-bold mb-0.5 opacity-70">
                        {isUser ? "Anda" : "Admin CS"}
                      </p>
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      <p className={`mt-1 text-right text-[9px] ${isUser ? "text-white/50" : "text-slate-400 lg:text-slate-500"}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply box or closed state */}
            {ticket.status === "CLOSED" ? (
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 pb-24 text-center lg:mx-auto lg:w-full lg:max-w-5xl lg:border-white/10 lg:bg-white/[0.04] lg:pb-14">
                <p className="text-xs font-semibold text-slate-400 lg:text-slate-300">Tiket ini sudah ditutup</p>
              </div>
            ) : (
              <div className="border-t border-slate-200 bg-white px-3 py-3 pb-24 lg:mx-auto lg:w-full lg:max-w-5xl lg:border-white/10 lg:bg-white/[0.04] lg:pb-14">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    placeholder="Tulis balasan..."
                    rows={1}
                    className="max-h-24 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 lg:border-white/10 lg:bg-white/5 lg:text-white lg:placeholder:text-slate-500"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="w-10 h-10 rounded-xl bg-[#003D99] text-white flex items-center justify-center hover:bg-[#002d73] disabled:opacity-40 transition flex-shrink-0"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  onClick={closeTicket}
                  disabled={closing}
                  className="mt-2 w-full py-1 text-center text-[11px] text-slate-400 transition hover:text-red-500 lg:text-slate-500"
                >
                  {closing ? "Menutup..." : "Tandai selesai & tutup tiket"}
                </button>
              </div>
            )}
          </>
        )}

        <BottomNavigation />
      </div>
    </div>
  );
}
