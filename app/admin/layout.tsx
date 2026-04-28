"use client";

import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  // Skip auth check on login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  return <AdminGuard>{children}</AdminGuard>;
}


function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAdminAuth();

  if (loading) {

    return (
      <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Will be redirected by the hook, show nothing
    return null;
  }

  return <div className="lg:pl-64">{children}</div>;
}

