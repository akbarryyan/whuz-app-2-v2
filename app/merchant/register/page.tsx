"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

interface FormState {
  displayName: string;
  slug: string;
  description: string;
  profileImageUrl: string;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default function MerchantRegisterPage() {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [siteName, setSiteName] = useState("Website");
  const [form, setForm] = useState<FormState>({
    displayName: "",
    slug: "",
    description: "",
    profileImageUrl: "",
  });

  useEffect(() => {
    fetch("/api/site-branding")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.site_name) {
          setSiteName(data.data.site_name);
        }
      })
      .catch(() => {});

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.isLoggedIn) {
          router.replace("/login");
          return;
        }

        if (data?.seller?.isActive) {
          router.replace("/merchant/dashboard");
          return;
        }

        setForm((prev) => ({
          ...prev,
          displayName: data?.user?.name ? `${data.user.name} Store` : prev.displayName,
        }));
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleDisplayNameChange = (value: string) => {
    setForm((prev) => {
      const shouldAutofillSlug = !prev.slug || prev.slug === slugify(prev.displayName);
      return {
        ...prev,
        displayName: value,
        slug: shouldAutofillSlug ? slugify(value) : prev.slug,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.displayName.trim()) {
      toast.error("Nama toko merchant wajib diisi.");
      return;
    }

    const payload = {
      displayName: form.displayName.trim(),
      slug: slugify(form.slug || form.displayName),
      description: form.description.trim() || undefined,
      profileImageUrl: form.profileImageUrl.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/seller/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal membuat toko merchant");
      }

      toast.success("Toko merchant berhasil dibuat.");
      router.replace("/merchant/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal membuat toko merchant";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5]`}>
        <div className="w-full max-w-[480px] min-h-screen bg-white shadow-2xl">
          <div className="h-14 w-full bg-[#003D99]" />
          <div className="space-y-4 px-4 pt-6">
            <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5]`}>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="relative w-full max-w-[480px] min-h-screen bg-white shadow-2xl flex flex-col">
        <AppHeader onBack={() => router.back()} />
        <div className="px-6 pt-20 pb-10 relative overflow-hidden" style={{ backgroundColor: "#003D99" }}>
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute top-14 -right-4 h-16 w-16 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10" />

          <div className="relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-100/80">Perjalanan Merchant</p>
            <h1 className="mt-3 text-xl font-bold text-white">Daftarkan merchant kamu</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-5 -mt-1 pb-28 bg-[radial-gradient(circle_at_top,_#dbeafe,_#ffffff_55%)]">
          <div className="rounded-[28px] bg-slate-950 px-5 py-6 text-white shadow-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300">Daftar Merchant</p>
            <h2 className="mt-3 text-2xl font-bold">Buka toko kamu di {siteName}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Setelah toko aktif, kamu bisa pilih produk, atur harga jual sendiri, dan dapat saldo dari penjualan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Nama Toko</span>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="Contoh: Akbar Topup Store"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Slug Toko</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                  placeholder="contoh: akbar-topup-store"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:bg-white"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Link toko kamu akan menjadi `/seller/{slugify(form.slug || form.displayName || "nama-toko")}`
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Deskripsi Toko</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Jelaskan singkat toko kamu, misalnya fokus game atau layanan unggulan."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">URL Gambar Profile Merchant</span>
                <input
                  type="url"
                  value={form.profileImageUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, profileImageUrl: e.target.value }))}
                  placeholder="https://example.com/profile-merchant.png"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:bg-white"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Opsional. Gambar ini akan tampil di daftar merchant dan halaman storefront toko.
                </p>
              </label>
            </div>

            <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-semibold text-emerald-800">Setelah daftar, kamu bisa langsung:</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-700">
                <li>Atur harga jual sendiri</li>
                <li>Pilih produk yang mau dijual</li>
                <li>Lihat transaksi dan saldo merchant</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-2xl bg-[#003D99] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              {submitting ? "Membuat Toko..." : "Buka Toko Merchant"}
            </button>
          </form>
        </div>

        <BottomNavigation />
      </div>
    </div>
  );
}
