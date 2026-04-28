"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";

interface TicketSummary {
  id: string;
  subject: string;
  status: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
  lastMessage: string;
  lastSender: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Menunggu", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  REPLIED: { label: "Dibalas", cls: "bg-green-50 text-green-700 border-green-200" },
  CLOSED: { label: "Selesai", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function AdminTicketsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then((r) => r.json())
      .then((d) => { if (d.success) setTickets(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);
  const counts = {
    ALL: tickets.length,
    OPEN: tickets.filter((t) => t.status === "OPEN").length,
    REPLIED: tickets.filter((t) => t.status === "REPLIED").length,
    CLOSED: tickets.filter((t) => t.status === "CLOSED").length,
  };

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
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          {/* Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800">💬 Tiket Customer Service</h1>
              <p className="text-xs text-slate-400 mt-0.5">Kelola pertanyaan dan keluhan dari pengguna.</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {(["ALL", "OPEN", "REPLIED", "CLOSED"] as const).map((key) => {
              const labels: Record<string, string> = { ALL: "Semua", OPEN: "Menunggu", REPLIED: "Dibalas", CLOSED: "Selesai" };
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    filter === key
                      ? "bg-[#003D99] text-white"
                      : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {labels[key]} ({counts[key]})
                </button>
              );
            })}
          </div>

          {/* Ticket list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="h-4 w-48 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-64 bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-32 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-sm text-slate-400">Tidak ada tiket{filter !== "ALL" ? ` dengan status "${(STATUS_BADGE[filter] ?? {}).label ?? filter}"` : ""}.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((t) => {
                const st = STATUS_BADGE[t.status] ?? STATUS_BADGE.OPEN;
                return (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/admin/tickets/${t.id}`)}
                    className="w-full text-left bg-white rounded-2xl p-4 hover:shadow-md transition-shadow border border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1 flex-1">{t.subject}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls} flex-shrink-0`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 line-clamp-1 mb-1.5">
                      {t.lastSender === "ADMIN" ? "Anda: " : "User: "}
                      {t.lastMessage}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-500">{t.user.name || t.user.email || t.user.phone || "User"}</span>
                        <span>·</span>
                        <span>{t.messageCount} pesan</span>
                        <span>·</span>
                        <span>{timeAgo(t.updatedAt)}</span>
                      </div>
                      {t.status === "OPEN" && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                          Perlu dibalas
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
