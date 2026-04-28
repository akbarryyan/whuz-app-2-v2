"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import AppHeader from "@/components/AppHeader";
import PageFooter from "@/components/PageFooter";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

interface FaqItem {
  question: string;
  answer: string;
}

const HELP_CATEGORIES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: "Pesanan & Transaksi",
    desc: "Cek status pesanan, pembayaran gagal, refund",
    color: "bg-blue-50 text-blue-600",
    items: [
      "Bagaimana cara cek status pesanan saya?",
      "Pembayaran sudah berhasil tapi produk belum masuk",
      "Bagaimana cara mengajukan refund?",
      "Pesanan saya dibatalkan, kemana uang saya?",
    ],
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: "Pembayaran",
    desc: "Metode pembayaran, biaya admin, saldo",
    color: "bg-green-50 text-green-600",
    items: [
      "Metode pembayaran apa saja yang tersedia?",
      "Apakah ada biaya admin untuk pembayaran?",
      "Bagaimana cara top up saldo wallet?",
      "Pembayaran QRIS tidak terverifikasi",
    ],
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: "Akun & Profil",
    desc: "Login, registrasi, ubah profil, keamanan",
    color: "bg-purple-50 text-purple-600",
    items: [
      "Bagaimana cara mendaftar akun?",
      "Saya lupa password, bagaimana cara reset?",
      "Bagaimana cara mengubah email atau nomor HP?",
      "Apakah bisa top up tanpa login?",
    ],
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
    title: "Promo & Voucher",
    desc: "Kode promo, diskon, cashback",
    color: "bg-amber-50 text-amber-600",
    items: [
      "Bagaimana cara menggunakan kode promo?",
      "Kenapa kode promo saya tidak bisa digunakan?",
      "Dimana saya bisa melihat promo terbaru?",
      "Apakah promo bisa digabung dengan saldo?",
    ],
  },
];

export default function PusatBantuanPage() {
  const router = useRouter();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openCategory, setOpenCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const helpCategories = HELP_CATEGORIES;

  useEffect(() => {
    fetch("/api/home-content")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.faqs) setFaqs(d.data.faqs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter FAQs by search
  const filteredFaqs = searchQuery.trim()
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-[#F5F5F5] shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        <AppHeader onBack={() => router.back()} />
        <div className="h-[60px]" />

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[#003D99] to-[#0052CC] px-5 pt-6 pb-8 text-white lg:mx-auto lg:mt-6 lg:w-full lg:max-w-6xl lg:rounded-[32px] lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">Pusat Bantuan</h1>
              <p className="text-[12px] text-white/70">Temukan jawaban untuk pertanyaanmu</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pertanyaan atau topik..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center"
              >
                <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 pb-8 lg:mx-auto lg:w-full lg:max-w-6xl">

          {loading ? (
            /* ===== SKELETON LOADING ===== */
            <>
              {/* Quick Actions Skeleton */}
              <div className="px-4 -mt-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm animate-pulse lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <div className="w-9 h-9 rounded-xl bg-slate-200 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="h-3 w-16 bg-slate-200 rounded mb-1.5" />
                          <div className="h-2.5 w-12 bg-slate-100 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Help Categories Skeleton */}
              <div className="px-4 mt-5">
                <div className="h-4 w-32 bg-slate-200 rounded mb-3 animate-pulse" />
                <div className="space-y-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm animate-pulse lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="h-3.5 w-28 bg-slate-200 rounded mb-1.5" />
                          <div className="h-2.5 w-44 bg-slate-100 rounded" />
                        </div>
                        <div className="w-5 h-5 rounded bg-slate-100 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ Skeleton */}
              <div className="px-4 mt-6">
                <div className="h-4 w-40 bg-slate-200 rounded mb-3 animate-pulse" />
                <div className="space-y-2.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm animate-pulse lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
                      <div className="flex items-center justify-between">
                        <div className="h-3.5 bg-slate-200 rounded" style={{ width: `${55 + (i * 7) % 30}%` }} />
                        <div className="w-4 h-4 rounded bg-slate-100 flex-shrink-0 ml-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact CTA Skeleton */}
              <div className="px-4 mt-6">
            <div className="rounded-2xl bg-slate-200 p-5 animate-pulse lg:bg-white/[0.05]">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-300 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 w-36 bg-slate-300 rounded mb-2" />
                      <div className="h-2.5 w-full bg-slate-300/60 rounded mb-1.5" />
                      <div className="h-2.5 w-3/4 bg-slate-300/60 rounded mb-4" />
                      <div className="h-9 w-36 bg-slate-300 rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ===== ACTUAL CONTENT ===== */
            <>

          {/* Quick Actions */}
          <div className="px-4 -mt-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push("/tickets")}
                  className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-bold text-slate-700">Hubungi CS</p>
                    <p className="text-[10px] text-slate-400">Kirim tiket</p>
                  </div>
                </button>
                <button
                  onClick={() => router.push("/akun/pesanan")}
                  className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-bold text-slate-700">Cek Pesanan</p>
                    <p className="text-[10px] text-slate-400">Status order</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Help Categories */}
          <div className="px-4 mt-5">
            <h2 className="mb-3 text-[13px] font-bold text-slate-800 lg:text-white">Kategori Bantuan</h2>
            <div className="space-y-2.5">
              {helpCategories.map((cat, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
                  <button
                    onClick={() => setOpenCategory(openCategory === idx ? null : idx)}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 lg:hover:bg-white/[0.06]"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 lg:text-white">{cat.title}</p>
                      <p className="text-[11px] text-slate-400 lg:text-slate-400">{cat.desc}</p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                        openCategory === idx ? "rotate-180" : ""
                      }`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      openCategory === idx ? "max-h-[500px]" : "max-h-0"
                    }`}
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {cat.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex cursor-default items-start gap-2.5 rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100 lg:bg-white/5 lg:hover:bg-white/10"
                        >
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[9px] font-bold text-slate-500">{i + 1}</span>
                          </div>
                          <p className="text-[12px] leading-relaxed text-slate-600 lg:text-slate-200">{item}</p>
                        </div>
                      ))}
                      <button
                        onClick={() => router.push("/tickets")}
                        className="mt-1 w-full rounded-xl bg-[#003D99]/5 py-2.5 text-[12px] font-semibold text-[#003D99] transition-colors hover:bg-[#003D99]/10 lg:bg-white/10 lg:text-white lg:hover:bg-white/15"
                      >
                        Butuh bantuan lain? Hubungi CS →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="px-4 mt-6">
            <h2 className="mb-3 text-[13px] font-bold text-slate-800 lg:text-white">Pertanyaan Umum (FAQ)</h2>

            {filteredFaqs.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
                <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="mb-1 text-sm font-semibold text-slate-500 lg:text-slate-200">
                  {searchQuery ? "Tidak ditemukan" : "Belum ada FAQ"}
                </p>
                <p className="text-[11px] text-slate-400 lg:text-slate-500">
                  {searchQuery
                    ? `Tidak ada hasil untuk "${searchQuery}"`
                    : "FAQ akan segera ditambahkan."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredFaqs.map((faq, idx) => (
                  <div key={idx} className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50 lg:hover:bg-white/[0.06]"
                    >
                      <span className="pr-4 text-[12px] font-semibold leading-relaxed text-slate-700 lg:text-white">{faq.question}</span>
                      <svg
                        className={`w-4.5 h-4.5 text-[#003D99] flex-shrink-0 transition-transform duration-200 ${
                          openFaq === idx ? "rotate-180" : ""
                        }`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        openFaq === idx ? "max-h-96" : "max-h-0"
                      }`}
                    >
                      <div className="border-t border-slate-50 px-4 pb-4 pt-3 text-[12px] leading-relaxed text-slate-500 lg:border-white/10 lg:text-slate-300">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact CTA */}
          <div className="px-4 mt-6">
            <div className="rounded-2xl bg-gradient-to-r from-[#003D99] to-[#0052CC] p-5 text-white shadow-lg lg:shadow-none">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold mb-1">Masih butuh bantuan?</p>
                  <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                    Tim Customer Service kami siap membantu kamu 24/7. Jangan ragu untuk menghubungi kami.
                  </p>
                  <button
                    onClick={() => router.push("/tickets")}
                    className="px-5 py-2.5 bg-white text-[#003D99] text-[12px] font-bold rounded-xl hover:bg-white/90 transition-colors shadow-sm"
                  >
                    Kirim Tiket Bantuan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6">
            <PageFooter />
          </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
