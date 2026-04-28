"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MerchantSidebar from "@/components/merchant/Sidebar";
import MerchantHeader from "@/components/merchant/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface OrderDetail {
  id: string;
  orderCode: string;
  targetNumber: string;
  targetData: unknown;
  amount: number;
  basePrice: number;
  markup: number;
  fee: number;
  discount: number;
  sellerGrossProfit: number;
  sellerFeeAmount: number;
  sellerCommission: number;
  status: string;
  paymentMethod: string;
  provider: string | null;
  providerRef: string | null;
  serialNumber: string | null;
  notes: string | null;
  sellerCommissionCreditedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string;
  } | null;
  product: {
    id: string;
    name: string;
    category: string;
    brand: string;
    type: string;
    provider: string;
    providerCode: string;
    providerPrice: number;
    margin: number;
    sellingPrice: number;
  } | null;
  paymentInvoice: {
    invoiceId?: string | null;
    gatewayName?: string | null;
    status?: string | null;
    amount?: number;
    paidAt?: string | null;
    expiredAt?: string | null;
  } | null;
  sellerProduct: {
    id: string;
    sellingPrice: number | null;
    feeType: string;
    feeValue: number;
    commissionType: string;
    commissionValue: number;
    isActive: boolean;
  } | null;
  providerLogs: Array<{
    id: string;
    provider: string;
    action: string;
    success: boolean;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusMeta(status: string) {
  if (status === "SUCCESS") return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  if (status === "FAILED") return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
  if (status === "PAID") return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
  if (status === "PROCESSING_PROVIDER") return "bg-sky-100 text-sky-700 ring-1 ring-sky-200";
  if (status === "WAITING_PAYMENT") return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

export default function MerchantOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { toasts, removeToast, error: showError } = useToast();

  useEffect(() => {
    fetch(`/api/merchant/orders/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error || "Gagal memuat detail order merchant");
        setData(json.data);
      })
      .catch((caughtError: unknown) => {
        const message = caughtError instanceof Error ? caughtError.message : "Gagal memuat detail order merchant";
        showError(message);
      })
      .finally(() => setLoading(false));
  }, [params.id, showError]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <MerchantSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <MerchantHeader
            title="Detail Order Merchant"
            subtitle="Lihat detail transaksi, breakdown komisi, dan log provider."
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className="flex items-center gap-3">
            <Link
              href="/merchant/orders"
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Kembali ke Transaksi
            </Link>
            {data && (
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusMeta(data.status)}`}>
                {data.status}
              </span>
            )}
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-400 shadow-sm sm:rounded-3xl">
              Memuat detail order merchant...
            </div>
          ) : data ? (
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.5fr_1fr]">
              <section className="flex flex-col gap-4 sm:gap-6">
                <section className="rounded-2xl bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Order Summary</p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">{data.orderCode}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {data.product?.name} • {data.product?.brand} • {data.targetNumber}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <p className="text-xs text-slate-500">Total dibayar customer</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{rupiah(data.amount)}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Pelanggan</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{data.user?.name || data.user?.email || data.user?.phone || "Guest"}</p>
                      <p className="mt-1 text-xs text-slate-400">{data.user?.email || data.user?.phone || "-"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Provider</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{data.provider || data.product?.provider || "-"}</p>
                      <p className="mt-1 text-xs text-slate-400">{data.providerRef || data.product?.providerCode || "-"}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
                  <p className="text-sm font-semibold text-slate-500">Breakdown Pricing</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">Base Price</p>
                      <p className="mt-1 font-semibold text-slate-900">{rupiah(data.basePrice)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">Markup</p>
                      <p className="mt-1 font-semibold text-slate-900">{rupiah(data.markup)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">Gross Profit</p>
                      <p className="mt-1 font-semibold text-slate-900">{rupiah(data.sellerGrossProfit)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">Fee Merchant</p>
                      <p className="mt-1 font-semibold text-slate-900">{rupiah(data.sellerFeeAmount)}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <p className="text-xs text-emerald-600">Komisi Masuk</p>
                      <p className="mt-1 font-semibold text-emerald-700">{rupiah(data.sellerCommission)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">Discount</p>
                      <p className="mt-1 font-semibold text-slate-900">{rupiah(data.discount)}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-500">Provider Logs</p>
                    <span className="text-xs text-slate-400">{data.providerLogs.length} log</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {data.providerLogs.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                        Belum ada provider log untuk order ini.
                      </div>
                    ) : (
                      data.providerLogs.map((log) => (
                        <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${log.success ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                {log.success ? "SUCCESS" : "FAILED"}
                              </span>
                              <span className="text-sm font-semibold text-slate-800">{log.action}</span>
                            </div>
                            <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString("id-ID")}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">{log.provider}</p>
                          {log.errorMessage && <p className="mt-2 text-sm text-rose-600">{log.errorMessage}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </section>

              <aside className="flex flex-col gap-4 sm:gap-6">
                <section className="rounded-2xl bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
                  <p className="text-sm font-semibold text-slate-500">Payment Detail</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Metode</span>
                      <strong className="text-slate-900">{data.paymentMethod}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Invoice</span>
                      <strong className="text-slate-900">{data.paymentInvoice?.invoiceId || "-"}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Gateway</span>
                      <strong className="text-slate-900">{data.paymentInvoice?.gatewayName || "-"}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">SN</span>
                      <strong className="text-slate-900">{data.serialNumber || "-"}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Dibuat</span>
                      <strong className="text-slate-900">{new Date(data.createdAt).toLocaleString("id-ID")}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Update</span>
                      <strong className="text-slate-900">{new Date(data.updatedAt).toLocaleString("id-ID")}</strong>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
                  <p className="text-sm font-semibold text-slate-500">Merchant Pricing Snapshot</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Selling Price</span>
                      <strong className="text-slate-900">{rupiah(data.sellerProduct?.sellingPrice ?? data.amount)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Fee Type</span>
                      <strong className="text-slate-900">{data.sellerProduct?.feeType || "-"}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Fee Value</span>
                      <strong className="text-slate-900">{rupiah(data.sellerProduct?.feeValue ?? 0)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Komisi Type</span>
                      <strong className="text-slate-900">{data.sellerProduct?.commissionType || "-"}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Komisi Value</span>
                      <strong className="text-slate-900">{rupiah(data.sellerProduct?.commissionValue ?? 0)}</strong>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          ) : null}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
