"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

interface SellerItem {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  profileImageUrl: string | null;
  productCount: number;
  brandCount: number;
}

const ACCENTS = [
  "from-[#003D99] to-[#1D4ED8]",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
];

export default function SellerListPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/catalog/sellers")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSellers(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
      <div className="relative min-h-screen w-full max-w-[480px] bg-[#F5F5F5] shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        <AppHeader onBack={() => router.push("/")} />

        <div className="px-4 pb-24 pt-[76px] lg:mx-auto lg:max-w-6xl lg:px-0 lg:pt-24 lg:pb-14">
          <div className="mb-5 rounded-[28px] bg-white p-5 shadow-sm lg:border lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#003D99] lg:text-slate-300">
              Merchant
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 lg:text-white">Pilih Merchant Tersedia</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 lg:text-slate-400">
              Buka toko merchant yang aktif, lalu lihat produk-produk yang mereka jual.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-[24px] bg-white shadow-sm lg:border lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none" />
              ))}
            </div>
          ) : sellers.length === 0 ? (
            <div className="rounded-[24px] bg-white p-8 text-center shadow-sm lg:border lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
              <p className="text-sm font-medium text-slate-500 lg:text-slate-300">Belum ada merchant aktif yang tersedia.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sellers.map((seller, index) => (
                <Link
                  key={seller.id}
                  href={`/seller/${seller.slug}`}
                  className="overflow-hidden rounded-[24px] bg-white shadow-sm transition-transform hover:-translate-y-0.5 lg:border lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none"
                >
                  <div className={`bg-gradient-to-br ${ACCENTS[index % ACCENTS.length]} p-4`}>
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/15">
                      {seller.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={seller.profileImageUrl}
                          alt={seller.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-base font-bold text-white">
                          {seller.displayName
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 line-clamp-2 text-base font-bold text-white">{seller.displayName}</p>
                  </div>

                  <div className="space-y-2 p-4">
                    <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-500 lg:text-slate-400">
                      {seller.description || "Lihat katalog produk merchant ini."}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 lg:bg-white/10 lg:text-slate-200">
                        {seller.productCount} produk
                      </span>
                      <span className="font-semibold text-[#003D99] lg:text-white">{seller.brandCount} brand</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <BottomNavigation />
      </div>
    </div>
  );
}
