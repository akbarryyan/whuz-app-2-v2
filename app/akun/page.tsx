"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import BottomNavigation from "@/components/BottomNavigation";
import AppHeader from "@/components/AppHeader";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

interface UserData {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
}

interface SellerData {
  id: string;
  slug: string;
  displayName: string;
  isActive: boolean;
}

interface WalletData {
  balance: number;
}

interface StatsData {
  totalOrders: number;
  successOrders: number;
}

interface TierInfo {
  id: string;
  name: string;
  label: string;
  minOrders: number;
  marginMultiplier: number;
}

type ModalType = "change-password" | "logout-confirm" | null;

export default function AkunPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<UserData | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [tier, setTier] = useState<TierInfo | null>(null);
  const [nextTier, setNextTier] = useState<TierInfo | null>(null);
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [siteName, setSiteName] = useState("Website");

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [modalMounted, setModalMounted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openModal = (type: ModalType) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setModal(type);
    setModalMounted(true);
    setModalVisible(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setModalVisible(true)));
  };

  const closeModal = () => {
    setModalVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setModal(null);
      setModalMounted(false);
      closeTimerRef.current = null;
    }, 300);
  };

  // Change password form
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  // ===================== FETCH SESSION =====================

  useEffect(() => {
    fetch("/api/site-branding")
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.site_name) setSiteName(data.data.site_name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.isLoggedIn) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        setWallet(data.wallet ?? { balance: 0 });
        setStats(data.stats ?? { totalOrders: 0, successOrders: 0 });
        setTier(data.tier ?? null);
        setNextTier(data.nextTier ?? null);
        setSeller(data.seller ?? null);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  // ===================== LOGOUT =====================

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Berhasil logout. Sampai jumpa!");
      setTimeout(() => router.replace("/"), 900);
    } catch {
      toast.error("Gagal logout. Coba lagi.");
      setIsLoggingOut(false);
    }
  };

  // ===================== CHANGE PASSWORD =====================

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwLoading) return;

    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      toast.error("Semua field wajib diisi.");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Password berhasil diubah.");
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        closeModal();
      } else {
        toast.error(data.message || "Gagal mengubah password.");
      }
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setPwLoading(false);
    }
  };

  // ===================== HELPERS =====================

  const formatBalance = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  };

  const getTierBadgeStyle = (tierName: string) => {
    const n = tierName.toLowerCase();
    if (n.includes("agent")) return { pill: "bg-amber-400 text-amber-900", bar: "bg-amber-400" };
    if (n.includes("reseller")) return { pill: "bg-emerald-400 text-emerald-900", bar: "bg-emerald-400" };
    return { pill: "bg-white/20 text-white", bar: "bg-white" };
  };

  // ===================== LOADING SKELETON =====================

  if (isLoading) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
        <div className="w-full max-w-[480px] min-h-screen bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
          {/* ---- Brand Header ---- */}
          <AppHeader />

          {/* Header skeleton */}
          <div style={{ backgroundColor: "#003D99" }} className="px-6 pt-16 pb-16 lg:mx-auto lg:max-w-6xl lg:rounded-[32px] lg:px-8 lg:pt-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-white/20 animate-pulse" />
              <div className="h-5 w-36 rounded-full bg-white/20 animate-pulse" />
              <div className="h-3.5 w-24 rounded-full bg-white/15 animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-white/20 animate-pulse" />
              <div className="h-2 w-52 rounded-full bg-white/15 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col gap-4 px-5 -mt-8 lg:mx-auto lg:max-w-6xl lg:px-0">
            <div className="h-28 rounded-2xl bg-slate-100 animate-pulse lg:bg-white/[0.05]" />
            <div className="h-48 rounded-2xl bg-slate-100 animate-pulse lg:bg-white/[0.05]" />
            <div className="h-32 rounded-2xl bg-slate-100 animate-pulse lg:bg-white/[0.05]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const menuItems = [
    {
      group: "Akun",
      items: [
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
          label: "Edit Profil",
          sub: "Nama & nomor HP",
          color: "text-purple-600 bg-purple-50",
          action: () => router.push("/akun/edit-profil"),
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
          label: "Ubah Password",
          sub: "Keamanan akun",
          color: "text-blue-600 bg-blue-50",
          action: () => openModal("change-password"),
        },
        ...(seller?.isActive
          ? [{
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9ZM9 12l2 2 4-4" />
                </svg>
              ),
              label: "Dashboard Merchant",
              sub: `Kelola toko ${seller.displayName}`,
              color: "text-emerald-700 bg-emerald-50",
              action: () => router.push("/merchant/dashboard"),
            }]
          : [{
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 6v12m6-6H6m1-7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                </svg>
              ),
              label: "Daftar Merchant",
              sub: "Buka toko dan mulai jualan",
              color: "text-emerald-700 bg-emerald-50",
              action: () => router.push("/merchant/register"),
            }]),
      ],
    },
    {
      group: "Transaksi",
      items: [
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
          label: "Riwayat Transaksi",
          sub: `${stats?.totalOrders ?? 0} transaksi total`,
          color: "text-emerald-600 bg-emerald-50",
          action: () => router.push("/transaksi"),
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          ),
          label: "Voucher Saya",
          sub: "Klaim & gunakan diskon",
          color: "text-purple-600 bg-purple-50",
          action: () => router.push("/voucher"),
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
          label: "Top Up Wallet",
          sub: "Tambah saldo",
          color: "text-amber-600 bg-amber-50",
          action: () => router.push("/topup"),
        },
      ],
    },
    {
      group: "Lainnya",
      items: [
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: "Bantuan & FAQ",
          sub: "Pusat bantuan",
          color: "text-slate-600 bg-slate-100",
          action: () => router.push("/pusat-bantuan"),
        },
      ],
    },
  ];

  // ===================== RENDER =====================

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">

        {/* ---- Brand Header ---- */}
        <AppHeader onBack={() => router.back()} />

        {/* ===== HEADER HERO ===== */}
        <div className="relative overflow-hidden px-6 pt-20 pb-20 lg:mx-auto lg:mt-6 lg:w-full lg:max-w-6xl lg:rounded-[32px] lg:px-8" style={{ backgroundColor: "#003D99" }}>
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute top-20 -right-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white/10" />

          <div className="relative z-10 flex flex-col items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold text-white shadow-xl border-2 border-white/30">
                {getInitials(user.name)}
              </div>
              {/* Badge role */}
              {user.role === "ADMIN" && (
                <span className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                  ADMIN
                </span>
              )}
            </div>

            {/* Nama & email */}
            <div className="text-center">
              <h1 className="text-lg font-bold text-white">
                {user.name ?? "Member"}
              </h1>
              <p className="text-purple-200 text-xs mt-0.5">{user.email}</p>
            </div>

            {/* Member since */}
            <span className="text-[11px] text-purple-200/80 bg-white/10 px-3 py-1 rounded-full">
              Member sejak {formatDate(user.createdAt)}
            </span>

            {/* ---- Tier badge + progress ---- */}
            {tier && (() => {
              const style = getTierBadgeStyle(tier.name);
              const successCount = stats?.successOrders ?? 0;
              const progressPct = nextTier
                ? Math.min(100, Math.round((successCount / nextTier.minOrders) * 100))
                : 100;
              const remaining = nextTier ? Math.max(0, nextTier.minOrders - successCount) : 0;
              return (
                <div className="flex flex-col items-center gap-2 w-full max-w-[260px]">
                  {/* Current tier pill */}
                  <span className={`text-[11px] font-extrabold px-4 py-1 rounded-full tracking-wide shadow ${style.pill}`}>
                    {tier.label}
                  </span>

                  {nextTier ? (
                    <>
                      {/* Progress bar */}
                      <div className="w-full">
                        <div className="flex justify-between text-[10px] text-white/60 mb-1">
                          <span>{successCount} transaksi sukses</span>
                          <span>{nextTier.minOrders} untuk {nextTier.label}</span>
                        </div>
                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-white/60 mt-1 text-center">
                          {remaining > 0
                            ? `${remaining} transaksi lagi naik ke ${nextTier.label}`
                            : `Siap naik ke ${nextTier.label}!`}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-[10px] text-white/60">Tier tertinggi 🎉</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-28 -mt-10 lg:mx-auto lg:w-full lg:max-w-6xl lg:px-0 lg:pb-16">

          {/* ---- WALLET CARD ---- */}
          <div className="relative overflow-hidden rounded-t-3xl border border-slate-100 bg-white p-5 shadow-lg lg:rounded-3xl lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
            {/* background deco */}
            <div className="absolute right-0 top-0 h-full w-32 rounded-r-3xl bg-gradient-to-l from-purple-50 to-transparent lg:from-white/[0.06]" />

            <div className="relative z-10 flex items-center justify-between">
              <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:text-slate-300">
                    Saldo Wallet
                  </p>
                  <p className="text-2xl font-bold text-slate-800 lg:text-white">
                    {formatBalance(wallet?.balance ?? 0)}
                  </p>
                  <button
                    onClick={() => router.push("/topup")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-600 transition hover:bg-purple-100 lg:bg-white/10 lg:text-white lg:hover:bg-white/15"
                  >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Top Up
                </button>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-500 shadow-md shadow-purple-200 lg:shadow-none">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* ---- STATS ROW ---- */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Transaksi",
                value: stats?.totalOrders ?? 0,
                icon: (
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                ),
                bg: "bg-blue-50",
              },
              {
                label: "Berhasil",
                value: stats?.successOrders ?? 0,
                icon: (
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                  </svg>
                ),
                bg: "bg-emerald-50",
              },
              {
                label: "Gagal",
                value: (stats?.totalOrders ?? 0) - (stats?.successOrders ?? 0),
                icon: (
                  <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ),
                bg: "bg-rose-50",
              },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
                <div className={`${stat.bg} rounded-xl p-2`}>{stat.icon}</div>
                <p className="text-xl font-bold text-slate-800 lg:text-white">{stat.value}</p>
                <p className="text-center text-[10px] leading-tight text-slate-400 lg:text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>

          {user.role === "ADMIN" && (
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="group w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none lg:hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 12l9-8 9 8M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 lg:text-slate-400">
                    Admin
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800 lg:text-white">
                    Buka Dashboard Admin
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 lg:text-slate-400">
                    Akses panel pengelolaan website tanpa keluar dari akun ini.
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-slate-900 group-hover:text-white lg:bg-white/10 lg:text-slate-300 lg:group-hover:bg-white/15">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          )}

          {/* ---- MENU GROUPS ---- */}
          {menuItems.map((group) => (
            <div key={group.group}>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:text-slate-300">
                {group.group}
              </p>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50 lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none lg:divide-white/10">
                {group.items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-slate-50 active:bg-slate-100 lg:hover:bg-white/[0.06] lg:active:bg-white/[0.08]"
                  >
                    <div className={`${item.color} rounded-xl p-2.5 flex-shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 lg:text-white">{item.label}</p>
                      <p className="mt-0.5 text-xs text-slate-400 lg:text-slate-400">{item.sub}</p>
                    </div>
                    <svg className="h-4 w-4 flex-shrink-0 text-slate-300 lg:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* ---- LOGOUT BUTTON ---- */}
          <button
            onClick={() => openModal("logout-confirm")}
            disabled={isLoggingOut}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-rose-100 bg-rose-50 py-4 text-sm font-semibold text-rose-500 transition hover:bg-rose-100 active:bg-rose-200 disabled:opacity-60 lg:border-rose-500/20 lg:bg-rose-500/10 lg:text-rose-100 lg:hover:bg-rose-500/15"
          >
            {isLoggingOut ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Keluar...
              </>
            ) : (
              <>
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Keluar dari Akun
              </>
            )}
          </button>

          {/* App version */}
          <p className="-mt-1 mb-2 text-center text-[11px] text-slate-300 lg:text-slate-500">
            {siteName} v1.0.0 · PPOB &amp; Top Up Game
          </p>
        </div>

        <BottomNavigation />
      </div>

      {/* ===== MODAL CHANGE PASSWORD ===== */}
      {modalMounted && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center transition-all duration-300 ${
            modalVisible ? "bg-black/40 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"
          }`}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className={`w-full max-w-[480px] bg-white rounded-t-3xl shadow-2xl p-6 pb-10 transition-transform duration-300 ease-out ${
            modalVisible ? "translate-y-0" : "translate-y-full"
          }`}>
            {/* Handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

            {/* ── Logout confirm ── */}
            {modal === "logout-confirm" && (
              <>
                <div className="flex flex-col items-center gap-3 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-slate-800">Keluar dari Akun?</h2>
                    <p className="text-sm text-slate-400 mt-1">Kamu perlu login kembali untuk menggunakan layanan {siteName}.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => { closeModal(); setTimeout(handleLogout, 300); }}
                    disabled={isLoggingOut}
                    className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 py-3.5 text-sm font-bold text-white shadow-md shadow-rose-200 transition disabled:opacity-60"
                  >
                    Ya, Keluar
                  </button>
                </div>
              </>
            )}

            {/* ── Change password ── */}
            {modal === "change-password" && (
              <>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Ubah Password</h2>
                <p className="text-sm text-slate-400 mb-5">Pastikan password baru kuat dan mudah diingat</p>
                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                {[
                  { key: "current" as const, label: "Password Saat Ini", field: "currentPassword" as const, placeholder: "Password lama kamu" },
                  { key: "new" as const, label: "Password Baru", field: "newPassword" as const, placeholder: "Minimal 6 karakter" },
                  { key: "confirm" as const, label: "Konfirmasi Password Baru", field: "confirmPassword" as const, placeholder: "Ulangi password baru" },
              ].map(({ key, label, field, placeholder }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {label}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input
                      type={showPw[key] ? "text" : "password"}
                      value={pwForm[field]}
                      onChange={(e) => setPwForm((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-12 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                      disabled={pwLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showPw[key] ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => { closeModal(); setTimeout(() => setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }), 300); }}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 py-3 text-sm font-bold text-white shadow-md shadow-purple-200 transition hover:from-purple-700 hover:to-purple-600 disabled:opacity-60"
                >
                  {pwLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Menyimpan...
                    </span>
                  ) : "Simpan"}
                </button>
              </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
