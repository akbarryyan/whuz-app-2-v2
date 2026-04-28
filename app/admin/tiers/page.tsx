"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface UserTier {
  id: string;
  name: string;
  label: string;
  description: string | null;
  marginMultiplier: number;
  minOrders: number;
  isDefault: boolean;
  sortOrder: number;
  _count: { users: number };
}

const EMPTY_FORM = {
  label: "",
  description: "",
  marginMultiplier: 1.0,
  minOrders: 0,
  isDefault: false,
};

const MULTIPLIER_PRESETS = [
  { label: "100% (harga normal)", value: 1.0 },
  { label: "90% (diskon 10%)", value: 0.9 },
  { label: "80% (diskon 20%)", value: 0.8 },
  { label: "70% (diskon 30%)", value: 0.7 },
  { label: "60% (diskon 40%)", value: 0.6 },
  { label: "50% (diskon 50%)", value: 0.5 },
];

export default function TiersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tiers, setTiers] = useState<UserTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tiers");
      const data = await res.json();
      if (data.success) setTiers(data.data.map((t: UserTier) => ({ ...t, marginMultiplier: Number(t.marginMultiplier) })));
      else toast.error("Gagal memuat tier");
    } catch { toast.error("Tidak dapat terhubung ke server"); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(tier: UserTier) {
    setEditId(tier.id);
    setForm({
      label: tier.label,
      description: tier.description ?? "",
      marginMultiplier: Number(tier.marginMultiplier),
      minOrders: tier.minOrders ?? 0,
      isDefault: tier.isDefault,
    });
    setShowForm(true);
  }

  async function submit() {
    if (!form.label.trim()) { toast.error("Label wajib diisi"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/tiers/${editId}` : "/api/admin/tiers";
      const method = editId ? "PUT" : "POST";
      const body = editId
        ? {
            label: form.label,
            description: form.description,
            marginMultiplier: form.marginMultiplier,
            minOrders: form.minOrders,
            isDefault: form.isDefault,
          }
        : {
            name: form.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
            label: form.label,
            description: form.description,
            marginMultiplier: form.marginMultiplier,
            minOrders: form.minOrders,
            isDefault: form.isDefault,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? "Tier diperbarui" : "Tier ditambahkan");
        setShowForm(false);
        load();
      } else {
        toast.error(data.error ?? "Gagal menyimpan");
      }
    } catch { toast.error("Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  async function deleteTier(tier: UserTier) {
    if (tier._count.users > 0) {
      toast.error(`Tidak bisa hapus — ${tier._count.users} user masih di tier ini`);
      return;
    }
    if (tier.isDefault) { toast.error("Tidak bisa hapus tier default"); return; }
    if (!confirm(`Hapus tier "${tier.label}"?`)) return;

    try {
      const res = await fetch(`/api/admin/tiers/${tier.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Tier dihapus"); load(); }
      else toast.error(data.error ?? "Gagal menghapus");
    } catch { toast.error("Gagal menghapus"); }
  }

  const tierColors: Record<string, string> = {
    member:   "bg-slate-100 text-slate-600 border-slate-200",
    reseller: "bg-blue-50 text-blue-600 border-blue-200",
    agent:    "bg-purple-50 text-purple-600 border-purple-200",
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Title */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">🏷️ Tier Harga</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Kelola tier pengguna.<span className="hidden sm:inline"> Tiap tier mendapat harga berbeda berdasarkan multiplier margin.</span>
              </p>
            </div>
            <button
              onClick={openAdd}
              className="w-full sm:w-auto flex-shrink-0 px-4 py-2 rounded-xl bg-[#003D99] text-white text-xs font-bold hover:bg-[#002d73] transition-colors"
            >
              + Tambah Tier
            </button>
          </div>

          {/* Info box */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 text-[11px] text-amber-700 leading-relaxed">
            <strong>Formula harga:</strong> Harga jual = Harga modal + (Margin produk × Multiplier tier)<br />
            Contoh: modal Rp10.000, margin Rp5.000, multiplier 0.8 → harga jual = Rp10.000 + Rp4.000 = <strong>Rp14.000</strong>
          </div>

          {/* Tier cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse">
                  <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
                  <div className="h-8 w-16 bg-slate-100 rounded mb-3" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiers.map((tier) => {
                const color = tierColors[tier.name] ?? "bg-slate-100 text-slate-600 border-slate-200";
                const discountPct = Math.round((1 - tier.marginMultiplier) * 100);
                return (
                  <div key={tier.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${color}`}>
                            {tier.label}
                          </span>
                          {tier.isDefault && (
                            <span className="text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5">{tier.description ?? "—"}</p>
                      </div>
                    </div>

                    {/* Multiplier display */}
                    <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
                      <p className="text-2xl font-black text-slate-800">{(tier.marginMultiplier * 100).toFixed(0)}%</p>
                      <p className="text-[11px] text-slate-400">dari margin</p>
                      {discountPct > 0 && (
                        <p className="text-[10px] font-bold text-green-600 mt-0.5">hemat {discountPct}%</p>
                      )}
                    </div>

                    {/* Min orders threshold */}
                    <div className="text-center">
                      <p className="text-[11px] text-slate-400">
                        {tier.minOrders > 0
                          ? `🔄 Auto-naik setelah ${tier.minOrders} transaksi`
                          : "⚙️ Manual saja"}
                      </p>
                    </div>

                    {/* User count */}
                    <p className="text-[11px] text-slate-400 text-center">
                      👥 {tier._count.users} user
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => openEdit(tier)}
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTier(tier)}
                        disabled={tier.isDefault || tier._count.users > 0}
                        className="flex-1 py-2 rounded-xl border border-red-100 text-xs font-semibold text-red-400 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {editId ? "Edit Tier" : "Tambah Tier"}
              </h3>
              <button onClick={() => setShowForm(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Label</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="cth: Reseller, Gold Member"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Deskripsi (opsional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="cth: Pengguna aktif transaksi 100x+"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Multiplier Margin</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {MULTIPLIER_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setForm((f) => ({ ...f, marginMultiplier: p.value }))}
                      className={`py-2 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                        form.marginMultiplier === p.value
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-purple-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={form.marginMultiplier}
                    onChange={(e) => setForm((f) => ({ ...f, marginMultiplier: Number(e.target.value) }))}
                    className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                  />
                  <span className="text-xs text-slate-400">0.0 – 1.0 &nbsp;(0.8 = diskon 20% dari margin)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Min. Transaksi (Auto-Upgrade)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.minOrders}
                  onChange={(e) => setForm((f) => ({ ...f, minOrders: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">0 = manual saja · &gt;0 = naik otomatis setelah N transaksi sukses</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-xs text-slate-600">Jadikan tier default (untuk user baru)</span>
              </label>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button
                onClick={submit}
                disabled={saving || !form.label.trim()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-40 transition-colors"
              >
                {saving ? "Menyimpan..." : editId ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
