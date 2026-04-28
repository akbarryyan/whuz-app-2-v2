"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl]     = useState("");
  const [siteName, setSiteName]   = useState("Website");
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintLoading, setMaintLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/maintenance")
      .then((r) => r.json())
      .then((d) => { if (typeof d.enabled === "boolean") setMaintEnabled(d.enabled); })
      .catch(() => {});
  }, []);

  async function toggleMaintenance() {
    setMaintLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", { method: "PATCH" });
      const d   = await res.json();
      if (typeof d.enabled === "boolean") setMaintEnabled(d.enabled);
    } catch {
      // ignore
    } finally {
      setMaintLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/footer-config")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.footer_logo_url) setLogoUrl(d.data.footer_logo_url);
        if (d.data?.footer_company_name) setSiteName(d.data.footer_company_name);
      })
      .catch(() => {});
  }, []);
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 transform flex-col bg-white p-6 shadow-xl transition-transform duration-300 ease-in-out lg:h-screen lg:shadow-sm ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={siteName}
                width={120}
                height={40}
                className="h-9 w-auto object-contain"
                unoptimized
              />
            ) : (
              <>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#2563eb] text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">{siteName}</p>
                  <p className="text-xs text-slate-400">Konsol Admin</p>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-8 flex-1 overflow-y-auto pr-2">
          <p className="mb-2 px-3 text-xs font-medium text-slate-400">Menu</p>
          <nav className="flex flex-col gap-1 text-sm">
            {([
              {
                name: "Dashboard", href: "/admin",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>,
              },
              {
                name: "Produk", href: "/admin/products",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
              },
              {
                name: "Brand", href: "/admin/brands",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>,
              },
              {
                name: "Flash Sale", href: "/admin/flash-sale",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
              },
              {
                name: "Promo", href: "/admin/promos",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>,
              },
              {
                name: "Voucher", href: "/admin/vouchers",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
              },
              {
                name: "Banner", href: "/admin/banners",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
              },
              {
                name: "Transaksi", href: "/admin/transactions",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>,
              },
              {
                name: "Laporan", href: "/admin/reports",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
              },
              {
                name: "Wallet", href: "/admin/wallet",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14h.01"/></svg>,
              },
              {
                name: "Pesan", href: "/admin/tickets",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>,
              },
              {
                name: "Provider", href: "/admin/providers",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>,
              },
              {
                name: "Metode Bayar", href: "/admin/payment-methods",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
              },
              {
                name: "Konten", href: "/admin/home-content",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
              },
              {
                name: "Footer", href: "/admin/footer",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h6"/></svg>,
              },
              {
                name: "Test Transaksi", href: "/admin/test-transaction",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
              },
              {
                name: "Debug Poppay", href: "/admin/payment-gateway/poppay",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3a3.75 3.75 0 00-3.75 3.75v1.5H5.25A2.25 2.25 0 003 10.5v7.5a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-7.5a2.25 2.25 0 00-2.25-2.25H18v-1.5A3.75 3.75 0 0014.25 3h-4.5zM16.5 8.25h-9v-1.5a2.25 2.25 0 012.25-2.25h4.5a2.25 2.25 0 012.25 2.25v1.5z"/></svg>,
              },
              {
                name: "Member", href: "/admin/members",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
              },
              {
                name: "Merchant", href: "/admin/merchants",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7.5l9-4 9 4m-18 0v9l9 4m-9-13l9 4m9-4l-9 4m0 9v-9"/></svg>,
              },
              {
                name: "Tier Harga", href: "/admin/tiers",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
              },
              {
                name: "Ulasan Brand", href: "/admin/brand-reviews",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>,
              },
              {
                name: "Pengaturan", href: "/admin/settings",
                icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
              },
            ] as { name: string; icon: React.ReactNode; href: string; badge?: number }[]).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-2xl px-3 py-2 text-left transition ${
                    isActive
                      ? "bg-[#eff6ff] text-[#2563eb]"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex-shrink-0 ${isActive ? "text-[#2563eb]" : "text-slate-400"}`}>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563eb] text-[10px] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto pt-6">
          <div
            className={`rounded-2xl p-4 text-white transition-colors duration-300 ${
              maintEnabled ? "bg-amber-500" : "bg-[#2563eb]"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Maintenance Mode</p>
              {maintEnabled && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                  AKTIF
                </span>
              )}
            </div>
            <p className={`mt-1 text-xs ${maintEnabled ? "text-amber-100" : "text-blue-100"}`}>
              {maintEnabled
                ? "Halaman user sedang ditutup."
                : "User dapat mengakses semua halaman."}
            </p>
            <button
              onClick={toggleMaintenance}
              disabled={maintLoading}
              className={`mt-4 w-full rounded-full px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                maintEnabled
                  ? "bg-white text-amber-500 hover:bg-amber-50"
                  : "bg-white text-[#2563eb] hover:bg-blue-50"
              }`}
            >
              {maintLoading ? "Memproses..." : maintEnabled ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
