"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function InfoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const fallbackTitle = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const [html, setHtml] = useState("");
  const [title, setTitle] = useState(fallbackTitle);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/page-content/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setHtml(d.data.content ?? "");
          setTitle(d.data.title ?? fallbackTitle);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fallbackTitle, slug]);

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}>
      <div className="relative w-full max-w-[480px] min-h-screen bg-[#F5F5F5] shadow-2xl flex flex-col lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        <AppHeader onBack={() => router.back()} />
        <div className="h-[60px]" />

        {/* Title bar */}
        <div className="bg-white px-4 py-3 border-b border-slate-100 lg:mx-auto lg:w-full lg:max-w-5xl lg:border-white/10 lg:bg-white/[0.04] lg:px-6">
          <h1 className="text-base font-bold text-slate-800 lg:text-white">{title}</h1>
        </div>

        {/* Content */}
        <div className="flex-1 pb-24 lg:pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-[#003D99] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : html ? (
            <div className="bg-white px-4 py-5 lg:mx-auto lg:w-full lg:max-w-5xl lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:px-6 lg:py-6">
              <article
                className="prose prose-sm max-w-none
                  prose-headings:text-slate-800 prose-headings:font-bold prose-headings:mb-2 prose-headings:mt-4
                  prose-h2:text-[15px] prose-h3:text-[14px]
                  prose-p:text-[13px] prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-2
                  prose-li:text-[13px] prose-li:text-slate-700
                  prose-a:text-[#003D99] prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-slate-800
                  prose-img:rounded-xl prose-img:shadow-sm
                  lg:prose-headings:text-white lg:prose-p:text-slate-200 lg:prose-li:text-slate-200 lg:prose-a:text-blue-300 lg:prose-strong:text-white
                  [&_*]:text-slate-700 lg:[&_*]:text-slate-200"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-20 px-6 text-center lg:mx-auto lg:w-full lg:max-w-5xl lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:px-8 lg:py-20">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 lg:bg-white/5">
                <svg className="w-8 h-8 text-slate-300 lg:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-500 lg:text-white">Belum ada konten</p>
              <p className="text-xs text-slate-400 mt-1">Halaman ini belum memiliki konten.</p>
            </div>
          )}
        </div>

        <BottomNavigation />
      </div>
    </div>
  );
}
