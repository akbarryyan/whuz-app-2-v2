"use client";

import { useState, useEffect } from "react";

interface Stat {
  label: string;
  value: string;
  delta: string;
  tone: "good" | "bad";
}

const SKELETON: Stat[] = [
  { label: "Order Hari Ini",   value: "–", delta: "–", tone: "good" },
  { label: "Transaksi Sukses", value: "–", delta: "–", tone: "good" },
  { label: "Pendapatan",       value: "–", delta: "–", tone: "good" },
];

export default function StatsCards() {
  const [stats, setStats]     = useState<Stat[]>(SKELETON);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/admin/dashboard");
        const json = await res.json();
        if (json.success) setStats(json.data.stats);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 min-w-0">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5 transition-opacity duration-300 ${loading ? "opacity-50" : ""}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">{stat.label}</p>
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                loading
                  ? "bg-slate-100 text-transparent animate-pulse"
                  : stat.tone === "good"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-rose-100 text-rose-600"
              }`}
            >
              {stat.delta}
            </span>
          </div>
          <p className={`mt-2 text-xl font-bold sm:mt-3 sm:text-2xl ${ loading ? "text-transparent bg-slate-200 rounded animate-pulse" : "text-slate-800"}`}>
            {stat.value}
          </p>
          <p className="mt-1 text-xs text-slate-400">Dibanding kemarin</p>
        </div>
      ))}
    </div>
  );
}
