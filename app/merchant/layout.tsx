"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface AuthState {
  loading: boolean;
  allowed: boolean;
}

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>({ loading: true, allowed: false });
  const isRegisterPage = pathname === "/merchant/register";

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;

        if (!data?.isLoggedIn) {
          router.replace("/login");
          return;
        }

        if (!data?.seller?.isActive && !isRegisterPage) {
          router.replace("/akun");
          return;
        }

        setAuth({ loading: false, allowed: true });
      })
      .catch(() => {
        if (!active) return;
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Menyiapkan area merchant...</p>
        </div>
      </div>
    );
  }

  if (!auth.allowed) return null;

  if (isRegisterPage) {
    return <>{children}</>;
  }

  return <div className="lg:pl-64">{children}</div>;
}
