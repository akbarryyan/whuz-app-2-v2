"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  provider: string;
}

interface PaymentInvoice {
  id: string;
  invoiceId: string;
  gatewayName: string;
  status: string;
  paidAt: string | null;
}

interface Transaction {
  id: string;
  orderCode: string;
  userId: string | null;
  user: User | null;
  product: Product;
  targetNumber: string;
  targetData: any;
  amount: number;
  status: string;
  paymentMethod: string;
  serialNumber: string | null;
  providerTrxId: string | null;
  notes: string | null;
  paymentInvoice: PaymentInvoice | null;
  createdAt: string;
  updatedAt: string;
}

interface TransactionDetail extends Transaction {
  providerLogs: ProviderLog[];
}

interface ProviderLog {
  id: string;
  provider: string;
  action: string;
  request: any;
  response: any;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  totalRevenue: number;
  byPaymentMethod: {
    wallet: number;
    gateway: number;
  };
  byUserType: {
    guest: number;
    member: number;
  };
}

interface FilterState {
  status: string;
  paymentMethod: string;
  userType: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

export default function TransactionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    status: "",
    paymentMethod: "",
    userType: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const itemsPerPage = 20;
  const toast = useToast();

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.paymentMethod) params.append("paymentMethod", filters.paymentMethod);
      if (filters.userType) params.append("userType", filters.userType);
      if (filters.search) params.append("search", filters.search);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const response = await fetch(`/api/admin/transactions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
      toast.error("Gagal memuat data transaksi");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const response = await fetch(`/api/admin/transactions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTransaction(data.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error("Failed to load transaction detail:", error);
      toast.error("Gagal memuat detail transaksi");
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredTransactions = transactions;

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

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

  const clearFilters = () => {
    setFilters({
      status: "",
      paymentMethod: "",
      userType: "",
      search: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const applyFilters = () => {
    loadTransactions();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "bg-emerald-100 text-emerald-600";
      case "FAILED":
        return "bg-rose-100 text-rose-600";
      case "PROCESSING_PROVIDER":
        return "bg-blue-100 text-blue-600";
      case "PAID":
        return "bg-purple-100 text-purple-600";
      case "WAITING_PAYMENT":
        return "bg-amber-100 text-amber-600";
      case "EXPIRED":
        return "bg-slate-100 text-slate-600";
      case "REFUNDED":
        return "bg-indigo-100 text-indigo-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CREATED: "Dibuat",
      WAITING_PAYMENT: "Menunggu Bayar",
      PAID: "Dibayar",
      PROCESSING_PROVIDER: "Diproses Provider",
      SUCCESS: "Berhasil",
      FAILED: "Gagal",
      EXPIRED: "Kadaluarsa",
      REFUNDED: "Refund",
    };
    return labels[status] || status;
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
              <h1 className="text-2xl font-bold text-slate-800">Transaksi</h1>
              <p className="mt-1 text-sm text-slate-500">
                Monitor semua transaksi PPOB dan topup game
              </p>
            </div>
            <button
              onClick={loadTransactions}
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
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Transaksi</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{stats.total}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                    💳
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Berhasil</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.success}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    ✅
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Gagal</p>
                    <p className="mt-2 text-2xl font-bold text-rose-600">{stats.failed}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                    ❌
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Pending</p>
                    <p className="mt-2 text-2xl font-bold text-amber-600">{stats.pending}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                    ⏳
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Revenue</p>
                    <p className="mt-2 text-xl font-bold text-purple-600">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                    💰
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Filter Transaksi</h2>
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
                <label className="block text-sm font-medium text-slate-700">Cari Transaksi</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Order code, customer, target..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Semua Status</option>
                  <option value="SUCCESS">Berhasil</option>
                  <option value="FAILED">Gagal</option>
                  <option value="PROCESSING_PROVIDER">Diproses Provider</option>
                  <option value="PAID">Dibayar</option>
                  <option value="WAITING_PAYMENT">Menunggu Bayar</option>
                  <option value="EXPIRED">Kadaluarsa</option>
                  <option value="REFUNDED">Refund</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Metode Bayar</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Semua Metode</option>
                  <option value="WALLET">Wallet</option>
                  <option value="PAYMENT_GATEWAY">Payment Gateway</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Tipe User</label>
                <select
                  value={filters.userType}
                  onChange={(e) => setFilters((prev) => ({ ...prev, userType: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Semua Tipe</option>
                  <option value="member">Member</option>
                  <option value="guest">Guest</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Tanggal Dari</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Tanggal Sampai</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={applyFilters}
                className="rounded-full bg-[#2563eb] px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Terapkan Filter
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Daftar Transaksi</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {filteredTransactions.length} transaksi ditemukan
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
                  {currentTransactions.map((transaction) => (
                    <div key={transaction.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-slate-700 truncate">{transaction.orderCode}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {new Date(transaction.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeColor(transaction.status)}`}>
                          {getStatusLabel(transaction.status)}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Customer</span>
                          <span className="font-medium text-slate-700 text-right truncate max-w-[60%]">
                            {transaction.user ? (transaction.user.name || transaction.user.phone || transaction.user.email || "-") : (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-500">Guest</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Produk</span>
                          <span className="font-medium text-slate-700 text-right truncate max-w-[60%]">{transaction.product.name}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Target</span>
                          <span className="font-mono font-medium text-slate-700">{transaction.targetNumber}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Jumlah</span>
                          <span className="font-bold text-slate-800">{formatCurrency(transaction.amount)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Metode</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${transaction.paymentMethod === "WALLET" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                            {transaction.paymentMethod === "WALLET" ? "Wallet" : "Gateway"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => loadTransactionDetail(transaction.id)}
                        className="mt-3 w-full rounded-xl bg-blue-100 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-200 transition"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  ))}
                </div>

                {/* ── Desktop table ── */}
                <div className="mt-5 hidden overflow-x-auto sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                        <th className="pb-3 font-medium">Order Code</th>
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Produk</th>
                        <th className="pb-3 font-medium">Target</th>
                        <th className="pb-3 font-medium">Jumlah</th>
                        <th className="pb-3 font-medium">Metode</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Waktu</th>
                        <th className="pb-3 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-slate-50 text-sm transition hover:bg-slate-50"
                        >
                          <td className="py-3 font-mono text-xs text-slate-600">
                            {transaction.orderCode}
                          </td>
                          <td className="py-3">
                            {transaction.user ? (
                              <div>
                                <p className="font-medium text-slate-800">
                                  {transaction.user.name || "-"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {transaction.user.phone || transaction.user.email || "-"}
                                </p>
                              </div>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                Guest
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <div>
                              <p className="font-medium text-slate-800">{transaction.product.name}</p>
                              <p className="text-xs text-slate-500">
                                {transaction.product.category} • {transaction.product.provider}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 font-mono text-xs text-slate-600">
                            {transaction.targetNumber}
                          </td>
                          <td className="py-3 font-semibold text-slate-800">
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                transaction.paymentMethod === "WALLET"
                                  ? "bg-purple-100 text-purple-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {transaction.paymentMethod === "WALLET" ? "Wallet" : "Gateway"}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(
                                transaction.status
                              )}`}
                            >
                              {getStatusLabel(transaction.status)}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-slate-600">
                            {new Date(transaction.createdAt).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => loadTransactionDetail(transaction.id)}
                              className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-200"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredTransactions.length > 0 && (
                  <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-sm text-slate-600">
                      Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
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

                {filteredTransactions.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="text-6xl">💳</div>
                    <p className="mt-4 text-lg font-medium text-slate-600">
                      Tidak ada transaksi ditemukan
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Coba ubah filter atau tunggu transaksi baru masuk
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail Modal */}
          {showDetailModal && selectedTransaction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md px-4">
              <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Detail Transaksi</h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {loadingDetail ? (
                  <div className="py-12 text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2563eb] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-sm text-slate-600">Memuat detail...</p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {/* Order Info */}
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500">Order Code</p>
                          <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                            {selectedTransaction.orderCode}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">Status</p>
                          <span
                            className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeColor(
                              selectedTransaction.status
                            )}`}
                          >
                            {getStatusLabel(selectedTransaction.status)}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">Customer</p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {selectedTransaction.user
                              ? selectedTransaction.user.name || "-"
                              : "Guest"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">Payment Method</p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {selectedTransaction.paymentMethod === "WALLET" ? "Wallet" : "Payment Gateway"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-800">Produk</p>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Nama</span>
                          <span className="text-sm font-medium text-slate-800">
                            {selectedTransaction.product.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Kategori</span>
                          <span className="text-sm font-medium text-slate-800">
                            {selectedTransaction.product.category}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Provider</span>
                          <span className="text-sm font-medium text-slate-800">
                            {selectedTransaction.product.provider}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Target</span>
                          <span className="text-sm font-mono font-medium text-slate-800">
                            {selectedTransaction.targetNumber}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-2">
                          <span className="text-sm font-semibold text-slate-800">Total</span>
                          <span className="text-lg font-bold text-slate-800">
                            {formatCurrency(selectedTransaction.amount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Serial Number */}
                    {selectedTransaction.serialNumber && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-semibold text-emerald-800">Serial Number</p>
                        <p className="mt-2 font-mono text-sm text-emerald-700">
                          {selectedTransaction.serialNumber}
                        </p>
                      </div>
                    )}

                    {/* Provider Logs */}
                    {selectedTransaction.providerLogs.length > 0 && (
                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-sm font-semibold text-slate-800">Provider Logs</p>
                        <div className="mt-3 space-y-2">
                          {selectedTransaction.providerLogs.map((log) => (
                            <div
                              key={log.id}
                              className={`rounded-lg p-3 ${
                                log.success ? "bg-emerald-50" : "bg-rose-50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600">
                                  {log.action} • {log.provider}
                                </span>
                                <span
                                  className={`text-xs font-semibold ${
                                    log.success ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {log.success ? "✓ Success" : "✗ Failed"}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                {new Date(log.createdAt).toLocaleString("id-ID")}
                              </p>
                              {log.errorMessage && (
                                <p className="mt-2 text-xs text-rose-600">
                                  Error: {log.errorMessage}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-500">Dibuat</p>
                          <p className="mt-1 font-medium text-slate-800">
                            {new Date(selectedTransaction.createdAt).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Diupdate</p>
                          <p className="mt-1 font-medium text-slate-800">
                            {new Date(selectedTransaction.updatedAt).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="rounded-full bg-[#2563eb] px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                  >
                    Tutup
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
