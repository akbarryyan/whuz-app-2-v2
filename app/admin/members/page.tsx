"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface TierInfo {
  id: string;
  name: string;
  label: string;
  marginMultiplier: number;
  isDefault?: boolean;
}

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  tierId: string | null;
  tier: TierInfo | null;
  balance: number;
  totalOrders: number;
}

const TIER_COLORS: Record<string, string> = {
  member:   "bg-slate-100 text-slate-600",
  reseller: "bg-blue-50 text-blue-600",
  agent:    "bg-purple-50 text-purple-600",
};

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function MembersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [changingTierId, setChangingTierId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, tiersRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/tiers"),
      ]);
      const [usersData, tiersData] = await Promise.all([usersRes.json(), tiersRes.json()]);
      if (usersData.success) setMembers(usersData.data);
      if (tiersData.success) setTiers(tiersData.data.map((t: TierInfo & { marginMultiplier: unknown }) => ({
        ...t,
        marginMultiplier: Number(t.marginMultiplier),
      })));
    } catch { toast.error("Gagal memuat data"); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeTier(userId: string, tierId: string | null) {
    setChangingTierId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      });
      const data = await res.json();
      if (data.success) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === userId
              ? { ...m, tierId: data.data.tierId, tier: data.data.tier ? { ...data.data.tier, marginMultiplier: Number(data.data.tier.marginMultiplier) } : null }
              : m
          )
        );
        toast.success("Tier berhasil diubah");
      } else {
        toast.error(data.error ?? "Gagal mengubah tier");
      }
    } catch { toast.error("Gagal mengubah tier"); }
    finally { setChangingTierId(null); }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error ?? "Gagal mengimpor file Excel.");
        return;
      }

      await load();
      toast.success(
        `Import selesai. ${data.data.createdCount} user dibuat, ${data.data.skippedCount} dilewati.`
      );
    } catch {
      toast.error("Gagal mengimpor file Excel.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (m.name ?? "").toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q) ||
      (m.phone ?? "").toLowerCase().includes(q);
    const matchTier = filterTier === "all" ||
      (filterTier === "none" ? !m.tierId : m.tier?.name === filterTier);
    return matchSearch && matchTier;
  });

  // Summary counts — users with no tierId fall back to the default tier
  const noTierCount = members.filter((m) => !m.tierId).length;
  const tierCounts = tiers.reduce<Record<string, number>>((acc, t) => {
    const explicit = members.filter((m) => m.tier?.name === t.name).length;
    acc[t.name] = explicit + (t.isDefault ? noTierCount : 0);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Title */}
          <div>
            <h1 className="text-xl font-bold text-slate-800">👥 Kelola Member</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola tier harga tiap pengguna. Tier menentukan harga jual yang diterima user.
            </p>
          </div>

          {/* Summary */}
          {!loading && (
            <div className="flex flex-wrap gap-2">
              {tiers.map((t) => (
                <div key={t.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${TIER_COLORS[t.name] ?? "bg-slate-100 text-slate-600"} border-transparent`}>
                  {t.label}: {tierCounts[t.name] ?? 0}
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, no. HP..."
              className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
            />
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none transition"
            >
              <option value="all">Semua Tier</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.name}>{t.label}</option>
              ))}
              <option value="none">Tanpa Tier (Default)</option>
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              {importing ? "Mengimpor..." : "Import Excel"}
            </button>
            <a
              href="/api/admin/users/import/template"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Download Template
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
            Format kolom import: <span className="font-semibold text-slate-700">name</span>, <span className="font-semibold text-slate-700">email</span>, <span className="font-semibold text-slate-700">phone</span>, <span className="font-semibold text-slate-700">password</span>, <span className="font-semibold text-slate-700">tier</span>, <span className="font-semibold text-slate-700">is_active</span>.
            Untuk membuat merchant, tambahkan <span className="font-semibold text-slate-700">role</span> bernilai <span className="font-semibold text-slate-700">merchant</span> lalu isi <span className="font-semibold text-slate-700">merchant_name</span> atau <span className="font-semibold text-slate-700">store_name</span>. Kolom opsional merchant: <span className="font-semibold text-slate-700">merchant_slug</span>, <span className="font-semibold text-slate-700">merchant_description</span>, <span className="font-semibold text-slate-700">merchant_is_active</span>.
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">Daftar Member</h2>
              <span className="text-[11px] text-slate-400">{filtered.length} dari {members.length} user</span>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-50">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 bg-slate-200 rounded" />
                      <div className="h-2.5 w-48 bg-slate-100 rounded" />
                    </div>
                    <div className="w-20 h-7 bg-slate-100 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-slate-400">Tidak ada user ditemukan</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map((member) => {
                  const initials = (member.name ?? member.email ?? "?").slice(0, 2).toUpperCase();
                  const tierInfo = member.tier;
                  const tierColor = TIER_COLORS[tierInfo?.name ?? ""] ?? "bg-slate-100 text-slate-600";
                  const isChanging = changingTierId === member.id;

                  // Find effective tier (user's tier or default)
                  const effectiveTier = tierInfo ?? tiers.find((t) => t.isDefault as unknown as boolean);
                  const discountPct = effectiveTier ? Math.round((1 - effectiveTier.marginMultiplier) * 100) : 0;

                  return (
                    <div key={member.id} className="px-4 py-3.5 flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0">
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {member.name ?? "(tanpa nama)"}
                          </p>
                          {member.role === "ADMIN" && (
                            <span className="text-[10px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">Admin</span>
                          )}
                          {tierInfo ? (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tierColor}`}>
                              {tierInfo.label}
                              {discountPct > 0 ? ` −${discountPct}%` : ""}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                              Default {effectiveTier ? `(${effectiveTier.label})` : ""}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400 break-words">
                          {member.email ?? member.phone ?? "—"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                          <span>{member.totalOrders} transaksi</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-semibold text-slate-700">{formatRp(member.balance)}</span>
                          <span className="text-slate-300">•</span>
                          <span>{formatDate(member.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                          Saldo: <span className="text-slate-700">{formatRp(member.balance)}</span>
                        </p>
                      </div>

                      {/* Tier selector */}
                      <div className="flex-shrink-0">
                        {isChanging ? (
                          <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin inline-block" />
                        ) : (
                          <select
                            value={member.tierId ?? ""}
                            onChange={(e) => changeTier(member.id, e.target.value || null)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:border-purple-400 focus:outline-none transition"
                          >
                            <option value="">Default</option>
                            {tiers.map((t) => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
