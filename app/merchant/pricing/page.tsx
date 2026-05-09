"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import MerchantSidebar from "@/components/merchant/Sidebar";
import MerchantHeader from "@/components/merchant/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface PricingRow {
  id: string;
  productId: string;
  isActive: boolean;
  feeType: "PERCENT" | "FIXED";
  feeValue: number;
  sellingPrice: number;
  margin: number;
  product: {
    id: string;
    name: string;
    brand: string;
    category: string;
    provider: string;
    providerCode: string;
    defaultSellingPrice: number;
    defaultMargin: number;
  };
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MerchantPricingPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { toasts, removeToast, error: showError, success: showSuccess } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/merchant/pricing${params.toString() ? `?${params}` : ""}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal memuat pricing");
      setRows(json.data);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Gagal memuat pricing";
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [search, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateRow = (productId: string, changes: Partial<PricingRow>) => {
    setRows((prev) => prev.map((row) => (row.productId === productId ? { ...row, ...changes } : row)));
  };

  const saveRow = async (row: PricingRow) => {
    setSavingId(row.productId);
    try {
      const res = await fetch("/api/merchant/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: row.productId,
          sellingPrice: row.sellingPrice,
          isActive: row.isActive,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal menyimpan pricing");
      showSuccess("Pricing merchant berhasil disimpan.");
      await loadData();
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Gagal menyimpan pricing";
      showError(message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <MerchantSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <MerchantHeader
            title="Pricing Merchant"
            subtitle="Atur harga jual merchant di atas harga website. Potongan platform ditentukan oleh admin dan dihitung otomatis dari margin merchant."
            onMenuClick={() => setSidebarOpen(true)}
          />

          <section className="rounded-2xl bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Katalog Pricing Merchant</p>
                <p className="text-xs text-slate-400">Cari produk lalu atur harga jual merchant. Potongan platform hanya ditampilkan sebagai informasi.</p>
              </div>
              <div className="flex flex-col gap-2 sm:w-[320px]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari produk, brand, provider code..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                />
              </div>
            </div>
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Memuat pricing merchant...</div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center sm:rounded-3xl">
                <p className="text-sm font-medium text-slate-600">Belum ada produk merchant yang cocok</p>
                <p className="mt-1 text-xs text-slate-400">Pilih dulu produk yang mau dijual dari katalog website, baru atur margin di halaman ini.</p>
                <Link
                  href="/merchant/products"
                  className="mt-4 inline-flex rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  Pilih Produk Merchant
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 p-4 sm:rounded-3xl">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{row.product.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {row.product.brand} • {row.product.provider} • {row.product.providerCode}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                            Harga website: {rupiah(row.product.defaultSellingPrice)}
                          </span>
                          <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                            Margin merchant: {rupiah(row.margin)}
                          </span>
                          <span className="rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-700">
                            Potongan platform: {row.feeType === "PERCENT" ? `${row.feeValue}%` : rupiah(row.feeValue)}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                            Saldo bersih merchant: {rupiah(Math.max(0, row.margin - (row.feeType === "FIXED" ? row.feeValue : Math.floor((row.margin * row.feeValue) / 100))))}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                            Harga jual merchant: {rupiah(row.sellingPrice)}
                          </span>
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          onChange={(e) => updateRow(row.productId, { isActive: e.target.checked })}
                        />
                        Aktif
                      </label>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-slate-600">Harga Jual</span>
                        <input
                          type="number"
                          min={row.product.defaultSellingPrice}
                          value={row.sellingPrice}
                          onChange={(e) => updateRow(row.productId, { sellingPrice: Number(e.target.value) })}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
                        />
                        <p className="mt-2 text-xs text-slate-400">
                          Minimal mengikuti harga website: {rupiah(row.product.defaultSellingPrice)}
                        </p>
                      </label>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                        <span className="mb-2 block font-medium text-slate-600">Potongan Platform</span>
                        <p className="text-slate-800">
                          {row.feeType === "PERCENT" ? `${row.feeValue}% dari margin merchant` : rupiah(row.feeValue)}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          Nilai ini ditentukan oleh admin/platform dan dipotong dari margin merchant, bukan biaya tambahan ke pembeli.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => saveRow(row)}
                        disabled={savingId === row.productId}
                        className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                      >
                        {savingId === row.productId ? "Menyimpan..." : "Simpan Pricing"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
