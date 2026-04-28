"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface PaymentMethodRow {
  id: string;
  key: string;
  label: string;
  group: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

const GROUP_LABELS: Record<string, string> = {
  QRIS: "QRIS / E-Wallet",
  VIRTUAL_ACCOUNT: "Virtual Account",
  OTHER: "Lainnya",
};

export default function AdminPaymentMethodsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // id of item being saved
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const toast = useToast();

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payment-methods");
      const data = await res.json();
      if (data.success) setMethods(data.data);
      else toast.error("Gagal memuat data.");
    } catch {
      toast.error("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMethods(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const toggleActive = async (item: PaymentMethodRow) => {
    setSaving(item.id);
    try {
      const res = await fetch(`/api/admin/payment-methods/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setMethods((prev) => prev.map((m) => m.id === item.id ? { ...m, isActive: !item.isActive } : m));
        toast.success(`${item.label} ${!item.isActive ? "diaktifkan" : "dinonaktifkan"}.`);
      } else toast.error(data.error ?? "Gagal memperbarui.");
    } catch { toast.error("Gagal memperbarui."); } finally { setSaving(null); }
  };

  const startEdit = (item: PaymentMethodRow) => {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditImageUrl(item.imageUrl ?? "");
    setEditGroup(item.group);
    setEditSortOrder(item.sortOrder);
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (id: string) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel.trim(),
          imageUrl: editImageUrl.trim() || null,
          group: editGroup,
          sortOrder: Number(editSortOrder),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMethods((prev) => prev.map((m) => m.id === id ? { ...m, label: editLabel.trim(), imageUrl: editImageUrl.trim() || null, group: editGroup, sortOrder: Number(editSortOrder) } : m));
        toast.success("Berhasil disimpan.");
        setEditingId(null);
      } else toast.error(data.error ?? "Gagal menyimpan.");
    } catch { toast.error("Gagal menyimpan."); } finally { setSaving(null); }
  };

  // Group methods by group field
  const grouped: Record<string, PaymentMethodRow[]> = {};
  for (const m of methods) {
    if (!grouped[m.group]) grouped[m.group] = [];
    grouped[m.group].push(m);
  }
  const groupOrder = ["QRIS", "VIRTUAL_ACCOUNT", "OTHER"];
  const sortedGroups = [...new Set([...groupOrder, ...Object.keys(grouped)])].filter((g) => grouped[g]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Page title */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Metode Pembayaran</h1>
              <p className="text-sm text-slate-500 mt-0.5">Kelola metode pembayaran aktif yang tampil di halaman produk.</p>
            </div>
            <button
              onClick={fetchMethods}
              className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Memuat data...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedGroups.map((group) => (
                <div key={group} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {/* Group header */}
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {GROUP_LABELS[group] ?? group}
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {grouped[group].map((item) => (
                      <div key={item.id}>
                        {editingId === item.id ? (
                          /* ---- Edit row ---- */
                          <div className="px-5 py-4 bg-blue-50 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Label</label>
                                <input
                                  value={editLabel}
                                  onChange={(e) => setEditLabel(e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Group</label>
                                <select
                                  value={editGroup}
                                  onChange={(e) => setEditGroup(e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                >
                                  <option value="QRIS">QRIS / E-Wallet</option>
                                  <option value="VIRTUAL_ACCOUNT">Virtual Account</option>
                                  <option value="OTHER">Lainnya</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">URL Gambar (logo)</label>
                                <input
                                  value={editImageUrl}
                                  onChange={(e) => setEditImageUrl(e.target.value)}
                                  placeholder="https://..."
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Urutan (Sort Order)</label>
                                <input
                                  type="number"
                                  value={editSortOrder}
                                  onChange={(e) => setEditSortOrder(Number(e.target.value))}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                />
                              </div>
                            </div>
                            {/* Preview image */}
                            {editImageUrl && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Preview:</span>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editImageUrl} alt="preview" className="h-8 w-auto object-contain rounded border border-slate-200 bg-white px-1" />
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(item.id)}
                                disabled={saving === item.id}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                              >
                                {saving === item.id ? "Menyimpan..." : "Simpan"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ---- Display row ---- */
                          <div className="flex items-center gap-4 px-5 py-3.5">
                            {/* Icon */}
                            <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {item.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.imageUrl} alt={item.label} className="w-full h-full object-contain p-1" />
                              ) : (
                                <span className="text-[9px] font-black text-slate-500 text-center leading-tight px-1">
                                  {item.key.toUpperCase().replace(/_VA$/, "").slice(0, 4)}
                                </span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{item.key}</p>
                            </div>

                            {/* Sort order badge */}
                            <span className="text-[11px] text-slate-400 font-mono w-8 text-center flex-shrink-0">
                              #{item.sortOrder}
                            </span>

                            {/* Active badge */}
                            <span className={`flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              item.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
                            }`}>
                              {item.isActive ? "Aktif" : "Nonaktif"}
                            </span>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Toggle */}
                              <button
                                onClick={() => toggleActive(item)}
                                disabled={saving === item.id}
                                title={item.isActive ? "Nonaktifkan" : "Aktifkan"}
                                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                                  item.isActive ? "bg-blue-500" : "bg-slate-200"
                                } disabled:opacity-50`}
                              >
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                  item.isActive ? "translate-x-5" : "translate-x-0.5"
                                }`} />
                              </button>

                              {/* Edit button */}
                              <button
                                onClick={() => startEdit(item)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 flex items-center justify-center transition"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {methods.length === 0 && (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
                  <p className="text-slate-500 text-sm mb-4">Belum ada metode pembayaran. Klik Refresh untuk seed otomatis.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
