import Image from "next/image";
import Link from "next/link";
import { getAllSiteConfig, getSiteName } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sedang dalam Pemeliharaan",
  description: "Situs sedang dalam pemeliharaan. Kami akan segera kembali.",
};

export default async function MaintenancePage() {
  const [raw, resolvedSiteName] = await Promise.all([
    getAllSiteConfig().catch(() => ({} as Record<string, string>)),
    getSiteName().catch(() => "Website"),
  ]);

  const logoUrl: string = raw["footer_logo_url"] || "";
  const siteName: string = raw["site_name"] || raw["footer_company_name"] || resolvedSiteName;
  const contactEmail: string = raw["footer_contact_email"] || "support@example.com";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4">
      {/* Card */}
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl text-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={160}
              height={56}
              className="h-14 w-auto object-contain"
              unoptimized
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563eb] text-white">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
          <svg className="h-10 w-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
            />
          </svg>
        </div>

        {/* Text */}
        <h1 className="text-2xl font-bold text-slate-800">Sedang dalam Pemeliharaan</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Kami sedang melakukan pembaruan sistem untuk memberikan pengalaman yang lebih baik.
          Silakan coba beberapa saat lagi.
        </p>

        {/* Divider */}
        <div className="my-6 h-px bg-slate-100" />

        {/* Contact */}
        <p className="text-xs text-slate-400">
          Ada pertanyaan mendesak? Hubungi kami di{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="font-medium text-[#2563eb] hover:underline"
          >
            {contactEmail}
          </a>
        </p>

        {/* Admin link */}
        <div className="mt-6">
          <Link
            href="/admin"
            className="text-xs text-slate-300 hover:text-slate-400 transition"
          >
            Admin Login →
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-8 text-xs text-slate-400">{siteName}</p>
    </div>
  );
}
