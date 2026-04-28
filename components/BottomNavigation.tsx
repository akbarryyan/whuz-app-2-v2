"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Cek session saat pertama kali mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.isLoggedIn) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true));
  }, []);

  const navItems = [
    { id: "home", label: "Home", href: "/" },
    { id: "merchant", label: "Merchant", href: "/seller" },
    { id: "deposit", label: "Deposit", href: "/topup" },
    { id: "transaksi", label: "Transaksi", href: "/transaksi" },
    { id: "akun", label: "Akun", href: "/akun" },
  ];

  const isActive = (id: string) => {
    if (id === "home") return pathname === "/";
    if (id === "merchant") return pathname === "/seller" || pathname.startsWith("/seller/");
    if (id === "deposit") return pathname.startsWith("/deposit");
    return pathname.startsWith(`/${id}`);
  };

  const handleNavClick = (item: (typeof navItems)[number]) => {
    if (item.id === "akun") {
      // Hanya redirect ke /login jika session sudah selesai dicek dan memang belum login
      // Jika session masih loading, navigasi ke /akun dan biarkan halaman itu yang handle auth
      if (sessionChecked && !user) {
        router.push("/login");
        return;
      }
      router.push("/akun");
      return;
    }
    router.push(item.href);
  };

  const renderIcon = (id: string, active: boolean) => {
    const color = active ? "#003D99" : "#94A3B8";

    switch (id) {
      case "home":
        return (
          <svg className="w-6 h-6" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case "merchant":
        return (
          <svg className="w-6 h-6" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7.5l9-4 9 4m-18 0v9l9 4m-9-13l9 4m9-4l-9 4m0 9v-9" />
          </svg>
        );
      case "deposit":
        return (
          <svg className="w-7 h-7" fill="white" viewBox="0 0 24 24">
            <path d="M22 7H2V20C2 20.5523 2.44772 21 3 21H21C21.5523 21 22 20.5523 22 20V7ZM21 3H3C2.44772 3 2 3.44772 2 4V5H22V4C22 3.44772 21.5523 3 21 3ZM15 13H17V15H15V13ZM11 13H13V15H11V13Z" />
          </svg>
        );
      case "transaksi":
        return (
          <svg className="w-6 h-6" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        );
      case "akun":
        // Jika sudah login: tampilkan avatar initials kecil
        if (sessionChecked && user) {
          const initials = user.name
            ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
            : "U";
          return (
            <div
              className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                active ? "ring-2 ring-[#003D99] ring-offset-1" : ""
              }`}
              style={{ background: "#003D99" }}
            >
              {initials}
            </div>
          );
        }
        // Belum login / masih loading: ikon user biasa
        return (
          <svg className="w-6 h-6" fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 mx-auto z-50 w-full max-w-[480px] border-t border-slate-200 bg-white px-4 py-2 shadow-lg lg:hidden">
      <div className="flex items-end justify-around relative">
        {navItems.map((nav, idx) => {
          const active = isActive(nav.id);

          if (nav.id === "deposit") {
            return (
              <button
                key={idx}
                onClick={() => handleNavClick(nav)}
                className="flex flex-col items-center -mt-8"
              >
                <div className="bg-[#003D99] rounded-full p-4 shadow-xl mb-1">
                  {renderIcon(nav.id, true)}
                </div>
                <span className="text-xs font-medium text-[#003D99]">{nav.label}</span>
              </button>
            );
          }

          return (
            <button
              key={idx}
              onClick={() => handleNavClick(nav)}
              className={`flex flex-col items-center gap-1 py-2 transition-colors ${
                active ? "text-[#003D99]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {renderIcon(nav.id, active)}
              <span className={`text-xs font-medium ${active ? "text-[#003D99]" : ""}`}>
                {nav.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
