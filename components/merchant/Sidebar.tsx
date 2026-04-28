"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface MerchantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/merchant/dashboard",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Produk",
    href: "/merchant/products",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7.5 12 3l8 4.5M4 7.5V16.5L12 21m-8-13.5L12 12m8-4.5V12M12 21v-9" />
      </svg>
    ),
  },
  {
    name: "Pricing",
    href: "/merchant/pricing",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 .895-4 2s1.79 2 4 2 4 .895 4 2-1.79 2-4 2m0-10V6m0 12v-2" />
      </svg>
    ),
  },
  {
    name: "Transaksi",
    href: "/merchant/orders",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    name: "Saldo",
    href: "/merchant/wallet",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-4h2a2 2 0 100-4h-2m0 4h2" />
      </svg>
    ),
  },
];

export default function MerchantSidebar({ isOpen, onClose }: MerchantSidebarProps) {
  const pathname = usePathname();
  const [siteName, setSiteName] = useState("Website");

  useEffect(() => {
    fetch("/api/site-branding")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.site_name) setSiteName(data.data.site_name);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 transform flex-col bg-white p-6 shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M6 7l1.5 11h9L18 7M9 11h6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{siteName} Merchant</p>
              <p className="text-xs text-slate-400">Seller Console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-8 flex-1 overflow-y-auto pr-2">
          <p className="mb-2 px-3 text-xs font-medium text-slate-400">Menu</p>
          <nav className="flex flex-col gap-1 text-sm">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
                    active ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <span className={active ? "text-emerald-600" : "text-slate-400"}>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto pt-6">
          <div className="rounded-2xl bg-emerald-500 p-4 text-white">
            <p className="text-sm font-semibold">Merchant Mode</p>
            <p className="mt-1 text-xs leading-5 text-emerald-50">
              Atur harga jual, pantau order masuk, dan cek saldo bersih merchant dari sini.
            </p>
            <p className="mt-4 rounded-full bg-white/15 px-3 py-2 text-center text-xs font-semibold">
              Reseller Dashboard Aktif
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
