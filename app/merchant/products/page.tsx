"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MerchantSidebar from "@/components/merchant/Sidebar";
import MerchantHeader from "@/components/merchant/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface CatalogRow {
  id: string;
  provider: string;
  providerCode: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  providerPrice: number;
  sellingPrice: number;
  margin: number;
  stock: boolean;
  isSelected: boolean;
  sellerProduct: {
    id: string;
    sellingPrice: number | null;
    commissionType: "PERCENT" | "FIXED";
    commissionValue: number;
    feeType: "PERCENT" | "FIXED";
    feeValue: number;
    isActive: boolean;
  } | null;
}

const CATEGORY_TABS = [
  { label: "Semua", value: null },
  { label: "Top Up Game", value: "game" },
  { label: "Pulsa & Data", value: "pulsa" },
  { label: "E-Wallet", value: "ewallet" },
  { label: "Token Listrik", value: "listrik" },
] as const;

const TYPE_GROUP_MAP: Record<string, string[]> = {
  game: ["game"],
  pulsa: ["paket-internet", "paket-telepon", "pulsa-reguler", "pulsa-transfer", "pulsa-internasional", "paket-lainnya"],
  ewallet: ["saldo-emoney"],
  listrik: ["token-pln"],
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MerchantProductsPage() {
  const BRANDS_PER_PAGE = 8;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [marginDrafts, setMarginDrafts] = useState<Record<string, number>>({});
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});
  const { toasts, removeToast, success, error } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (selectedOnly) params.set("selectedOnly", "true");

      const res = await fetch(`/api/seller/products${params.toString() ? `?${params.toString()}` : ""}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal memuat katalog merchant");

      const nextRows = json.data as CatalogRow[];
      setRows(nextRows);
      setMarginDrafts((prev) => {
        const next: Record<string, number> = {};
        for (const row of nextRows) {
          const savedMargin = row.sellerProduct?.sellingPrice !== null && row.sellerProduct?.sellingPrice !== undefined
            ? Math.max(0, row.sellerProduct.sellingPrice - row.sellingPrice)
            : 0;
          next[row.id] = prev[row.id] ?? savedMargin;
        }
        return next;
      });

      setExpandedBrands((prev) => {
        const next = { ...prev };
        for (const row of nextRows) {
          if (next[row.brand] === undefined) {
            next[row.brand] = Boolean(search.trim()) || nextRows.filter((item) => item.brand === row.brand).some((item) => item.isSelected);
          }
        }
        return next;
      });
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Gagal memuat katalog merchant";
      error(message);
    } finally {
      setLoading(false);
    }
  }, [error, search, selectedOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, search, selectedOnly]);

  const groupedBrands = useMemo(() => {
    const groups = new Map<string, CatalogRow[]>();
    const allowedTypes = activeCategory ? TYPE_GROUP_MAP[activeCategory] ?? [] : null;

    for (const row of rows) {
      if (allowedTypes && !allowedTypes.includes(row.type)) continue;
      const list = groups.get(row.brand) ?? [];
      list.push(row);
      groups.set(row.brand, list);
    }

    return Array.from(groups.entries())
      .map(([brand, items]) => ({
        brand,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
        selectedCount: items.filter((item) => item.isSelected).length,
      }))
      .sort((a, b) => a.brand.localeCompare(b.brand));
  }, [activeCategory, rows]);

  const totalPages = Math.max(1, Math.ceil(groupedBrands.length / BRANDS_PER_PAGE));
  const paginatedBrands = groupedBrands.slice((page - 1) * BRANDS_PER_PAGE, page * BRANDS_PER_PAGE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const toggleBrand = (brand: string) => {
    setExpandedBrands((prev) => ({
      ...prev,
      [brand]: !prev[brand],
    }));
  };

  const saveProduct = async (row: CatalogRow) => {
    setProcessingId(row.id);
    try {
      const extraMargin = Math.max(0, Number(marginDrafts[row.id] ?? 0));
      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: row.id,
          sellingPrice: row.sellingPrice + extraMargin,
          commissionType: "FIXED",
          commissionValue: 0,
          feeType: row.sellerProduct?.feeType ?? "FIXED",
          feeValue: row.sellerProduct?.feeValue ?? 0,
          isActive: true,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal menyimpan produk merchant");
      success(row.isSelected ? "Margin produk merchant berhasil diperbarui." : "Produk berhasil ditambahkan ke toko merchant.");
      await loadData();
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Gagal menyimpan produk merchant";
      error(message);
    } finally {
      setProcessingId(null);
    }
  };

  const removeProduct = async (productId: string) => {
    setProcessingId(productId);
    try {
      const res = await fetch("/api/seller/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal menghapus produk");
      success("Produk dihapus dari toko merchant.");
      await loadData();
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Gagal menghapus produk";
      error(message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <MerchantSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <MerchantHeader
            title="Produk Merchant"
            subtitle="Pilih brand terlebih dulu, lalu tentukan produk yang ingin dijual beserta margin per produknya."
            onMenuClick={() => setSidebarOpen(true)}
          />

          <section className="rounded-2xl bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Katalog Produk per Brand</p>
                <p className="text-xs text-slate-400">Merchant cukup memilih produk website yang ingin dijual, lalu menambahkan margin sendiri per produk.</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedOnly}
                    onChange={(e) => setSelectedOnly(e.target.checked)}
                  />
                  Hanya produk terpilih
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari brand atau nama produk..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 sm:w-[320px]"
                />
              </div>
            </div>

            <div className="mb-5 overflow-x-auto">
              <div className="inline-flex min-w-full gap-2 rounded-2xl bg-slate-100 p-1">
                {CATEGORY_TABS.map((category) => {
                  const isActive = activeCategory === category.value;
                  return (
                    <button
                      key={category.label}
                      type="button"
                      onClick={() => setActiveCategory(category.value)}
                      className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? "bg-white text-emerald-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Memuat katalog produk merchant...</div>
            ) : groupedBrands.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center sm:rounded-3xl">
                <p className="text-sm font-medium text-slate-600">Belum ada brand yang cocok</p>
                <p className="mt-1 text-xs text-slate-400">Coba ganti kategori, ubah kata kunci pencarian, atau matikan filter produk terpilih.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedBrands.map((group) => (
                  <div key={group.brand} className="overflow-hidden rounded-2xl border border-slate-200 sm:rounded-3xl">
                    <button
                      type="button"
                      onClick={() => toggleBrand(group.brand)}
                      className="flex w-full items-center justify-between gap-4 bg-white px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-900">{group.brand}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {group.items.length} produk • {group.selectedCount} sudah dipilih merchant
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {group.selectedCount > 0 ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                            {group.selectedCount} aktif
                          </span>
                        ) : null}
                        <svg
                          className={`h-5 w-5 text-slate-400 transition-transform ${expandedBrands[group.brand] ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {expandedBrands[group.brand] ? (
                      <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                        <div className="space-y-3">
                          {group.items.map((row) => {
                            const extraMargin = Math.max(0, Number(marginDrafts[row.id] ?? 0));
                            const merchantSellingPrice = row.sellingPrice + extraMargin;

                            return (
                              <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                                      {row.isSelected ? (
                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                          Sudah di toko
                                        </span>
                                      ) : (
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                          Belum dipilih
                                        </span>
                                      )}
                                    </div>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {row.category} • {row.type} • {row.providerCode}
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                      <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                                        Harga website: {rupiah(row.sellingPrice)}
                                      </span>
                                      <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                                        Margin merchant: {rupiah(extraMargin)}
                                      </span>
                                      <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                                        Harga jual merchant: {rupiah(merchantSellingPrice)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid gap-3 sm:min-w-[320px]">
                                    <label className="text-sm">
                                      <span className="mb-2 block font-medium text-slate-600">Margin Merchant</span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={extraMargin}
                                        onChange={(e) => {
                                          const nextValue = Number(e.target.value);
                                          setMarginDrafts((prev) => ({
                                            ...prev,
                                            [row.id]: Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0,
                                          }));
                                        }}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
                                      />
                                    </label>

                                    <div className="flex flex-col gap-2 sm:flex-row">
                                      <button
                                        type="button"
                                        onClick={() => saveProduct(row)}
                                        disabled={processingId === row.id}
                                        className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                                      >
                                        {processingId === row.id
                                          ? "Menyimpan..."
                                          : row.isSelected
                                            ? "Simpan Margin"
                                            : "Pilih Produk"}
                                      </button>

                                      {row.isSelected ? (
                                        <button
                                          type="button"
                                          onClick={() => removeProduct(row.id)}
                                          disabled={processingId === row.id}
                                          className="rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                                        >
                                          Hapus Produk
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}

                {groupedBrands.length > BRANDS_PER_PAGE ? (
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <p className="text-sm text-slate-500">
                      Menampilkan brand {(page - 1) * BRANDS_PER_PAGE + 1}-{Math.min(page * BRANDS_PER_PAGE, groupedBrands.length)} dari {groupedBrands.length}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Sebelumnya
                      </button>

                      <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                        Halaman {page} / {totalPages}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
