"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface Product {
  id: string;
  provider: string;
  providerCode: string;
  name: string;
  category: string;
  brand: string;
  type: string;
  providerPrice: number;
  margin: number;
  sellingPrice: number;
  stock: boolean;
  description?: string;
  isActive: boolean;
  lastSyncAt: string;
}

interface FilterState {
  search: string;
  provider: string;
  category: string;
  brand: string;
  status: string;
  stock: string;
}

export default function ProductsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    provider: "",
    category: "",
    brand: "",
    status: "",
    stock: "",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    margin: 0,
    isActive: true,
  });

  const itemsPerPage = 20;
  const toast = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/products", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Gagal memuat daftar produk");
      }

      const data = await response.json();
      const items = Array.isArray(data.data) ? data.data : [];
      setProducts(items);

      // Extract unique categories and brands
      const uniqueCategories = Array.from(new Set(items.map((p: Product) => p.category))).sort();
      const uniqueBrands = Array.from(new Set(items.map((p: Product) => p.brand))).sort();
      setCategories(uniqueCategories as string[]);
      setBrands(uniqueBrands as string[]);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Gagal memuat data produk");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchSearch = 
      filters.search === "" ||
      product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      product.providerCode.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchProvider = filters.provider === "" || product.provider === filters.provider;
    const matchCategory = filters.category === "" || product.category === filters.category;
    const matchBrand = filters.brand === "" || product.brand === filters.brand;
    const matchStatus = 
      filters.status === "" ||
      (filters.status === "active" && product.isActive) ||
      (filters.status === "inactive" && !product.isActive);
    const matchStock =
      filters.stock === "" ||
      (filters.stock === "available" && product.stock) ||
      (filters.stock === "empty" && !product.stock);

    return matchSearch && matchProvider && matchCategory && matchBrand && matchStatus && matchStock;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
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

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      margin: product.margin,
      isActive: product.isActive,
    });
    setShowEditModal(true);
  };

  const saveProductChanges = async () => {
    if (!editingProduct) return;

    try {
      const response = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProduct.id,
          margin: editForm.margin,
          isActive: editForm.isActive,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? data.data : p))
        );
        
        toast.success("Berhasil update produk");
        setShowEditModal(false);
      } else {
        throw new Error("Gagal update produk");
      }
    } catch (error) {
      console.error("Save product error:", error);
      toast.error("Gagal update produk");
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const response = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          isActive: !product.isActive,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? data.data : p))
        );
        toast.success(`Produk ${!product.isActive ? "diaktifkan" : "dinonaktifkan"}`);
      } else {
        throw new Error("Gagal update status");
      }
    } catch (error) {
      console.error("Toggle status error:", error);
      toast.error("Gagal update status produk");
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      provider: "",
      category: "",
      brand: "",
      status: "",
      stock: "",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const activeFiltersCount = Object.values(filters).filter((v) => v !== "").length;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Page Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Manajemen Produk</h1>
              <p className="mt-1 text-sm text-slate-500">
                Kelola produk dan harga jual PPOB Anda
              </p>
            </div>
            <button
              onClick={loadProducts}
              disabled={loading}
              className="flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
            >
              <svg
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
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
              <span>{loading ? "Loading..." : "Refresh"}</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Produk</p>
                  <p className="mt-2 text-2xl font-bold text-slate-800">{products.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  🛒
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Produk Aktif</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">
                    {products.filter((p) => p.isActive).length}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  ✅
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Stok Tersedia</p>
                  <p className="mt-2 text-2xl font-bold text-blue-600">
                    {products.filter((p) => p.stock).length}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  📦
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Kategori</p>
                  <p className="mt-2 text-2xl font-bold text-purple-600">
                    {categories.length}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                  📋
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Filter Produk</h2>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-[#2563eb] hover:underline"
                >
                  Reset Filter ({activeFiltersCount})
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Cari Produk</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Nama atau kode produk..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Provider</label>
                <select
                  value={filters.provider}
                  onChange={(e) => setFilters((prev) => ({ ...prev, provider: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Semua Provider</option>
                  <option value="DIGIFLAZZ">DIGIFLAZZ</option>
                  <option value="VIP_RESELLER">VIP RESELLER</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Kategori</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Brand</label>
                <select
                  value={filters.brand}
                  onChange={(e) => setFilters((prev) => ({ ...prev, brand: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Semua Brand</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Stok</label>
                <select
                  value={filters.stock}
                  onChange={(e) => setFilters((prev) => ({ ...prev, stock: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Semua Stok</option>
                  <option value="available">Tersedia</option>
                  <option value="empty">Habis</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Daftar Produk</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {filteredProducts.length} produk ditemukan
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2563eb] border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-sm text-slate-600">Memuat data...</p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Mobile card list ── */}
                <div className="mt-4 flex flex-col gap-3 sm:hidden">
                  {currentProducts.map((product) => (
                    <div key={product.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800 text-sm" title={product.name}>
                            {product.name}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-slate-400 truncate">{product.providerCode}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${product.isActive ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                            {product.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${product.stock ? "bg-blue-100 text-blue-600" : "bg-rose-100 text-rose-600"}`}>
                            {product.stock ? "Stok" : "Habis"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-600">
                          {product.provider.replace("_", " ")}
                        </span>
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

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="flex-1 rounded-full bg-blue-100 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleProductStatus(product)}
                          className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${
                            product.isActive
                              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                          }`}
                        >
                          {product.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Desktop table ── */}
                <div className="mt-5 hidden overflow-x-auto sm:block">
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[10%]" />
                      <col className="w-[11%]" />
                      <col className="w-[22%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[10%]" />
                      <col className="w-[8%]" />
                      <col className="w-[10%]" />
                      <col className="w-[7%]" />
                      <col className="w-[4%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                        <th className="pb-3 pr-3 font-medium">Provider</th>
                        <th className="pb-3 pr-3 font-medium">Kode</th>
                        <th className="pb-3 pr-3 font-medium">Nama Produk</th>
                        <th className="pb-3 pr-3 font-medium">Kategori</th>
                        <th className="pb-3 pr-3 font-medium">Brand</th>
                        <th className="pb-3 pr-3 font-medium">Harga Provider</th>
                        <th className="pb-3 pr-3 font-medium">Margin</th>
                        <th className="pb-3 pr-3 font-medium">Harga Jual</th>
                        <th className="pb-3 pr-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="border-b border-slate-50 text-sm transition hover:bg-slate-50"
                        >
                          <td className="py-3 pr-3">
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-600 whitespace-nowrap">
                              {product.provider.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 pr-3 font-mono text-xs text-slate-600 truncate max-w-0" title={product.providerCode}>
                            {product.providerCode}
                          </td>
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
                          <td className="py-3 pr-3">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium text-center ${
                                  product.isActive
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {product.isActive ? "Aktif" : "Nonaktif"}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium text-center ${
                                  product.stock
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-rose-100 text-rose-600"
                                }`}
                              >
                                {product.stock ? "Stok" : "Habis"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => openEditModal(product)}
                                className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleProductStatus(product)}
                                className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
                                  product.isActive
                                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                                }`}
                              >
                                {product.isActive ? "Nonaktif" : "Aktifkan"}
                              </button>
                            </div>
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
                    <div className="py-12 text-center">
                      <div className="text-6xl">📦</div>
                      <p className="mt-4 text-lg font-medium text-slate-600">
                        Tidak ada produk ditemukan
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        Coba ubah filter atau sync produk dari provider
                      </p>
                    </div>
                  )}
              </>
            )}
          </div>

          {/* Edit Product Modal */}
          {showEditModal && editingProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md px-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Edit Produk</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Nama Produk</p>
                  <p className="mt-1 font-semibold text-slate-800">{editingProduct.name}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Provider: {editingProduct.provider.replace("_", " ")} • {editingProduct.providerCode}
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Margin Keuntungan (Rupiah)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={editForm.margin}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          margin: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Status Produk</p>
                      <p className="text-xs text-slate-500">
                        {editForm.isActive ? "Produk dapat dijual" : "Produk tidak tersedia"}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setEditForm((prev) => ({ ...prev, isActive: !prev.isActive }))
                      }
                      className={`relative h-7 w-12 rounded-full transition ${
                        editForm.isActive ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                          editForm.isActive ? "right-1" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-600">Ringkasan Harga:</p>
                    <div className="mt-2 space-y-1 text-sm text-blue-700">
                      <p>Harga Provider: {formatCurrency(editingProduct.providerPrice)}</p>
                      <p>Margin: +{formatCurrency(editForm.margin)}</p>
                      <p className="font-semibold">
                        Harga Jual: {formatCurrency(editingProduct.providerPrice + editForm.margin)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={saveProductChanges}
                    className="flex-1 rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
