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
    providerPrice: number;
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
          feeType: row.feeType,
          feeValue: row.feeValue,
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
            subtitle="Atur harga jual sendiri dan fee platform untuk tiap produk merchant."
            onMenuClick={() => setSidebarOpen(true)}
          />

          <section className="rounded-2xl bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Katalog Pricing Merchant</p>
                <p className="text-xs text-slate-400">Cari produk lalu atur harga jual dan fee merchant.</p>
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
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                            Provider: {rupiah(row.product.providerPrice)}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                            Margin Saat Ini: {rupiah(Math.max(0, row.sellingPrice - row.product.providerPrice))}
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

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-slate-600">Harga Jual</span>
                        <input
                          type="number"
                          min={row.product.providerPrice}
                          value={row.sellingPrice}
                          onChange={(e) => updateRow(row.productId, { sellingPrice: Number(e.target.value) })}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
                        />
                      </label>

                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-slate-600">Fee Type</span>
                        <select
                          value={row.feeType}
                          onChange={(e) => updateRow(row.productId, { feeType: e.target.value as "PERCENT" | "FIXED" })}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
                        >
                          <option value="PERCENT">Persen</option>
                          <option value="FIXED">Nominal</option>
                        </select>
                      </label>

                      <label className="text-sm">
                        <span className="mb-2 block font-medium text-slate-600">Fee Value</span>
                        <input
                          type="number"
                          min={0}
                          value={row.feeValue}
                          onChange={(e) => updateRow(row.productId, { feeValue: Number(e.target.value) })}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
                        />
                      </label>
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
