"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import BottomNavigation from "@/components/BottomNavigation";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function formatPrice(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

function formatDate(d: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function buildQrImageUrl(raw: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(raw)}`;
}

function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SUCCESS:             { label: "Sukses",           cls: "bg-green-100 text-green-700" },
    PAID:                { label: "Dibayar",           cls: "bg-blue-100 text-blue-700" },
    WAITING_PAYMENT:     { label: "Menunggu Bayar",    cls: "bg-yellow-100 text-yellow-700" },
    PROCESSING_PROVIDER: { label: "Sedang Diproses",   cls: "bg-purple-100 text-purple-700" },
    CREATED:             { label: "Dibuat",            cls: "bg-slate-100 text-slate-600" },
    FAILED:              { label: "Gagal",             cls: "bg-red-100 text-red-700" },
    EXPIRED:             { label: "Kedaluwarsa",       cls: "bg-orange-100 text-orange-700" },
    REFUNDED:            { label: "Dikembalikan",      cls: "bg-teal-100 text-teal-700" },
    // Invoice statuses
    PENDING:             { label: "Menunggu",          cls: "bg-yellow-100 text-yellow-700" },
  };
  const info = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${info.cls}`}>
      {info.label}
    </span>
  );
}

interface OrderDetail {
  orderCode: string;
  status: string;
  amount: number;
  fee: number;
  paymentMethod: string;
  notes: string | null;
  serialNumber: string | null;
  createdAt: string;
  updatedAt: string;
  targetNumber: string;
  targetData: Record<string, unknown> | null;
  product: { name: string; brand: string; category: string };
  paymentInvoice: {
    status: string;
    method: string | null;
    paymentUrl: string | null;
    paymentNumber: string | null;
    expiredAt: string | null;
    paidAt: string | null;
  } | null;
}

function OrderDetailPageContent() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copyingQr, setCopyingQr] = useState(false);
  const [copyQrLabel, setCopyQrLabel] = useState("Salin String QRIS");
  const [requestingNewQris, setRequestingNewQris] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const fetchOrder = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const qs = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`/api/orders/${encodeURIComponent(params.code)}${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data as OrderDetail);
        setError(null);
        setActionError(null);
      } else {
        setError(data.error ?? "Pesanan tidak ditemukan.");
      }
    } catch {
      setError("Gagal memuat pesanan. Periksa koneksi internet kamu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code, token]);

  useEffect(() => {
    if (!order) return;

    const shouldPoll =
      order.status === "WAITING_PAYMENT" ||
      order.status === "PAID" ||
      order.status === "PROCESSING_PROVIDER";

    if (!shouldPoll) return;

    const interval = setInterval(() => {
      fetchOrder();
    }, 7000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, order?.paymentInvoice?.status, params.code, token]);

  useEffect(() => {
    if (!order?.paymentInvoice?.expiredAt || order.paymentInvoice.status !== "PENDING") {
      setRemainingSeconds(null);
      return;
    }

    const updateRemaining = () => {
      const expiredAtMs = new Date(order.paymentInvoice!.expiredAt!).getTime();
      const diffSeconds = Math.floor((expiredAtMs - Date.now()) / 1000);
      setRemainingSeconds(Math.max(0, diffSeconds));
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [order?.paymentInvoice?.expiredAt, order?.paymentInvoice?.status]);

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#f5f7fb] lg:bg-[#161B22]`}>
        <div className="flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
          <div className="bg-[#003D99] px-4 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-28 bg-white/20 rounded animate-pulse" />
              <div className="h-2.5 w-36 bg-white/20 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-3 p-4 lg:mx-auto lg:w-full lg:max-w-3xl lg:px-0 lg:pt-10">
            <div className="rounded-2xl bg-slate-50 p-4 animate-pulse space-y-2 lg:bg-white/[0.05]">
              <div className="h-3 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 animate-pulse space-y-2 lg:bg-white/[0.05]">
              <div className="h-3 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-28 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#f5f7fb] lg:bg-[#161B22]`}>
        <div className="flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
          <header className="bg-[#003D99] px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="text-sm font-bold text-white">Detail Pesanan</p>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="mb-1 text-sm font-semibold text-slate-700 lg:text-white">{error}</p>
            <p className="mb-4 text-xs text-slate-400">
              Kode: <span className="font-mono font-semibold text-slate-600">{params.code}</span>
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold"
            >
              Kembali ke Beranda
            </button>
          </div>
          <BottomNavigation />
        </div>
      </div>
    );
  }

  if (!order) return null;

  const extraTargetEntries = Object.entries(order.targetData ?? {}).filter(([key, value]) => {
    if (key === "targetNumber") return false;
    if (value == null) return false;
    const normalized = String(value).trim();
    return normalized.length > 0 && normalized !== order.targetNumber;
  });

  const formatTargetLabel = (key: string) =>
    key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const canShowPaymentFlow = order.status === "WAITING_PAYMENT";
  const hasEverBeenPaid = Boolean(order.paymentInvoice?.paidAt) || order.status === "PAID" || order.status === "PROCESSING_PROVIDER" || order.status === "SUCCESS" || order.status === "REFUNDED";
  const isPendingPayment =
    canShowPaymentFlow &&
    order.paymentInvoice?.status === "PENDING" &&
    (!!order.paymentInvoice?.paymentUrl || !!order.paymentInvoice?.paymentNumber);
  const hasInternalQris =
    canShowPaymentFlow &&
    order.paymentInvoice?.status === "PENDING" &&
    order.paymentInvoice?.method?.toLowerCase() === "qris" &&
    !!order.paymentInvoice?.paymentNumber;
  const isQrisExpired =
    canShowPaymentFlow &&
    order.paymentInvoice?.status === "PENDING" &&
    remainingSeconds !== null &&
    remainingSeconds <= 0;
  const canRequestNewQris =
    order.status === "WAITING_PAYMENT" &&
    !hasEverBeenPaid &&
    !!order.paymentInvoice &&
    remainingSeconds !== null &&
    remainingSeconds <= 0;

  const handleCopyQrString = async () => {
    if (!order.paymentInvoice?.paymentNumber) return;
    try {
      setCopyingQr(true);
      const rawQr = order.paymentInvoice.paymentNumber;

      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(rawQr);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = rawQr;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        textArea.style.pointerEvents = "none";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const copied = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error("Gagal menyalin string QRIS.");
        }
      }

      setCopyQrLabel("String QRIS Tersalin");
      window.setTimeout(() => setCopyQrLabel("Salin String QRIS"), 2000);
    } catch {
      setCopyQrLabel("Salin Gagal");
      window.setTimeout(() => setCopyQrLabel("Salin String QRIS"), 2000);
    } finally {
      setCopyingQr(false);
    }
  };

  const handleRequestNewQris = async () => {
    try {
      setRequestingNewQris(true);
      setActionError(null);
      const qs = token ? `?token=${encodeURIComponent(token)}` : "";
      const response = await fetch(`/api/orders/${encodeURIComponent(params.code)}/refresh-payment${qs}`, {
        method: "POST",
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal meminta QRIS baru.");
      }
      await fetchOrder(true);
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Gagal meminta QRIS baru.");
    } finally {
      setRequestingNewQris(false);
    }
  };

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#f5f7fb] lg:bg-[#161B22]`}>
      <div className="flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        {/* Header */}
        <header className="flex flex-shrink-0 items-center gap-3 bg-[#003D99] px-4 py-4 lg:mx-auto lg:mt-6 lg:w-full lg:max-w-3xl lg:rounded-[28px]">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Detail Pesanan</p>
            <p className="text-[11px] text-white/70 font-mono">{order.orderCode}</p>
          </div>
          <button
            onClick={() => fetchOrder(true)}
            disabled={refreshing}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 text-white ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-24 lg:mx-auto lg:w-full lg:max-w-3xl lg:px-0 lg:pb-14">

          {/* ── Status Banner ─────────────────────────────────────────────── */}
          {order.status === "SUCCESS" && (
            <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 lg:border-green-500/20 lg:bg-green-500/10">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-green-800 lg:text-green-50">Transaksi Berhasil!</p>
                <p className="text-[11px] text-green-600 lg:text-green-100/80">Produk sudah berhasil diproses.</p>
              </div>
            </div>
          )}

          {(order.status === "PAID" || order.status === "PROCESSING_PROVIDER") && (
            <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 lg:border-blue-500/20 lg:bg-blue-500/10">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-blue-800 lg:text-blue-50">Pembayaran Diterima</p>
                <p className="text-[11px] text-blue-600 lg:text-blue-100/80">
                  Produk sedang diproses, harap tunggu sebentar.
                </p>
              </div>
            </div>
          )}

          {order.status === "WAITING_PAYMENT" && isPendingPayment && (
            <div className="flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 lg:border-yellow-500/20 lg:bg-yellow-500/10">
              <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-yellow-800 lg:text-yellow-50">Belum Dibayar</p>
                <p className="text-[11px] text-yellow-700 lg:text-yellow-100/80">Selesaikan pembayaran sebelum kedaluwarsa.</p>
              </div>
            </div>
          )}

          {order.status === "FAILED" && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 lg:border-red-500/20 lg:bg-red-500/10">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-red-800 lg:text-red-50">Transaksi Gagal</p>
                <p className="text-[11px] text-red-600 lg:text-red-100/80">
                  {order.notes ?? "Hubungi support jika saldo sudah terpotong."}
                </p>
              </div>
            </div>
          )}

          {order.status === "REFUNDED" && (
            <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 lg:border-teal-500/20 lg:bg-teal-500/10">
              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-teal-800 lg:text-teal-50">Dana Sudah Dikembalikan</p>
                <p className="text-[11px] text-teal-700 lg:text-teal-100/80">
                  {order.notes ?? "Dana otomatis sudah masuk kembali ke saldo akun kamu."}
                </p>
              </div>
            </div>
          )}

          {order.status === "EXPIRED" && (
            <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 lg:border-orange-500/20 lg:bg-orange-500/10">
              <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-orange-800 lg:text-orange-50">Pesanan Kedaluwarsa</p>
                <p className="text-[11px] text-orange-600 lg:text-orange-100/80">Waktu pembayaran habis. Silakan buat pesanan baru.</p>
              </div>
            </div>
          )}

          {/* ── Order Card ────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
            {/* Card header */}
            <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2 border-b border-slate-100">
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Kode Pesanan</p>
                <p className="text-sm font-mono font-bold text-purple-700 lg:text-white">{order.orderCode}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Card body */}
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-slate-500">Produk</span>
                  <span className="max-w-[60%] text-right text-xs font-semibold leading-relaxed text-slate-700 lg:text-white">
                  {order.product.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Brand</span>
                <span className="text-xs text-slate-600">{order.product.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Harga Produk</span>
                <span className="text-xs font-semibold text-slate-700 lg:text-slate-100">
                  Rp {formatPrice(order.amount - order.fee)}
                </span>
              </div>
              {order.fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Biaya Admin</span>
                  <span className="text-xs text-slate-600">Rp {formatPrice(order.fee)}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-2 flex justify-between">
                <span className="text-xs font-bold text-slate-600">Total Bayar</span>
                <span className="text-sm font-black text-slate-800 lg:text-white">Rp {formatPrice(order.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Metode</span>
                <span className="text-xs text-slate-600 lg:text-slate-300">
                  {order.paymentMethod === "WALLET"
                    ? "Saldo Wallet"
                    : (order.paymentInvoice?.method?.toUpperCase() ?? "Payment Gateway")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Waktu</span>
                <span className="text-xs text-slate-600 lg:text-slate-300">{formatDate(order.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600">Data Tujuan</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="flex justify-between items-start gap-3">
                <span className="text-xs text-slate-500">Tujuan Utama</span>
                <span className="max-w-[65%] break-all text-right text-xs font-semibold text-slate-700 lg:text-white">
                  {order.targetNumber}
                </span>
              </div>

              {extraTargetEntries.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {extraTargetEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between items-start gap-3">
                      <span className="text-xs text-slate-500">{formatTargetLabel(key)}</span>
                      <span className="max-w-[65%] break-all text-right text-xs font-medium text-slate-700 lg:text-slate-100">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Serial Number ─────────────────────────────────────────────── */}
          {order.serialNumber && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 lg:border-green-500/20 lg:bg-green-500/10">
              <p className="text-[11px] font-bold text-green-700 mb-1.5">
                ✅ Serial Number / Kode Voucher
              </p>
              <p className="break-all text-base font-mono font-black tracking-wide text-green-800 lg:text-green-50">
                {order.serialNumber}
              </p>
              <p className="mt-1.5 text-[10px] text-green-600 lg:text-green-100/80">
                Screenshot atau salin kode ini sebagai bukti pembelian.
              </p>
            </div>
          )}

          {/* ── Payment Invoice ───────────────────────────────────────────── */}
          {order.paymentInvoice && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-600">Info Pembayaran</p>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Status Invoice</span>
                  <StatusBadge status={order.paymentInvoice.status} />
                </div>
                {order.paymentInvoice.method && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Metode</span>
                    <span className="text-xs text-slate-600 font-semibold uppercase">
                      {order.paymentInvoice.method}
                    </span>
                  </div>
                )}
                {order.paymentInvoice.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Dibayar pada</span>
                    <span className="text-xs text-green-700 font-semibold">
                      {formatDate(order.paymentInvoice.paidAt)}
                    </span>
                  </div>
                )}
                {order.paymentInvoice.expiredAt && order.paymentInvoice.status === "PENDING" && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Batas Bayar</span>
                    <span className="text-xs text-orange-600 font-semibold">
                      {formatDate(order.paymentInvoice.expiredAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* CTA — only show when still PENDING */}
              {isPendingPayment && (
                <div className="px-4 pb-4 space-y-3">
                  {hasInternalQris && order.paymentInvoice.paymentNumber && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:border-white/10 lg:bg-white/5">
                      <p className="text-xs font-bold text-slate-700">
                        Scan QRIS untuk membayar
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500 lg:text-slate-400">
                        QR ditampilkan langsung di aplikasi dan berlaku selama 30 menit sejak dibuat.
                      </p>
                      {remainingSeconds !== null && (
                        <div className={`mt-3 rounded-2xl px-3 py-2 text-center ${
                          isQrisExpired ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        }`}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                            {isQrisExpired ? "QRIS Kedaluwarsa" : "Sisa Waktu Pembayaran"}
                          </p>
                          <p className="mt-1 text-xl font-black">
                            {formatCountdown(remainingSeconds)}
                          </p>
                        </div>
                      )}
                      {actionError && (
                        <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-[11px] text-red-700 ring-1 ring-red-200">
                          {actionError}
                        </div>
                      )}
                      <div className="mt-4 flex justify-center">
                        <div className={`rounded-[28px] bg-white p-3 shadow-sm transition lg:shadow-none ${isQrisExpired ? "opacity-50 grayscale" : ""}`}>
                          <img
                            src={buildQrImageUrl(order.paymentInvoice.paymentNumber)}
                            alt="QRIS Payment"
                            className="h-64 w-64 rounded-2xl border border-slate-100"
                          />
                        </div>
                      </div>
                      {canRequestNewQris ? (
                        <div className="mt-4 space-y-2">
                          <button
                            onClick={handleRequestNewQris}
                            disabled={requestingNewQris}
                            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                          >
                            {requestingNewQris ? "Meminta QRIS Baru..." : "Request QRIS Baru"}
                          </button>
                          <button
                            onClick={() => router.push("/")}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 lg:border-white/10 lg:bg-white/5 lg:text-slate-200 lg:hover:bg-white/10"
                          >
                            Buat Pesanan Baru
                          </button>
                        </div>
                      ) : !isQrisExpired ? (
                        <button
                          onClick={handleCopyQrString}
                          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 lg:border-white/10 lg:bg-white/5 lg:text-slate-200 lg:hover:bg-white/10"
                        >
                          {copyingQr ? "Menyalin..." : copyQrLabel}
                        </button>
                      ) : (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-500 lg:border-white/10 lg:bg-white/5 lg:text-slate-300">
                          QRIS ini sudah tidak aktif.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Processing notice ─────────────────────────────────────────── */}
          {(order.status === "PAID" || order.status === "PROCESSING_PROVIDER") &&
            !order.serialNumber && (
              <div className="flex gap-2.5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 lg:border-blue-500/20 lg:bg-blue-500/10">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-blue-700 lg:text-blue-100/80">
                  Memproses pembelian... Serial number akan muncul di sini setelah berhasil.
                  Tekan tombol refresh untuk memperbarui status.
                </p>
              </div>
            )}

          {/* ── Back to home ──────────────────────────────────────────────── */}
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 lg:border-white/10 lg:bg-white/5 lg:text-slate-200 lg:hover:bg-white/10"
          >
            ← Kembali ke Beranda
          </button>
        </div>

        <BottomNavigation />
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetailPageContent />
    </Suspense>
  );
}
