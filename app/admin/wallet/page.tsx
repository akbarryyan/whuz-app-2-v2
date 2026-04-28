"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletInfo {
  id: string;
  balance: number;
  entryCount: number;
  updatedAt: string;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  wallet: WalletInfo | null;
}

interface LedgerEntry {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

interface LedgerResponse {
  wallet: {
    id: string;
    balance: number;
    updatedAt: string;
    user: { name: string | null; email: string | null; phone: string | null };
  } | null;
  data: LedgerEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  CREDIT:  { label: "CREDIT",  color: "bg-emerald-100 text-emerald-700",  desc: "Top-up / tambah saldo" },
  COMMISSION: { label: "COMMISSION", color: "bg-lime-100 text-lime-700", desc: "Komisi seller dari order sukses" },
  HOLD:    { label: "HOLD",    color: "bg-amber-100 text-amber-700",      desc: "Tahan saldo (transaksi pending)" },
  RELEASE: { label: "RELEASE", color: "bg-sky-100 text-sky-700",          desc: "Kembalikan saldo yang di-hold" },
  DEBIT:   { label: "DEBIT",   color: "bg-rose-100 text-rose-700",        desc: "Potong saldo langsung" },
  REFUND:  { label: "REFUND",  color: "bg-purple-100 text-purple-700",    desc: "Kembalikan saldo setelah debit" },
  WITHDRAW_HOLD: { label: "WITHDRAW_HOLD", color: "bg-orange-100 text-orange-700", desc: "Saldo ditahan untuk request withdraw seller" },
  WITHDRAW_RELEASE: { label: "WITHDRAW_RELEASE", color: "bg-cyan-100 text-cyan-700", desc: "Saldo withdraw seller dikembalikan" },
  WITHDRAW_PAID: { label: "WITHDRAW_PAID", color: "bg-fuchsia-100 text-fuchsia-700", desc: "Withdraw seller sudah dibayarkan" },
};

const DELTA_SIGN: Record<string, string> = {
  CREDIT: "+", RELEASE: "+", REFUND: "+",
  COMMISSION: "+", WITHDRAW_RELEASE: "+",
  HOLD: "-",   DEBIT: "-", WITHDRAW_HOLD: "-", WITHDRAW_PAID: "",
};

function rp(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminWalletPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toast = useToast();

  // Users list
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQ, setSearchQ] = useState("");

  // Selected user
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  // Ledger
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("");

  // Operation form
  const [opAction, setOpAction] = useState<"CREDIT" | "HOLD" | "DEBIT" | "RELEASE" | "REFUND">("CREDIT");
  const [opAmount, setOpAmount] = useState("");
  const [opRef, setOpRef] = useState("");
  const [opDesc, setOpDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch users ─────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (q: string) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/wallet?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) setUsers(data.data);
      else toast.error("Gagal memuat daftar user.");
    } catch {
      toast.error("Gagal memuat daftar user.");
    } finally {
      setLoadingUsers(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ, fetchUsers]);

  // ── Fetch ledger ─────────────────────────────────────────────────────────────

  const fetchLedger = useCallback(async (userId: string, page: number, type: string) => {
    setLoadingLedger(true);
    try {
      const params = new URLSearchParams({
        userId,
        page: String(page),
        limit: "20",
        ...(type ? { type } : {}),
      });
      const res = await fetch(`/api/admin/wallet/ledger?${params}`);
      const data = await res.json();
      if (data.success) setLedger(data);
      else toast.error("Gagal memuat ledger.");
    } catch {
      toast.error("Gagal memuat ledger.");
    } finally {
      setLoadingLedger(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchLedger(selectedUser.id, ledgerPage, ledgerTypeFilter);
    }
  }, [selectedUser, ledgerPage, ledgerTypeFilter, fetchLedger]);

  const selectUser = (user: UserRow) => {
    setSelectedUser(user);
    setLedgerPage(1);
    setLedgerTypeFilter("");
    setLedger(null);
  };

  // ── Submit operation ─────────────────────────────────────────────────────────

  const handleSubmitOp = async () => {
    if (!selectedUser) return;
    const amount = Number(opAmount.replace(/[^0-9]/g, ""));
    if (!amount || amount <= 0) {
      toast.error("Masukkan jumlah yang valid.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: opAction,
          userId: selectedUser.id,
          amount,
          reference: opRef.trim() || undefined,
          description: opDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const after = data.data.wallet.balanceAfter;
        toast.success(`${opAction} berhasil. Saldo baru: ${rp(after)}`);
        // Refresh
        setOpAmount("");
        setOpRef("");
        setOpDesc("");
        await fetchUsers(searchQ);
        // Update selectedUser balance
        setSelectedUser((prev) =>
          prev ? { ...prev, wallet: prev.wallet ? { ...prev.wallet, balance: after } : { id: "", balance: after, entryCount: 0, updatedAt: new Date().toISOString() } } : null
        );
        await fetchLedger(selectedUser.id, 1, ledgerTypeFilter);
        setLedgerPage(1);
      } else {
        toast.error(data.error ?? "Operasi gagal.");
      }
    } catch {
      toast.error("Operasi gagal.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const currentBalance = ledger?.wallet?.balance ?? selectedUser?.wallet?.balance ?? 0;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Page Header */}
          <div>
            <h1 className="text-xl font-bold text-slate-800">Wallet Engine</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Kelola saldo, operasi HOLD/DEBIT/RELEASE/CREDIT, dan histori ledger per user.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            {/* ── Left column: user list ─────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                {/* Search */}
                <div className="border-b border-slate-100 p-4">
                  <input
                    type="text"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Cari nama, email, phone..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                </div>

                {/* List */}
                <div className="max-h-[calc(100vh-18rem)] overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-8 text-sm text-slate-400">
                      Memuat...
                    </div>
                  ) : users.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-slate-400">
                      Tidak ada user
                    </div>
                  ) : (
                    users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className={`flex w-full items-start justify-between px-4 py-3 text-left transition hover:bg-slate-50 ${
                          selectedUser?.id === user.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {user.name ?? "(no name)"}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {user.email ?? user.phone ?? user.id.slice(0, 12)}
                          </p>
                        </div>
                        <div className="ml-2 shrink-0 text-right">
                          {user.wallet ? (
                            <p className="text-sm font-semibold text-emerald-600">
                              {rp(user.wallet.balance)}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400">No wallet</p>
                          )}
                          <span
                            className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              user.role === "ADMIN"
                                ? "bg-purple-100 text-purple-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── Right column ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-5 lg:col-span-3">
              {!selectedUser ? (
                <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-sm text-slate-400 shadow-sm ring-1 ring-slate-100">
                  Pilih user dari daftar untuk melihat wallet & ledger
                </div>
              ) : (
                <>
                  {/* Balance card */}
                  <div className="rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] p-5 text-white shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium opacity-80">
                          {selectedUser.name ?? "(no name)"}
                        </p>
                        <p className="text-xs opacity-60">
                          {selectedUser.email ?? selectedUser.phone ?? selectedUser.id}
                        </p>
                      </div>
                      <span className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-semibold">
                        {selectedUser.role}
                      </span>
                    </div>
                    <p className="mt-4 text-3xl font-bold tracking-tight">
                      {rp(currentBalance)}
                    </p>
                    <p className="mt-1 text-xs opacity-60">
                      {ledger?.wallet
                        ? `Diperbarui ${fmtDate(ledger.wallet.updatedAt)}`
                        : selectedUser.wallet
                        ? `${selectedUser.wallet.entryCount} entri`
                        : "Wallet belum dibuat — akan dibuat otomatis saat operasi pertama"}
                    </p>
                  </div>

                  {/* Operation form */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <h2 className="mb-4 text-sm font-semibold text-slate-700">Operasi Wallet</h2>

                    {/* Action picker */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      {(["CREDIT", "HOLD", "RELEASE", "DEBIT", "REFUND"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => setOpAction(a)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                            opAction === a
                              ? ACTION_LABELS[a].color + " ring-2 ring-offset-1 ring-current/30"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>

                    <p className="mb-3 text-xs text-slate-500">{ACTION_LABELS[opAction].desc}</p>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Amount */}
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Jumlah (Rp)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={opAmount}
                          onChange={(e) => setOpAmount(e.target.value)}
                          placeholder="Contoh: 50000"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        />
                      </div>

                      {/* Reference */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Referensi (opsional)
                        </label>
                        <input
                          type="text"
                          value={opRef}
                          onChange={(e) => setOpRef(e.target.value)}
                          placeholder="Order ID, dll."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Keterangan (opsional)
                        </label>
                        <input
                          type="text"
                          value={opDesc}
                          onChange={(e) => setOpDesc(e.target.value)}
                          placeholder="Catatan admin"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitOp}
                      disabled={submitting || !opAmount}
                      className="mt-4 w-full rounded-xl bg-[#2563eb] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Memproses..." : `Jalankan ${opAction}`}
                    </button>
                  </div>

                  {/* Ledger table */}
                  <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                    {/* Ledger header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                      <h2 className="text-sm font-semibold text-slate-700">
                        Histori Ledger
                        {ledger && (
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            ({ledger.total} entri)
                          </span>
                        )}
                      </h2>
                      {/* Type filter */}
                      <select
                        value={ledgerTypeFilter}
                        onChange={(e) => { setLedgerTypeFilter(e.target.value); setLedgerPage(1); }}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-blue-400"
                      >
                        <option value="">Semua tipe</option>
                        {Object.keys(ACTION_LABELS).map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>

                    {/* Table */}
                    {loadingLedger ? (
                      <div className="flex items-center justify-center py-10 text-sm text-slate-400">
                        Memuat ledger...
                      </div>
                    ) : !ledger || ledger.data.length === 0 ? (
                      <div className="flex items-center justify-center py-10 text-sm text-slate-400">
                        Belum ada entri ledger
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                              <th className="px-5 py-3 font-medium">Tanggal</th>
                              <th className="px-3 py-3 font-medium">Tipe</th>
                              <th className="px-3 py-3 text-right font-medium">Jumlah</th>
                              <th className="px-3 py-3 text-right font-medium">Saldo Sesudah</th>
                              <th className="px-3 py-3 font-medium">Referensi</th>
                              <th className="px-5 py-3 font-medium">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {ledger.data.map((entry) => {
                              const sign = DELTA_SIGN[entry.type] ?? "+";
                              const isPositive = sign === "+";
                              return (
                                <tr key={entry.id} className="hover:bg-slate-50">
                                  <td className="px-5 py-3 text-xs text-slate-500">
                                    {fmtDate(entry.createdAt)}
                                  </td>
                                  <td className="px-3 py-3">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        ACTION_LABELS[entry.type]?.color ?? "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {entry.type}
                                    </span>
                                  </td>
                                  <td
                                    className={`px-3 py-3 text-right text-xs font-semibold ${
                                      isPositive ? "text-emerald-600" : "text-rose-500"
                                    }`}
                                  >
                                    {sign}{rp(entry.amount)}
                                  </td>
                                  <td className="px-3 py-3 text-right text-xs text-slate-700">
                                    {rp(entry.balanceAfter)}
                                  </td>
                                  <td className="px-3 py-3 text-xs text-slate-500">
                                    {entry.reference ?? "—"}
                                  </td>
                                  <td className="max-w-[12rem] truncate px-5 py-3 text-xs text-slate-500">
                                    {entry.description ?? "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {ledger && ledger.totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                        <p className="text-xs text-slate-400">
                          Halaman {ledger.page} / {ledger.totalPages}
                        </p>
                        <div className="flex gap-2">
                          <button
                            disabled={ledger.page <= 1}
                            onClick={() => setLedgerPage((p) => p - 1)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ← Prev
                          </button>
                          <button
                            disabled={ledger.page >= ledger.totalPages}
                            onClick={() => setLedgerPage((p) => p + 1)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
