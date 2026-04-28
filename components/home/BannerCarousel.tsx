"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function BannerCarousel() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [banners, setBanners] = useState<string[]>([]);
  const [tagline, setTagline] = useState("Tempat Top Up Game dan Jual Beli Produk Digital Terpercaya");

  // Fetch banner images from API
  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data) && d.data.length > 0) {
          setBanners(d.data);
        }
        if (d.tagline) setTagline(d.tagline);
      })
      .catch(() => {});
  }, []);

  // Auto slide — only when banners are loaded
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  };

  // Show skeleton while fetching
  if (banners.length === 0) {
    return (
      <div className="relative mb-0 bg-white lg:bg-transparent">
        <div className="relative w-full aspect-[2/1] -mt-10 bg-slate-200 animate-pulse lg:mt-0 lg:aspect-[16/6.2] lg:rounded-[26px]" />
      </div>
    );
  }

  return (
    <div className="relative -mt-0 mb-0 bg-white lg:bg-transparent">
      <div className="relative w-full aspect-[2/1] overflow-hidden -mt-10 lg:mt-0 lg:aspect-[16/6.2] lg:rounded-[30px]">
        <div
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentBanner * 100}%)` }}
        >
          {banners.map((banner, idx) => (
            <div key={idx} className="relative h-full min-w-full overflow-hidden lg:rounded-[30px]">
              <Image
                src={banner}
                alt={`Banner ${idx + 1}`}
                fill
                className="object-cover lg:rounded-[30px]"
                priority={idx === 0}
              />
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevBanner}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg transition-all hover:bg-white lg:left-5 lg:bg-black/35 lg:p-3 lg:text-white lg:shadow-none lg:hover:bg-black/50"
        >
          <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextBanner}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg transition-all hover:bg-white lg:right-5 lg:bg-black/35 lg:p-3 lg:text-white lg:shadow-none lg:hover:bg-black/50"
        >
          <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-2 mx-auto w-full max-w-[480px] bg-[#E5F0FF] px-3 py-2 text-center shadow-lg lg:hidden">
        <p className="text-[11px] text-slate-800 font-semibold">{tagline}</p>
      </div>
    </div>
  );
}
