"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface Message {
  id: string;
  senderRole: string;
  senderId: string | null;
  body: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
  messages: Message[];
}

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Menunggu", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "REPLIED", label: "Dibalas", cls: "bg-green-50 text-green-700 border-green-200" },
  { value: "CLOSED", label: "Selesai", cls: "bg-slate-100 text-slate-500 border-slate-200" },
];

export default function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => { loadTicket(); }, [id]);

  function loadTicket() {
    setLoading(true);
    fetch(`/api/admin/tickets/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTicket(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (ticket) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages.length]);

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`/api/admin/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        setReply("");
        toast.success("Balasan terkirim");
        loadTicket();
      }
    } catch { toast.error("Gagal mengirim"); }
    setSending(false);
  }

  async function updateStatus(status: string) {
    try {
      await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast.success(`Status diubah ke ${status}`);
      loadTicket();
    } catch { toast.error("Gagal update status"); }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <div className="mx-auto flex w-full gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 lg:px-6">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          {/* Back */}
          <button
            onClick={() => router.push("/admin/tickets")}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke daftar tiket
          </button>

          {loading ? (
            <div className="bg-white rounded-2xl p-6 animate-pulse space-y-3">
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
              <div className="h-40 bg-slate-50 rounded-xl" />
            </div>
          ) : !ticket ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-sm text-slate-400">Tiket tidak ditemukan.</p>
            </div>
          ) : (
            <>
              {/* Ticket info card */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h1 className="text-base font-bold text-slate-800">{ticket.subject}</h1>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        dari <span className="font-bold text-slate-600">{ticket.user.name || ticket.user.email || ticket.user.phone || "User"}</span>
                        {ticket.user.email && <span> · {ticket.user.email}</span>}
                        {ticket.user.phone && <span> · {ticket.user.phone}</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatTime(ticket.createdAt)}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateStatus(opt.value)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${
                            ticket.status === opt.value
                              ? opt.cls
                              : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="px-5 py-4 space-y-3 max-h-[50vh] overflow-y-auto bg-slate-50/50">
                  {ticket.messages.map((msg) => {
                    const isAdmin = msg.senderRole === "ADMIN";
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                            isAdmin
                              ? "bg-[#003D99] text-white rounded-br-md"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-sm"
                          }`}
                        >
                          <p className="text-[10px] font-bold mb-1 opacity-60">
                            {isAdmin ? "Admin" : ticket.user.name || "User"}
                          </p>
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                          <p className={`text-[9px] mt-1.5 ${isAdmin ? "text-white/40" : "text-slate-400"} text-right`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Reply box */}
                {ticket.status !== "CLOSED" ? (
                  <div className="px-5 py-4 border-t border-slate-100">
                    <div className="flex gap-2 items-end">
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                        placeholder="Tulis balasan admin..."
                        rows={2}
                        className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none"
                      />
                      <button
                        onClick={sendReply}
                        disabled={sending || !reply.trim()}
                        className="px-5 py-2.5 rounded-xl bg-[#003D99] text-white text-xs font-bold hover:bg-[#002d73] disabled:opacity-40 transition flex-shrink-0"
                      >
                        {sending ? "..." : "Balas"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-3 border-t border-slate-100 text-center">
                    <p className="text-[11px] text-slate-400">Tiket sudah ditutup. Ubah status untuk membuka lagi.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
