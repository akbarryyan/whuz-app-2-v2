"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Quicksand } from "@/lib/fonts";
import Header from "@/components/home/Header";
import BannerCarousel from "@/components/home/BannerCarousel";
import FlashSale from "@/components/home/FlashSale";
import GameGrid from "@/components/home/GameGrid";
import Categories from "@/components/home/Categories";
import AboutFAQ from "@/components/home/AboutFAQ";
import Footer from "@/components/home/Footer";
import BottomNavigation from "@/components/BottomNavigation";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

/* ────────────────────────────────────────────────────────── */
/*  Skeleton placeholder shown while the page is "loading"   */
/* ────────────────────────────────────────────────────────── */
function HomeSkeleton() {
  return (
    <div className="flex min-h-screen w-full max-w-[480px] flex-col bg-[#F5F5F5] shadow-2xl animate-pulse lg:max-w-none lg:shadow-none">
      {/* ── Header skeleton ── */}
      <div className="bg-[#003D99] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="h-10 w-28 bg-white/15 rounded-lg" />
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white/15 rounded-full" />
            <div className="w-6 h-6 bg-white/15 rounded-full" />
            <div className="w-6 h-6 bg-white/15 rounded-full" />
          </div>
        </div>
        <div className="mt-2.5 h-9 bg-white/20 rounded-md" />
      </div>

      {/* ── Banner skeleton ── */}
      <div className="bg-white">
        <div className="aspect-[2/1] -mt-10 bg-slate-200" />
        <div className="h-8 bg-[#E5F0FF]" />
      </div>

      {/* ── Flash Sale skeleton ── */}
      <div className="bg-white px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-32 bg-slate-200 rounded" />
          <div className="flex gap-1.5">
            <div className="h-6 w-8 bg-green-200 rounded" />
            <div className="h-6 w-8 bg-green-200 rounded" />
            <div className="h-6 w-8 bg-green-200 rounded" />
          </div>
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-[140px] flex-shrink-0 rounded-xl bg-slate-100 p-2">
              <div className="aspect-square bg-slate-200 rounded-lg mb-2" />
              <div className="h-3 w-20 bg-slate-200 rounded mb-1.5" />
              <div className="h-3 w-14 bg-slate-200 rounded mb-2" />
              <div className="h-7 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Categories skeleton ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex gap-6">
        {[80, 100, 65, 75, 90].map((w, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded flex-shrink-0" style={{ width: w }} />
        ))}
      </div>

      {/* ── Game Grid skeleton ── */}
      <div className="flex-1 px-4 py-6 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-2 shadow-sm">
              <div className="aspect-square bg-slate-200 rounded-lg mb-1.5" />
              <div className="h-3 w-14 bg-slate-200 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Nav skeleton ── */}
      <div className="h-16 bg-white border-t border-slate-200 flex items-center justify-around px-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 bg-slate-200 rounded" />
            <div className="h-2.5 w-10 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTypeGroup, setActiveTypeGroup] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [siteName, setSiteName] = useState("Website");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Simulate a short delay so child components can start fetching, then reveal
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch("/api/site-branding")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.site_name) setSiteName(d.data.site_name);
        if (d.data?.site_logo) setLogoUrl(d.data.site_logo);
      })
      .catch(() => {});
  }, []);

  return (
    <div className={`${quicksand.className} flex min-h-screen w-full overflow-x-hidden justify-center bg-[#F5F5F5] lg:block`}>
      {/* Skeleton — fades out */}
      <div
        className={`absolute inset-0 flex w-full overflow-x-hidden justify-center z-50 transition-opacity duration-500 lg:block ${
          ready ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="mx-auto w-full lg:max-w-none">
          <HomeSkeleton />
        </div>
      </div>

      {/* App Content — fades in */}
      <div
        className={`relative w-full max-w-[480px] min-h-screen overflow-x-hidden bg-[#F5F5F5] shadow-2xl flex flex-col gap-0 transition-opacity duration-500 lg:max-w-none lg:shadow-none ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="lg:hidden">
          <Header />
          {isScrolled && <div className="h-[52px]" />}

          <BannerCarousel />
          <FlashSale />
          <Categories activeCategory={activeTypeGroup} onCategoryChange={setActiveTypeGroup} />

          <div className="flex-1 bg-slate-50 px-4 py-6 pb-24">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Link
                href="/seller"
                className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-slate-100" />
                <div className="absolute bottom-0 right-10 h-14 w-14 rounded-full bg-blue-50" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-blue-100 bg-blue-50">
                    <svg className="h-6 w-6 text-[#003D99]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M3 7.5l9-4 9 4m-18 0v9l9 4m-9-13l9 4m9-4l-9 4m0 9v-9" />
                    </svg>
                  </div>
                  <div className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#003D99]">
                    Merchant
                  </div>
                  <h2 className="mt-2 text-base font-bold leading-tight text-slate-900">Lihat Merchant</h2>
                  <p className="mt-1.5 min-h-[2.5rem] text-sm leading-relaxed text-slate-500">Jelajahi toko merchant aktif.</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#003D99]">
                    <span>Buka</span>
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              <Link
                href="/promo"
                className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-slate-100" />
                <div className="absolute bottom-0 right-10 h-14 w-14 rounded-full bg-amber-50" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-amber-100 bg-amber-50">
                    <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <div className="mt-3 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                    Promo
                  </div>
                  <h2 className="mt-2 text-base font-bold leading-tight text-slate-900">Promo Terbaru</h2>
                  <p className="mt-1.5 min-h-[2.5rem] text-sm leading-relaxed text-slate-500">Cek promo dan penawaran aktif.</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                    <span>Lihat</span>
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>

            <GameGrid category={activeTypeGroup} />
            <AboutFAQ />
          </div>

          <Footer />
          <BottomNavigation />
        </div>

        <div className="hidden lg:block">
          <div className="border-b border-[#232a34] bg-[#171D25] text-white">
            <div className="mx-auto max-w-7xl">
              <div className="flex items-center gap-6 px-6 pt-5 pb-4">
                <Link href="/" className="flex min-w-[160px] items-center gap-3">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt={siteName} className="h-12 w-auto object-contain" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold uppercase text-white">
                      {siteName.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-bold">{siteName}</p>
                    <p className="text-xs text-blue-100">Top up, PPOB, merchant, dan promo</p>
                  </div>
                </Link>

                <div className="relative flex-1">
                  <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/55" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Cari game atau voucher"
                    className="w-full rounded-full border border-white/12 bg-white/10 py-3 pl-12 pr-5 text-sm text-white placeholder:text-white/55 focus:border-white/25 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Link href="/login" className="rounded-full border border-white/12 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                    Masuk
                  </Link>
                  <Link href="/register" className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#003D99] transition hover:bg-blue-50">
                    Daftar
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-7 px-6 pb-5 pt-1 text-sm font-semibold text-blue-100">
                <Link href="/" className="flex items-center gap-2 border-b-2 border-white pb-3 text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7.5l9-4 9 4m-18 0v9l9 4m-9-13l9 4m9-4l-9 4m0 9v-9" />
                  </svg>
                  <span>Topup</span>
                </Link>
                <Link href="/transaksi" className="flex items-center gap-2 pb-3 transition hover:text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span>Cek Transaksi</span>
                </Link>
                <Link href="/promo" className="flex items-center gap-2 pb-3 transition hover:text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <span>Promo</span>
                </Link>
                <Link href="/seller" className="flex items-center gap-2 pb-3 transition hover:text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V9H2v11h5m10 0v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5m10 0H7" />
                  </svg>
                  <span>Merchant</span>
                </Link>
                <Link href="/pusat-bantuan" className="flex items-center gap-2 pb-3 transition hover:text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span>Pusat Bantuan</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-[#161B22] px-6 py-10">
            <div className="mx-auto max-w-7xl">
              <div className="overflow-hidden rounded-[34px]">
                <BannerCarousel />
              </div>

              <div className="mt-8 border-t border-white/10 pt-8">
                <FlashSale />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <Link
                  href="/seller"
                  className="rounded-[28px] border border-white/8 bg-white/[0.04] p-7 text-white transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Merchant</p>
                  <h2 className="mt-3 text-[28px] font-bold leading-tight text-white">Lihat Merchant</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">Temukan merchant aktif dan produk digital yang sudah siap dijual tanpa harus berpindah halaman terlalu jauh.</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/90">
                    <span>Buka direktori</span>
                    <span className="text-white/50">→</span>
                  </div>
                </Link>

                <Link
                  href="/promo"
                  className="rounded-[28px] border border-white/8 bg-white/[0.04] p-7 text-white transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Promo</p>
                  <h2 className="mt-3 text-[28px] font-bold leading-tight text-white">Promo Terbaru</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">Pantau penawaran aktif, campaign berjalan, dan produk dengan momentum terbaik untuk dijual.</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/90">
                    <span>Lihat promo aktif</span>
                    <span className="text-white/50">→</span>
                  </div>
                </Link>
              </div>

              <div className="mt-10 p-0">
                <Categories activeCategory={activeTypeGroup} onCategoryChange={setActiveTypeGroup} />
              </div>

              <div className="mt-10 grid grid-cols-[1.4fr_0.42fr] gap-8">
                <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <GameGrid category={activeTypeGroup} />
                </div>

                <div className="space-y-4">
                  <Link
                    href="/seller"
                    className="block rounded-[28px] border border-white/10 bg-white/6 p-6 text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-200">Butuh Merchant?</p>
                    <h3 className="mt-2 text-xl font-bold">Buka direktori merchant</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">Jelajahi partner aktif dan produk digital yang sudah siap dijual.</p>
                  </Link>

                  <Link
                    href="/pusat-bantuan"
                    className="block rounded-[28px] border border-white/10 bg-white/6 p-6 text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-200">Butuh Bantuan?</p>
                    <h3 className="mt-2 text-xl font-bold">Lihat pusat bantuan</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">Temukan panduan transaksi, pembayaran, dan jawaban cepat untuk pertanyaan umum.</p>
                  </Link>
                </div>
              </div>

              <div className="mt-10 border-t border-white/10 pt-10">
                <AboutFAQ />
              </div>

              <div className="mt-10 border-t border-white/10 pt-10">
                <Footer />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
