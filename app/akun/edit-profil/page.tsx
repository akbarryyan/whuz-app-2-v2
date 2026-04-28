"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

interface UserData {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
}

export default function EditProfilPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.isLoggedIn) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        setName(data.user.name ?? "");
        setPhone(data.user.phone ?? "");
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const getInitials = (n: string | null) => {
    if (!n) return "U";
    return n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

  const handleSave = async () => {
    if (saving) return;
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Nama minimal 2 karakter.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) => prev ? { ...prev, name: name.trim(), phone: phone.trim() || null } : prev);
        toast.success("Profil berhasil diperbarui!");
      } else {
        toast.error(data.message || "Gagal memperbarui profil.");
      }
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5]`}>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="relative w-full max-w-[480px] min-h-screen bg-[#F5F5F5] shadow-2xl flex flex-col">
        <AppHeader onBack={() => router.back()} />
        <div className="h-[60px]" />

        {loading ? (
          <div className="flex-1 px-4 pt-6 space-y-4">
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-20 h-20 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="bg-white rounded-2xl p-4 space-y-4">
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          </div>
        ) : !user ? null : (
          <div className="flex-1 pb-24">
            {/* Avatar + info header */}
            <div className="bg-white px-4 pt-6 pb-5 flex flex-col items-center border-b border-slate-100">
              <div className="w-20 h-20 rounded-full bg-[#003D99] flex items-center justify-center text-2xl font-bold text-white shadow-lg border-3 border-white">
                {getInitials(user.name)}
              </div>
              <p className="mt-3 text-base font-bold text-slate-800">{user.name || "Member"}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full mt-2">
                Bergabung {formatDate(user.createdAt)}
              </span>
            </div>

            {/* Form */}
            <div className="px-4 pt-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-700 px-1">Informasi Profil</h2>

              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-1">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={user.email ?? ""}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-400 cursor-not-allowed"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 px-1">Email tidak dapat diubah</p>
              </div>

              {/* Nama */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#003D99] focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              {/* No HP */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-1">
                  Nomor HP <span className="normal-case font-normal">(opsional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#003D99] focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              {/* Role (read-only info) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-1">
                  Role
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={user.role === "ADMIN" ? "Administrator" : "Member"}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-2 py-3.5 rounded-xl bg-[#003D99] text-white text-sm font-bold hover:bg-[#002d73] disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </button>
            </div>
          </div>
        )}

        <BottomNavigation />
      </div>
    </div>
  );
}
