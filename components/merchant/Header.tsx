"use client";

interface MerchantHeaderProps {
  title: string;
  subtitle: string;
  onMenuClick: () => void;
}

export default function MerchantHeader({ title, subtitle, onMenuClick }: MerchantHeaderProps) {
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  return (
    <header className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white transition hover:bg-emerald-600 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-semibold sm:text-lg">{title}</h1>
            <p suppressHydrationWarning className="text-xs text-slate-400">{formattedDate}</p>
          </div>
        </div>

        <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 sm:inline-flex">
          Merchant Area
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{subtitle}</p>
        <a
          href="/akun"
          className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Kembali ke Akun
        </a>
      </div>
    </header>
  );
}
