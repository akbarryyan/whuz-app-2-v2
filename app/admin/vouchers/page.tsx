"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface VoucherRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscount: number | null;
  minPurchase: number;
  quota: number | null;
  usedCount: number;
  perUserLimit: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  totalClaims: number;
  createdAt: string;
}

const EMPTY_FORM = {
  code: "",
  title: "",
  description: "",
  discountType: "PERCENT" as "PERCENT" | "FIXED",
  discountValue: 0,
  maxDiscount: "",
  minPurchase: 0,
  quota: "",
  perUserLimit: 1,
  startDate: "",
  endDate: "",
  isActive: true,
};

type FormState = typeof EMPTY_FORM;

function formatRp(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function toInputDate(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function toISOOrNull(s: string): string | null {
  if (!s) return null;
  try { return new Date(s).toISOString(); } catch { return null; }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export default function AdminVouchersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const toast = useToast();

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vouchers");
      const data = await res.json();
      if (data.success) setVouchers(data.data);
      else toast.error("Gagal memuat voucher");
    } catch {
      toast.error("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (v: VoucherRow) => {
    setEditingId(v.id);
    setForm({
      code: v.code,
      title: v.title,
      description: v.description ?? "",
      discountType: v.discountType,
      discountValue: v.discountValue,
      maxDiscount: v.maxDiscount?.toString() ?? "",
      minPurchase: v.minPurchase,
      quota: v.quota?.toString() ?? "",
      perUserLimit: v.perUserLimit,
      startDate: toInputDate(v.startDate),
      endDate: toInputDate(v.endDate),
      isActive: v.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.code || !form.title) { toast.error("Kode dan judul wajib diisi."); return; }
    if (form.discountValue <= 0) { toast.error("Nilai diskon harus lebih dari 0."); return; }
    if (form.discountType === "PERCENT" && form.discountValue > 100) { toast.error("Persen diskon maks. 100%."); return; }

    setSaving(true);
    try {
      const payload = {
        code: form.code,
        title: form.title,
        description: form.description || null,
        discountType: form.discountType,
        discountValue: form.discountValue,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        minPurchase: form.minPurchase,
        quota: form.quota ? Number(form.quota) : null,
        perUserLimit: form.perUserLimit,
        startDate: toISOOrNull(form.startDate),
        endDate: toISOOrNull(form.endDate),
        isActive: form.isActive,
      };

      const res = await fetch(
        editingId ? `/api/admin/vouchers/${editingId}` : "/api/admin/vouchers",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? "Voucher diperbarui." : "Voucher berhasil dibuat.");
        setModalOpen(false);
        loadVouchers();
      } else {
        toast.error(typeof data.error === "string" ? data.error : "Gagal menyimpan voucher.");
      }
    } catch {
      toast.error("Koneksi bermasalah.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/vouchers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Voucher dihapus."); setDeleteConfirmId(null); loadVouchers(); }
      else toast.error(data.error ?? "Gagal menghapus.");
    } catch { toast.error("Koneksi bermasalah."); }
  };

  const handleToggle = async (v: VoucherRow) => {
    try {
      const res = await fetch(`/api/admin/vouchers/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !v.isActive }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`Voucher ${!v.isActive ? "diaktifkan" : "dinonaktifkan"}.`); loadVouchers(); }
      else toast.error(data.error ?? "Gagal update.");
    } catch { toast.error("Koneksi bermasalah."); }
  };

  const filtered = search
    ? vouchers.filter((v) =>
        v.code.toLowerCase().includes(search.toLowerCase()) ||
        v.title.toLowerCase().includes(search.toLowerCase())
      )
    : vouchers;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">🎟️ Manajemen Voucher</h1>
              <p className="text-sm text-slate-500 mt-0.5">Kelola kode voucher diskon untuk pengguna</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Buat Voucher
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Voucher", value: vouchers.length, color: "text-[#2563eb]" },
              { label: "Aktif", value: vouchers.filter((v) => v.isActive).length, color: "text-emerald-600" },
              { label: "Tidak Aktif", value: vouchers.filter((v) => !v.isActive).length, color: "text-slate-400" },
              { label: "Total Klaim", value: vouchers.reduce((a, v) => a + v.totalClaims, 0), color: "text-purple-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-700">Daftar Voucher</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Voucher nonaktif tidak ditampilkan ke pengguna.</p>
              </div>
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kode / judul..."
                  className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-blue-400 w-44"
                />
              </div>
            </div>
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-400 text-sm">
                    {vouchers.length === 0 ? "Belum ada voucher. Buat yang pertama!" : "Tidak ada hasil pencarian."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="text-left px-4 py-3 font-medium">Kode / Judul</th>
                        <th className="text-left px-4 py-3 font-medium">Diskon</th>
                        <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Kuota</th>
                        <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Klaim</th>
                        <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Berlaku</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-right px-4 py-3 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3">
                            <p className="font-bold font-mono text-slate-800 text-xs tracking-wider">{v.code}</p>
                            <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[160px]">{v.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              v.discountType === "PERCENT" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {v.discountType === "PERCENT" ? `${v.discountValue}%` : formatRp(v.discountValue)}
                            </span>
                            {v.minPurchase > 0 && (
                              <p className="text-[10px] text-slate-400 mt-0.5">Min. {formatRp(v.minPurchase)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                            {v.quota === null ? "∞ Tak terbatas" : `${v.usedCount} / ${v.quota}`}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                            {v.totalClaims}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">
                            {v.endDate ? (
                              <span>– {formatDate(v.endDate)}</span>
                            ) : (
                              <span className="text-slate-300">Tidak ada</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggle(v)}
                              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition ${
                                v.isActive
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${v.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {v.isActive ? "Aktif" : "Nonaktif"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEdit(v)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(v.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                                title="Hapus"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* ===== MODAL CREATE / EDIT ===== */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? "Edit Voucher" : "Buat Voucher Baru"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Code + Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kode Voucher *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                    placeholder="CONTOH10"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Judul *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Diskon Top Up 10%"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Opsional – penjelasan singkat untuk pengguna"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                />
              </div>

              {/* Discount type & value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipe Diskon *</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as "PERCENT" | "FIXED" }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                  >
                    <option value="PERCENT">Persen (%)</option>
                    <option value="FIXED">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Nilai {form.discountType === "PERCENT" ? "(%)" : "(Rp)"} *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={form.discountType === "PERCENT" ? 100 : undefined}
                    value={form.discountValue}
                    onChange={(e) => setForm((p) => ({ ...p, discountValue: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                    required
                  />
                </div>
              </div>

              {/* Max discount + Min purchase */}
              <div className="grid grid-cols-2 gap-3">
                {form.discountType === "PERCENT" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Maks. Diskon (Rp)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.maxDiscount}
                      onChange={(e) => setForm((p) => ({ ...p, maxDiscount: e.target.value }))}
                      placeholder="Kosong = tidak ada batas"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Min. Pembelian (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minPurchase}
                    onChange={(e) => setForm((p) => ({ ...p, minPurchase: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                  />
                </div>
              </div>

              {/* Quota + per user limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kuota Total</label>
                  <input
                    type="number"
                    min={1}
                    value={form.quota}
                    onChange={(e) => setForm((p) => ({ ...p, quota: e.target.value }))}
                    placeholder="Kosong = tak terbatas"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Maks. per Pengguna</label>
                  <input
                    type="number"
                    min={1}
                    value={form.perUserLimit}
                    onChange={(e) => setForm((p) => ({ ...p, perUserLimit: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                  />
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mulai</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Berakhir</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? "bg-emerald-500" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : ""}`} />
                </button>
                <span className="text-sm font-medium text-slate-700">Aktif</span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] py-3 text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {editingId ? "Simpan Perubahan" : "Buat Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM ===== */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null); }}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Hapus Voucher?</h3>
            <p className="text-sm text-slate-400 text-center mb-6">
              Semua data klaim voucher ini juga akan dihapus. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 py-3 text-sm font-bold text-white transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
