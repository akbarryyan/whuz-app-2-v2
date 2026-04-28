"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface ProviderInfo {
  type: string;
  mode: string;
  balance: {
    amount: number;
    currency: string;
    lastUpdated: string;
  };
  health: {
    status: string;
    latency: number;
    lastCheck: string;
    message?: string;
  };
}

interface ProductInfo {
  code: string;
  name: string;
  category: string;
  brand: string;
  type: string;
  providerPrice: number;
  margin: number;
  sellingPrice: number;
  stock: boolean;
  isActive?: boolean;
  description?: string;
}

interface ProviderSetting {
  provider: string;
  defaultMargin: number;
  marginType: "FIXED" | "PERCENTAGE";
  isActive: boolean;
  lastBalance?: number;
  lastBalanceAt?: string;
}

export default function ProvidersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [products, setProducts] = useState<Record<string, ProductInfo[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState<Record<string, boolean>>({});
  const [syncingProducts, setSyncingProducts] = useState<Record<string, boolean>>({});
  const [providerSettings, setProviderSettings] = useState<ProviderSetting[]>([]);
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [marginForm, setMarginForm] = useState({
    defaultMargin: 0,
    marginType: "FIXED" as "FIXED" | "PERCENTAGE",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const toast = useToast();

  // Load initial data from database only (no external API calls)
  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = async () => {
    try {
      setLoading(true);
      
      // Only load products from database - no external API calls
      const productsRes = await fetch("/api/admin/providers/products", {
        cache: "no-store",
      });
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.data || {});
      } else {
        throw new Error("Gagal memuat daftar produk provider");
      }

      // Load provider settings (margin configuration and cached balance)
      const settingsRes = await fetch("/api/admin/providers/settings", {
        cache: "no-store",
      });
      let settings: ProviderSetting[] = [];
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        settings = settingsData.data || [];
        setProviderSettings(settings);
      } else {
        throw new Error("Gagal memuat pengaturan provider");
      }

      // Initialize providers with cached balance from database
      const digiflazzSetting = settings.find((s) => s.provider === "DIGIFLAZZ");
      const vipSetting = settings.find((s) => s.provider === "VIP_RESELLER");

      setProviders([
        {
          type: "DIGIFLAZZ",
          mode: "real",
          balance: {
            amount: digiflazzSetting?.lastBalance || 0,
            currency: "IDR",
            lastUpdated: digiflazzSetting?.lastBalanceAt || new Date().toISOString(),
          },
          health: {
            status: digiflazzSetting?.lastBalance ? "ONLINE" : "UNKNOWN",
            latency: 0,
            lastCheck: digiflazzSetting?.lastBalanceAt || new Date().toISOString(),
            message: digiflazzSetting?.lastBalance ? "Cache dari database" : "Klik 'Cek Saldo' untuk update",
          },
        },
        {
          type: "VIP_RESELLER",
          mode: "real",
          balance: {
            amount: vipSetting?.lastBalance || 0,
            currency: "IDR",
            lastUpdated: vipSetting?.lastBalanceAt || new Date().toISOString(),
          },
          health: {
            status: vipSetting?.lastBalance ? "ONLINE" : "UNKNOWN",
            latency: 0,
            lastCheck: vipSetting?.lastBalanceAt || new Date().toISOString(),
            message: vipSetting?.lastBalance ? "Cache dari database" : "Klik 'Cek Saldo' untuk update",
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to load cached data:", error);
      toast.error("Gagal memuat data dari database");
    } finally {
      setLoading(false);
    }
  };

  // Remove auto-fetch - now manually triggered only

  const fetchProvidersData = async () => {
    try {
      setLoading(true);
      
      const [providersRes, productsRes] = await Promise.all([
        fetch("/api/admin/providers", { cache: "no-store" }),
        fetch("/api/admin/providers/products", { cache: "no-store" }),
      ]);

      if (providersRes.ok) {
        const providersData = await providersRes.json();
        setProviders(providersData.data || []);
      } else {
        throw new Error("Gagal memuat provider");
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.data || {});
      } else {
        throw new Error("Gagal memuat daftar produk provider");
      }
    } catch (error) {
      console.error("Failed to fetch providers data:", error);
      toast.error("Gagal memuat data provider");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchProvidersData();
    setRefreshing(false);
  };

  const checkProviderBalance = async (providerType: string) => {
    try {
      setCheckingBalance((prev) => ({ ...prev, [providerType]: true }));
      
      const response = await fetch(
        `/api/admin/providers/${providerType.toLowerCase()}/check-balance`,
        { method: "POST" }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Update provider in state
        setProviders((prev) =>
          prev.map((p) =>
            p.type === providerType
              ? {
                  ...p,
                  balance: {
                    amount: data.data.balance,
                    currency: data.data.currency || "IDR",
                    lastUpdated: new Date().toISOString(),
                  },
                  health: {
                    ...p.health,
                    status: "ONLINE",
                    lastCheck: new Date().toISOString(),
                    message: "Balance updated",
                  },
                }
              : p
          )
        );
        
        toast.success(`Saldo ${providerType}: ${formatCurrency(data.data.balance)}`);
      } else {
        throw new Error("Gagal cek saldo");
      }
    } catch (error) {
      console.error("Check balance error:", error);
      toast.error("Gagal cek saldo provider");
    } finally {
      setCheckingBalance((prev) => ({ ...prev, [providerType]: false }));
    }
  };

  const syncProviderProducts = async (providerType: string) => {
    try {
      setSyncingProducts((prev) => ({ ...prev, [providerType]: true }));
      
      const response = await fetch(
        `/api/admin/providers/${providerType.toLowerCase()}/sync-products`,
        { method: "POST" }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Refresh products from database
        const productsRes = await fetch("/api/admin/providers/products", {
          cache: "no-store",
        });
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.data || {});
        } else {
          throw new Error("Gagal memuat ulang daftar produk provider");
        }
        
        toast.success(`Berhasil sync ${data.data.syncedCount} produk dari ${providerType}`);
      } else {
        throw new Error("Gagal sync produk");
      }
    } catch (error) {
      console.error("Sync products error:", error);
      toast.error("Gagal sync produk provider");
    } finally {
      setSyncingProducts((prev) => ({ ...prev, [providerType]: false }));
    }
  };

  const openMarginModal = (providerType: string) => {
    const setting = providerSettings.find((s) => s.provider === providerType);
    setEditingProvider(providerType);
    setMarginForm({
      defaultMargin: setting?.defaultMargin || 0,
      marginType: setting?.marginType || "FIXED",
    });
    setShowMarginModal(true);
  };

  const saveMarginSettings = async () => {
    if (!editingProvider) return;

    try {
      const response = await fetch("/api/admin/providers/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: editingProvider,
          defaultMargin: marginForm.defaultMargin,
          marginType: marginForm.marginType,
          isActive: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setProviderSettings((prev) => {
          const existing = prev.find((s) => s.provider === editingProvider);
          if (existing) {
            return prev.map((s) =>
              s.provider === editingProvider ? data.data : s
            );
          } else {
            return [...prev, data.data];
          }
        });
        
        toast.success("Berhasil update margin settings");
        setShowMarginModal(false);
        
        // Re-sync products to apply new margin
        await syncProviderProducts(editingProvider);
      } else {
        throw new Error("Gagal update settings");
      }
    } catch (error) {
      console.error("Save margin error:", error);
      toast.error("Gagal update margin settings");
    }
  };

  const getProviderMargin = (providerType: string) => {
    const setting = providerSettings.find((s) => s.provider === providerType);
    if (!setting) return "Belum diatur";
    
    if (setting.marginType === "PERCENTAGE") {
      return `${setting.defaultMargin}%`;
    } else {
      return formatCurrency(setting.defaultMargin);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "ONLINE":
        return "bg-emerald-500";
      case "OFFLINE":
        return "bg-rose-500";
      case "DEGRADED":
        return "bg-amber-500";
      default:
        return "bg-slate-400";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "ONLINE":
        return "bg-emerald-100 text-emerald-600";
      case "OFFLINE":
        return "bg-rose-100 text-rose-600";
      case "DEGRADED":
        return "bg-amber-100 text-amber-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const filteredProducts = selectedProvider
    ? products[selectedProvider] || []
    : Object.values(products).flat();

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset page when changing provider filter
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProvider]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2563eb] border-t-transparent mx-auto"></div>
                <p className="mt-4 text-sm text-slate-600">Memuat data...</p>
              </div>
            </div>
          ) : (
            <>

          {/* Page Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Provider Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                Monitor dan kelola provider PPOB Anda
              </p>
            </div>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
            >
              <svg
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>

          {/* Provider Cards */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {providers.map((provider) => (
              <div
                key={provider.type}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getStatusColor(provider.health.status)} text-white`}>
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {provider.type.replace("_", " ")}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            provider.mode === "mock"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {provider.mode.toUpperCase()}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadgeColor(
                            provider.health.status
                          )}`}
                        >
                          {provider.health.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-400">Saldo Provider</p>
                    <p className="mt-2 text-xl font-bold text-slate-800">
                      {formatCurrency(provider.balance.amount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Update: {new Date(provider.balance.lastUpdated).toLocaleTimeString("id-ID")}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-400">Latency</p>
                    <p className="mt-2 text-xl font-bold text-slate-800">
                      {provider.health.latency}ms
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Check: {new Date(provider.health.lastCheck).toLocaleTimeString("id-ID")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-emerald-600">Margin Keuntungan</p>
                      <p className="mt-1 text-lg font-bold text-emerald-700">
                        {getProviderMargin(provider.type)}
                      </p>
                    </div>
                    <button
                      onClick={() => openMarginModal(provider.type)}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
                    >
                      Atur Margin
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() =>
                      setSelectedProvider(
                        selectedProvider === provider.type ? null : provider.type
                      )
                    }
                    className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                  >
                    {selectedProvider === provider.type ? "Semua Produk" : "Lihat Produk"}
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => checkProviderBalance(provider.type)}
                    disabled={checkingBalance[provider.type]}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {checkingBalance[provider.type] ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Loading...
                      </span>
                    ) : (
                      "Cek Saldo"
                    )}
                  </button>
                  <button
                    onClick={() => syncProviderProducts(provider.type)}
                    disabled={syncingProducts[provider.type]}
                    className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
                  >
                    {syncingProducts[provider.type] ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Syncing...
                      </span>
                    ) : (
                      "Sync Layanan"
                    )}
                  </button>
                </div>

                {provider.health.message && provider.health.status !== "ONLINE" && (
                  <div className="mt-3 rounded-xl bg-rose-50 p-3">
                    <p className="text-xs text-rose-600">{provider.health.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Products Table */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Daftar Produk</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedProvider
                    ? `${filteredProducts.length} produk dari ${selectedProvider.replace("_", " ")}`
                    : `${filteredProducts.length} total produk dari semua provider`}
                </p>
              </div>
              {selectedProvider && (
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="text-sm text-[#2563eb] hover:underline"
                >
                  Tampilkan Semua
                </button>
              )}
            </div>

            <div className="mt-4">
              {/* ── Mobile card list ── */}
              <div className="flex flex-col gap-3 sm:hidden">
                {currentProducts.map((product, idx) => (
                  <div key={`${product.code}-${idx}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800 text-sm" title={product.name}>{product.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400 truncate">{product.code}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${product.stock ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                        {product.stock ? "Tersedia" : "Habis"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{product.category}</span>
                      <span>·</span>
                      <span>{product.brand}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white p-3 text-xs">
                      <div>
                        <p className="text-slate-400">Harga Provider</p>
                        <p className="mt-0.5 font-medium text-slate-700">{formatCurrency(product.providerPrice)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Margin</p>
                        <p className="mt-0.5 font-medium text-emerald-600">+{formatCurrency(product.margin)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Harga Jual</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{formatCurrency(product.sellingPrice)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop table ── */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[13%]" />
                    <col className="w-[25%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                      <th className="pb-3 pr-3 font-medium">Kode</th>
                      <th className="pb-3 pr-3 font-medium">Nama Produk</th>
                      <th className="pb-3 pr-3 font-medium">Kategori</th>
                      <th className="pb-3 pr-3 font-medium">Brand</th>
                      <th className="pb-3 pr-3 font-medium">Harga Provider</th>
                      <th className="pb-3 pr-3 font-medium">Margin</th>
                      <th className="pb-3 pr-3 font-medium">Harga Jual</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProducts.map((product, idx) => (
                      <tr
                        key={`${product.code}-${idx}`}
                        className="border-b border-slate-50 text-sm transition hover:bg-slate-50"
                      >
                        <td className="py-3 pr-3 font-mono text-xs text-slate-600 truncate max-w-0" title={product.code}>{product.code}</td>
                        <td className="py-3 pr-3 font-medium text-slate-800 max-w-0">
                          <span className="block truncate" title={product.name}>{product.name}</span>
                        </td>
                        <td className="py-3 pr-3 text-slate-600 truncate max-w-0" title={product.category}>{product.category}</td>
                        <td className="py-3 pr-3 text-slate-600 truncate max-w-0" title={product.brand}>{product.brand}</td>
                        <td className="py-3 pr-3 text-slate-600 whitespace-nowrap">
                          {formatCurrency(product.providerPrice)}
                        </td>
                        <td className="py-3 pr-3 font-medium text-emerald-600 whitespace-nowrap">
                          +{formatCurrency(product.margin)}
                        </td>
                        <td className="py-3 pr-3 font-semibold text-slate-800 whitespace-nowrap">
                          {formatCurrency(product.sellingPrice)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              product.stock
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-rose-100 text-rose-600"
                            }`}
                          >
                            {product.stock ? "Tersedia" : "Habis"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredProducts.length > 0 && (
                <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <p className="text-sm text-slate-600">
                    Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredProducts.length)} dari {filteredProducts.length} produk
                  </p>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {getPageNumbers().map((page, idx) => (
                          page === '...' ? (
                            <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-slate-400">
                              ...
                            </span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => goToPage(page as number)}
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition ${
                                currentPage === page
                                  ? 'bg-[#2563eb] text-white'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        ))}
                      </div>
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {filteredProducts.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-400">Tidak ada produk. Klik 'Sync Layanan' untuk mengambil produk dari provider.</p>
                </div>
              )}
            </div>
          </div>

          {/* Margin Configuration Modal */}
          {showMarginModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md px-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">
                    Atur Margin - {editingProvider?.replace("_", " ")}
                  </h3>
                  <button
                    onClick={() => setShowMarginModal(false)}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Tipe Margin
                    </label>
                    <select
                      value={marginForm.marginType}
                      onChange={(e) =>
                        setMarginForm((prev) => ({
                          ...prev,
                          marginType: e.target.value as "FIXED" | "PERCENTAGE",
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="FIXED">Fixed (Nominal)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Nilai Margin{" "}
                      {marginForm.marginType === "PERCENTAGE" ? "(%)" : "(Rupiah)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={marginForm.marginType === "PERCENTAGE" ? "0.1" : "100"}
                      value={marginForm.defaultMargin}
                      onChange={(e) =>
                        setMarginForm((prev) => ({
                          ...prev,
                          defaultMargin: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder={
                        marginForm.marginType === "PERCENTAGE"
                          ? "Contoh: 10 untuk 10%"
                          : "Contoh: 2000 untuk Rp 2.000"
                      }
                    />
                  </div>

                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-600">Contoh Perhitungan:</p>
                    <div className="mt-2 space-y-1 text-sm text-blue-700">
                      <p>Harga Provider: Rp 5.000</p>
                      <p>
                        Margin:{" "}
                        {marginForm.marginType === "PERCENTAGE"
                          ? `${marginForm.defaultMargin}% = Rp ${((5000 * marginForm.defaultMargin) / 100).toLocaleString("id-ID")}`
                          : `Rp ${marginForm.defaultMargin.toLocaleString("id-ID")}`}
                      </p>
                      <p className="font-semibold">
                        Harga Jual:{" "}
                        {marginForm.marginType === "PERCENTAGE"
                          ? `Rp ${(5000 + (5000 * marginForm.defaultMargin) / 100).toLocaleString("id-ID")}`
                          : `Rp ${(5000 + marginForm.defaultMargin).toLocaleString("id-ID")}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowMarginModal(false)}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={saveMarginSettings}
                    className="flex-1 rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                  >
                    Simpan & Sync
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
