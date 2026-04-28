"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import StatsCards from "@/components/admin/StatsCards";
import RevenueChart from "@/components/admin/RevenueChart";
import TransactionTable from "@/components/admin/TransactionTable";
import ProviderStatus from "@/components/admin/ProviderStatus";
import CustomerSupport from "@/components/admin/CustomerSupport";

function AdminDashboardPageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (searchParams.get("login") === "success") {
      toast.success("Login berhasil! Selamat datang di dashboard admin.");
      router.replace("/admin", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Sidebar dirender di luar flex container agar tidak mempengaruhi lebar konten */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[2.1fr_1fr] min-w-0">
            <section className="flex flex-col gap-4 sm:gap-6 min-w-0">
              <StatsCards />
              <RevenueChart />
              <TransactionTable />
            </section>

            <aside className="flex flex-col gap-4 sm:gap-6 min-w-0">
              <ProviderStatus />
              <CustomerSupport />
            </aside>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboardPageContent />
    </Suspense>
  );
}
