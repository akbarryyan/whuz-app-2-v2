"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface FlashSaleProduct {
  id: string;
  name: string;
  brand: string;
  brandImage: string;
  badge: string;
  discount: string;
  originalPrice: string;
  price: string;
}

interface FlashSaleConfig {
  isActive: boolean;
  endTime: string;
  products: FlashSaleProduct[];
}

interface BrandOption {
  brand: string;
  imageUrl: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  brand: string;
  sellingPrice: number;
}

const EMPTY_EXTRA = { badge: "", discount: "", flashSalePrice: "" };

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function FlashSalePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [config, setConfig] = useState<FlashSaleConfig>({
    isActive: false,
    endTime: "",
    products: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Brand / product selection
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [extra, setExtra] = useState(EMPTY_EXTRA); // badge, discount, originalPrice, image

  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/flash-sale");
      const data = await res.json();
      if (data.success) {
        setConfig({
          ...data.data,
          // Normalize endTime to datetime-local format for input
          endTime: data.data.endTime
            ? new Date(data.data.endTime).toISOString().slice(0, 16)
            : "",
        });
      } else toast.error("Gagal memuat konfigurasi");
    } catch {
      toast.error("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Load brands + products once
  useEffect(() => {
    setBrandsLoading(true);
    Promise.all([
      fetch("/api/admin/brands").then((r) => r.json()),
      fetch("/api/admin/products").then((r) => r.json()),
    ]).then(([b, p]) => {
      if (b.success) setBrands(b.data as BrandOption[]);
      if (p.success) setAllProducts(p.data as ProductOption[]);
    }).catch(() => {}).finally(() => setBrandsLoading(false));
  }, []);

  const productsForBrand = allProducts.filter((p) => p.brand === selectedBrand);
  const selectedProduct = allProducts.find((p) => p.id === selectedProductId) ?? null;

  // Always reset flashSalePrice to sellingPrice when product selection changes
  useEffect(() => {
    if (selectedProduct) {
      setExtra((f) => ({ ...f, flashSalePrice: String(selectedProduct.sellingPrice) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id]);

  // ── Product CRUD ──────────────────────────────────────────────────────────

  function openAddForm() {
    setEditId(null);
    setSelectedBrand("");
    setSelectedProductId("");
    setExtra(EMPTY_EXTRA);
    setShowForm(true);
  }

  function openEditForm(p: FlashSaleProduct) {
    setEditId(p.id);
    // Pre-fill brand from existing product list if possible
    const found = allProducts.find((ap) => ap.name === p.name);
    setSelectedBrand(found?.brand ?? "");
    setSelectedProductId(found?.id ?? "");
    // Extract numeric value from stored "Rp X.XXX" string
    const priceNum = p.price.replace(/[^0-9]/g, "");
    setExtra({ badge: p.badge, discount: p.discount, flashSalePrice: priceNum });
    setShowForm(true);
  }

  function submitForm() {
    if (!selectedProduct) { toast.error("Pilih produk terlebih dahulu"); return; }
    const flashSalePriceNum =
      parseInt(extra.flashSalePrice.replace(/[^0-9]/g, ""), 10) || selectedProduct.sellingPrice;
    const brandOption = brands.find((b) => b.brand === selectedProduct.brand);
    const entry: FlashSaleProduct = {
      id: editId ?? genId(),
      name: selectedProduct.name,
      brand: selectedProduct.brand,
      brandImage: brandOption?.imageUrl ?? "",
      price: `Rp ${new Intl.NumberFormat("id-ID").format(flashSalePriceNum)}`,
      badge: extra.badge,
      discount: extra.discount,
      originalPrice: `Rp ${new Intl.NumberFormat("id-ID").format(selectedProduct.sellingPrice)}`,
    };
    if (editId) {
      setConfig((c) => ({ ...c, products: c.products.map((p) => p.id === editId ? entry : p) }));
    } else {
      setConfig((c) => ({ ...c, products: [...c.products, entry] }));
    }
    setShowForm(false);
  }

  function removeProduct(id: string) {
    setConfig((c) => ({ ...c, products: c.products.filter((p) => p.id !== id) }));
  }

  function moveProduct(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= config.products.length) return;
    const arr = [...config.products];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setConfig((c) => ({ ...c, products: arr }));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function save() {
    if (!config.endTime) { toast.error("Waktu selesai wajib diisi"); return; }
    setSaving(true);
    try {
      const payload: FlashSaleConfig = {
        ...config,
        endTime: new Date(config.endTime).toISOString(),
      };
      const res = await fetch("/api/admin/flash-sale", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) toast.success("Flash sale berhasil disimpan");
      else toast.error(data.error ?? "Gagal menyimpan");
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Title */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">⚡ Flash Sale</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Kelola produk dan waktu flash sale di halaman utama.
              </p>
            </div>
            <button
              onClick={save}
              disabled={saving || loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#003D99] text-white text-xs font-bold hover:bg-[#002d73] disabled:opacity-50 transition-colors sm:flex-shrink-0 w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : "💾 Simpan"}
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-8 w-full bg-slate-100 rounded-xl" />
              <div className="h-4 w-48 bg-slate-200 rounded" />
            </div>
          ) : (
            <>
              {/* ── General Settings ────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-700">Pengaturan Umum</h2>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {/* Active toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Flash Sale Aktif</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tampilkan seksi flash sale di halaman utama
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={config.isActive}
                      onClick={() => setConfig((c) => ({ ...c, isActive: !c.isActive }))}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        config.isActive ? "bg-green-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                          config.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* End time */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                      Waktu Selesai Flash Sale
                    </label>
                    <input
                      type="datetime-local"
                      value={config.endTime}
                      onChange={(e) => setConfig((c) => ({ ...c, endTime: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Countdown di halaman utama akan menghitung mundur ke waktu ini.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Products ─────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-700">Produk Flash Sale</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                      {config.products.length} produk
                      <span className="hidden sm:inline"> · Urutan dapat diubah dengan panah</span>
                    </p>
                  </div>
                  <button
                    onClick={openAddForm}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors"
                  >
                    + Tambah
                  </button>
                </div>

                {config.products.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="text-3xl mb-2">⚡</div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">Belum ada produk</p>
                    <p className="text-xs text-slate-400">Klik "+ Tambah" untuk menambahkan produk flash sale.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {config.products.map((p, idx) => (
                      <div key={p.id} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        {/* Top row: brand image + info + controls (desktop) */}
                        <div className="flex items-center gap-3">
                          {/* Brand image */}
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                            {p.brandImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.brandImage} alt={p.brand} className="w-8 h-8 object-contain" />
                            ) : (
                              <span className="text-xs font-bold text-purple-400">{(p.brand ?? "??").slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{p.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{p.badge}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 line-through">{p.originalPrice}</span>
                              <span className="text-[10px] font-bold text-red-500">{p.discount} OFF</span>
                              <span className="text-[10px] font-bold text-purple-600">{p.price}</span>
                            </div>
                          </div>

                          {/* Controls — desktop only (hidden on mobile, shown below) */}
                          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => moveProduct(idx, -1)} disabled={idx === 0}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-25 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button onClick={() => moveProduct(idx, 1)} disabled={idx === config.products.length - 1}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-25 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <button onClick={() => openEditForm(p)}
                              className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => removeProduct(p.id)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Controls — mobile only */}
                        <div className="flex sm:hidden items-center gap-2">
                          <button onClick={() => moveProduct(idx, -1)} disabled={idx === 0}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-medium disabled:opacity-30 hover:bg-slate-200 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                            </svg>
                            Naik
                          </button>
                          <button onClick={() => moveProduct(idx, 1)} disabled={idx === config.products.length - 1}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-medium disabled:opacity-30 hover:bg-slate-200 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                            Turun
                          </button>
                          <button onClick={() => openEditForm(p)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-medium hover:bg-blue-100 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button onClick={() => removeProduct(p.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-50 text-red-500 text-[11px] font-medium hover:bg-red-100 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Product Form Modal ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {editId ? "Edit Produk" : "Tambah Produk Flash Sale"}
              </h3>
              <button onClick={() => setShowForm(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {brandsLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Memuat data produk...
              </div>
            ) : (
            <div className="space-y-4">
              {/* Step 1 — Brand */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">1. Pilih Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => { setSelectedBrand(e.target.value); setSelectedProductId(""); }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                >
                  <option value="">-- Pilih brand --</option>
                  {brands.map((b) => (
                    <option key={b.brand} value={b.brand}>{b.brand}</option>
                  ))}
                </select>
              </div>

              {/* Step 2 — Product */}
              {selectedBrand && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                    2. Pilih Produk
                    <span className="ml-1 text-slate-400 font-normal">({productsForBrand.length} produk)</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                  >
                    <option value="">-- Pilih produk --</option>
                    {productsForBrand.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Rp {new Intl.NumberFormat("id-ID").format(p.sellingPrice)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preview */}
              {selectedProduct && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 flex items-center gap-3">
                  {brands.find((b) => b.brand === selectedBrand)?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brands.find((b) => b.brand === selectedBrand)!.imageUrl!} alt={selectedBrand}
                      className="w-8 h-8 object-contain rounded flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-purple-200 flex items-center justify-center text-sm flex-shrink-0">🏷️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-purple-800 truncate">{selectedProduct.name}</p>
                    <p className="text-[11px] text-purple-600 font-semibold">
                      Rp {new Intl.NumberFormat("id-ID").format(selectedProduct.sellingPrice)}
                    </p>
                  </div>
                </div>
              )}

              {/* Extra fields — shown after product is picked */}
              {selectedProduct && (
                <>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-semibold text-slate-500 mb-3">3. Detail Tampilan (opsional)</p>
                    <div className="space-y-3">
                      {/* Badge */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Badge / Label Bonus</label>
                        <input type="text" value={extra.badge}
                          onChange={(e) => setExtra((f) => ({ ...f, badge: e.target.value }))}
                          placeholder="🔥 50 + 6 Bonds 🔥"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition" />
                      </div>
                      {/* Flash sale price + original price */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Harga Flash Sale (Rp)</label>
                          <input
                            type="number"
                            value={extra.flashSalePrice}
                            onChange={(e) => setExtra((f) => ({ ...f, flashSalePrice: e.target.value }))}
                            placeholder={String(selectedProduct?.sellingPrice ?? "")}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Harga setelah diskon yang ditampilkan ke pembeli
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Diskon (badge)</label>
                            <input type="text" value={extra.discount}
                              onChange={(e) => setExtra((f) => ({ ...f, discount: e.target.value }))}
                              placeholder="92%"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition" />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Harga Asli (coret)</label>
                            <div className="w-full rounded-xl border border-slate-100 bg-slate-100 px-3 py-2 text-xs text-slate-500 cursor-not-allowed">
                              Rp {new Intl.NumberFormat("id-ID").format(selectedProduct?.sellingPrice ?? 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            )}

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={submitForm} disabled={!selectedProduct}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editId ? "Simpan Perubahan" : "Tambah Produk"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
