"use client";

import { FormEvent, useEffect, useState } from "react";
import MerchantSidebar from "@/components/merchant/Sidebar";
import MerchantHeader from "@/components/merchant/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface WalletData {
  balance: number;
  updatedAt: string | null;
  totalSalesCredits: number;
  totalFeeDeductions: number;
  totalGrossMargin: number;
  totalSuccessfulOrders: number;
  ledger: Array<{
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reference: string | null;
    description: string | null;
    createdAt: string;
  }>;
}

interface WithdrawalItem {
  id: string;
  amount: number;
  status: string;
  bankCode: string | null;
  accountName: string;
  accountNumber: string;
  bankName: string;
  note: string | null;
  processedNote: string | null;
  payoutGateway?: string | null;
  payoutRefId?: string | null;
  payoutAggRefId?: string | null;
  processedAt: string | null;
  createdAt: string;
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ledgerMeta(type: string) {
  if (type === "COMMISSION") {
    return { label: "Komisi Masuk", sign: "+", className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" };
  }
  if (type === "WITHDRAW_HOLD") {
    return { label: "Withdraw Hold", sign: "-", className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" };
  }
  if (type === "WITHDRAW_RELEASE") {
    return { label: "Release Hold", sign: "+", className: "bg-sky-100 text-sky-700 ring-1 ring-sky-200" };
  }
  if (type === "WITHDRAW_PAID") {
    return { label: "Withdraw Paid", sign: "", className: "bg-fuchsia-100 text-fuchsia-700 ring-1 ring-fuchsia-200" };
  }

  return { label: type, sign: "", className: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" };
}

function withdrawalStatusMeta(status: string) {
  if (status === "PENDING") {
    return { label: "Menunggu Diproses", className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" };
  }
  if (status === "APPROVED") {
    return { label: "Payout Diproses", className: "bg-sky-100 text-sky-700 ring-1 ring-sky-200" };
  }
  if (status === "PAID") {
    return { label: "Berhasil Dibayar", className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" };
  }
  if (status === "REJECTED") {
    return { label: "Ditolak", className: "bg-rose-100 text-rose-700 ring-1 ring-rose-200" };
  }
  if (status === "CANCELLED") {
    return { label: "Dibatalkan", className: "bg-slate-200 text-slate-700 ring-1 ring-slate-300" };
  }

  return { label: status, className: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" };
}

const BANK_OPTIONS = [
  "BCA",
  "BNI",
  "BRI",
  "Mandiri",
  "CIMB Niaga",
  "Permata",
  "BSI",
  "Danamon",
  "BTN",
  "Bank Jago",
  "SeaBank",
  "Neo Commerce",
  "Bank Mega",
  "Bank OCBC NISP",
  "Bank Panin",
  "Bank Sinarmas",
  "Bank Muamalat",
  "Bank Maybank",
  "Gopay",
  "OVO",
  "DANA",
  "ShopeePay",
];

export default function MerchantWalletPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<WalletData | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    note: "",
  });
  const { toasts, removeToast, error: showError, success: showSuccess } = useToast();

  const loadPageData = async () => {
    const [walletRes, withdrawalsRes] = await Promise.all([
      fetch("/api/merchant/wallet", { cache: "no-store" }),
      fetch("/api/seller/withdrawals", { cache: "no-store" }),
    ]);

    const walletJson = await walletRes.json();
    if (!walletJson.success) {
      throw new Error(walletJson.error || "Gagal memuat saldo merchant");
    }

    const withdrawalsJson = await withdrawalsRes.json();
    if (!withdrawalsJson.success) {
      throw new Error(withdrawalsJson.error || "Gagal memuat riwayat withdraw");
    }

    setData(walletJson.data);
    setWithdrawals(withdrawalsJson.data);
  };

  useEffect(() => {
    loadPageData()
      .catch((caughtError: unknown) => {
        const message = caughtError instanceof Error ? caughtError.message : "Gagal memuat saldo merchant";
        showError(message);
      })
      .finally(() => setLoading(false));
  }, [showError]);

  const submitWithdrawal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data) return;

    const amountValue = Number(form.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      showError("Nominal withdraw harus lebih dari 0.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/seller/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountValue,
          accountName: form.accountName.trim(),
          accountNumber: form.accountNumber.trim(),
          bankName: form.bankName.trim(),
          note: form.note.trim() || undefined,
        }),
      });

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal mengajukan withdraw");
      }

      showSuccess("Request withdraw berhasil dibuat dan payout sedang diproses.");
      setForm({
        amount: "",
        accountName: "",
        accountNumber: "",
        bankName: "",
        note: "",
      });
      await loadPageData();
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Gagal mengajukan withdraw";
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <MerchantSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <MerchantHeader
            title="Saldo Merchant"
            subtitle="Lihat saldo masuk dari penjualan, ajukan withdraw, dan pantau payout merchant."
            onMenuClick={() => setSidebarOpen(true)}
          />

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-400 shadow-sm sm:rounded-3xl">
              Memuat saldo merchant...
            </div>
          ) : data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                  <p className="text-sm text-slate-500">Saldo Saat Ini</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{rupiah(data.balance)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                  <p className="text-sm text-slate-500">Saldo Masuk Penjualan</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{rupiah(data.totalSalesCredits)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                  <p className="text-sm text-slate-500">Potongan Fee</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{rupiah(data.totalFeeDeductions)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                  <p className="text-sm text-slate-500">Gross Margin</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{rupiah(data.totalGrossMargin)}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-2xl bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Ajukan Withdraw</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Withdraw akan langsung diproses ke Poppay setelah kamu kirim request.
                      </p>
                    </div>
                    <div className="w-full rounded-2xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100 sm:w-auto sm:max-w-[220px] sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600 sm:tracking-[0.18em]">
                        Saldo Tersedia
                      </p>
                      <p className="mt-1 break-words text-sm font-bold text-emerald-700 sm:text-base">
                        {rupiah(data.balance)}
                      </p>
                    </div>
                  </div>

                  <form className="mt-5 grid gap-4" onSubmit={submitWithdrawal}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Nominal Withdraw
                        </span>
                        <input
                          type="number"
                          min={1000}
                          step={1000}
                          value={form.amount}
                          onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                          placeholder="10000"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Nama Pemilik Rekening
                        </span>
                        <input
                          type="text"
                          value={form.accountName}
                          onChange={(event) => setForm((prev) => ({ ...prev, accountName: event.target.value }))}
                          placeholder="SUSANTO WANGSADJAJA"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                          required
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Nomor Rekening / Tujuan
                        </span>
                        <input
                          type="text"
                          value={form.accountNumber}
                          onChange={(event) => setForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
                          placeholder="1197363"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Nama Bank
                        </span>
                        <select
                          value={form.bankName}
                          onChange={(event) => setForm((prev) => ({ ...prev, bankName: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                          required
                        >
                          <option value="">Pilih bank / e-wallet tujuan</option>
                          {BANK_OPTIONS.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Catatan
                        </span>
                        <input
                          type="text"
                          value={form.note}
                          onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                          placeholder="Catatan opsional untuk request withdraw"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                        />
                      </label>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200">
                      Pastikan data rekening tujuan sudah benar. Status pencairan dan riwayat withdraw akan diperbarui otomatis di halaman ini.
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                      >
                        {submitting ? "Mengirim Withdraw..." : "Ajukan Withdraw"}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="rounded-2xl bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Riwayat Withdraw</h2>
                      <p className="mt-1 text-sm text-slate-500">Pantau status payout merchant dan reference dari Poppay.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoading(true);
                        loadPageData()
                          .catch((caughtError: unknown) => {
                            const message =
                              caughtError instanceof Error ? caughtError.message : "Gagal memuat ulang data withdraw";
                            showError(message);
                          })
                          .finally(() => setLoading(false));
                      }}
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Muat Ulang
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {withdrawals.length === 0 ? (
                      <div className="rounded-3xl bg-slate-50 px-4 py-10 text-center">
                        <p className="text-sm font-medium text-slate-600">Belum ada request withdraw</p>
                        <p className="mt-1 text-xs text-slate-400">Request yang kamu ajukan akan tampil di sini lengkap dengan status payout.</p>
                      </div>
                    ) : (
                      withdrawals.map((item) => {
                        const status = withdrawalStatusMeta(item.status);
                        return (
                          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{rupiah(item.amount)}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.bankName} · {item.accountNumber} · {item.accountName}
                                </p>
                              </div>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                                {status.label}
                              </span>
                            </div>

                            <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                              <p>
                                Dibuat:{" "}
                                <span className="font-medium text-slate-700">
                                  {new Date(item.createdAt).toLocaleString("id-ID")}
                                </span>
                              </p>
                              <p>
                                Diproses:{" "}
                                <span className="font-medium text-slate-700">
                                  {item.processedAt ? new Date(item.processedAt).toLocaleString("id-ID") : "-"}
                                </span>
                              </p>
                              <p>
                                Bank Code: <span className="font-medium text-slate-700">{item.bankCode || "-"}</span>
                              </p>
                              <p>
                                Gateway Ref: <span className="font-medium text-slate-700">{item.payoutRefId || "-"}</span>
                              </p>
                            </div>

                            {(item.note || item.processedNote || item.payoutAggRefId) && (
                              <div className="mt-3 space-y-1 text-xs text-slate-500">
                                {item.note ? (
                                  <p>
                                    Catatan: <span className="text-slate-700">{item.note}</span>
                                  </p>
                                ) : null}
                                {item.processedNote ? (
                                  <p>
                                    Status Detail: <span className="text-slate-700">{item.processedNote}</span>
                                  </p>
                                ) : null}
                                {item.payoutAggRefId ? (
                                  <p>
                                    Agg Ref: <span className="text-slate-700">{item.payoutAggRefId}</span>
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>

              <section className="rounded-2xl bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Ledger Merchant</h2>
                    <p className="text-sm text-slate-500">Riwayat komisi, hold withdraw, dan release saldo.</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>Total order sukses</p>
                    <p className="mt-1 font-semibold text-slate-600">{data.totalSuccessfulOrders.toLocaleString("id-ID")}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="hidden grid-cols-[1fr_1.4fr_0.8fr_0.9fr_0.9fr_0.8fr] gap-3 px-3 text-xs text-slate-400 md:grid">
                    <span>Tipe</span>
                    <span>Keterangan</span>
                    <span>Nominal</span>
                    <span>Saldo Sebelum</span>
                    <span>Saldo Sesudah</span>
                    <span>Waktu</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {data.ledger.length === 0 ? (
                      <div className="rounded-3xl bg-slate-50 px-4 py-10 text-center">
                        <p className="text-sm font-medium text-slate-600">Belum ada mutasi saldo merchant</p>
                        <p className="mt-1 text-xs text-slate-400">Komisi penjualan dan proses withdraw akan tercatat otomatis di ledger merchant.</p>
                      </div>
                    ) : (
                      data.ledger.map((entry) => (
                        <div key={entry.id} className="rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100 md:grid md:grid-cols-[1fr_1.4fr_0.8fr_0.9fr_0.9fr_0.8fr] md:items-center md:gap-3 md:rounded-2xl">
                          <div>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${ledgerMeta(entry.type).className}`}>
                              {ledgerMeta(entry.type).label}
                            </span>
                          </div>
                          <div className="mt-2 md:mt-0">
                            <p className="text-xs font-medium text-slate-700">{entry.description || "-"}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{entry.reference || "Tanpa referensi"}</p>
                          </div>
                          <div className="mt-2 text-xs font-bold md:mt-0">
                            <span className={ledgerMeta(entry.type).sign === "-" ? "text-rose-600" : "text-emerald-600"}>
                              {ledgerMeta(entry.type).sign ? `${ledgerMeta(entry.type).sign} ` : ""}
                              {rupiah(entry.amount)}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-slate-500 md:mt-0">{rupiah(entry.balanceBefore)}</div>
                          <div className="mt-2 text-xs text-slate-700 md:mt-0">{rupiah(entry.balanceAfter)}</div>
                          <div className="mt-2 text-xs text-slate-400 md:mt-0">{new Date(entry.createdAt).toLocaleString("id-ID")}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
