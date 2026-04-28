"use client";

import { useState, useEffect } from "react";

interface RevenueData {
  label: string;
  wallet: number;
  gateway: number;
  walletRaw: number;
  gatewayRaw: number;
}

function formatRp(n: number) {
  if (n >= 1000000000) return `Rp ${(n / 1000000000).toFixed(1)}M`;
  if (n >= 1000000)    return `Rp ${(n / 1000000).toFixed(1)}jt`;
  if (n >= 1000)       return `Rp ${(n / 1000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

const SKELETON: RevenueData[] = Array.from({ length: 5 }, (_, i) => ({
  label: "–", wallet: 30 + i * 8, gateway: 35 + i * 5,
  walletRaw: 0, gatewayRaw: 0,
}));

export default function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>(SKELETON);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/admin/dashboard");
        const json = await res.json();
        if (json.success) setData(json.data.revenue);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 overflow-hidden min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Analitik Pendapatan</p>
          <p className="text-xs text-slate-400">Pembayaran Wallet vs Payment Gateway</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
            Wallet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            Gateway
          </span>
        </div>
      </div>

      <div className={`mt-6 grid grid-cols-5 items-end gap-2 sm:mt-8 sm:gap-4 transition-opacity duration-300 ${loading ? "opacity-50" : ""}`}>
        {data.map((item, idx) => (
          <div key={idx} className="group flex flex-col items-center gap-2 sm:gap-3 relative">
            {/* Hover tooltip */}
            <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
              <div className="bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg text-center">
                <p className="font-semibold text-slate-200 mb-0.5">{item.label}</p>
                <p className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb] inline-block" />
                  {formatRp(item.walletRaw)}
                </p>
                <p className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 inline-block" />
                  {formatRp(item.gatewayRaw)}
                </p>
              </div>
              <div className="w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
            </div>

            <div className="flex h-32 w-full items-end justify-center gap-1 sm:h-40 sm:gap-2">
              <div className="flex h-full w-5 items-end rounded-full bg-slate-100 sm:w-8">
                <div
                  className="w-full rounded-full bg-[#2563eb] transition-all duration-500"
                  style={{ height: `${Math.max(item.wallet, item.walletRaw > 0 ? 4 : 0)}%` }}
                />
              </div>
              <div className="flex h-full w-5 items-end rounded-full bg-slate-100 sm:w-8">
                <div
                  className="w-full rounded-full bg-slate-300 transition-all duration-500"
                  style={{ height: `${Math.max(item.gateway, item.gatewayRaw > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
            <span className={`text-xs font-medium ${ loading ? "text-transparent bg-slate-200 rounded animate-pulse" : "text-slate-400"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
