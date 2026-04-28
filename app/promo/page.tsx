"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import PageFooter from "@/components/PageFooter";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

interface Promo {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string | null;
  startDate: string | null;
  endDate: string | null;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export default function PromoPage() {
  const router = useRouter();

  const [promos, setPromos] = useState<Promo[]>([]);
  const [filtered, setFiltered] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState(
    "https://i.postimg.cc/fkmgL3hH/image-percent-4146a3ec.png"
  );

  useEffect(() => {
    fetch("/api/promos")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPromos(d.data);
          setFiltered(d.data);
          if (d.heroImageUrl) setHeroImageUrl(d.heroImageUrl);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? promos.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              (p.description ?? "").toLowerCase().includes(q)
          )
        : promos
    );
  }, [search, promos]);

  const handleCardClick = (promo: Promo) => {
    if (promo.linkUrl) {
      if (promo.linkUrl.startsWith("/")) {
        router.push(promo.linkUrl);
      } else {
        window.open(promo.linkUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
      <div className="relative w-full max-w-[480px] min-h-screen bg-white shadow-2xl flex flex-col lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        <AppHeader onBack={() => router.back()} />

        <div className="flex-1 overflow-y-auto pt-[60px] pb-24 lg:pb-12">

          {/* ── Hero banner ── */}
          <div
            className="w-full px-5 py-4 relative overflow-hidden flex items-center justify-between lg:mx-auto lg:mt-5 lg:max-w-6xl lg:rounded-[28px] lg:px-8 lg:py-6"
            style={{ backgroundColor: "#003D99" }}
          >
            {/* Left: text */}
            <div className="relative z-10">
              <h1 className="text-white font-extrabold text-sm leading-tight">Cek Berbagai Promo Menarik</h1>
              <p className="text-purple-200 text-xs font-medium mt-0.5">Dijamin Makin Hemat</p>
            </div>

            {/* Right: discount badge image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://i.postimg.cc/fkmgL3hH/image-percent-4146a3ec.png"
              alt="promo"
              className="h-16 w-auto -mb-4 object-contain flex-shrink-0"
            />
          </div>

          {/* ── Search ── */}
          <div className="px-4 py-3 bg-white sticky top-[60px] z-10 border-b border-slate-100 lg:mx-auto lg:w-full lg:max-w-6xl lg:border-white/10 lg:bg-[#161B22]/95 lg:px-0 lg:backdrop-blur">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari promo..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-100 rounded-xl border-none outline-none text-slate-700 placeholder-slate-400 lg:bg-white/[0.04] lg:text-white lg:placeholder:text-slate-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Promo list ── */}
          <div className="px-4 py-4 lg:mx-auto lg:w-full lg:max-w-6xl lg:px-0 lg:py-6">

            {/* Section title */}
            <p className="text-sm font-bold text-[#003D99] mb-4 lg:text-white">
              {search ? `Hasil pencarian "${search}"` : "Promo Bisa Kamu Nikmati"}
            </p>

            {/* Loading skeleton */}
            {loading && (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-slate-100 lg:border-white/10 lg:bg-white/[0.04]">
                    <div className="w-full h-[180px] bg-slate-100 animate-pulse lg:bg-white/5" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded lg:bg-white/5" />
                      <div className="h-3 w-1/3 bg-slate-100 animate-pulse rounded lg:bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-white/[0.04]">
                <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center lg:bg-white/5">
                  <svg className="w-8 h-8 text-purple-300 lg:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <p className="text-slate-500 font-semibold text-sm lg:text-white">
                  {search ? "Promo tidak ditemukan" : "Belum ada promo aktif"}
                </p>
                <p className="text-slate-400 text-xs">
                  {search ? "Coba kata kunci lain" : "Pantau terus ya, promo menarik segera hadir!"}
                </p>
              </div>
            )}

            {/* Promo cards */}
            {!loading && filtered.length > 0 && (
              <div className="flex flex-col gap-4">
                {filtered.map((promo) => (
                  <div
                    key={promo.id}
                    onClick={() => handleCardClick(promo)}
                    className={`rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-white lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none ${
                      promo.linkUrl ? "cursor-pointer active:scale-[0.98] transition-transform" : ""
                    }`}
                  >
                    {/* Promo image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={promo.imageUrl}
                      alt={promo.title}
                      className="w-full object-cover"
                      style={{ maxHeight: "200px" }}
                      loading="lazy"
                    />

                    {/* Card body */}
                    <div className="px-4 py-3">
                      <p className="text-[11px] font-bold text-[#003D99] leading-snug lg:text-white">{promo.title}</p>
                      {promo.description && (
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 lg:text-slate-300">{promo.description}</p>
                      )}
                      {promo.endDate && (
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          Berlaku s.d{" "}
                          <span className="font-semibold text-slate-500 lg:text-slate-200">{formatDate(promo.endDate)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <PageFooter />
        <BottomNavigation />
      </div>
    </div>
  );
}
