"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import MerchantSidebar from "@/components/merchant/Sidebar";
import MerchantHeader from "@/components/merchant/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface MerchantOrder {
  id: string;
  orderCode: string;
  status: string;
  amount: number;
  sellerGrossProfit: number;
  sellerFeeAmount: number;
  sellerCommission: number;
  paymentMethod: string;
  targetNumber: string;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
  retryAllowed: boolean;
  product: { id: string; name: string; brand: string; category: string };
  customer: { id: string; name: string | null; email: string | null; phone: string | null } | null;
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusMeta(status: string) {
  if (status === "SUCCESS") {
    return { label: "Sukses", className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" };
  }
  if (status === "FAILED") {
    return { label: "Gagal", className: "bg-rose-100 text-rose-700 ring-1 ring-rose-200" };
  }
  if (status === "PAID") {
    return { label: "Dibayar", className: "bg-blue-100 text-blue-700 ring-1 ring-blue-200" };
  }
  if (status === "PROCESSING_PROVIDER") {
    return { label: "Diproses", className: "bg-sky-100 text-sky-700 ring-1 ring-sky-200" };
  }
  if (status === "WAITING_PAYMENT") {
    return { label: "Menunggu", className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" };
  }
  if (status === "EXPIRED") {
    return { label: "Expired", className: "bg-slate-200 text-slate-700 ring-1 ring-slate-300" };
  }

  return { label: status, className: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" };
}

export default function MerchantOrdersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [mode, setMode] = useState<"all" | "today">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { toasts, removeToast, error: showError, success: showSuccess } = useToast();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        mode,
      });
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/merchant/orders?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal memuat transaksi merchant");
      setOrders(json.data);
      setTotal(json.pagination?.total ?? 0);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Gagal memuat transaksi merchant";
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, mode, page, search, showError, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const retryOrder = async (orderId: string) => {
    setRetryingId(orderId);
    try {
      const res = await fetch(`/api/merchant/orders/${orderId}/retry`, { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Retry order gagal");
      showSuccess("Retry order berhasil dijalankan.");
      await loadOrders();
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Retry order gagal";
      showError(message);
    } finally {
      setRetryingId(null);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      format: "csv",
      mode,
    });
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("q", search.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.open(`/api/merchant/orders?${params.toString()}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <MerchantSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <MerchantHeader
            title="Transaksi Merchant"
            subtitle="Lihat order masuk, status provider, dan retry saat order gagal."
            onMenuClick={() => setSidebarOpen(true)}
          />

          <section className="rounded-2xl bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="mb-5 flex flex-col gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Daftar Transaksi Merchant</p>
                  <p className="text-xs text-slate-400">Filter transaksi berdasarkan waktu, status, dan kata kunci.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-full bg-slate-100 p-0.5">
                    {(["all", "today"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setMode(item);
                          setPage(1);
                          if (item === "today") {
                            const today = new Date().toISOString().slice(0, 10);
                            setDateFrom(today);
                            setDateTo(today);
                          }
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          mode === item ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {item === "all" ? "Semua" : "Hari ini"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex rounded-2xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari order ID, produk, pelanggan, atau target..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                >
                  <option value="">Semua Status</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILED">FAILED</option>
                  <option value="PAID">PAID</option>
                  <option value="PROCESSING_PROVIDER">PROCESSING_PROVIDER</option>
                  <option value="WAITING_PAYMENT">WAITING_PAYMENT</option>
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Dari Tanggal
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setMode("all");
                      setPage(1);
                    }}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  Sampai Tanggal
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setMode("all");
                      setPage(1);
                    }}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setMode("all");
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                  className="self-end rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Reset Filter
                </button>
              </div>
            </div>
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Memuat transaksi merchant...</div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center sm:rounded-3xl">
                <p className="text-sm font-medium text-slate-600">Belum ada transaksi merchant</p>
                <p className="mt-1 text-xs text-slate-400">Transaksi dari storefront merchant akan muncul di sini. Coba ubah filter jika data belum terlihat.</p>
              </div>
            ) : (
              <div className="mt-4">
                <div className="hidden grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_0.8fr] gap-3 px-3 text-xs text-slate-400 md:grid">
                  <span>Order ID</span>
                  <span>Produk</span>
                  <span>Pelanggan</span>
                  <span>Status</span>
                  <span>Masuk</span>
                  <span>Waktu</span>
                </div>
                <div className="mt-3 space-y-3">
                {orders.map((order) => (
                  <Link key={order.id} href={`/merchant/orders/${order.id}`} className="block rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100 md:grid md:grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_0.8fr] md:items-center md:gap-3 md:rounded-2xl">
                    <div className="flex items-center justify-between md:block">
                      <span className="text-xs font-semibold text-slate-700">{order.orderCode}</span>
                      <span className="text-xs text-slate-500 md:hidden">{new Date(order.createdAt).toLocaleDateString("id-ID")}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600 md:mt-0">
                      <p className="font-medium text-slate-700">{order.product.name}</p>
                      <p className="mt-0.5 text-slate-400">{order.product.brand} • {order.targetNumber}</p>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 md:mt-0">
                      <p>{order.customer?.name || order.customer?.email || order.customer?.phone || "Guest"}</p>
                      <p className="mt-0.5 text-slate-400">{order.paymentMethod} • {order.provider || "-"}</p>
                    </div>
                    <div className="mt-2 md:mt-0">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta(order.status).className}`}>
                        {statusMeta(order.status).label}
                      </span>
                    </div>
                    <div className="mt-2 md:mt-0">
                      <p className="text-xs font-bold text-emerald-600">{rupiah(order.sellerCommission)}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">Fee {rupiah(order.sellerFeeAmount)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 md:mt-0 md:block">
                      <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString("id-ID")}</span>
                      {order.retryAllowed && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            retryOrder(order.id);
                          }}
                          disabled={retryingId === order.id}
                          className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                        >
                          {retryingId === order.id ? "Retry..." : "Retry"}
                        </button>
                      )}
                    </div>
                  </Link>
                ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col items-center justify-between gap-2 text-xs text-slate-400 sm:flex-row">
                    <span>
                      {total === 0 ? "Belum ada data" : `Menampilkan ${(page - 1) * 10 + 1}–${Math.min(page * 10, total)} dari ${total} entri`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={page === 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        ←
                      </button>
                      {Array.from({ length: totalPages }, (_, index) => index + 1)
                        .slice(Math.max(0, page - 3), Math.max(0, page - 3) + 5)
                        .map((pageNumber) => (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => setPage(pageNumber)}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${
                              pageNumber === page ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        ))}
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        disabled={page === totalPages}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
