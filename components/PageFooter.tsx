"use client";

import { useEffect, useState } from "react";
import { DEFAULT_FOOTER_COLUMNS, FooterColumnItem, normalizeFooterColumns } from "@/lib/footer-columns";

interface PaymentMethod {
  name: string;
  img: string;
}

interface FooterBranding {
  site_name?: string;
  footer_logo_url?: string;
  footer_tagline?: string;
  footer_copyright?: string;
  footer_company_name?: string;
  footer_payment_methods?: string; // JSON
  footer_columns?: string;
  visitorStats?: {
    visitorsToday: number;
    totalVisits: number;
    pagesToday: number;
  };
}

function safeJSON<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function getBrandInitials(siteName: string): string {
  const letters = siteName.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  return letters || "WS";
}

export default function PageFooter() {
  const [branding, setBranding] = useState<FooterBranding>({});

  useEffect(() => {
    fetch("/api/footer-config")
      .then((r) => r.json())
      .then((d) => { if (d.success) setBranding(d.data); })
      .catch(() => {});
  }, []);

  const siteName = branding.site_name || "Website";
  const logoUrl = branding.footer_logo_url || "";
  const tagline = branding.footer_tagline || `Top Up Game Murah & PPOB Terpercaya? ${siteName} Aja!`;
  const copyright = branding.footer_copyright || `Copyright ©2024 - ${new Date().getFullYear()}\n${siteName}. All rights reserved.`;
  const paymentMethods = safeJSON<PaymentMethod[]>(branding.footer_payment_methods ?? "", [
    { name: "GoPay", img: "" },
    { name: "DANA", img: "" },
    { name: "Shopee", img: "" },
    { name: "OVO", img: "" },
    { name: "QRIS", img: "" },
  ]);
  const footerColumns = normalizeFooterColumns(
    safeJSON<FooterColumnItem[]>(branding.footer_columns ?? "", []),
    DEFAULT_FOOTER_COLUMNS
  );
  const visitorStats = branding.visitorStats ?? {
    visitorsToday: 0,
    totalVisits: 0,
    pagesToday: 0,
  };

  return (
    <footer className="border-t border-slate-100 bg-white px-5 pt-6 pb-28 lg:rounded-[28px] lg:border-white/10 lg:bg-white/[0.04] lg:px-7 lg:pt-7 lg:pb-12">
      {/* Logo + tagline */}
      <div className="mb-4 lg:mb-6">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={siteName} className="h-10 w-auto object-contain mb-2" />
        ) : (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="bg-[#003D99] rounded-lg px-2 py-1">
              <span className="text-white font-bold text-sm tracking-wide">{getBrandInitials(siteName)}</span>
            </div>
            <span className="text-slate-800 font-bold text-base lg:text-white">{siteName}</span>
          </div>
        )}
        <p className="text-[11px] text-slate-500 font-semibold leading-snug lg:max-w-xl lg:text-slate-300">{tagline}</p>
      </div>

      <div className="mb-5 space-y-4 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] lg:gap-10 lg:space-y-0">
        <div>
          <p className="text-[11px] font-bold text-slate-700 mb-2 lg:text-slate-100">Pengunjung</p>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600">
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center lg:bg-white/5">
              <p className="lg:text-slate-400">Vis. today</p>
              <p className="mt-1 font-bold text-slate-800 lg:text-white">{visitorStats.visitorsToday.toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center lg:bg-white/5">
              <p className="lg:text-slate-400">Visits</p>
              <p className="mt-1 font-bold text-slate-800 lg:text-white">{visitorStats.totalVisits.toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center lg:bg-white/5">
              <p className="lg:text-slate-400">Pag. today</p>
              <p className="mt-1 font-bold text-slate-800 lg:text-white">{visitorStats.pagesToday.toLocaleString("id-ID")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-5 lg:space-y-0">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-[11px] font-bold text-slate-700 mb-1 lg:text-slate-100">{column.title}</p>
              <div className="flex flex-col gap-1">
                {column.links.map((link) => (
                  <a key={`${column.title}-${link.label}-${link.href}`} href={link.href} className="text-[12px] font-semibold text-[#6A7389] transition-colors hover:text-slate-700 lg:text-slate-300 lg:hover:text-white">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Help card */}
      <a href="/pusat-bantuan" className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100 lg:border-white/10 lg:bg-white/5 lg:hover:bg-white/[0.08]">
        <div className="w-9 h-9 rounded-full bg-[#003D99] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-lg font-bold">?</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="mb-0.5 text-[11px] leading-none text-slate-500 lg:text-slate-400">Punya Pertanyaan?</p>
          <p className="text-[12px] font-semibold text-[#003D99] lg:text-blue-300">
            Cek Pusat Bantuan{" "}
            <span className="text-[#003D99] lg:text-blue-300">&rsaquo;</span>
          </p>
        </div>
      </a>

      {/* Payment methods — from footer config (same as home Footer) */}
      <div className="mb-2">
        <p className="text-[11px] font-bold text-slate-700 lg:text-slate-100">Pembayaran Lengkap</p>
        <div className="flex flex-wrap gap-2 items-center">
          {paymentMethods.map((pm) =>
            pm.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={pm.name}
                src={pm.img}
                alt={pm.name}
                title={pm.name}
                className="h-14 w-auto object-contain rounded"
              />
            ) : (
              <span
                key={pm.name}
                className="rounded-lg bg-slate-200 px-3 py-1.5 text-[10px] font-bold tracking-wide text-slate-700 lg:bg-white/8 lg:text-slate-100"
              >
                {pm.name}
              </span>
            )
          )}
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-slate-100 pt-4 lg:border-white/10">
        {copyright.split("\n").map((line, i) => (
          <p key={i} className="text-[10px] leading-relaxed text-slate-400 lg:text-slate-500">{line}</p>
        ))}
      </div>
    </footer>
  );
}
