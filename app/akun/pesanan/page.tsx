"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SUCCESS:              { label: "Sukses",                cls: "bg-green-100 text-green-700" },
    PAID:                 { label: "Dibayar",               cls: "bg-blue-100 text-blue-700" },
    WAITING_PAYMENT:      { label: "Menunggu Bayar",        cls: "bg-yellow-100 text-yellow-700" },
    PROCESSING_PROVIDER:  { label: "Sedang Diproses",       cls: "bg-purple-100 text-purple-700" },
    CREATED:              { label: "Dibuat",                cls: "bg-slate-100 text-slate-600" },
    FAILED:               { label: "Gagal",                 cls: "bg-red-100 text-red-700" },
    EXPIRED:              { label: "Kedaluwarsa",           cls: "bg-orange-100 text-orange-700" },
    REFUNDED:             { label: "Dikembalikan",          cls: "bg-teal-100 text-teal-700" },
  };
  const info = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${info.cls}`}>
      {info.label}
    </span>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  orderCode: string;
  status: string;
  amount: number;
  fee: number;
  paymentMethod: string;
  serialNumber: string | null;
  createdAt: string;
  updatedAt: string;
  product: { name: string; brand: string; category: string };
  paymentInvoice: {
    status: string;
    method: string | null;
    paymentUrl: string | null;
    expiredAt: string | null;
    paidAt: string | null;
  } | null;
}

// ── Main Component ────────────────────────────────────────────────────────────
function PesananPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderCodeParam = searchParams.get("orderCode");
  const tokenParam = searchParams.get("token");

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading
  const [singleOrder, setSingleOrder] = useState<OrderItem | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search form for guests
  const [searchCode, setSearchCode] = useState("");
  const [searchToken, setSearchToken] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ── Fetch session + decide what to load ──────────────────────────────────
  useEffect(() => {
    async function init() {
      // Check login status
      const meRes = await fetch("/api/auth/me").then((r) => r.json()).catch(() => ({ isLoggedIn: false }));
      const loggedIn: boolean = meRes.isLoggedIn === true;
      setIsLoggedIn(loggedIn);

      // Case 1: URL has orderCode + token → load single order (guest deep-link)
      if (orderCodeParam) {
        await loadSingleOrder(orderCodeParam, tokenParam ?? undefined, loggedIn);
        setLoading(false);
        return;
      }

      // Case 2: Logged in → load orders list
      if (loggedIn) {
        await loadOrdersList();
        setLoading(false);
        return;
      }

      // Case 3: Guest, no params → show search form
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSingleOrder = useCallback(async (code: string, token?: string, loggedIn?: boolean) => {
    try {
      const qs = token ? `?token=${encodeURIComponent(token)}` : "";
      const res = await fetch(`/api/orders/${encodeURIComponent(code)}${qs}`);
      const data = await res.json();
      if (data.success) {
        setSingleOrder(data.data as OrderItem);
      } else {
        setError(data.error ?? "Pesanan tidak ditemukan.");
      }
    } catch {
      setError("Gagal memuat pesanan.");
    }
  }, []);

  const loadOrdersList = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?limit=20");
      const data = await res.json();
      if (data.success) setOrders(data.data);
      else setError(data.error ?? "Gagal memuat pesanan.");
    } catch {
      setError("Gagal memuat pesanan.");
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const qs = searchToken.trim() ? `?token=${encodeURIComponent(searchToken.trim())}` : "";
      const res = await fetch(`/api/orders/${encodeURIComponent(searchCode.trim())}${qs}`);
      const data = await res.json();
      if (data.success) {
        setSingleOrder(data.data as OrderItem);
      } else {
        setSearchError(data.error ?? "Pesanan tidak ditemukan.");
      }
    } catch {
      setSearchError("Gagal mencari pesanan.");
    } finally {
      setSearching(false);
    }
  };

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading || isLoggedIn === null) {
    return (
      <div className={`${quicksand.className} min-h-screen bg-[#f5f7fb] flex justify-center`}>
        <div className="w-full max-w-[480px] min-h-screen flex flex-col pb-20">
          <div className="bg-[#003D99] px-4 py-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-white/20 rounded animate-pulse" />
            <div className="h-4 w-24 bg-white/20 rounded animate-pulse" />
          </div>
          <div className="flex-1 px-4 py-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-3 w-32 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-48 bg-slate-100 rounded mb-3" />
                <div className="h-4 w-24 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Single Order Detail View ──────────────────────────────────────────────
  const renderSingleOrder = (order: OrderItem) => (
    <div className="flex-1 px-4 py-4 pb-24 space-y-3">
      {/* Status card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-[11px] text-slate-400 mb-0.5">Kode Pesanan</p>
            <p className="text-sm font-mono font-bold text-purple-700">{order.orderCode}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-slate-500">Produk</span>
            <span className="text-xs font-semibold text-slate-700 text-right max-w-[60%]">{order.product.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-500">Brand</span>
            <span className="text-xs text-slate-600">{order.product.brand}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-500">Total Bayar</span>
            <span className="text-sm font-bold text-slate-800">Rp {formatPrice(order.amount)}</span>
          </div>
          {order.fee > 0 && (
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Biaya Admin</span>
              <span className="text-xs text-slate-600">Rp {formatPrice(order.fee)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-xs text-slate-500">Metode</span>
            <span className="text-xs text-slate-600">
              {order.paymentMethod === "WALLET" ? "Saldo Wallet" : (order.paymentInvoice?.method?.toUpperCase() ?? "Payment Gateway")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-500">Waktu</span>
            <span className="text-xs text-slate-600">{formatDate(order.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Serial Number */}
      {order.serialNumber && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-green-700 mb-1">Serial Number / Kode Voucher</p>
          <p className="text-base font-mono font-black text-green-800 tracking-wide break-all">{order.serialNumber}</p>
        </div>
      )}

      {/* Payment Invoice */}
      {order.paymentInvoice && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-600 mb-2">Info Pembayaran</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Status Invoice</span>
              <StatusBadge status={order.paymentInvoice.status} />
            </div>
            {order.paymentInvoice.paidAt && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Dibayar</span>
                <span className="text-xs text-slate-600">{formatDate(order.paymentInvoice.paidAt)}</span>
              </div>
            )}
            {order.paymentInvoice.expiredAt && order.paymentInvoice.status === "PENDING" && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Kedaluwarsa</span>
                <span className="text-xs text-orange-600">{formatDate(order.paymentInvoice.expiredAt)}</span>
              </div>
            )}
            {order.paymentInvoice.paymentUrl && order.paymentInvoice.status === "PENDING" && (
              <a
                href={`/akun/pesanan/${encodeURIComponent(order.orderCode)}`}
                className="mt-1 block w-full text-center py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors"
              >
                Selesaikan Pembayaran →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Processing info */}
      {(order.status === "PAID" || order.status === "PROCESSING_PROVIDER") && !order.serialNumber && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex gap-2.5">
          <span className="text-blue-500 text-base">ℹ️</span>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Produk sedang diproses. Serial number akan muncul di sini setelah berhasil.
            Refresh halaman untuk update status.
          </p>
        </div>
      )}
    </div>
  );

  // ── Orders List View ──────────────────────────────────────────────────────
  const renderOrdersList = () => (
    <div className="flex-1 px-4 py-4 pb-24 space-y-2">
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-1">Belum ada pesanan</p>
          <p className="text-xs text-slate-400">Yuk mulai top up game favoritmu!</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-5 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold"
          >
            Mulai Belanja
          </button>
        </div>
      ) : (
        orders.map((order) => (
          <button
            key={order.orderCode}
            onClick={() => setSingleOrder(order)}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-purple-200 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-slate-700 flex-1 truncate">{order.product.name}</p>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-mono">{order.orderCode}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
              </div>
              <p className="text-sm font-bold text-slate-800">Rp {formatPrice(order.amount)}</p>
            </div>
            {order.serialNumber && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-[10px] font-mono text-green-700 truncate">{order.serialNumber}</p>
              </div>
            )}
          </button>
        ))
      )}
    </div>
  );

  // ── Guest Search Form ─────────────────────────────────────────────────────
  const renderGuestSearch = () => (
    <div className="flex-1 px-4 py-6 pb-24">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Cek Status Pesanan</p>
            <p className="text-[11px] text-slate-400">Masukkan kode pesanan untuk melihat status</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Kode Pesanan</label>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              placeholder="Contoh: WP-260223-ABC123"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">
              Token Akses <span className="text-slate-400 font-normal">(opsional — dari email konfirmasi)</span>
            </label>
            <input
              type="text"
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              placeholder="Token keamanan pesanan guest"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
            />
          </div>

          {searchError && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600 font-medium">{searchError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!searchCode.trim() || searching}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              searchCode.trim() && !searching
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {searching ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Mencari...
              </>
            ) : "Cari Pesanan"}
          </button>
        </form>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-slate-400 mb-2">Punya akun? Login untuk lihat semua pesanan</p>
        <button
          onClick={() => router.push("/masuk")}
          className="text-sm font-semibold text-purple-600 hover:text-purple-700"
        >
          Login Sekarang →
        </button>
      </div>
    </div>
  );

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className={`${quicksand.className} min-h-screen bg-[#f5f7fb] flex justify-center`}>
      <div className="w-full max-w-[480px] min-h-screen bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <header className="bg-[#003D99] px-4 py-4 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => {
              // Jika sedang melihat single order dari list, kembali ke list
              if (singleOrder && !orderCodeParam && isLoggedIn) {
                setSingleOrder(null);
              } else {
                router.back();
              }
            }}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">
              {singleOrder ? "Detail Pesanan" : "Pesanan Saya"}
            </p>
            {singleOrder && (
              <p className="text-[11px] text-white/70 font-mono">{singleOrder.orderCode}</p>
            )}
          </div>
          {isLoggedIn && !singleOrder && (
            <button
              onClick={loadOrdersList}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              title="Refresh"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </header>

        {/* Error state */}
        {error && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-20">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">{error}</p>
            <button onClick={() => router.push("/")} className="mt-3 text-sm text-purple-600 font-semibold">
              Kembali ke Beranda
            </button>
          </div>
        )}

        {/* Content */}
        {!error && (
          <>
            {singleOrder
              ? renderSingleOrder(singleOrder)
              : isLoggedIn
              ? renderOrdersList()
              : renderGuestSearch()}
          </>
        )}

        <BottomNavigation />
      </div>
    </div>
  );
}

export default function PesananPage() {
  return (
    <Suspense fallback={null}>
      <PesananPageContent />
    </Suspense>
  );
}
