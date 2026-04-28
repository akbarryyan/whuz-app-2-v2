"use client";

import { useState, useEffect } from "react";

interface ProviderStat {
  provider: string;
  isActive: boolean;
  balance: number | null;
  balanceAt: string | null;
  avgLatency: number | null;
  successRate: number | null;
  requests24h: number;
  lastError: { action: string; message: string; at: string } | null;
}

interface SummaryData {
  providers: ProviderStat[];
  total24h: number;
  failed24h: number;
  successRate: number | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  DIGIFLAZZ:   "Digiflazz",
  VIP_RESELLER: "VIP Reseller",
};

function formatRp(n: number) {
  if (n >= 1000000000) return `Rp ${(n / 1000000000).toFixed(1)}M`;
  if (n >= 1000000)    return `Rp ${(n / 1000000).toFixed(1)}jt`;
  if (n >= 1000)       return `Rp ${(n / 1000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return "baru saja";
  if (mins < 60)  return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  return `${Math.floor(hours / 24)}h lalu`;
}

function latencyColor(ms: number | null) {
  if (ms === null)  return "text-slate-400";
  if (ms <= 500)    return "text-emerald-600";
  if (ms <= 1500)   return "text-amber-600";
  return "text-rose-600";
}

function statusInfo(p: ProviderStat) {
  if (!p.isActive)
    return { label: "Nonaktif", bg: "bg-slate-100", dot: "bg-slate-400", text: "text-slate-500" };
  if (p.successRate !== null && p.successRate < 80)
    return { label: "Degraded",    bg: "bg-rose-50",    dot: "bg-rose-500",    text: "text-rose-600" };
  if (p.successRate !== null && p.successRate < 95)
    return { label: "Unstable",    bg: "bg-amber-50",   dot: "bg-amber-400",   text: "text-amber-600" };
  return   { label: "Operational", bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-600" };
}

export default function ProviderStatus() {
  const [data, setData]       = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/admin/providers/summary");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allOnline = data?.providers.every((p) => p.isActive && (p.successRate === null || p.successRate >= 95));
  const hasError  = data?.providers.some((p) => p.lastError !== null);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5 overflow-hidden min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Status Provider</p>
          <p className="mt-0.5 text-xs font-medium text-slate-400">Real-time monitoring</p>
        </div>
        {!loading && data && (
          <span className={`flex items-center gap-1.5 text-[11px] font-medium ${allOnline ? "text-emerald-600" : "text-amber-600"}`}>
            <span className={`h-2 w-2 rounded-full ${allOnline ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`} />
            {allOnline ? "Semua Online" : "Ada Masalah"}
          </span>
        )}
      </div>

      {/* Summary banner */}
      <div className={`relative mt-4 overflow-hidden rounded-2xl px-4 py-5 text-center ${
        loading ? "bg-slate-100 animate-pulse h-28" :
        allOnline ? "bg-gradient-to-br from-emerald-50 to-blue-50" : "bg-gradient-to-br from-amber-50 to-rose-50"
      }`}>
        {!loading && data && (
          <>
            <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-xl text-white ${allOnline ? "bg-emerald-500" : "bg-amber-400"}`}>
              {allOnline ? "✓" : "!"}
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {allOnline ? "Semua Provider Online" : "Perlu Perhatian"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {data.successRate !== null
                ? `Success rate ${data.successRate}% (24 jam)`
                : "Belum ada log hari ini"}
            </p>
          </>
        )}
      </div>

      {/* Per-provider cards */}
      <div className={`mt-4 flex flex-col gap-3 transition-opacity duration-200 ${loading ? "opacity-40" : ""}`}>
        {(loading ? ["DIGIFLAZZ", "VIP_RESELLER"] : data?.providers.map((p) => p.provider) ?? []).map((key) => {
          const p = data?.providers.find((x) => x.provider === key);
          if (!p) {
            return (
              <div key={key} className="rounded-2xl bg-slate-50 p-3 animate-pulse h-14" />
            );
          }
          const st = statusInfo(p);
          return (
            <div key={key} className={`rounded-2xl ${st.bg} p-3`}>
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${p.isActive ? "bg-emerald-500" : "bg-slate-300"}`}>
                  <span className="text-[10px] text-white">{p.isActive ? "✓" : "✕"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">{PROVIDER_LABELS[p.provider] ?? p.provider}</p>
                    <span className={`text-[10px] font-semibold ${st.text}`}>{st.label}</span>
                  </div>
                  {/* Balance */}
                  <p className="font-semibold text-slate-700 text-xs mt-0.5">
                    {p.balance !== null
                      ? <><span className="text-slate-400 font-normal">Saldo </span>{formatRp(p.balance)}</>
                      : <span className="text-slate-400">Saldo belum dicek</span>}
                  </p>
                  {/* Stats row */}
                  <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                    {p.avgLatency !== null && (
                      <span className={`text-[10px] font-medium ${latencyColor(p.avgLatency)}`}>
                        ⚡ {p.avgLatency}ms
                      </span>
                    )}
                    {p.successRate !== null && (
                      <span className={`text-[10px] font-medium ${p.successRate >= 95 ? "text-emerald-600" : p.successRate >= 80 ? "text-amber-600" : "text-rose-600"}`}>
                        ✔ {p.successRate}%
                      </span>
                    )}
                    {p.requests24h > 0 && (
                      <span className="text-[10px] text-slate-400">
                        {p.requests24h} req/24j
                      </span>
                    )}
                    {p.balanceAt && (
                      <span className="text-[10px] text-slate-300 ml-auto">
                        {timeAgo(p.balanceAt)}
                      </span>
                    )}
                  </div>
                  {/* Last error */}
                  {p.lastError && (
                    <p className="mt-1 truncate text-[10px] text-rose-400">
                      ✕ {p.lastError.action}: {p.lastError.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 24h totals */}
      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700">Total Requests</p>
            <p className="text-[11px] text-slate-500">24 jam terakhir</p>
          </div>
          {loading || !data ? (
            <div className="h-6 w-16 rounded bg-slate-200 animate-pulse" />
          ) : (
            <div className="text-right">
              <p className="text-lg font-bold text-[#2563eb]">
                {data.total24h >= 1000 ? `${(data.total24h / 1000).toFixed(1)}K` : data.total24h}
              </p>
              {data.failed24h > 0 && (
                <p className="text-[10px] text-rose-500">{data.failed24h} gagal</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
