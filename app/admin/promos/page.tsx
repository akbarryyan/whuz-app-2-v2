"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface Promo {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  startDate: "",
  endDate: "",
  isActive: true,
  sortOrder: 0,
};

function toInputDate(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

function toISOOrNull(s: string): string | null {
  if (!s) return null;
  try { return new Date(s).toISOString(); }
  catch { return null; }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export default function AdminPromosPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Hero banner config
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroSaving, setHeroSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/site-config")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setHeroImageUrl(d.data?.raw?.promo_hero_image_url ?? "");
      });
  }, []);

  async function saveHeroImage() {
    setHeroSaving(true);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "promo_hero_image_url", value: heroImageUrl }),
      });
      const data = await res.json();
      if (!data.success) { toast.error("Gagal menyimpan"); return; }
      toast.success("Gambar hero banner disimpan");
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setHeroSaving(false);
    }
  }

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const toast = useToast();

  const loadPromos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promos");
      const data = await res.json();
      if (data.success) setPromos(data.data);
      else toast.error("Gagal memuat promo");
    } catch {
      toast.error("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPromos(); }, [loadPromos]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p: Promo) {
    setEditingId(p.id);
    setForm({
      title:       p.title,
      description: p.description ?? "",
      imageUrl:    p.imageUrl,
      linkUrl:     p.linkUrl ?? "",
      startDate:   toInputDate(p.startDate),
      endDate:     toInputDate(p.endDate),
      isActive:    p.isActive,
      sortOrder:   p.sortOrder,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!form.imageUrl.trim()) { toast.error("URL gambar wajib diisi"); return; }
    setSaving(true);
    try {
      const payload = {
        title:       form.title,
        description: form.description || undefined,
        imageUrl:    form.imageUrl,
        linkUrl:     form.linkUrl || undefined,
        startDate:   toISOOrNull(form.startDate),
        endDate:     toISOOrNull(form.endDate),
        isActive:    form.isActive,
        sortOrder:   Number(form.sortOrder),
      };

      const url  = editingId ? `/api/admin/promos/${editingId}` : "/api/admin/promos";
      const method = editingId ? "PUT" : "POST";
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error?.imageUrl?.[0] ?? data.error ?? "Gagal menyimpan"); return; }

      toast.success(editingId ? "Promo diperbarui" : "Promo ditambahkan");
      setModalOpen(false);
      loadPromos();
    } catch {
      toast.error("Gagal menyimpan promo");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/promos/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) { toast.error("Gagal menghapus"); return; }
      toast.success("Promo dihapus");
      setDeleteConfirmId(null);
      loadPromos();
    } catch {
      toast.error("Gagal menghapus promo");
    }
  }

  async function toggleActive(p: Promo) {
    try {
      const res = await fetch(`/api/admin/promos/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const data = await res.json();
      if (!data.success) { toast.error("Gagal mengubah status"); return; }
      toast.success(p.isActive ? "Promo dinonaktifkan" : "Promo diaktifkan");
      loadPromos();
    } catch {
      toast.error("Gagal mengubah status");
    }
  }

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
              <h1 className="text-xl font-bold text-slate-800">🎁 Manajemen Promo</h1>
              <p className="text-sm text-slate-500 mt-0.5">Kelola promo yang tampil di halaman Promo</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Promo
            </button>
          </div>

          {/* ── Hero Banner Config ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-700 text-sm">Gambar Hero Banner</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Gambar yang muncul di pojok kanan banner ungu pada halaman Promo.</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex gap-3 items-start">
                <input
                  type="url"
                  value={heroImageUrl}
                  onChange={(e) => setHeroImageUrl(e.target.value)}
                  placeholder="https://... (URL gambar)"
                  className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                />
                <button
                  onClick={saveHeroImage}
                  disabled={heroSaving || !heroImageUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-purple-800 text-white text-xs font-bold transition disabled:opacity-50 flex-shrink-0"
                >
                  {heroSaving ? "Menyimpan..." : "💾 Simpan"}
                </button>
              </div>
              {heroImageUrl && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroImageUrl} alt="Hero preview" className="h-14 w-auto object-contain rounded" />
                  <p className="text-xs text-slate-400">Preview gambar hero banner</p>
                </div>
              )}
            </div>
          </div>

          {/* Promo list */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">Daftar Promo</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Urutkan berdasarkan kolom "Urutan Tampil", promo nonaktif tidak ditampilkan ke pengguna.</p>
            </div>
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="w-20 h-14 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 bg-slate-100 animate-pulse rounded" />
                      <div className="h-3 w-1/3 bg-slate-100 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : promos.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-slate-400 text-sm">Belum ada promo. Klik "+ Tambah Promo" untuk mulai.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {promos.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition">
                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="w-20 h-14 object-cover rounded-xl flex-shrink-0 bg-slate-100"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 justify-between">
                        <p className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">{p.title}</p>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                        }`}>
                          {p.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {p.endDate && (
                          <p className="text-xs text-slate-400">
                            s.d. <span className="font-medium">{formatDate(p.endDate)}</span>
                          </p>
                        )}
                        <p className="text-xs text-slate-300">urutan: {p.sortOrder}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(p)}
                        title={p.isActive ? "Nonaktifkan" : "Aktifkan"}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {p.isActive
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          }
                        </svg>
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        title="Edit"
                        className="p-1.5 rounded-lg hover:bg-blue-50 transition text-slate-400 hover:text-blue-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(p.id)}
                        title="Hapus"
                        className="p-1.5 rounded-lg hover:bg-rose-50 transition text-slate-400 hover:text-rose-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editingId ? "Edit Promo" : "Tambah Promo"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Image URL + preview */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">URL Gambar *</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                />
                {form.imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imageUrl} alt="Preview" className="w-full object-cover max-h-[150px]" />
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Judul *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Flash Sale Setiap Rabu"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Deskripsi (opsional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi singkat promo..."
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none"
                />
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">URL Link (opsional)</label>
                <input
                  type="url"
                  value={form.linkUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="/brand/mlbb atau https://..."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                />
                <p className="text-xs text-slate-400 mt-1">Ketika kartu diklik, user diarahkan ke URL ini</p>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Mulai (opsional)</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Berakhir (opsional)</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Sort order + isActive */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Urutan Tampil</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                  />
                </div>
                <div className="flex flex-col justify-end pb-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{form.isActive ? "Aktif" : "Nonaktif"}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-bold transition disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambahkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Hapus Promo?</h3>
            <p className="text-sm text-slate-400 mb-5">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition"
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
