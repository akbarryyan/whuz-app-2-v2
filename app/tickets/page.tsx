"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

interface TicketSummary {
  id: string;
  subject: string;
  status: string;
  lastMessage: string;
  lastSender: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: "Menunggu", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  REPLIED: { label: "Dibalas", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  CLOSED: { label: "Selesai", color: "text-slate-500", bg: "bg-slate-50 border-slate-200" },
};

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  function loadTickets() {
    setLoading(true);
    fetch("/api/tickets")
      .then((r) => r.json())
      .then((d) => { if (d.success) setTickets(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function createTicket() {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      const r = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        setShowNew(false);
        setSubject("");
        setMessage("");
        loadTickets();
      }
    } catch { /* ignore */ }
    setSending(false);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins}m lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}j lalu`;
    const days = Math.floor(hrs / 24);
    return `${days}h lalu`;
  }

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-[#F5F5F5] shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        <AppHeader onBack={() => router.back()} />
        <div className="h-[60px]" />

        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 lg:mx-auto lg:mt-6 lg:w-full lg:max-w-5xl lg:rounded-[28px] lg:border-white/10 lg:bg-white/[0.04] lg:px-5">
          <div>
            <h1 className="text-base font-bold text-slate-800 lg:text-white">Pusat Bantuan</h1>
            <p className="text-[11px] text-slate-400 lg:text-slate-400">Kirim pertanyaan atau keluhan Anda</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="px-3.5 py-2 rounded-xl bg-[#003D99] text-white text-xs font-bold hover:bg-[#002d73] transition"
          >
            + Tiket Baru
          </button>
        </div>

        {/* New ticket form */}
        {showNew && (
          <div className="space-y-3 border-b border-slate-100 bg-white px-4 py-4 lg:mx-auto lg:w-full lg:max-w-5xl lg:border-white/10 lg:bg-white/[0.04]">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subjek (misal: Transaksi gagal)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 lg:border-white/10 lg:bg-white/5 lg:text-white lg:placeholder:text-slate-500"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Jelaskan masalah Anda..."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 lg:border-white/10 lg:bg-white/5 lg:text-white lg:placeholder:text-slate-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowNew(false); setSubject(""); setMessage(""); }}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 lg:text-slate-300 lg:hover:bg-white/10"
              >
                Batal
              </button>
              <button
                onClick={createTicket}
                disabled={sending || !subject.trim() || !message.trim()}
                className="px-4 py-2 rounded-xl bg-[#003D99] text-white text-xs font-bold hover:bg-[#002d73] disabled:opacity-50 transition"
              >
                {sending ? "Mengirim..." : "Kirim Tiket"}
              </button>
            </div>
          </div>
        )}

        {/* Ticket list */}
        <div className="flex-1 pb-24 lg:mx-auto lg:w-full lg:max-w-5xl lg:pb-14">
          {loading ? (
            <div className="px-4 pt-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-white p-4 animate-pulse lg:border lg:border-white/10 lg:bg-white/[0.04]">
                  <div className="h-4 w-40 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-56 bg-slate-100 rounded mb-3" />
                  <div className="h-5 w-16 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-500 lg:text-slate-200">Belum ada tiket</p>
              <p className="mt-1 text-xs text-slate-400 lg:text-slate-500">Tap &quot;Tiket Baru&quot; untuk mengirim pertanyaan</p>
            </div>
          ) : (
            <div className="px-4 pt-4 space-y-2.5">
              {tickets.map((t) => {
                const st = STATUS_MAP[t.status] ?? STATUS_MAP.OPEN;
                const hasReply = t.lastSender === "ADMIN" && t.status !== "CLOSED";
                return (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/tickets/${t.id}`)}
                    className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left transition-shadow hover:shadow-md lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none lg:hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="line-clamp-1 flex-1 text-sm font-bold text-slate-800 lg:text-white">{t.subject}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.bg} ${st.color} flex-shrink-0`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mb-2 line-clamp-1 text-[12px] text-slate-500 lg:text-slate-400">
                      {t.lastSender === "ADMIN" ? "Admin: " : "Anda: "}
                      {t.lastMessage}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 lg:text-slate-500">{timeAgo(t.updatedAt)}</span>
                      {hasReply && (
                        <span className="text-[10px] font-bold text-[#003D99] bg-blue-50 px-2 py-0.5 rounded-full">
                          Balasan baru
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <BottomNavigation />
      </div>
    </div>
  );
}
