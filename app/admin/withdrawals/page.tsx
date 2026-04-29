"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

type WithdrawalStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED" | "CANCELLED";

interface WithdrawalItem {
  id: string;
  userId: string;
  amount: number;
  status: WithdrawalStatus;
  bankCode: string | null;
  accountName: string;
  accountNumber: string;
  bankName: string;
  note: string | null;
  payoutGateway: string | null;
  payoutRefId: string | null;
  payoutAggRefId: string | null;
  processedNote: string | null;
  processedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    sellerProfile: {
      slug: string;
      displayName: string;
    } | null;
  };
}

interface ActionModal {
  item: WithdrawalItem;
  status: Exclude<WithdrawalStatus, "PENDING">;
}

const STATUS_OPTIONS: Array<{ value: "" | WithdrawalStatus; label: string }> = [
  { value: "", label: "Semua Status" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "PAID", label: "Paid" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusMeta(status: WithdrawalStatus) {
  if (status === "PENDING") {
    return { label: "Pending", className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" };
  }
  if (status === "APPROVED") {
    return { label: "Disetujui", className: "bg-sky-100 text-sky-700 ring-1 ring-sky-200" };
  }
  if (status === "PAID") {
    return { label: "Paid", className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" };
  }
  if (status === "REJECTED") {
    return { label: "Ditolak", className: "bg-rose-100 text-rose-700 ring-1 ring-rose-200" };
  }
  return { label: "Dibatalkan", className: "bg-slate-200 text-slate-700 ring-1 ring-slate-300" };
}

function defaultNote(status: ActionModal["status"]) {
  if (status === "APPROVED") return "Withdraw disetujui, menunggu transfer manual.";
  if (status === "PAID") return "Withdraw dibayar manual oleh admin.";
  if (status === "REJECTED") return "Withdraw ditolak admin.";
  return "Withdraw dibatalkan admin.";
}

function actionTitle(status: ActionModal["status"]) {
  if (status === "APPROVED") return "Approve Withdraw";
  if (status === "PAID") return "Tandai Paid";
  if (status === "REJECTED") return "Tolak Withdraw";
  return "Batalkan Withdraw";
}

export default function AdminWithdrawalsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | WithdrawalStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionRef, setActionRef] = useState("");
  const [actionBankCode, setActionBankCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toasts, removeToast, error: showError, success: showSuccess } = useToast();

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/admin/seller-withdrawals?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || "Gagal memuat withdraw merchant");
      }

      setItems(json.data);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Gagal memuat withdraw merchant";
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError, statusFilter]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const merchantName = item.user.sellerProfile?.displayName ?? "";
      return [
        item.id,
        item.accountName,
        item.accountNumber,
        item.bankName,
        item.bankCode ?? "",
        item.payoutRefId ?? "",
        merchantName,
        item.user.name ?? "",
        item.user.email ?? "",
        item.user.phone ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, search]);

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.count += 1;
        acc.totalAmount += item.amount;
        acc.byStatus[item.status] += 1;
        return acc;
      },
      {
        count: 0,
        totalAmount: 0,
        byStatus: {
          PENDING: 0,
          APPROVED: 0,
          PAID: 0,
          REJECTED: 0,
          CANCELLED: 0,
        } as Record<WithdrawalStatus, number>,
      }
    );
  }, [items]);

  function openAction(item: WithdrawalItem, status: ActionModal["status"]) {
    setActionModal({ item, status });
    setActionNote(defaultNote(status));
    setActionRef(item.payoutRefId ?? "");
    setActionBankCode(item.bankCode ?? "");
  }

  function closeAction() {
    if (submitting) return;
    setActionModal(null);
    setActionNote("");
    setActionRef("");
    setActionBankCode("");
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionModal) return;

    setSubmitting(true);
    try {
      const payload = {
        status: actionModal.status,
        processedNote: actionNote.trim() || undefined,
        payoutRefId: actionRef.trim() || undefined,
        bankCode: actionBankCode.trim() || undefined,
      };

      const response = await fetch(`/api/admin/seller-withdrawals/${actionModal.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || "Gagal memproses withdraw");
      }

      const updatedItem = json.data as WithdrawalItem;
      setItems((prev) => {
        if (statusFilter && updatedItem.status !== statusFilter) {
          return prev.filter((item) => item.id !== updatedItem.id);
        }

        return prev.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      });
      showSuccess("Withdraw merchant berhasil diperbarui.");
      closeAction();
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Gagal memproses withdraw";
      showError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <div>
            <h1 className="text-xl font-bold text-slate-800">Withdraw Merchant</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Proses pencairan saldo merchant secara manual dari dashboard admin.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Request</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.count}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nominal</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{rupiah(stats.totalAmount)}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Pending</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{stats.byStatus.PENDING}</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Disetujui</p>
              <p className="mt-2 text-2xl font-bold text-sky-700">{stats.byStatus.APPROVED}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Paid</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.byStatus.PAID}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari merchant, rekening, bank, ref transfer..."
              className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "" | WithdrawalStatus)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition focus:border-blue-400 focus:outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "ALL"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadWithdrawals}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Muat Ulang
            </button>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-700">Daftar Withdraw</h2>
              <span className="text-[11px] text-slate-400">
                {filteredItems.length} request tampil
              </span>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-slate-400">Memuat withdraw merchant...</div>
            ) : filteredItems.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-slate-600">Belum ada request withdraw</p>
                <p className="mt-1 text-xs text-slate-400">Ubah filter status atau muat ulang data.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const meta = statusMeta(item.status);
                  const merchantName =
                    item.user.sellerProfile?.displayName ?? item.user.name ?? item.user.email ?? item.user.phone ?? "Merchant";
                  const canApprove = item.status === "PENDING";
                  const canFinish = item.status === "PENDING" || item.status === "APPROVED";

                  return (
                    <div key={item.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[1.25fr_1fr_0.9fr_auto] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{merchantName}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.user.email ?? item.user.phone ?? item.userId}
                        </p>
                        <p className="mt-2 font-mono text-[11px] text-slate-400">{item.id}</p>
                      </div>

                      <div className="text-sm">
                        <p className="font-bold text-slate-900">{rupiah(item.amount)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.bankName} {item.bankCode ? `(${item.bankCode})` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.accountNumber} · {item.accountName}
                        </p>
                      </div>

                      <div className="grid gap-1 text-xs text-slate-500">
                        <p>Dibuat: <span className="font-medium text-slate-700">{formatDate(item.createdAt)}</span></p>
                        <p>Diproses: <span className="font-medium text-slate-700">{formatDate(item.processedAt)}</span></p>
                        <p>Ref: <span className="font-medium text-slate-700">{item.payoutRefId || "-"}</span></p>
                        {item.processedNote ? (
                          <p className="line-clamp-2">Catatan: <span className="text-slate-700">{item.processedNote}</span></p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        {canApprove ? (
                          <button
                            type="button"
                            onClick={() => openAction(item, "APPROVED")}
                            className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            Approve
                          </button>
                        ) : null}
                        {canFinish ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openAction(item, "PAID")}
                              className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => openAction(item, "REJECTED")}
                              className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => openAction(item, "CANCELLED")}
                              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {actionModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <form onSubmit={submitAction} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Proses Withdraw
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {actionTitle(actionModal.status)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {rupiah(actionModal.item.amount)} ke {actionModal.item.bankName} {actionModal.item.accountNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAction}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bank Code
                </span>
                <input
                  type="text"
                  value={actionBankCode}
                  onChange={(event) => setActionBankCode(event.target.value)}
                  placeholder="Opsional"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ref Transfer
                </span>
                <input
                  type="text"
                  value={actionRef}
                  onChange={(event) => setActionRef(event.target.value)}
                  placeholder="Isi setelah transfer manual"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Catatan Admin
                </span>
                <textarea
                  value={actionNote}
                  onChange={(event) => setActionNote(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAction}
                disabled={submitting}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {submitting ? "Memproses..." : "Simpan Status"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
