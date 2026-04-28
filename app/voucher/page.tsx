"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import AppHeader from "@/components/AppHeader";
import PageFooter from "@/components/PageFooter";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

interface VoucherItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscount: number | null;
  minPurchase: number;
  quota: number | null;
  usedCount: number;
  perUserLimit: number;
  startDate: string | null;
  endDate: string | null;
  claimStatus: "CLAIMED" | "USED" | "EXPIRED" | null;
  isFull: boolean;
}

function formatDiscount(v: VoucherItem) {
  if (v.discountType === "PERCENT") {
    let text = `Diskon ${v.discountValue}%`;
    if (v.maxDiscount) text += ` (maks. ${formatRp(v.maxDiscount)})`;
    return text;
  }
  return `Potongan ${formatRp(v.discountValue)}`;
}

function formatRp(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}

function ClaimBadge({ status, isFull }: { status: VoucherItem["claimStatus"]; isFull: boolean }) {
  if (status === "CLAIMED") return (
    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">✓ Diklaim</span>
  );
  if (status === "USED") return (
    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full">Digunakan</span>
  );
  if (isFull) return (
    <span className="text-[10px] font-bold bg-red-100 text-red-500 px-2.5 py-0.5 rounded-full">Habis</span>
  );
  return null;
}

export default function VoucherPage() {
  const router = useRouter();
  const toast = useToast();

  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Manual code input
  const [codeInput, setCodeInput] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null); // voucherId or "manual"

  const [activeTab, setActiveTab] = useState<"semua" | "diklaim">("semua");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionRes, vRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/vouchers"),
      ]);
      const sessionData = await sessionRes.json();
      setIsLoggedIn(sessionData.isLoggedIn ?? false);

      const vData = await vRes.json();
      if (vData.success) setVouchers(vData.data);
    } catch {
      toast.error("Gagal memuat voucher.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleClaim = async (voucher: VoucherItem | null, manualCode?: string) => {
    if (!isLoggedIn) {
      toast.info("Login dulu untuk klaim voucher.");
      router.push("/login");
      return;
    }

    const code = manualCode ?? voucher?.code ?? "";
    const claimKey = voucher ? voucher.id : "manual";
    setClaiming(claimKey);
    try {
      const res = await fetch("/api/vouchers/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.toUpperCase().trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message ?? "Voucher berhasil diklaim!");
        setCodeInput("");
        await load();
      } else {
        toast.error(data.error ?? "Gagal mengklaim voucher.");
      }
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setClaiming(null);
    }
  };

  const displayedVouchers = activeTab === "diklaim"
    ? vouchers.filter((v) => v.claimStatus !== null)
    : vouchers;

  const claimedCount = vouchers.filter((v) => v.claimStatus !== null).length;

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-[#F5F5F5] shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        <AppHeader onBack={() => router.back()} />
        <div className="h-[60px]" />

        {/* Hero */}
        <div className="bg-[#003D99] px-5 pt-6 pb-8 text-white lg:mx-auto lg:mt-6 lg:w-full lg:max-w-6xl lg:rounded-[32px] lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">Voucher</h1>
              <p className="text-[12px] text-white/70">Klaim & hemat lebih banyak</p>
            </div>
          </div>

          {/* Manual code input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Masukkan kode voucher..."
              onKeyDown={(e) => { if (e.key === "Enter" && codeInput.trim()) handleClaim(null, codeInput); }}
              className="flex-1 px-4 py-3 rounded-xl bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg font-mono tracking-wider"
            />
            <button
              onClick={() => codeInput.trim() && handleClaim(null, codeInput)}
              disabled={claiming === "manual" || !codeInput.trim()}
              className="px-4 py-3 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
            >
              {claiming === "manual" ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              )}
              Klaim
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 pt-4 pb-1 lg:mx-auto lg:w-full lg:max-w-6xl lg:px-0">
          {(["semua", "diklaim"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition ${
                activeTab === tab
                  ? "bg-[#003D99] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-500 lg:border-white/10 lg:bg-white/[0.04] lg:text-slate-300"
              }`}
            >
              {tab === "semua" ? "Semua Voucher" : `Voucherku${claimedCount > 0 ? ` (${claimedCount})` : ""}`}
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 px-4 py-3 pb-10 lg:mx-auto lg:w-full lg:max-w-6xl lg:px-0">
          {loading ? (
            <div className="space-y-3 mt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm animate-pulse lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3.5 w-3/4 bg-slate-200 rounded mb-2" />
                      <div className="h-3 w-1/2 bg-slate-100 rounded mb-3" />
                      <div className="h-7 w-20 bg-slate-200 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayedVouchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#003D99]">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-400 lg:text-slate-200">
                {activeTab === "diklaim" ? "Kamu belum mengklaim voucher" : "Belum ada voucher tersedia"}
              </p>
              <p className="mt-1 text-[11px] text-slate-300 lg:text-slate-500">
                {activeTab === "diklaim" ? "Klaim voucher di tab Semua Voucher" : "Pantau terus untuk promo terbaru!"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 mt-1">
              {displayedVouchers.map((v) => {
                const isClaiming = claiming === v.id;
                const alreadyClaimed = v.claimStatus !== null;
                const canClaim = !alreadyClaimed && !v.isFull;

                return (
                  <div
                    key={v.id}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                      alreadyClaimed ? "border-emerald-100" : v.isFull ? "border-slate-100 opacity-60" : "border-purple-100"
                    } lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none ${
                      v.isFull ? "lg:opacity-60" : ""
                    }`}
                  >
                    {/* Top stripe */}
                    <div className={`h-1 w-full ${
                      v.claimStatus === "CLAIMED" ? "bg-emerald-400" :
                      v.claimStatus === "USED" ? "bg-slate-300" :
                      v.isFull ? "bg-red-300" : "bg-[#003D99]"
                    }`} />

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          v.discountType === "PERCENT" ? "bg-purple-100" : "bg-amber-100"
                        }`}>
                          {v.discountType === "PERCENT" ? (
                            <span className="text-lg font-black text-purple-600">%</span>
                          ) : (
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="text-[13px] font-bold leading-tight text-slate-800 lg:text-white">{v.title}</h3>
                            <ClaimBadge status={v.claimStatus} isFull={v.isFull} />
                          </div>

                          <p className="mb-1 text-[11px] font-bold text-[#003D99] lg:text-white">{formatDiscount(v)}</p>

                          {v.description && (
                            <p className="mb-2 text-[11px] leading-relaxed text-slate-400">{v.description}</p>
                          )}

                          {/* Meta */}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-3">
                            {v.minPurchase > 0 && (
                                <span className="text-[10px] text-slate-400 lg:text-slate-500">
                                Min. {formatRp(v.minPurchase)}
                              </span>
                            )}
                            {v.endDate && (
                                <span className="text-[10px] text-slate-400 lg:text-slate-500">
                                Berlaku s/d {formatDate(v.endDate)}
                              </span>
                            )}
                            {v.quota !== null && (
                                <span className="text-[10px] text-slate-400 lg:text-slate-500">
                                Sisa: {Math.max(0, v.quota - v.usedCount)}/{v.quota}
                              </span>
                            )}
                          </div>

                          {/* Code pill */}
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-slate-600 lg:border-white/15 lg:bg-white/5 lg:text-slate-200">
                              {v.code}
                            </span>

                            {canClaim && (
                              <button
                                onClick={() => handleClaim(v)}
                                disabled={isClaiming}
                                className="px-3 py-1 rounded-lg bg-[#003D99] hover:bg-[#002366] text-white text-[11px] font-bold transition disabled:opacity-60 flex items-center gap-1"
                              >
                                {isClaiming ? (
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : null}
                                Klaim
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <PageFooter />
      </div>
    </div>
  );
}
