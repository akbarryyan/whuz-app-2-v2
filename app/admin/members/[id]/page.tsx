"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface UserDetail {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  walletBalance: number;
  tier: {
    id: string;
    name: string;
    label: string;
    marginMultiplier: number;
  } | null;
  sellerProfile: {
    id: string;
    slug: string;
    displayName: string;
    isActive: boolean;
  } | null;
  _count: {
    orders: number;
    sellerProducts: number;
    sellerOrders: number;
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRp(value: number) {
  return "Rp " + value.toLocaleString("id-ID");
}

export default function AdminMemberDetailPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetail | null>(null);
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${params.id}`);
        const data = await res.json();
        if (data.success) setUser(data.data);
        else toast.error(data.error ?? "Gagal memuat detail user");
      } catch {
        toast.error("Gagal memuat detail user");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) load();
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              ← Kembali
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Detail Pemilik Merchant</h1>
              <p className="mt-0.5 text-sm text-slate-500">Ringkasan akun pemilik merchant untuk kebutuhan verifikasi admin.</p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-3 animate-pulse">
                <div className="h-5 w-48 rounded bg-slate-200" />
                <div className="h-4 w-72 rounded bg-slate-100" />
                <div className="h-24 rounded-2xl bg-slate-100" />
              </div>
            </div>
          ) : !user ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              User tidak ditemukan.
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800">{user.name ?? "Tanpa nama"}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${user.isActive ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {user.isActive ? "USER AKTIF" : "USER NONAKTIF"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                      {user.role}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{user.email ?? "—"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nomor HP</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{user.phone ?? "—"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tier</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{user.tier?.label ?? "Default"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Saldo Wallet</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{formatRp(user.walletBalance)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-700">Statistik</h2>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4 text-center">
                      <p className="text-xl font-bold text-slate-800">{user._count.orders}</p>
                      <p className="mt-1 text-[11px] text-slate-400">Order</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-center">
                      <p className="text-xl font-bold text-slate-800">{user._count.sellerProducts}</p>
                      <p className="mt-1 text-[11px] text-slate-400">Produk</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-center">
                      <p className="text-xl font-bold text-slate-800">{user._count.sellerOrders}</p>
                      <p className="mt-1 text-[11px] text-slate-400">Order Seller</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    <p>Dibuat: {formatDate(user.createdAt)}</p>
                    <p>Update terakhir: {formatDate(user.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {user.sellerProfile && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-700">Merchant Terkait</h2>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-800">{user.sellerProfile.displayName}</p>
                      <p className="text-sm text-slate-500">/seller/{user.sellerProfile.slug}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${user.sellerProfile.isActive ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {user.sellerProfile.isActive ? "MERCHANT AKTIF" : "MERCHANT NONAKTIF"}
                    </span>
                    <a
                      href={`/seller/${user.sellerProfile.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Buka Storefront
                    </a>
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
