"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import {
  calculatePaymentGatewayFee,
  DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG,
  PaymentGatewayFeeConfig,
} from "@/lib/payment-gateway-fee";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: string;
  key: string;
  label: string;
  group: string;
  imageUrl: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PRESET_AMOUNTS = [10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000];

const GROUP_LABELS: Record<string, string> = {
  QRIS: "QRIS",
  VIRTUAL_ACCOUNT: "Virtual Account",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatRp(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatShort(n: number) {
  if (n >= 1_000_000) return `${n / 1_000_000}jt`;
  if (n >= 1_000) return `${n / 1_000}rb`;
  return String(n);
}

function formatPrice(n: number) {
  return n.toLocaleString("id-ID");
}

// ── Page ────────────────────────────────────────────────────────────────────── 

export default function TopupPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [feeConfig, setFeeConfig] = useState<PaymentGatewayFeeConfig>(DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG);
  const [methodsLoading, setMethodsLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.isLoggedIn) { router.replace("/login"); return; }
        setWalletBalance(d.wallet?.balance ?? 0);
        setAuthChecked(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // ── Load payment methods ────────────────────────────────────────────────────
  useEffect(() => {
    if (!authChecked) return;
    fetch("/api/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMethods(d.data);
          setFeeConfig(d.feeConfig ?? DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG);
        }
      })
      .finally(() => setMethodsLoading(false));
  }, [authChecked]);

  // ── Submit topup ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedAmount || !selectedMethod || submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedAmount,
          paymentMethod: selectedMethod,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(
          typeof data.error === "string"
            ? data.error
            : "Gagal membuat pembayaran. Coba lagi."
        );
        setSubmitting(false);
        return;
      }
      if (data.data.id) {
        router.push(`/topup/${encodeURIComponent(data.data.id)}`);
      } else {
        setErrorMsg("Tidak ada detail top up yang bisa dibuka.");
        setSubmitting(false);
      }
    } catch {
      setErrorMsg("Koneksi bermasalah. Coba lagi.");
      setSubmitting(false);
    }
  };

  // ── Group methods by group ──────────────────────────────────────────────────
  const groupedMethods = methods.reduce<Record<string, PaymentMethod[]>>((acc, m) => {
    (acc[m.group] ??= []).push(m);
    return acc;
  }, {});

  if (!authChecked) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
        <div className="w-full max-w-[480px] min-h-screen bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
          <div className="w-full" style={{ backgroundColor: "#003D99" }}>
            <div className="mx-auto flex max-w-[480px] items-center gap-2 px-3 py-3 lg:max-w-7xl lg:px-5">
              <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse flex-shrink-0" />
              <div className="h-7 w-28 rounded bg-white/20 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col gap-4 px-5 pt-6 lg:mx-auto lg:max-w-6xl lg:px-0">
            <div className="h-24 rounded-2xl bg-slate-100 animate-pulse lg:bg-white/[0.05]" />
            <div className="h-40 rounded-2xl bg-slate-100 animate-pulse lg:bg-white/[0.05]" />
            <div className="h-48 rounded-2xl bg-slate-100 animate-pulse lg:bg-white/[0.05]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        <AppHeader onBack={() => router.back()} />

        <div className="flex-1 overflow-y-auto pt-[60px] pb-24">
          <div className="flex flex-col gap-5 px-4 pt-4 pb-6 lg:mx-auto lg:max-w-6xl lg:px-0 lg:pt-8">

              {/* Wallet balance card */}
              <div className="relative overflow-hidden rounded-2xl p-5" style={{ backgroundColor: "#003D99" }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-white/5" />
                <div className="relative z-10">
                  <p className="text-[11px] text-white/60 font-semibold uppercase tracking-wider mb-1">Saldo Wallet Kamu</p>
                  <p className="text-2xl font-bold text-white">{formatRp(walletBalance ?? 0)}</p>
                </div>
              </div>

              {/* Amount selection */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 lg:text-slate-300">Pilih Nominal</p>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSelectedAmount(amt)}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition ${
                        selectedAmount === amt
                          ? "border-[#003D99] bg-blue-50 text-[#003D99] lg:bg-[#2E5F95]/20 lg:text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 lg:border-white/10 lg:bg-white/[0.04] lg:text-slate-100 lg:hover:border-[#2E5F95]"
                      }`}
                    >
                      {formatShort(amt)}
                    </button>
                  ))}
                </div>
                {selectedAmount && (
                  <p className="mt-2 text-center text-xs text-slate-400 lg:text-slate-400">
                    Nominal dipilih: <span className="font-bold text-[#003D99] lg:text-white">{formatRp(selectedAmount)}</span>
                  </p>
                )}
              </div>

              {/* Payment method */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 lg:text-slate-300">Metode Pembayaran</p>
                {methodsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse lg:bg-white/[0.05]" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {Object.entries(groupedMethods).map(([group, items]) => (
                      <div key={group}>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:text-slate-400">
                          {GROUP_LABELS[group] ?? group}
                        </p>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 lg:border-white/10 lg:bg-white/[0.04] lg:divide-white/10">
                          {items.map((m) => {
                            const isActive = selectedMethod === m.key;
                            const fee = selectedAmount ? calculatePaymentGatewayFee(m.key, selectedAmount, feeConfig) : 0;
                            const total = (selectedAmount ?? 0) + fee;
                            const abbr = m.key.replace(/_va$/, "").toUpperCase().slice(0, 4);
                            return (
                              <button
                                key={m.id}
                                onClick={() => setSelectedMethod(m.key)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                                  isActive ? "bg-blue-50 lg:bg-[#2E5F95]/16" : "hover:bg-slate-50 lg:hover:bg-white/[0.06]"
                                }`}
                              >
                                {/* Logo */}
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white lg:border-white/10 lg:bg-white/[0.05]">
                                  {m.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={m.imageUrl} alt={m.label} className="w-full h-full object-contain p-1" />
                                  ) : m.group === "QRIS" ? (
                                    <svg className="w-5 h-5 text-slate-600 lg:text-slate-200" viewBox="0 0 24 20" fill="none" stroke="currentColor">
                                      <rect x="1" y="1" width="8" height="8" rx="1" strokeWidth={2} />
                                      <rect x="15" y="1" width="8" height="8" rx="1" strokeWidth={2} />
                                      <rect x="1" y="12" width="8" height="8" rx="1" strokeWidth={2} />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12h3v3M21 12v-.01M15 15v3h3M21 17v3h-3" />
                                    </svg>
                                  ) : (
                                    <span className="text-[9px] font-black text-slate-600 lg:text-slate-200">{abbr}</span>
                                  )}
                                </div>
                                {/* Label + fee */}
                                <div className="flex-1 text-left">
                                  <p className="text-sm font-semibold text-slate-800 lg:text-white">{m.label}</p>
                                  {fee > 0 ? (
                                    <p className="mt-0.5 text-[10px] text-slate-400">+biaya Rp {formatPrice(fee)}</p>
                                  ) : (
                                    <p className="text-[10px] text-emerald-500 mt-0.5">Gratis biaya admin</p>
                                  )}
                                </div>
                                {/* Total on right */}
                                {selectedAmount && (
                                  <div className="text-right flex-shrink-0 mr-2">
                                    <p className="text-sm font-bold text-slate-800 lg:text-white">Rp {formatPrice(total)}</p>
                                    {fee > 0 && (
                                      <p className="text-[10px] text-slate-400">harga + biaya</p>
                                    )}
                                  </div>
                                )}
                                {/* Radio */}
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isActive ? "border-[#003D99] bg-[#003D99]" : "border-slate-300 lg:border-slate-500"
                                }`}>
                                  {isActive && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 lg:border-rose-500/20 lg:bg-rose-500/10">
                  <svg className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <p className="text-sm text-rose-600 lg:text-rose-100">{errorMsg}</p>
                </div>
              )}

              {/* Summary + Bayar button */}
              {selectedAmount && selectedMethod && (() => {
                const fee = calculatePaymentGatewayFee(selectedMethod, selectedAmount, feeConfig);
                const total = selectedAmount + fee;
                const methodLabel = methods.find((m) => m.key === selectedMethod)?.label ?? selectedMethod;
                return (
                  <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:border-white/10 lg:bg-white/[0.04]">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 lg:text-slate-300">Ringkasan Pembayaran</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 lg:text-slate-400">Nominal Top Up</span>
                      <span className="font-bold text-slate-800 lg:text-white">{formatRp(selectedAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 lg:text-slate-400">Metode</span>
                      <span className="font-semibold text-slate-700 lg:text-slate-100">{methodLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 lg:text-slate-400">Biaya Admin</span>
                      {fee > 0 ? (
                        <span className="font-semibold text-slate-600 lg:text-slate-200">Rp {formatPrice(fee)}</span>
                      ) : (
                        <span className="font-semibold text-emerald-500">Gratis</span>
                      )}
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2.5 text-sm lg:border-white/10">
                      <span className="font-bold text-slate-700 lg:text-white">Total Bayar</span>
                      <span className="font-bold text-[#003D99] lg:text-white">{formatRp(total)}</span>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full mt-1 py-4 rounded-2xl font-bold text-sm text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#003D99" }}
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Memproses...
                        </span>
                      ) : `Bayar ${formatRp(total)}`}
                    </button>
                  </div>
                );
              })()}
          </div>
        </div>

        <BottomNavigation />
      </div>
    </div>
  );
}
