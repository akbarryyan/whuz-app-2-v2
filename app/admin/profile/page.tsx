"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface AdminProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  // Edit profile state
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const toast = useToast();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/profile");
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setEditEmail(data.data.email ?? "");
        setEditName(data.data.name ?? "");
        setEditPhone(data.data.phone ?? "");
      } else {
        toast.error("Gagal memuat profil");
      }
    } catch {
      toast.error("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Save profile ───────────────────────────────────────────────────────────
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editEmail.trim()) { toast.error("Email wajib diisi"); return; }
    if (!editName.trim()) { toast.error("Nama wajib diisi"); return; }
    if (editName.trim().length < 2) { toast.error("Nama minimal 2 karakter"); return; }

    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editEmail.trim(), name: editName.trim(), phone: editPhone.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev) => prev ? { ...prev, ...data.data } : prev);
        toast.success("Profil berhasil diperbarui");
      } else {
        toast.error(data.error ?? "Gagal menyimpan profil");
      }
    } catch {
      toast.error("Gagal menyimpan profil");
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Change password ────────────────────────────────────────────────────────
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Semua field wajib diisi");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Password berhasil diubah");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.message ?? "Gagal mengubah password");
      }
    } catch {
      toast.error("Gagal mengubah password");
    } finally {
      setSavingPassword(false);
    }
  }

  const initial = (profile?.name || profile?.email || "A").charAt(0).toUpperCase();
  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const passwordStrength = (pw: string) => {
    if (!pw) return null;
    if (pw.length < 6) return { label: "Terlalu pendek", color: "bg-red-400", width: "w-1/4" };
    if (pw.length < 8) return { label: "Lemah", color: "bg-orange-400", width: "w-2/4" };
    if (pw.length < 12 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { label: "Kuat", color: "bg-green-500", width: "w-full" };
    if (pw.length >= 8) return { label: "Cukup", color: "bg-yellow-400", width: "w-3/4" };
    return null;
  };
  const strength = passwordStrength(newPassword);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Title */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">👤 Profil Admin</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Kelola informasi akun dan keamanan.
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                  <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
                  <div className="h-10 w-full bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3 lg:items-start">

              {/* ── Left: Profile card ────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center gap-4 text-center">
                {/* Avatar */}
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2563eb] text-3xl font-bold text-white shadow-md">
                  {initial}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-800">{profile?.name ?? "—"}</h2>
                  <p className="text-sm text-slate-400 mt-0.5">{profile?.email}</p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="text-[11px] font-bold bg-[#2563eb] text-white px-3 py-1 rounded-full">
                    {profile?.role}
                  </span>
                  <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${
                    profile?.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-600"
                  }`}>
                    {profile?.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <div className="w-full divide-y divide-slate-100 text-left">
                  <div className="py-3">
                    <p className="text-[11px] text-slate-400 font-medium">Nomor HP</p>
                    <p className="text-sm text-slate-700 mt-0.5 font-medium">
                      {profile?.phone ?? <span className="text-slate-300 italic">Belum diisi</span>}
                    </p>
                  </div>
                  <div className="py-3">
                    <p className="text-[11px] text-slate-400 font-medium">Bergabung</p>
                    <p className="text-sm text-slate-700 mt-0.5 font-medium">{joinDate}</p>
                  </div>
                  <div className="py-3">
                    <p className="text-[11px] text-slate-400 font-medium">ID Akun</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono break-all">{profile?.id}</p>
                  </div>
                </div>
              </div>

              {/* ── Right: Forms ──────────────────────────────────────── */}
              <div className="flex flex-col gap-4 lg:col-span-2">

                {/* Edit Profile */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700">✏️ Edit Profil</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Perbarui nama dan nomor HP akun admin.</p>
                  </div>
                  <form onSubmit={saveProfile} className="px-5 py-4 space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="email@contoh.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Nama <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nama lengkap"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nomor HP</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="w-full py-2.5 rounded-xl bg-[#2563eb] text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {savingProfile ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Menyimpan...
                        </span>
                      ) : "💾 Simpan Profil"}
                    </button>
                  </form>
                </div>

                {/* Change Password */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700">🔒 Ganti Password</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Password baru minimal 6 karakter.</p>
                  </div>
                  <form onSubmit={changePassword} className="px-5 py-4 space-y-4">
                    {/* Current password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Password Saat Ini <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPw ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPw ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* New password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Password Baru <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPw ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPw ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {/* Password strength indicator */}
                      {strength && (
                        <div className="mt-2">
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                          </div>
                          <p className={`text-[10px] mt-1 font-medium ${
                            strength.color.includes("red") ? "text-red-500"
                            : strength.color.includes("orange") ? "text-orange-500"
                            : strength.color.includes("yellow") ? "text-yellow-600"
                            : "text-green-600"
                          }`}>{strength.label}</p>
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Konfirmasi Password Baru <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPw ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 transition ${
                            confirmPassword && newPassword !== confirmPassword
                              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                              : confirmPassword && newPassword === confirmPassword
                              ? "border-emerald-400 focus:border-emerald-400 focus:ring-emerald-100"
                              : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPw ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[10px] text-red-500 mt-1">Password tidak cocok</p>
                      )}
                      {confirmPassword && newPassword === confirmPassword && (
                        <p className="text-[10px] text-emerald-600 mt-1">✓ Password cocok</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={savingPassword || (!!confirmPassword && newPassword !== confirmPassword)}
                      className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors"
                    >
                      {savingPassword ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Menyimpan...
                        </span>
                      ) : "🔒 Ubah Password"}
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
