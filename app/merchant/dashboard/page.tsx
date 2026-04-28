"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MerchantSidebar from "@/components/merchant/Sidebar";
import MerchantHeader from "@/components/merchant/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface DashboardData {
  merchant: {
    id: string;
    slug: string;
    displayName: string;
    description: string | null;
    profileImageUrl: string | null;
  };
  summary: {
    saldo: number;
    totalTransaksi: number;
    omzetHarian: number;
    transaksiHarian: number;
    totalOmzet: number;
    totalMarginKotor: number;
    totalFee: number;
    totalSaldoMasuk: number;
  };
  revenue: Array<{
    label: string;
    omzet: number;
    komisi: number;
    omzetBar: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderCode: string;
    amount: number;
    sellerCommission: number;
    createdAt: string;
    productName: string;
    brand: string;
    customerName: string;
  }>;
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MerchantDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRevenueIndex, setActiveRevenueIndex] = useState<number | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    slug: "",
    description: "",
    profileImageUrl: "",
  });
  const { toasts, removeToast, error: showError } = useToast();

  useEffect(() => {
    fetch("/api/merchant/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error || "Gagal memuat dashboard merchant");
        setData(json.data);
        setProfileForm({
          displayName: json.data.merchant.displayName ?? "",
          slug: json.data.merchant.slug ?? "",
          description: json.data.merchant.description ?? "",
          profileImageUrl: json.data.merchant.profileImageUrl ?? "",
        });
      })
      .catch((caughtError: unknown) => {
        const message = caughtError instanceof Error ? caughtError.message : "Gagal memuat dashboard merchant";
        showError(message);
      })
      .finally(() => setLoading(false));
  }, [showError]);

  const cards = data
    ? [
        { label: "Saldo Merchant", value: rupiah(data.summary.saldo), delta: "Siap withdraw", tone: "bg-emerald-100 text-emerald-600" },
        { label: "Total Transaksi", value: data.summary.totalTransaksi.toLocaleString("id-ID"), delta: "Order sukses", tone: "bg-sky-100 text-sky-600" },
        { label: "Omzet Harian", value: rupiah(data.summary.omzetHarian), delta: `${data.summary.transaksiHarian.toLocaleString("id-ID")} transaksi`, tone: "bg-amber-100 text-amber-600" },
        { label: "Saldo Masuk Bersih", value: rupiah(data.summary.totalSaldoMasuk), delta: "Setelah fee", tone: "bg-fuchsia-100 text-fuchsia-600" },
      ]
    : [];

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/seller/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profileForm.displayName.trim(),
          slug: profileForm.slug.trim(),
          description: profileForm.description.trim(),
          profileImageUrl: profileForm.profileImageUrl.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal menyimpan profil merchant");

      setData((prev) => prev ? {
        ...prev,
        merchant: {
          ...prev.merchant,
          displayName: json.data.displayName,
          slug: json.data.slug,
          description: json.data.description ?? null,
          profileImageUrl: json.data.profileImageUrl ?? null,
        },
      } : prev);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Gagal menyimpan profil merchant";
      showError(message);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <MerchantSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <MerchantHeader
            title="Dashboard Merchant"
            subtitle="Pantau saldo, total transaksi, dan performa penjualan hari ini."
            onMenuClick={() => setSidebarOpen(true)}
          />

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm sm:rounded-3xl" />
              ))}
            </div>
          ) : data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                {cards.map((card) => (
                  <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-400">{card.label}</p>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${card.tone}`}>{card.delta}</span>
                    </div>
                    <p className="mt-3 text-xl font-bold text-slate-800 sm:text-2xl">{card.value}</p>
                    <p className="mt-1 text-xs text-slate-400">Ringkasan performa merchant</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:gap-6 lg:grid-cols-[2.1fr_1fr] min-w-0">
                <section className="flex flex-col gap-4 sm:gap-6">
                  <section className="rounded-2xl bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">Ringkasan Merchant</p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                            {data.merchant.profileImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={data.merchant.profileImageUrl}
                                alt={data.merchant.displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-base font-bold text-emerald-700">
                                {data.merchant.displayName
                                  .split(" ")
                                  .map((part: string) => part[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900">{data.merchant.displayName}</h2>
                            <p className="mt-1 text-sm text-slate-500">Slug toko: /seller/{data.merchant.slug}</p>
                          </div>
                        </div>
                      </div>
                      <a
                        href={`/seller/${data.merchant.slug}`}
                        className="inline-flex rounded-2xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50"
                      >
                        Buka Storefront
                      </a>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4 sm:rounded-3xl">
                        <p className="text-sm text-slate-500">Transaksi Hari Ini</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{data.summary.transaksiHarian.toLocaleString("id-ID")}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 sm:rounded-3xl">
                        <p className="text-sm text-slate-500">Total Omzet</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{rupiah(data.summary.totalOmzet)}</p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-slate-800">Profil Storefront</p>
                        <p className="text-xs text-slate-400">Gambar ini akan tampil di daftar merchant dan halaman storefront merchant.</p>
                      </div>

                      <div className="grid gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                            {profileForm.profileImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={profileForm.profileImageUrl}
                                alt={profileForm.displayName || "Merchant"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-base font-bold text-slate-500">
                                {(profileForm.displayName || data.merchant.displayName || "M")
                                  .split(" ")
                                  .map((part: string) => part[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <label className="mb-1 block text-xs font-semibold text-slate-500">URL Gambar Profile Merchant</label>
                            <input
                              type="url"
                              value={profileForm.profileImageUrl}
                              onChange={(e) => setProfileForm((prev) => ({ ...prev, profileImageUrl: e.target.value }))}
                              placeholder="https://example.com/profile-merchant.png"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-500">Nama Toko</span>
                            <input
                              type="text"
                              value={profileForm.displayName}
                              onChange={(e) => setProfileForm((prev) => ({ ...prev, displayName: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-500">Slug Toko</span>
                            <input
                              type="text"
                              value={profileForm.slug}
                              onChange={(e) => setProfileForm((prev) => ({ ...prev, slug: e.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                            />
                          </label>
                        </div>

                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-slate-500">Deskripsi Toko</span>
                          <textarea
                            value={profileForm.description}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                          />
                        </label>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={saveProfile}
                            disabled={savingProfile}
                            className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                          >
                            {savingProfile ? "Menyimpan..." : "Simpan Profil"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Grafik Omzet 7 Hari</p>
                        <p className="text-xs text-slate-400">Perbandingan omzet dan komisi merchant</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          Omzet
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                          Komisi
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-7 items-end gap-2 sm:mt-8 sm:gap-4">
                      {data.revenue.map((item, index) => {
                        const isActive = activeRevenueIndex === index;
                        return (
                        <button
                          key={item.label}
                          type="button"
                          onMouseEnter={() => setActiveRevenueIndex(index)}
                          onMouseLeave={() => setActiveRevenueIndex(null)}
                          onFocus={() => setActiveRevenueIndex(index)}
                          onBlur={() => setActiveRevenueIndex(null)}
                          className="group relative flex flex-col items-center gap-2 sm:gap-3"
                        >
                          <div className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 flex-col items-center transition-all ${isActive ? "opacity-100" : "opacity-0"}`}>
                            <div className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-center text-[10px] text-white shadow-lg whitespace-nowrap">
                              <p className="font-semibold text-slate-200">{item.label}</p>
                              <p>{rupiah(item.omzet)}</p>
                              <p className="text-emerald-200">{rupiah(item.komisi)}</p>
                            </div>
                            <div className="mt-[-4px] h-2 w-2 rotate-45 bg-slate-800" />
                          </div>
                          <div className="flex h-32 w-full items-end justify-center gap-1 sm:h-40 sm:gap-2">
                            <div className="flex h-full w-5 items-end rounded-full bg-slate-100 sm:w-8">
                              <div
                                className={`w-full rounded-full bg-emerald-500 transition-all duration-300 ${isActive ? "opacity-100 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" : "opacity-90"}`}
                                style={{ height: `${item.omzetBar}%` }}
                              />
                            </div>
                            <div className="flex h-full w-5 items-end rounded-full bg-slate-100 sm:w-8">
                              <div
                                className={`w-full rounded-full bg-slate-300 transition-all duration-300 ${isActive ? "opacity-100 shadow-[0_0_0_4px_rgba(148,163,184,0.12)]" : "opacity-90"}`}
                                style={{ height: `${Math.max(8, item.omzet > 0 ? Math.round((item.komisi / item.omzet) * item.omzetBar) : 8)}%` }}
                              />
                            </div>
                          </div>
                          <span className={`text-xs font-medium ${isActive ? "text-slate-700" : "text-slate-400"}`}>{item.label}</span>
                        </button>
                      )})}
                    </div>

                    <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                      {activeRevenueIndex !== null ? (
                        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-semibold text-slate-700">Detail {data.revenue[activeRevenueIndex].label}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="text-slate-500">Omzet: <strong className="text-slate-800">{rupiah(data.revenue[activeRevenueIndex].omzet)}</strong></span>
                            <span className="text-slate-500">Komisi: <strong className="text-emerald-600">{rupiah(data.revenue[activeRevenueIndex].komisi)}</strong></span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Arahkan kursor ke batang grafik untuk melihat detail omzet dan komisi per hari.</p>
                      )}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">Transaksi Terbaru</p>
                      <Link href="/merchant/orders" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                        Lihat semua
                      </Link>
                    </div>

                    <div className="mt-4">
                      <div className="hidden grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr] gap-3 px-3 text-xs text-slate-400 md:grid">
                        <span>Order ID</span>
                        <span>Produk</span>
                        <span>Pelanggan</span>
                        <span>Komisi</span>
                        <span>Waktu</span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {data.recentOrders.length === 0 ? (
                          <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center sm:rounded-3xl">
                            <p className="text-sm font-medium text-slate-600">Belum ada transaksi merchant</p>
                            <p className="mt-1 text-xs text-slate-400">Setelah customer checkout dari storefront merchant, ringkasan order akan tampil di sini.</p>
                          </div>
                        ) : (
                          data.recentOrders.map((order) => (
                            <div key={order.id} className="rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100 md:grid md:grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr] md:items-center md:gap-3 md:rounded-2xl">
                              <div className="flex items-center justify-between md:block">
                                <span className="text-xs font-semibold text-slate-700">{order.orderCode}</span>
                                <span className="text-xs text-slate-500 md:hidden">{new Date(order.createdAt).toLocaleDateString("id-ID")}</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-600 md:mt-0">{order.productName} • {order.brand}</div>
                              <div className="mt-1 text-xs text-slate-500 md:mt-0">{order.customerName}</div>
                              <div className="mt-2 text-xs font-bold text-emerald-600 md:mt-0">{rupiah(order.sellerCommission)}</div>
                              <div className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString("id-ID")}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>
                </section>

                <aside className="rounded-2xl bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6 lg:min-h-[420px]">
                  <div className="flex h-full flex-col">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Profit Breakdown</p>
                      <p className="mt-1 text-xs text-slate-400">Ringkasan profit merchant dari transaksi sukses.</p>
                    </div>

                    <div className="mt-6 grid gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Margin Kotor</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{rupiah(data.summary.totalMarginKotor)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Potongan Fee</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{rupiah(data.summary.totalFee)}</p>
                      </div>
                    </div>

                    <div className="mt-auto rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Masuk Ke Saldo</p>
                      <p className="mt-2 text-2xl font-bold text-emerald-700">{rupiah(data.summary.totalSaldoMasuk)}</p>
                      <p className="mt-2 text-xs text-emerald-700/80">
                        Nilai ini adalah komisi bersih merchant setelah potongan fee platform.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
