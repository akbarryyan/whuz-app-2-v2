"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

interface SellerCatalogItem {
  sellerProductId: string;
  sellingPrice: number;
  feeType: string;
  feeValue: number;
  product: {
    id: string;
    provider: string;
    providerCode: string;
    name: string;
    brand: string;
    brandImageUrl?: string | null;
    category: string;
    type: string;
    providerPrice: number;
    sellingPrice: number;
    margin: number;
    stock: boolean;
  };
}

interface SellerPageData {
  seller: {
    id: string;
    slug: string;
    displayName: string;
    description: string | null;
    profileImageUrl: string | null;
  };
  data: SellerCatalogItem[];
}

function slugifyBrand(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SellerStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const toast = useToast();

  const [slug, setSlug] = useState("");
  const [data, setData] = useState<SellerPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStorefront() {
      const { slug: sellerSlug } = await params;
      if (cancelled) return;
      setSlug(sellerSlug);

      try {
        const res = await fetch(`/api/catalog/sellers/${sellerSlug}/products`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Toko merchant tidak ditemukan");
        if (!cancelled) setData(json);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Gagal memuat toko merchant";
        if (!cancelled) {
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStorefront();
    return () => {
      cancelled = true;
    };
  }, [params, toast]);

  const productGrid = useMemo(() => {
    if (!data) return [];
    return [...data.data].sort((a, b) => {
      if (a.product.brand !== b.product.brand) return a.product.brand.localeCompare(b.product.brand);
      if (a.sellingPrice !== b.sellingPrice) return a.sellingPrice - b.sellingPrice;
      return a.product.name.localeCompare(b.product.name);
    });
  }, [data]);

  if (loading) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
        <div className="w-full max-w-[480px] min-h-screen bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
          <div className="h-14 w-full bg-[#003D99]" />
          <div className="space-y-4 px-4 pt-6 lg:mx-auto lg:max-w-6xl lg:px-0 lg:pt-10">
            <div className="h-28 animate-pulse rounded-3xl bg-slate-100 lg:bg-white/[0.05]" />
            <div className="h-40 animate-pulse rounded-3xl bg-slate-100 lg:bg-white/[0.05]" />
            <div className="h-40 animate-pulse rounded-3xl bg-slate-100 lg:bg-white/[0.05]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
        <div className="w-full max-w-[480px] min-h-screen bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
          <AppHeader onBack={() => router.push("/seller")} />
          <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-bold text-slate-800 lg:text-white">{error || "Toko merchant tidak ditemukan"}</p>
            <button
              type="button"
              onClick={() => router.push("/seller")}
              className="mt-5 rounded-2xl bg-[#003D99] px-5 py-3 text-sm font-semibold text-white"
            >
              Kembali ke Merchant
            </button>
          </div>
          <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#f5f7fb] lg:bg-[#161B22]`}>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="relative w-full max-w-[480px] min-h-screen bg-[#f5f7fb] shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        <AppHeader onBack={() => router.push("/seller")} />

        <div className="h-[60px]" />

        <div className="px-4 pb-24 pt-4 lg:mx-auto lg:max-w-6xl lg:px-0 lg:pt-10 lg:pb-14">
          <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600 lg:text-slate-300">Storefront Merchant</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                    {data.seller.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.seller.profileImageUrl}
                        alt={data.seller.displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-bold text-emerald-700">
                        {data.seller.displayName
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 lg:text-white">{data.seller.displayName}</h1>
                </div>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M6 7l1.5 11h9L18 7M9 11h6" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 lg:text-slate-300">
              {data.seller.description || "Belanja produk digital dari merchant ini dengan harga jual versi tokonya."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 lg:bg-white/10 lg:text-slate-200">
                /seller/{data.seller.slug}
              </div>
              <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {new Set(productGrid.map((item) => item.product.brand)).size} brand aktif
              </div>
              <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 lg:bg-white/10 lg:text-white">
                {data.data.length} produk tersedia
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {productGrid.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-10 text-center shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
                <p className="text-sm font-medium text-slate-600 lg:text-slate-200">Merchant ini belum memilih produk untuk dijual</p>
                <p className="mt-1 text-xs text-slate-400 lg:text-slate-500">Coba lagi nanti saat katalog merchant sudah diperbarui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {productGrid.map((item) => (
                  <button
                    key={item.sellerProductId}
                    type="button"
                    onClick={() => router.push(`/brand/${slugifyBrand(item.product.brand)}?seller=${encodeURIComponent(slug)}&sellerProductId=${encodeURIComponent(item.sellerProductId)}`)}
                    className="rounded-[22px] border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none lg:hover:bg-white/[0.06]"
                  >
                    <div className="aspect-[0.95] overflow-hidden rounded-[18px] bg-gradient-to-br from-slate-100 to-slate-200">
                      {item.product.brandImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.product.brandImageUrl}
                          alt={item.product.brand}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
                          <span className="text-xl font-bold text-white">
                            {item.product.brand
                              .split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5">
                      <p className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-900 lg:text-white">{item.product.name}</p>
                      <p className="mt-1 line-clamp-1 text-[11px] font-medium text-slate-500 lg:text-slate-400">{item.product.brand}</p>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500 lg:bg-white/10 lg:text-slate-300">
                          {item.product.category}
                        </span>
                        <span className="text-[13px] font-bold text-emerald-600 lg:text-emerald-300">{rupiah(item.sellingPrice)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <BottomNavigation />
      </div>
    </div>
  );
}
