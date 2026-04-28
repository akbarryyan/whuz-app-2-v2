"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TicketItem {
  id: string;
  subject: string;
  status: string;
  user: { name: string | null; email: string | null; phone: string | null } | null;
  lastMessage: string;
  lastSender: string;
  updatedAt: string;
}

const AVATAR_COLORS = [
  "bg-rose-500", "bg-blue-500", "bg-amber-500", "bg-emerald-500",
  "bg-purple-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
];

function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function displayName(user: TicketItem["user"]): string {
  if (!user) return "Guest";
  const raw = user.name ?? user.phone ?? user.email ?? "?";
  if (user.phone && user.phone.length > 6)
    return user.phone.slice(0, 4) + "****" + user.phone.slice(-3);
  return raw;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j`;
  const days  = Math.floor(hours / 24);
  return `${days}h`;
}

function statusBadge(status: string) {
  if (status === "OPEN")    return { label: "Open",   cls: "bg-rose-100 text-rose-600" };
  if (status === "REPLIED") return { label: "Replied", cls: "bg-amber-100 text-amber-600" };
  return                           { label: "Closed",  cls: "bg-slate-200 text-slate-500" };
}

export default function CustomerSupport() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/admin/tickets");
        const json = await res.json();
        if (json.success) {
          const all: TicketItem[] = json.data;
          setOpenCount(all.filter((t) => t.status === "OPEN" || t.status === "REPLIED").length);
          // Show top 3 most recent non-closed
          const active = all
            .filter((t) => t.status !== "CLOSED")
            .slice(0, 3);
          setTickets(active);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5 overflow-hidden min-w-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Customer Support</p>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className={`h-2 w-2 rounded-full ${openCount > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
          {loading ? "–" : `${openCount} Pending`}
        </span>
      </div>

      <div className={`mt-4 flex flex-col gap-3 text-xs transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}>
        {!loading && tickets.length === 0 ? (
          <p className="py-6 text-center text-slate-400">Tidak ada tiket aktif</p>
        ) : (loading ? [1, 2, 3] : tickets).map((item) => {
          if (typeof item === "number") {
            // skeleton
            return (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 animate-pulse">
                <div className="h-9 w-9 flex-shrink-0 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 w-24 rounded bg-slate-200" />
                  <div className="h-2 w-36 rounded bg-slate-200" />
                </div>
              </div>
            );
          }

          const t = item as TicketItem;
          const badge = statusBadge(t.status);
          const initials = displayName(t.user).slice(0, 1).toUpperCase();

          return (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-slate-100">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${avatarColor(t.id)} text-sm font-semibold text-white`}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-700">{displayName(t.user)}</p>
                <p className="truncate text-[11px] text-slate-400">{t.subject}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-300">{timeAgo(t.updatedAt)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <Link
                  href={`/admin/tickets/${t.id}`}
                  className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-medium text-[#2563eb] shadow-sm hover:bg-blue-50"
                >
                  Balas
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && openCount > 3 && (
        <Link
          href="/admin/tickets"
          className="mt-3 block text-center text-[11px] font-medium text-[#2563eb] hover:underline"
        >
          Lihat semua {openCount} tiket →
        </Link>
      )}
    </div>
  );
}
