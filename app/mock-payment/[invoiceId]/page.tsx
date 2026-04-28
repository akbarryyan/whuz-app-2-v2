"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Quicksand } from "@/lib/fonts";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function formatPrice(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

function getMethodLabel(key: string): string {
  const map: Record<string, string> = {
    qris: "QRIS",
    bca_va: "BCA Virtual Account",
    bni_va: "BNI Virtual Account",
    bri_va: "BRI Virtual Account",
    mandiri_va: "Mandiri Virtual Account",
    cimb_niaga_va: "CIMB Niaga Virtual Account",
    maybank_va: "Maybank Virtual Account",
    permata_va: "Permata Virtual Account",
    bnc_va: "BNC Virtual Account",
    artha_graha_va: "Artha Graha Virtual Account",
    sampoerna_va: "Sampoerna Virtual Account",
  };
  return map[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getMethodIcon(key: string): React.ReactNode {
  if (key === "qris") {
    return (
      <svg className="w-8 h-8 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="2" y="2" width="8" height="8" rx="1" strokeWidth={2} />
        <rect x="14" y="2" width="8" height="8" rx="1" strokeWidth={2} />
        <rect x="2" y="14" width="8" height="8" rx="1" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M14 14h3v3M20 14v-.01M14 17v3h3M20 18v3h-3" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

// Countdown 30 menit
function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [remaining]);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return { remaining, formatted: `${mm}:${ss}` };
}

function MockPaymentPageContent({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoiceId, setInvoiceId] = useState("");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [siteName, setSiteName] = useState("Website");

  const amount = Number(searchParams.get("amount") ?? 0);
  const method = searchParams.get("method") ?? "qris";
  const redirectUrl = searchParams.get("redirectUrl") ?? "/akun/pesanan";

  const countdown = useCountdown(30 * 60); // 30 menit

  useEffect(() => {
    params.then(({ invoiceId: id }) => setInvoiceId(id));
  }, [params]);

  useEffect(() => {
    fetch("/api/site-branding")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.site_name) setSiteName(data.data.site_name);
      })
      .catch(() => {});
  }, []);

  const handlePay = async () => {
    setPaying(true);
    // Simulasi delay proses pembayaran
    await new Promise((r) => setTimeout(r, 1500));
    setPaid(true);
    await new Promise((r) => setTimeout(r, 1200));
    router.push(redirectUrl);
  };

  const handleCancel = () => {
    router.back();
  };

  // ---- Sudah bayar (transisi ke redirect) ----
  if (paid) {
    return (
      <div className={`${quicksand.className} min-h-screen bg-slate-50 flex items-center justify-center p-4`}>
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-[400px] flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-bounce">
            <svg className="w-9 h-9 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Pembayaran Berhasil!</h2>
          <p className="text-sm text-slate-500 mb-1">Mengalihkan ke halaman pesanan...</p>
          <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mt-3" />
        </div>
      </div>
    );
  }

  // ---- Expired ----
  if (countdown.remaining <= 0) {
    return (
      <div className={`${quicksand.className} min-h-screen bg-slate-50 flex items-center justify-center p-4`}>
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-[400px] flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <svg className="w-9 h-9 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Pembayaran Kedaluwarsa</h2>
          <p className="text-sm text-slate-500 mb-5">Sesi mock payment sudah habis.</p>
          <button
            onClick={handleCancel}
            className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // ---- Main Payment Page ----
  return (
    <div className={`${quicksand.className} min-h-screen bg-slate-50 flex justify-center`}>
      <div className="w-full max-w-[480px] min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-sm font-bold text-slate-800">Selesaikan Pembayaran</p>
            <p className="text-[11px] text-slate-400">{siteName} Mock Gateway</p>
          </div>
        </div>

        {/* Mode banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <span className="text-base">🧪</span>
          <p className="text-[11px] font-semibold text-amber-700">
            MODE SIMULASI — Ini adalah halaman pembayaran palsu untuk testing.
            Tidak ada transaksi nyata yang terjadi.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-5 flex flex-col gap-4">
          {/* Countdown */}
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-slate-600">Bayar sebelum</span>
            </div>
            <span className={`text-base font-bold tabular-nums ${
              countdown.remaining < 300 ? "text-rose-600" : "text-slate-800"
            }`}>
              {countdown.formatted}
            </span>
          </div>

          {/* Method + Amount Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Method header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                {getMethodIcon(method)}
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Metode Pembayaran</p>
                <p className="text-sm font-bold text-slate-800">{getMethodLabel(method)}</p>
              </div>
            </div>

            {/* Details */}
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Invoice</span>
                <span className="text-[11px] font-mono font-semibold text-slate-700 text-right max-w-[55%] break-all">
                  {invoiceId || "..."}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Total Bayar</span>
                <span className="text-xl font-black text-purple-700">
                  Rp {formatPrice(amount)}
                </span>
              </div>
            </div>

            {/* Mock QRIS or VA placeholder */}
            {method === "qris" ? (
              <div className="mx-4 mb-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center py-5 gap-2">
                {/* Fake QR grid */}
                <div className="w-32 h-32 bg-white rounded-xl border-2 border-slate-300 flex items-center justify-center">
                  <svg className="w-24 h-24 text-slate-200" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="2" width="8" height="8" rx="1" />
                    <rect x="14" y="2" width="8" height="8" rx="1" />
                    <rect x="2" y="14" width="8" height="8" rx="1" />
                    <rect x="9" y="9" width="2" height="2" />
                    <rect x="14" y="14" width="3" height="3" />
                    <rect x="19" y="14" width="3" height="3" />
                    <rect x="14" y="19" width="3" height="3" />
                    <rect x="19" y="19" width="3" height="3" />
                  </svg>
                </div>
                <p className="text-[11px] text-slate-400">Scan QR Code untuk bayar</p>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  QR PALSU — Testing Only
                </span>
              </div>
            ) : (
              <div className="mx-4 mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] text-slate-500 mb-1">Nomor Virtual Account</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-black tracking-widest text-slate-800 font-mono">
                    8080 1234 5678 90
                  </p>
                  <button className="text-[11px] text-purple-600 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors">
                    Salin
                  </button>
                </div>
                <p className="text-[10px] text-amber-600 font-semibold mt-1.5">
                  Nomor virtual account palsu — Testing Only
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <p className="text-[11px] font-bold text-blue-700 mb-1.5">Ini adalah halaman simulasi</p>
            <p className="text-[11px] text-blue-600 leading-relaxed">
              Klik <strong>"Simulasikan Pembayaran"</strong> untuk mensimulasikan
              pembayaran berhasil dan kembali ke halaman pesanan.
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="bg-white border-t border-slate-200 px-4 py-4 flex flex-col gap-2">
          <button
            onClick={handlePay}
            disabled={paying}
            className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              paying
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-200 hover:from-purple-700 hover:to-purple-600 active:scale-[0.98]"
            }`}
          >
            {paying ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                🧪 Simulasikan Pembayaran Berhasil
              </>
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={paying}
            className="w-full py-3 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Batalkan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MockPaymentPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <MockPaymentPageContent params={params} />
    </Suspense>
  );
}
