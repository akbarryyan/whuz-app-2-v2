"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FaqItem {
  question: string;
  answer: string;
}

interface HomeContent {
  gameTags: { label: string; href: string }[];
  faqs: FaqItem[];
  aboutText: string;
}

export default function AboutFAQ() {
  const [content, setContent] = useState<HomeContent | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showAllFaq, setShowAllFaq] = useState(false);

  useEffect(() => {
    fetch("/api/home-content")
      .then((r) => r.json())
      .then((d) => { if (d.success) setContent(d.data); })
      .catch(() => {});
  }, []);

  if (!content) {
    return (
      <div className="mt-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse space-y-3 lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
          <div className="h-4 w-40 bg-slate-200 rounded lg:bg-white/12" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-28 bg-slate-100 rounded-lg lg:bg-white/10" />
            ))}
          </div>
          <div className="h-4 w-48 bg-slate-200 rounded mt-4 lg:bg-white/12" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-100 rounded-xl lg:bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  const { gameTags, faqs, aboutText } = content;
  const displayedFaqs = showAllFaq ? faqs : faqs.slice(0, 5);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="mt-4 space-y-8 lg:mt-8">
      <div className="space-y-5 lg:grid lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:space-y-0">
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:p-8 lg:shadow-none">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#003D99] lg:text-blue-200">Tentang Kami</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900 lg:text-[28px] lg:text-white">Layanan digital untuk kebutuhan top up dan PPOB</h2>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-slate-600 lg:text-[15px] lg:text-slate-300">
            <p>{aboutText}</p>
          </div>

          {gameTags.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-[14px] font-bold text-slate-800 lg:text-white">Top Up Game</h3>
              <div className="flex flex-wrap gap-2">
                {gameTags.map((tag, idx) => (
                  <Link
                    key={idx}
                    href={tag.href}
                    className="rounded-lg bg-purple-50 px-4 py-2 text-[13px] font-medium text-purple-600 transition-colors hover:bg-purple-100 lg:border lg:border-white/10 lg:bg-white/8 lg:text-slate-100 lg:hover:bg-white/12"
                  >
                    {tag.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {faqs.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:p-8 lg:shadow-none">
            <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#003D99] lg:text-blue-200">FAQ</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900 lg:text-[28px] lg:text-white">Paling Sering Ditanyakan</h2>
              </div>
              <p className="max-w-md text-sm text-slate-500 lg:text-right lg:text-slate-300">
                Temukan jawaban untuk pertanyaan umum seputar layanan kami.
              </p>
            </div>

            <div className="space-y-3">
              {displayedFaqs.map((faq, idx) => (
                <div key={idx} className="overflow-hidden rounded-xl border border-slate-200 lg:border-white/10 lg:bg-white/[0.03]">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50 lg:hover:bg-white/[0.06]"
                  >
                    <span className="pr-4 text-[12px] font-semibold text-purple-600 lg:text-[13px] lg:text-white">{faq.question}</span>
                    <svg
                      className={`h-5 w-5 flex-shrink-0 text-purple-600 transition-transform duration-300 lg:text-blue-200 ${
                        openFaq === idx ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      openFaq === idx ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <div className="px-4 pb-4 text-sm leading-relaxed text-slate-600 lg:text-slate-300">{faq.answer}</div>
                  </div>
                </div>
              ))}
            </div>

            {!showAllFaq && faqs.length > 5 && (
              <div className="mt-6 text-center lg:text-left">
                <button
                  onClick={() => setShowAllFaq(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#003D99] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#002766] lg:bg-white lg:text-[#171D25] lg:hover:bg-slate-100"
                >
                  Baca Selengkapnya
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            {showAllFaq && (
              <div className="mt-6 text-center lg:text-left">
                <button
                  onClick={() => {
                    setShowAllFaq(false);
                    setOpenFaq(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#003D99] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#002766] lg:bg-white lg:text-[#171D25] lg:hover:bg-slate-100"
                >
                  Tampilkan Lebih Sedikit
                  <svg className="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
