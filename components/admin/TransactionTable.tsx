"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface OrderRow {
  id: string;
  orderCode: string;
  user: { phone: string | null; name: string | null } | null;
  product: { name: string } | null;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

type FilterMode = "all" | "today";

const PAGE_SIZE = 10;

function maskPhone(val: string | null | undefined): string {
  if (!val) return "–";
  if (val.length <= 6) return val;
  return val.slice(0, 4) + "****" + val.slice(-3);
}

function statusStyle(status: string): string {
  if (status === "SUCCESS")  return "bg-emerald-100 text-emerald-600";
  if (status === "FAILED" || status === "EXPIRED" || status === "REFUNDED")
    return "bg-rose-100 text-rose-600";
  if (status === "PROCESSING_PROVIDER" || status === "PAID")
    return "bg-blue-100 text-blue-600";
  return "bg-amber-100 text-amber-600"; // CREATED, WAITING_PAYMENT
}

function statusLabel(status: string): string {
  if (status === "SUCCESS")              return "Sukses";
  if (status === "FAILED")               return "Gagal";
  if (status === "EXPIRED")              return "Expired";
  if (status === "REFUNDED")             return "Refund";
  if (status === "PROCESSING_PROVIDER")  return "Proses";
  if (status === "PAID")                 return "Dibayar";
  if (status === "WAITING_PAYMENT")      return "Menunggu";
  return "Dibuat";
}

export default function TransactionTable() {
  const [rows, setRows]           = useState<OrderRow[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter]       = useState<FilterMode>("all");
  const [loading, setLoading]     = useState(true);

  const fetchData = useCallback(async (pg: number, mode: FilterMode) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:     String(pg),
        pageSize: String(PAGE_SIZE),
        orderBy:  "createdAt",
      });
      if (mode === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.set("dateFrom", today.toISOString());
      }
      const res  = await fetch(`/api/admin/transactions?${params}`);
      const json = await res.json();
      if (json.success) {
        setRows(json.data);
        setTotal(json.total ?? json.data.length);
        setTotalPages(json.totalPages ?? 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page, filter);
  }, [page, filter, fetchData]);

  const switchFilter = (mode: FilterMode) => {
    setFilter(mode);
    setPage(1);
  };

  // Show at most 5 page buttons centred around current page
  const pageButtons = () => {
    const buttons: number[] = [];
    const half = 2;
    let start = Math.max(1, page - half);
    let end   = Math.min(totalPages, start + 4);
    start     = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) buttons.push(i);
    return buttons;
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Transaksi Terbaru</p>
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-0.5">
          {(["all", "today"] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => switchFilter(mode)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === mode ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {mode === "all" ? "Semua" : "Hari ini"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 sm:mt-5">
        {/* Column headers (desktop) */}
        <div className="hidden grid-cols-[1.1fr_0.8fr_1.3fr_1fr_0.7fr_0.8fr] gap-3 px-3 text-xs text-slate-400 md:grid">
          <span>Order ID</span>
          <span>Tanggal</span>
          <span>Produk</span>
          <span>Pelanggan</span>
          <span>Status</span>
          <span>Jumlah</span>
        </div>

        {/* Rows */}
        <div className={`mt-3 space-y-2 sm:space-y-3 transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
          {rows.length === 0 && !loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada transaksi</p>
          ) : rows.map((row) => {
            const customer = row.user
              ? maskPhone(row.user.phone ?? row.user.name)
              : "–";
            const amountStr = new Intl.NumberFormat("id-ID", {
              style: "currency", currency: "IDR", maximumFractionDigits: 0,
            }).format(row.amount);
            const dateStr = new Date(row.createdAt).toLocaleDateString("id-ID", {
              day: "2-digit", month: "2-digit", year: "numeric",
            });

            return (
              <Link
                key={row.id}
                href={`/admin/transactions/${row.id}`}
                className="block rounded-xl bg-slate-50 p-3 hover:bg-slate-100 transition-colors md:grid md:grid-cols-[1.1fr_0.8fr_1.3fr_1fr_0.7fr_0.8fr] md:items-center md:gap-3 md:rounded-2xl"
              >
                <div className="flex items-center justify-between md:contents">
                  <span className="text-xs font-semibold text-slate-700">{row.orderCode}</span>
                  <span className="text-xs text-slate-500 md:hidden">{dateStr}</span>
                </div>
                <span className="hidden text-xs text-slate-500 md:inline">{dateStr}</span>
                <div className="mt-1 md:mt-0">
                  <span className="text-xs text-slate-600 line-clamp-1">{row.product?.name ?? "–"}</span>
                </div>
                <span className="hidden text-xs text-slate-500 md:inline">{customer}</span>
                <div className="mt-2 flex items-center justify-between md:mt-0 md:contents">
                  <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle(row.status)}`}>
                    {statusLabel(row.status)}
                  </span>
                  <span className="text-xs font-bold text-slate-700">{amountStr}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer: count + pagination */}
        <div className="mt-4 flex flex-col items-center justify-between gap-2 text-xs text-slate-400 sm:flex-row sm:gap-0">
          <span className="hidden sm:inline">
            {total === 0
              ? "Belum ada data"
              : `Menampilkan ${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, total)} dari ${total} entri`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                ←
              </button>
              {pageButtons().map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${
                    p === page ? "bg-[#2563eb] text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
