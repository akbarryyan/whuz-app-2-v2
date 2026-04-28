"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface Merchant {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  description: string | null;
  profileImageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeSellerProductsCount: number;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    walletBalance: number;
    _count: {
      sellerProducts: number;
      sellerOrders: number;
    };
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRp(value: number) {
  return "Rp " + value.toLocaleString("id-ID");
}

export default function AdminMerchantsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [ownerStatusFilter, setOwnerStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"newest" | "products" | "transactions">("newest");
  const [page, setPage] = useState(1);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailMerchant, setDetailMerchant] = useState<Merchant | null>(null);
  const [showCopyProductsModal, setShowCopyProductsModal] = useState(false);
  const [copySourceMerchantId, setCopySourceMerchantId] = useState("");
  const [copyingProducts, setCopyingProducts] = useState(false);
  const toast = useToast();

  const loadMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/merchants");
      const data = await res.json();
      if (data.success) {
        setMerchants(data.data);
      } else {
        toast.error(data.error ?? "Gagal memuat merchant");
      }
    } catch {
      toast.error("Gagal memuat merchant");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMerchants();
  }, [loadMerchants]);

  async function toggleMerchant(merchant: Merchant) {
    setTogglingId(merchant.id);
    try {
      const res = await fetch(`/api/admin/merchants/${merchant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !merchant.isActive }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error ?? "Gagal mengubah status merchant");
        return;
      }

      setMerchants((prev) =>
        prev.map((item) =>
          item.id === merchant.id ? { ...item, isActive: data.data.isActive } : item
        )
      );
      setDetailMerchant((prev) =>
        prev && prev.id === merchant.id ? { ...prev, isActive: data.data.isActive } : prev
      );

      toast.success(
        data.data.isActive
          ? `${merchant.displayName} diaktifkan`
          : `${merchant.displayName} dinonaktifkan`
      );
    } catch {
      toast.error("Gagal mengubah status merchant");
    } finally {
      setTogglingId(null);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAll(checked: boolean, ids: string[]) {
    setSelectedIds(checked ? ids : []);
  }

  async function runBulkToggle(isActive: boolean) {
    if (selectedIds.length === 0) {
      toast.error("Pilih merchant terlebih dahulu.");
      return;
    }

    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/merchants/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, isActive }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error ?? "Gagal mengubah status merchant massal");
        return;
      }

      setMerchants((prev) =>
        prev.map((merchant) =>
          selectedIds.includes(merchant.id) ? { ...merchant, isActive } : merchant
        )
      );
      setSelectedIds([]);
      toast.success(
        `${data.data.count} merchant berhasil ${isActive ? "diaktifkan" : "dinonaktifkan"}`
      );
    } catch {
      toast.error("Gagal mengubah status merchant massal");
    } finally {
      setBulkLoading(false);
    }
  }

  async function copyProductsToSelectedMerchants() {
    if (!copySourceMerchantId) {
      toast.error("Pilih merchant sumber terlebih dahulu.");
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("Pilih merchant target terlebih dahulu.");
      return;
    }

    setCopyingProducts(true);
    try {
      const res = await fetch("/api/admin/merchants/copy-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceMerchantId: copySourceMerchantId,
          targetMerchantIds: selectedIds,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error ?? "Gagal menyalin produk merchant");
        return;
      }

      setShowCopyProductsModal(false);
      setCopySourceMerchantId("");
      setSelectedIds([]);
      await loadMerchants();
      toast.success(
        `${data.data.createdCount} produk template berhasil ditambahkan ke ${data.data.targetCount} merchant target`
      );
    } catch {
      toast.error("Gagal menyalin produk merchant");
    } finally {
      setCopyingProducts(false);
    }
  }

  async function copyStorefrontLink(slug: string) {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/seller/${slug}`
        : `/seller/${slug}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link storefront berhasil disalin.");
    } catch {
      toast.error("Gagal menyalin link storefront.");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merchants.filter((merchant) => {
      const matchesSearch =
        !q ||
        merchant.displayName.toLowerCase().includes(q) ||
        merchant.slug.toLowerCase().includes(q) ||
        (merchant.user.name ?? "").toLowerCase().includes(q) ||
        (merchant.user.email ?? "").toLowerCase().includes(q) ||
        (merchant.user.phone ?? "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? merchant.isActive : !merchant.isActive);

      const matchesOwnerStatus =
        ownerStatusFilter === "all" ||
        (ownerStatusFilter === "active" ? merchant.user.isActive : !merchant.user.isActive);

      return matchesSearch && matchesStatus && matchesOwnerStatus;
    });
  }, [merchants, ownerStatusFilter, search, statusFilter]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    if (sortBy === "products") {
      items.sort((a, b) => b.activeSellerProductsCount - a.activeSellerProductsCount || b.user._count.sellerProducts - a.user._count.sellerProducts);
      return items;
    }
    if (sortBy === "transactions") {
      items.sort((a, b) => b.user._count.sellerOrders - a.user._count.sellerOrders);
      return items;
    }
    items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return items;
  }, [filtered, sortBy]);

  const stats = useMemo(() => {
    return {
      total: merchants.length,
      active: merchants.filter((merchant) => merchant.isActive).length,
      inactive: merchants.filter((merchant) => !merchant.isActive).length,
    };
  }, [merchants]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [page, sorted]
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, ownerStatusFilter, sortBy]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const allVisibleIds = paginated.map((merchant) => merchant.id);
  const allVisibleSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <div>
            <h1 className="text-xl font-bold text-slate-800">🏪 Kelola Merchant</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Lihat daftar merchant yang terdaftar, cek pemilik toko, dan aktifkan atau nonaktifkan merchant dari panel admin.
            </p>
          </div>

          {!loading && (
            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                Total: {stats.total}
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                Aktif: {stats.active}
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                Nonaktif: {stats.inactive}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama toko, slug, nama user, email, nomor HP..."
              className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none transition"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
            <select
              value={ownerStatusFilter}
              onChange={(e) => setOwnerStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none transition"
            >
              <option value="all">Semua Pemilik</option>
              <option value="active">Pemilik Aktif</option>
              <option value="inactive">Pemilik Nonaktif</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "products" | "transactions")}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none transition"
            >
              <option value="newest">Urutkan: Terbaru</option>
              <option value="products">Urutkan: Produk Aktif Terbanyak</option>
              <option value="transactions">Urutkan: Transaksi Terbanyak</option>
            </select>
          </div>

          {!loading && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked, allVisibleIds)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Pilih semua yang terlihat
              </label>
              <span className="text-xs text-slate-400">
                {selectedIds.length} merchant dipilih
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  onClick={() => setShowCopyProductsModal(true)}
                  disabled={selectedIds.length === 0}
                  className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                >
                  Salin Produk ke Terpilih
                </button>
                <button
                  onClick={() => runBulkToggle(true)}
                  disabled={bulkLoading || selectedIds.length === 0}
                  className="rounded-xl bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                >
                  {bulkLoading ? "Memproses..." : "Aktifkan Terpilih"}
                </button>
                <button
                  onClick={() => runBulkToggle(false)}
                  disabled={bulkLoading || selectedIds.length === 0}
                  className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                >
                  {bulkLoading ? "Memproses..." : "Nonaktifkan Terpilih"}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-700">Daftar Merchant</h2>
              <span className="text-[11px] text-slate-400">
                {sorted.length} dari {merchants.length} merchant
              </span>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-50">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                    <div className="h-11 w-11 rounded-2xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-40 rounded bg-slate-200" />
                      <div className="h-2.5 w-56 rounded bg-slate-100" />
                    </div>
                    <div className="h-8 w-24 rounded-xl bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-slate-400">Belum ada merchant yang cocok dengan filter ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {paginated.map((merchant) => {
                  const initials = merchant.displayName
                    .split(" ")
                    .map((part) => part[0] ?? "")
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div key={merchant.id} className="flex items-start gap-3 px-4 py-4">
                      <label className="mt-3 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(merchant.id)}
                          onChange={() => toggleSelected(merchant.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                      {merchant.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={merchant.profileImageUrl}
                          alt={merchant.displayName}
                          className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {merchant.displayName}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              merchant.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {merchant.isActive ? "AKTIF" : "NONAKTIF"}
                          </span>
                          {!merchant.user.isActive && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              USER NONAKTIF
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          /seller/{merchant.slug} · dibuat {formatDate(merchant.createdAt)}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-500">
                          Pemilik: {merchant.user.name ?? "Tanpa nama"} · {merchant.user.email ?? merchant.user.phone ?? "—"}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                            {merchant.activeSellerProductsCount} produk aktif
                          </span>
                          <span className="mx-1.5 text-slate-300">•</span>
                          {merchant.user._count.sellerProducts} produk total
                          <span className="mx-1.5 text-slate-300">•</span>
                          {merchant.user._count.sellerOrders} transaksi seller
                        </p>

                        <p className="mt-1 text-[11px] text-slate-500">
                          Saldo owner:{" "}
                          <span className="font-semibold text-slate-700">
                            {formatRp(merchant.user.walletBalance)}
                          </span>
                        </p>

                        {merchant.description && (
                          <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">
                            {merchant.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <a
                            href={`/seller/${merchant.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition"
                          >
                            Buka Storefront
                          </a>
                          <button
                            onClick={() => copyStorefrontLink(merchant.slug)}
                            className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                          >
                            Copy Link
                          </button>
                          <button
                            onClick={() => setDetailMerchant(merchant)}
                            className="rounded-xl bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => toggleMerchant(merchant)}
                            disabled={togglingId === merchant.id}
                            className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                              merchant.isActive
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {togglingId === merchant.id
                              ? "Memproses..."
                              : merchant.isActive
                              ? "Nonaktifkan"
                              : "Aktifkan"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && sorted.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-slate-400">
                  Menampilkan {(page - 1) * pageSize + 1}-
                  {Math.min(page * pageSize, sorted.length)} dari {sorted.length} merchant
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    Halaman {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {detailMerchant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
          <button
            type="button"
            className="flex-1 cursor-default"
            onClick={() => setDetailMerchant(null)}
            aria-label="Tutup detail merchant"
          />
          <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Detail Merchant</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-800">{detailMerchant.displayName}</h2>
                </div>
                <button
                  onClick={() => setDetailMerchant(null)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex items-center gap-3">
                {detailMerchant.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detailMerchant.profileImageUrl}
                    alt={detailMerchant.displayName}
                    className="h-16 w-16 rounded-3xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-lg font-bold text-emerald-700">
                    {detailMerchant.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      detailMerchant.isActive ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {detailMerchant.isActive ? "MERCHANT AKTIF" : "MERCHANT NONAKTIF"}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      detailMerchant.user.isActive ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                    }`}>
                      {detailMerchant.user.isActive ? "PEMILIK AKTIF" : "PEMILIK NONAKTIF"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">/seller/{detailMerchant.slug}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Produk Aktif</p>
                  <p className="mt-2 text-xl font-bold text-slate-800">{detailMerchant.activeSellerProductsCount}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Transaksi</p>
                  <p className="mt-2 text-xl font-bold text-slate-800">{detailMerchant.user._count.sellerOrders}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Saldo Owner</p>
                  <p className="mt-2 text-xl font-bold text-slate-800">{formatRp(detailMerchant.user.walletBalance)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pemilik Merchant</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Nama:</span> {detailMerchant.user.name ?? "Tanpa nama"}</p>
                  <p><span className="font-semibold text-slate-800">Email:</span> {detailMerchant.user.email ?? "—"}</p>
                  <p><span className="font-semibold text-slate-800">Nomor HP:</span> {detailMerchant.user.phone ?? "—"}</p>
                  <p><span className="font-semibold text-slate-800">User ID:</span> <span className="font-mono text-xs">{detailMerchant.userId}</span></p>
                  <p><span className="font-semibold text-slate-800">Status akun:</span> {detailMerchant.user.isActive ? "Aktif" : "Nonaktif"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Informasi Toko</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Slug:</span> {detailMerchant.slug}</p>
                  <p><span className="font-semibold text-slate-800">Dibuat:</span> {formatDate(detailMerchant.createdAt)}</p>
                  <p><span className="font-semibold text-slate-800">Update terakhir:</span> {formatDate(detailMerchant.updatedAt)}</p>
                  <div>
                    <p className="font-semibold text-slate-800">Deskripsi:</p>
                    <p className="mt-1 leading-6 text-slate-500">{detailMerchant.description ?? "Belum ada deskripsi."}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`/seller/${detailMerchant.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Buka Storefront
                </a>
                <button
                  onClick={() => copyStorefrontLink(detailMerchant.slug)}
                  className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Copy Link
                </button>
                <a
                  href={`/admin/members/${detailMerchant.userId}`}
                  className="rounded-xl bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                >
                  Buka Profil Owner
                </a>
                <button
                  onClick={() => toggleMerchant(detailMerchant)}
                  disabled={togglingId === detailMerchant.id}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                    detailMerchant.isActive
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {togglingId === detailMerchant.id
                    ? "Memproses..."
                    : detailMerchant.isActive
                    ? "Nonaktifkan Merchant"
                    : "Aktifkan Merchant"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCopyProductsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Duplikasi Produk Merchant
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-800">
                  Salin produk aktif ke merchant terpilih
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sistem hanya menyalin daftar produk aktif. Harga target akan kembali memakai harga dasar/default, jadi merchant target tetap bisa mengatur harga sendiri setelahnya.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCopyProductsModal(false);
                  setCopySourceMerchantId("");
                }}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Merchant sumber
                </label>
                <select
                  value={copySourceMerchantId}
                  onChange={(e) => setCopySourceMerchantId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Pilih merchant sumber...</option>
                  {merchants.map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.displayName} ({merchant.activeSellerProductsCount} produk aktif)
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Merchant target</p>
                <div className="mt-3 space-y-2">
                  {merchants.filter((merchant) => selectedIds.includes(merchant.id)).length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada merchant target yang dipilih.</p>
                  ) : (
                    merchants
                      .filter((merchant) => selectedIds.includes(merchant.id))
                      .map((merchant) => (
                        <div key={merchant.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{merchant.displayName}</p>
                            <p className="text-xs text-slate-400">/seller/{merchant.slug}</p>
                          </div>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {merchant.activeSellerProductsCount} aktif
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Produk yang sudah lebih dulu dimiliki merchant target akan dilewati otomatis dan tidak ditimpa.
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => {
                  setShowCopyProductsModal(false);
                  setCopySourceMerchantId("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={copyProductsToSelectedMerchants}
                disabled={copyingProducts || !copySourceMerchantId || selectedIds.length === 0}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {copyingProducts ? "Menyalin..." : "Salin Produk"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
