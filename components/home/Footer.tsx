"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_FOOTER_COLUMNS, FooterColumnItem, normalizeFooterColumns } from "@/lib/footer-columns";

interface PaymentMethod {
  name: string;
  img: string;
}
interface SocialLink {
  platform: string;
  href: string;
}

interface FooterConfig {
  site_name?: string;
  footer_logo_url: string;
  footer_tagline: string;
  footer_payment_methods: string; // JSON
  footer_company_name: string;
  footer_contact_phone: string;
  footer_contact_email: string;
  footer_columns?: string;
  footer_social_links: string; // JSON
  footer_copyright: string;
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

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  facebook: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  youtube: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  discord: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  ),
  tiktok: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
};

export default function Footer() {
  const [cfg, setCfg] = useState<FooterConfig | null>(null);

  useEffect(() => {
    fetch("/api/footer-config")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCfg(d.data); })
      .catch(() => {});
  }, []);

  const siteName = cfg?.site_name?.trim() || "Website";
  const logoUrl       = cfg?.footer_logo_url ?? "";
  const tagline       = cfg?.footer_tagline ?? `Top Up Game Murah & PPOB Terpercaya? ${siteName} Aja!`;
  const paymentMethods = safeJSON<PaymentMethod[]>(cfg?.footer_payment_methods ?? "", [
    { name: "GoPay",  img: "" },
    { name: "DANA",   img: "" },
    { name: "Shopee", img: "" },
    { name: "OVO",    img: "" },
    { name: "QRIS",   img: "" },
  ]);
  const companyName   = cfg?.footer_company_name ?? siteName;
  const contactPhone  = cfg?.footer_contact_phone ?? "";
  const contactEmail  = cfg?.footer_contact_email ?? "";
  const footerColumns = normalizeFooterColumns(
    safeJSON<FooterColumnItem[]>(cfg?.footer_columns ?? "", []),
    DEFAULT_FOOTER_COLUMNS
  );
  const socialLinks   = safeJSON<SocialLink[]>(cfg?.footer_social_links ?? "", [
    { platform: "instagram", href: "#" },
    { platform: "facebook",  href: "#" },
    { platform: "youtube",   href: "#" },
    { platform: "discord",   href: "#" },
    { platform: "tiktok",    href: "#" },
  ]);
  const copyright     = cfg?.footer_copyright ?? `Copyright ©2024 - ${new Date().getFullYear()}\n${siteName}. All rights reserved.`;
  const visitorStats = cfg?.visitorStats ?? {
    visitorsToday: 0,
    totalVisits: 0,
    pagesToday: 0,
  };

  return (
    <footer className="-mt-14 overflow-hidden bg-white shadow-2xl pb-24 lg:mt-0 lg:rounded-[32px] lg:bg-transparent lg:shadow-none">
      <div className="mx-auto max-w-6xl px-5 pt-6 pb-8 lg:px-8 lg:pt-10 lg:pb-10">
        <div className="space-y-8 lg:grid lg:grid-cols-[1.15fr_0.9fr_0.75fr_1.5fr] lg:gap-8 lg:space-y-0">
          <div className="lg:pr-6">
            <div className="mb-3 flex items-center gap-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <>
                  <div className="rounded-lg bg-purple-600 px-2.5 py-1 lg:bg-white/10">
                    <span className="text-base font-bold tracking-wide text-white">{getBrandInitials(siteName)}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-800 lg:text-white">{siteName}</span>
                </>
              )}
            </div>
            <p className="max-w-xs text-[13px] leading-7 text-slate-500 lg:text-[14px] lg:text-slate-300">{tagline}</p>
          </div>

          <div>
            <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#262C3B] lg:text-white">Pembayaran</h3>
            <div className="flex flex-wrap items-center gap-2 lg:max-w-[220px]">
              {paymentMethods.map((pm) => (
                pm.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={pm.name}
                    src={pm.img}
                    alt={pm.name}
                    title={pm.name}
                    className="h-12 w-auto rounded object-contain sm:h-14"
                  />
                ) : (
                  <span
                    key={pm.name}
                    className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold tracking-wide text-slate-700 lg:bg-white/8 lg:text-slate-100"
                  >
                    {pm.name}
                  </span>
                )
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#262C3B] lg:text-white">Pengunjung</h3>
            <div className="space-y-2 text-[13px] text-slate-700 lg:max-w-[170px] lg:text-slate-300">
              <div className="flex items-center justify-between gap-4">
                <span>Vis. today</span>
                <strong className="lg:text-white">{visitorStats.visitorsToday.toLocaleString("id-ID")}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Visits</span>
                <strong className="lg:text-white">{visitorStats.totalVisits.toLocaleString("id-ID")}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Pag. today</span>
                <strong className="lg:text-white">{visitorStats.pagesToday.toLocaleString("id-ID")}</strong>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#262C3B] lg:text-white">{column.title}</h3>
                <ul className="space-y-2">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}-${link.href}`} className="flex items-start gap-2 text-[13px]">
                      <span className="pt-1 text-slate-400 lg:text-slate-500">•</span>
                      <a
                        href={link.href}
                        className="font-semibold leading-6 text-[#003D99] transition-colors hover:text-emerald-800 lg:text-slate-200 lg:hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-6 border-t border-slate-100 pt-6 lg:grid lg:grid-cols-[1.1fr_0.9fr_1fr] lg:gap-6 lg:space-y-0 lg:border-white/10">
          <div>
            <h3 className="mb-2 text-[13px] font-bold text-[#262C3B] lg:text-white">Layanan Pengaduan Konsumen</h3>
            <p className="mb-1 text-[12px] text-[#6A7389] lg:text-slate-400">{companyName}</p>
            <div className="flex flex-col gap-1">
              {contactPhone && (
                <a
                  href={`https://wa.me/${contactPhone.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-2 text-[13px] text-[#003D99] transition-colors hover:text-purple-700 lg:text-slate-200 lg:hover:text-white"
                >
                  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {contactPhone}
                </a>
              )}
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 text-[13px] text-[#003D99] transition-colors hover:text-purple-700 lg:text-slate-200 lg:hover:text-white"
                >
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {contactEmail}
                </a>
              )}
            </div>
          </div>

          {socialLinks.length > 0 && (
            <div>
              <h3 className="mb-2 text-[13px] font-bold text-[#262C3B] lg:text-white">Ikuti Kami di</h3>
              <div className="flex flex-wrap items-center gap-4">
                {socialLinks.map((s) =>
                  SOCIAL_ICONS[s.platform] ? (
                    <a
                      key={s.platform}
                      href={s.href}
                      className="text-[#003D99] transition-colors hover:text-purple-700 lg:text-slate-200 lg:hover:text-white"
                    >
                      {SOCIAL_ICONS[s.platform]}
                    </a>
                  ) : null
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 lg:self-start">
            <Link href="/seller" className="block rounded-xl bg-blue-50 p-4 transition-colors hover:bg-blue-100 lg:border lg:border-white/10 lg:bg-white/6 lg:hover:bg-white/10">
              <p className="text-[13px] font-semibold text-slate-700 lg:text-slate-300">Cari Merchant?</p>
              <p className="mt-1 text-[13px] font-bold text-[#003D99] lg:text-white">Lihat Semua Merchant</p>
            </Link>
            <a href="/pusat-bantuan" className="block rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 lg:border lg:border-white/10 lg:bg-white/6 lg:hover:bg-white/10">
              <p className="text-[13px] font-semibold text-slate-700 lg:text-slate-300">Punya Pertanyaan?</p>
              <p className="mt-1 text-[13px] font-bold text-[#003D99] lg:text-white">Cek Pusat Bantuan</p>
            </a>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 lg:border-white/10">
          {copyright.split("\n").map((line, i) => (
            <p key={i} className="text-[11px] leading-relaxed text-slate-400 lg:text-slate-500">{line}</p>
          ))}
        </div>
      </div>
    </footer>
  );
}
