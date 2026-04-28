"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

interface FlashSaleProduct {
  id: string;
  name: string;
  brand: string;
  brandImage: string;
  badge: string;
  discount: string;
  originalPrice: string;
  price: string;
}

interface FlashSaleConfig {
  isActive: boolean;
  endTime: string;
  products: FlashSaleProduct[];
}

function useCountdown(endTime: string) {
  const calcRemaining = () => {
    const diff = Math.max(0, new Date(endTime).getTime() - Date.now());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { h, m, s, expired: diff === 0 };
  };
  const [remaining, setRemaining] = useState(calcRemaining);
  useEffect(() => {
    const t = setInterval(() => setRemaining(calcRemaining()), 1_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime]);
  return remaining;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function toBrandSlug(brand: string) {
  return brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function FlashSale() {
  const [config, setConfig] = useState<FlashSaleConfig | null>(null);

  useEffect(() => {
    fetch("/api/flash-sale")
      .then((r) => r.json())
      .then((d) => { if (d.success) setConfig(d.data); })
      .catch(() => {});
  }, []);

  const countdown = useCountdown(config?.endTime ?? new Date(Date.now() + 3_600_000).toISOString());

  // Still fetching — render nothing to avoid flash
  if (config === null) return null;

  // Not active, no products, or expired → informational placeholder
  if (!config || !config.isActive || config.products.length === 0 || countdown.expired) {
    return (
      <div className="mt-0 bg-white px-4 py-4 lg:bg-transparent lg:px-0 lg:py-0">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xl font-bold text-red-400 lg:text-white lg:text-2xl">⚡ Flash Sale</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-5 lg:border-white/10 lg:bg-transparent">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl lg:bg-white/10">
            🕐
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600 lg:text-white lg:text-xl">Flash Sale belum tersedia</p>
            <p className="mt-0.5 text-[11px] text-slate-400 lg:text-slate-300 lg:text-[13px]">
              {countdown.expired
                ? "Flash sale telah berakhir. Pantau terus untuk penawaran berikutnya!"
                : "Saat ini belum ada flash sale yang aktif. Pantau terus ya!"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-0 bg-white px-4 pt-4 pb-4 lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-red-500">⚡ Flash Sale</span>
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-slate-600 mb-1">Berakhir dalam</span>
            <div className="flex items-center gap-1">
              <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold tabular-nums">{pad(countdown.h)}</span>
              <span className="text-xs font-bold text-slate-600">:</span>
              <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold tabular-nums">{pad(countdown.m)}</span>
              <span className="text-xs font-bold text-slate-600">:</span>
              <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold tabular-nums">{pad(countdown.s)}</span>
            </div>
          </div>
        </div>
        <button className="text-xs text-purple-600 font-semibold whitespace-nowrap cursor-pointer">
          Lihat Semua →
        </button>
      </div>

      {/* Products horizontal scroll */}
      <div className="-mx-4 overflow-x-auto px-4 hide-scrollbar lg:mx-0 lg:overflow-visible lg:px-0">
        <div className="flex gap-3 pb-2 lg:grid lg:grid-cols-4 lg:gap-5 lg:pb-0 xl:grid-cols-5">
          {config.products.map((product) => (
            <div
              key={product.id}
              className="w-[140px] flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 shadow-md lg:min-w-0 lg:w-auto lg:flex-shrink lg:rounded-[24px] lg:border lg:border-slate-200/70 lg:bg-white/88 lg:shadow-none"
            >
              {/* Brand image */}
              <div className="relative aspect-square bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center overflow-hidden">
                {product.brandImage ? (
                  <Image
                    src={product.brandImage}
                    alt={product.brand}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-purple-300">{(product.brand ?? "?").slice(0, 2).toUpperCase()}</span>
                )}
                {product.discount && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {product.discount}
                  </div>
                )}
              </div>

              <div className="p-2.5">
                <p className="text-[11px] font-semibold text-slate-700 mb-0.5 leading-tight line-clamp-2">{product.name}</p>
                {product.badge && (
                  <div className="bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 mb-1.5">
                    <p className="text-[9px] font-medium text-orange-600 text-center truncate">{product.badge}</p>
                  </div>
                )}
                <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                  {product.originalPrice && (
                    <span className="text-[10px] text-slate-400 line-through">{product.originalPrice}</span>
                  )}
                  {product.discount && (
                    <span className="bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">
                      {product.discount}
                    </span>
                  )}
                </div>
                <p className="text-purple-600 font-bold text-sm mb-2">{product.price}</p>
                <Link
                  href={`/brand/${toBrandSlug(product.brand ?? "")}`}
                  className="w-full bg-purple-600 text-white text-[11px] font-semibold py-1.5 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                >
                  <span>🛒</span>
                  <span>Beli</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
