"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import BottomNavigation from "@/components/BottomNavigation";
import AppHeader from "@/components/AppHeader";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  orderCode: string;
  status: string;
  amount: number;
  paymentMethod: string;
  targetNumber: string;
  serialNumber: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    brand: string;
    category: string;
  };
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Tab config ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "menunggu",   label: "Menunggu Pembayaran" },
  { key: "diproses",   label: "Diproses" },
  { key: "dikirim",    label: "Dikirim" },
  { key: "selesai",    label: "Selesai" },
  { key: "dibatalkan", label: "Dibatalkan" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case "SUCCESS":
      return { label: "Selesai",             cls: "bg-emerald-100 text-emerald-700" };
    case "PAID":
      return { label: "Dibayar",             cls: "bg-blue-100 text-blue-700" };
    case "PROCESSING_PROVIDER":
      return { label: "Diproses",            cls: "bg-blue-100 text-blue-700" };
    case "WAITING_PAYMENT":
      return { label: "Menunggu Bayar",      cls: "bg-amber-100 text-amber-700" };
    case "CREATED":
      return { label: "Dibuat",              cls: "bg-amber-100 text-amber-700" };
    case "FAILED":
      return { label: "Gagal",               cls: "bg-rose-100 text-rose-600" };
    case "EXPIRED":
      return { label: "Kedaluwarsa",         cls: "bg-slate-100 text-slate-500" };
    case "REFUNDED":
      return { label: "Dikembalikan",        cls: "bg-purple-100 text-purple-600" };
    default:
      return { label: status,                cls: "bg-slate-100 text-slate-500" };
  }
}

function brandColor(brand: string): string {
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-rose-500", "bg-amber-500",
    "bg-emerald-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash += brand.charCodeAt(i);
  return colors[hash % colors.length];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TransaksiPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("menunggu");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const tabScrollRef = useRef<HTMLDivElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.isLoggedIn) { router.replace("/login"); return; }
        setAuthChecked(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // ─── Fetch orders ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(
    async (tab: TabKey, q: string, pg: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ tab, page: String(pg) });
        if (q) params.set("q", q);
        const res  = await fetch(`/api/transaksi?${params}`, { cache: "no-store" });
        const data = await res.json();
        if (data.success) {
          setOrders(data.data);
          setMeta(data.meta);
        }
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!authChecked) return;
    fetchOrders(activeTab, search, page);
  }, [authChecked, activeTab, search, page, fetchOrders]);

  // ─── Tab switch ────────────────────────────────────────────────────────────
  const handleTab = (key: TabKey) => {
    setActiveTab(key);
    setPage(1);
    setSearch("");
    setSearchInput("");
  };

  // ─── Search debounce ───────────────────────────────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

  // ─── Scroll active tab into view ───────────────────────────────────────────
  useEffect(() => {
    if (!tabScrollRef.current) return;
    const active = tabScrollRef.current.querySelector(`[data-active="true"]`) as HTMLElement | null;
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeTab]);

  // ─── Auth pending: show skeleton shell (same bg as loaded state, no black flash) ──
  if (!authChecked) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
        <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
          {/* Header skeleton */}
          <AppHeader />
          <div className="fixed left-1/2 top-[60px] z-30 w-full max-w-[480px] -translate-x-1/2 bg-[#003D99] lg:max-w-7xl lg:bg-[#171D25]">
            <div className="flex items-center gap-2 px-4 pb-3 lg:px-5 lg:pb-4 lg:pt-2">
              <div className="h-9 flex-1 rounded-md bg-white/20 animate-pulse" />
              <div className="h-9 w-20 rounded-md bg-white/20 animate-pulse" />
            </div>
            <div className="flex gap-2 px-4 pb-3 lg:px-5 lg:pb-4">
              {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-28 flex-shrink-0 rounded-full bg-white/20 animate-pulse" />)}
            </div>
          </div>
          {/* Content skeleton */}
          <div className="flex flex-col gap-3 px-4 pt-5 lg:mx-auto lg:w-full lg:max-w-6xl lg:px-0 lg:pt-8">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 animate-pulse lg:border-white/10 lg:bg-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                  <div className="h-5 w-16 bg-slate-200 rounded-full" />
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">

        {/* ══════ HEADER ══════ */}
        <AppHeader onBack={() => router.back()} />

        {/* Search + Tabs strip */}
        <div
          className="fixed top-[60px] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 bg-[#003D99] lg:max-w-7xl lg:bg-[#171D25]"
        >
          {/* Search row */}
          <div className="flex items-center gap-2 px-4 pb-3 pt-2 lg:px-5 lg:pb-4 lg:pt-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari ID Pesanan/Nama Barang"
                className="w-full pl-9 pr-3 py-2 rounded-md bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300 text-[13px]"
              />
            </div>
            <button className="flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-white/25">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </button>
          </div>

          {/* Status tabs */}
          <div
            ref={tabScrollRef}
            className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide lg:px-5 lg:pb-4"
            style={{ scrollbarWidth: "none" }}
          >
            {TABS.map((t) => (
              <button
                key={t.key}
                data-active={activeTab === t.key}
                onClick={() => handleTab(t.key)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold transition whitespace-nowrap ${
                  activeTab === t.key
                    ? "bg-white text-[#003D99]"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════ CONTENT ══════ */}
        {/* AppHeader ~60px + search row ~48px + tabs row ~44px = ~152px */}
        <div className="flex-1 overflow-y-auto pt-[160px] pb-24 lg:pb-14">
          <div className="lg:mx-auto lg:w-full lg:max-w-6xl lg:px-0">

          {/* Info banner */}
          <div className="mx-4 mt-3 mb-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 lg:mt-6 lg:border-amber-500/20 lg:bg-amber-500/10">
            <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p className="text-[12px] leading-snug text-amber-700 lg:text-amber-100">
              Hubungi{" "}
              <span className="cursor-pointer font-bold text-[#003D99] lg:text-white">Customer Support</span>
              {" "}jika status pembayaran tidak berubah hingga 5 menit sejak kamu melakukan pembayaran.
            </p>
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="flex flex-col gap-3 px-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 animate-pulse lg:border-white/10 lg:bg-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                    <div className="h-5 w-16 bg-slate-200 rounded-full" />
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center px-8 py-16">
              {/* Robot illustration SVG */}
              <div className="w-44 h-44 mb-4">
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Body/spaceship base */}
                  <ellipse cx="100" cy="160" rx="55" ry="18" fill="#7C3AED" opacity="0.3"/>
                  <ellipse cx="100" cy="156" rx="50" ry="14" fill="#7C3AED" opacity="0.5"/>
                  {/* Spaceship bottom */}
                  <ellipse cx="100" cy="148" rx="42" ry="10" fill="#6D28D9"/>
                  {/* Robot body */}
                  <rect x="68" y="90" width="64" height="58" rx="14" fill="#60A5FA"/>
                  {/* Robot head */}
                  <rect x="72" y="52" width="56" height="46" rx="12" fill="#93C5FD"/>
                  {/* Antenna */}
                  <line x1="100" y1="52" x2="100" y2="36" stroke="#94A3B8" strokeWidth="3"/>
                  <circle cx="100" cy="32" r="5" fill="#FCD34D"/>
                  {/* Eyes — sad */}
                  <ellipse cx="87" cy="70" rx="6" ry="7" fill="white"/>
                  <ellipse cx="113" cy="70" rx="6" ry="7" fill="white"/>
                  <circle cx="87" cy="72" r="3.5" fill="#1E3A8A"/>
                  <circle cx="113" cy="72" r="3.5" fill="#1E3A8A"/>
                  {/* Sad mouth */}
                  <path d="M89 85 Q100 79 111 85" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  {/* Chest panel */}
                  <rect x="80" y="102" width="40" height="28" rx="6" fill="#BFDBFE"/>
                  <circle cx="90" cy="112" r="4" fill="#3B82F6"/>
                  <circle cx="100" cy="112" r="4" fill="#F59E0B"/>
                  <rect x="84" y="120" width="32" height="4" rx="2" fill="#93C5FD"/>
                  {/* Arms */}
                  <rect x="44" y="96" width="24" height="12" rx="6" fill="#60A5FA"/>
                  <rect x="132" y="96" width="24" height="12" rx="6" fill="#60A5FA"/>
                  {/* VCG badge on chest */}
                  <text x="100" y="133" textAnchor="middle" fill="#3B82F6" fontSize="7" fontWeight="bold">VCG</text>
                </svg>
              </div>
              <p className="text-center text-sm font-medium text-slate-500 lg:text-slate-100">
                Belum ada data di status transaksi ini
              </p>
              {search && (
                <p className="mt-1 text-center text-xs text-slate-400 lg:text-slate-400">
                  Tidak ada hasil untuk &ldquo;{search}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Order list */}
          {!loading && orders.length > 0 && (
            <div className="flex flex-col gap-3 px-4">
              {orders.map((order) => {
                const badge = statusBadge(order.status);
                const bColor = brandColor(order.product.brand);
                const initial = order.product.brand.charAt(0).toUpperCase();
                return (
                  <div
                    key={order.id}
                    className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none"
                  >
                    {/* Top section */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      {/* Brand icon */}
                      <div className={`w-11 h-11 rounded-xl ${bColor} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                        {initial}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800 lg:text-white">
                          {order.product.name}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400 lg:text-slate-400">
                          {order.product.brand} &middot; {order.targetNumber}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="mx-4 border-t border-slate-50 lg:border-white/10" />

                    {/* Bottom section */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 lg:text-slate-400">
                          {order.orderCode}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400 lg:text-slate-400">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <p className="text-base font-bold text-slate-800 lg:text-white">
                        {formatRupiah(order.amount)}
                      </p>
                    </div>

                    {/* CTA for waiting payment */}
                    {(order.status === "WAITING_PAYMENT" || order.status === "CREATED") && (
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => router.push(`/akun/pesanan/${encodeURIComponent(order.orderCode)}`)}
                          className="w-full bg-[#003D99] hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-semibold py-2.5 rounded-xl transition"
                        >
                          Bayar Sekarang
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 lg:border-white/15 lg:text-slate-200 lg:hover:bg-white/10"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-sm font-medium text-slate-500 lg:text-slate-300">
                    {page} / {meta.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={page === meta.totalPages}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 lg:border-white/15 lg:text-slate-200 lg:hover:bg-white/10"
                  >
                    Berikutnya
                  </button>
                </div>
              )}

              {/* Total count */}
              {meta && (
                <p className="pb-2 text-center text-[11px] text-slate-400 lg:text-slate-500">
                  {meta.total} transaksi ditemukan
                </p>
              )}
            </div>
          )}
          </div>
        </div>

        <BottomNavigation />
      </div>
    </div>
  );
}
