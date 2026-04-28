"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BrandItem {
  brand: string;
  slug: string;
  productCount: number;
  imageUrl: string | null;
}

// Fallback images for brands without a DB imageUrl
const BRAND_IMAGES_FALLBACK: Record<string, string> = {
  "Mobile Legends": "https://i.ibb.co.com/9wX5jZm/ml.png",
  "Free Fire": "https://i.ibb.co.com/yhRfk3L/ff.png",
  "PUBG Mobile": "https://i.ibb.co.com/fSLq9YH/pubg.png",
  "Genshin Impact": "https://i.ibb.co.com/YdBvqLZ/genshin.png",
  "Roblox": "https://i.ibb.co.com/k8sFvHN/roblox.png",
  "Valorant": "https://i.ibb.co.com/sH7p8WY/valorant.png",
  "Call of Duty": "https://i.ibb.co.com/d6NqZ3m/cod.png",
  "Arena of Valor": "https://i.ibb.co.com/HPfYg2J/aov.png",
  "Honor of Kings": "https://i.ibb.co.com/ZxtRv9n/hok.png",
  "Magic Chess": "https://i.ibb.co.com/fYbHq8B/magic-chess.png",
  "Soul Land": "https://i.ibb.co.com/j8Zy3Hq/soul-land.png",
  "Blood Strike": "https://i.ibb.co.com/LNjtGZy/blood-strike.png",
};

const BRAND_GRADIENTS = [
  "from-purple-500 to-indigo-600",
  "from-rose-500 to-orange-500",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-red-500",
  "from-fuchsia-500 to-purple-600",
  "from-sky-500 to-indigo-500",
  "from-lime-500 to-green-600",
];

// Priority order for "Semua" and "Top Up Game" tabs
const PRIORITY_BRANDS = [
  "Mobile Legends A",
  "Mobile Legends B",
  "Free Fire",
  "Free Fire Max",
  "Delta Force",
  "PUBG Mobile",
];

interface GameGridProps {
  category?: string | null;
}

export default function GameGrid({ category }: GameGridProps) {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setLoading(true);
      setShowAll(false);
    });
    const url = category
      ? `/api/catalog/brands?typeGroup=${encodeURIComponent(category)}`
      : "/api/catalog/brands";
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          let data: BrandItem[] = res.data;
          // Apply priority sorting for "Semua" (null) and "game" categories
          if (!category || category === "game") {
            const priorityLower = PRIORITY_BRANDS.map((b) => b.toLowerCase());
            data = [...data].sort((a, b) => {
              const idxA = priorityLower.indexOf(a.brand.toLowerCase());
              const idxB = priorityLower.indexOf(b.brand.toLowerCase());
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return 0;
            });
          }
          setBrands(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  const displayedBrands = showAll ? brands : brands.slice(0, 12);

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-28 rounded-lg bg-slate-200 animate-pulse lg:bg-white/12" />
          <div className="h-4 w-24 rounded-lg bg-slate-200 animate-pulse lg:bg-white/10" />
        </div>
        <div className="grid grid-cols-4 gap-3 lg:grid-cols-6 lg:gap-5 xl:grid-cols-7">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 bg-white rounded-xl p-2 shadow-sm lg:rounded-[24px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:p-3 lg:shadow-none">
              <div className="w-full aspect-square rounded-lg bg-slate-200 animate-pulse lg:bg-white/10" />
              <div className="h-3 w-14 rounded bg-slate-200 animate-pulse lg:bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (brands.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 lg:text-white">Pilih Produk</h3>
        </div>
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3 lg:text-white/35" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm text-slate-500 lg:text-slate-300">Belum ada produk tersedia{category ? ` di kategori ini` : ""}.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 lg:text-white">Pilih Produk</h3>
        {brands.length > 12 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-sm font-semibold text-purple-600 lg:text-blue-200"
          >
            {showAll ? "Sembunyikan" : `Lihat Semua (${brands.length})`} →
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-x-3 gap-y-5 lg:grid-cols-6 lg:gap-x-5 lg:gap-y-7 xl:grid-cols-7">
        {displayedBrands.map((brand, idx) => {
          const image = brand.imageUrl ?? BRAND_IMAGES_FALLBACK[brand.brand] ?? null;
          const gradient = BRAND_GRADIENTS[idx % BRAND_GRADIENTS.length];
          const initials = brand.brand
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <button
              key={brand.slug}
              onClick={() => router.push(`/brand/${brand.slug}`)}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md lg:rounded-[24px] lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none lg:hover:border-white/15 lg:hover:bg-white/[0.07] lg:hover:shadow-none"
            >
              <div className="flex flex-col items-center gap-2 px-3 pb-3 pt-4">
                <div className="w-full aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 lg:rounded-[18px] lg:from-[#0f223f] lg:to-[#132b4a]">
                  <div className="h-full w-full overflow-hidden rounded-lg">
                    {image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={image}
                        alt={brand.brand}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} transition-transform group-hover:scale-105`}
                      >
                        <span className="text-lg font-bold text-white drop-shadow-sm">
                          {initials}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-center text-[11px] font-medium leading-tight text-slate-700 line-clamp-2 lg:text-[12px] lg:text-slate-100">
                  {brand.brand}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
