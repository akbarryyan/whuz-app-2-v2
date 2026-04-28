"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

export default function BannersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [banners, setBanners] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [siteName, setSiteName] = useState("Website");
  const [taglineSaving, setTaglineSaving] = useState(false);
  const toast = useToast();

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      const data = await res.json();
      if (data.success) setBanners(data.data);
      else toast.error("Gagal memuat banner");
    } catch {
      toast.error("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadBanners(); }, [loadBanners]);

  // Load tagline from site-config
  useEffect(() => {
    fetch("/api/admin/site-config")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const currentSiteName = d.data?.raw?.site_name ?? "Website";
          setSiteName(currentSiteName);
          setTagline(
            d.data?.raw?.banner_tagline ??
              `${currentSiteName} - Tempat Top Up Game dan Jual Beli Produk Digital Terpercaya`
          );
        }
      })
      .catch(() => {});
  }, []);

  async function saveTagline() {
    setTaglineSaving(true);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "banner_tagline", value: tagline }),
      });
      const data = await res.json();
      if (data.success) toast.success("Tagline disimpan");
      else toast.error("Gagal menyimpan tagline");
    } catch {
      toast.error("Gagal menyimpan tagline");
    } finally {
      setTaglineSaving(false);
    }
  }

  function addBanner() {
    const url = newUrl.trim();
    if (!url) return;
    try { new URL(url); } catch {
      toast.error("URL tidak valid");
      return;
    }
    if (banners.includes(url)) { toast.error("URL sudah ada"); return; }
    setBanners((p) => [...p, url]);
    setNewUrl("");
  }

  function removeBanner(idx: number) {
    setBanners((p) => p.filter((_, i) => i !== idx));
  }

  function moveBanner(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= banners.length) return;
    const arr = [...banners];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setBanners(arr);
  }

  async function saveBanners() {
    if (banners.length === 0) { toast.error("Minimal 1 banner"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/banners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: banners }),
      });
      const data = await res.json();
      if (data.success) toast.success("Banner berhasil disimpan");
      else toast.error(data.error ?? "Gagal menyimpan");
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function resetBanners() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/banners", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setBanners(data.data);
        toast.success("Banner direset ke default");
      }
    } catch {
      toast.error("Gagal reset");
    } finally {
      setSaving(false);
    }
  }

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
              <h1 className="text-xl font-bold text-slate-800">🎨 Banner Carousel</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Kelola gambar carousel halaman utama.
                <span className="hidden sm:inline"> Urutan dapat diatur dengan tombol panah.</span>
              </p>
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              <button
                onClick={resetBanners}
                disabled={saving || loading}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                Reset default
              </button>
              <button
                onClick={saveBanners}
                disabled={saving || loading || banners.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#003D99] text-white text-xs font-bold hover:bg-[#002d73] disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : "💾 Simpan"}
              </button>
            </div>
          </div>

          {/* Preview strip */}
          {!loading && banners.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">Preview urutan banner</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {banners.map((url, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Banner ${idx + 1}`}
                      className="w-40 h-20 object-cover rounded-xl bg-slate-100 border border-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                    />
                    <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Banner list */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">Daftar Banner</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {banners.length} banner aktif · Klik simpan setelah selesai mengubah
              </p>
            </div>

            <div className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                    <div className="w-20 h-12 bg-slate-200 rounded-xl flex-shrink-0" />
                    <div className="flex-1 h-3 bg-slate-100 rounded" />
                    <div className="flex gap-1">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg" />
                      <div className="w-7 h-7 bg-slate-100 rounded-lg" />
                      <div className="w-7 h-7 bg-slate-100 rounded-lg" />
                    </div>
                  </div>
                ))
              ) : banners.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-2xl">
                    🖼️
                  </div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Belum ada banner</p>
                  <p className="text-xs text-slate-400">Tambahkan URL gambar di bawah untuk mulai.</p>
                </div>
              ) : (
                banners.map((url, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center gap-3">
                    {/* Number */}
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    {/* Preview */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Banner ${idx + 1}`}
                      className="w-20 h-12 object-cover rounded-xl flex-shrink-0 bg-slate-100 border border-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                    />
                    {/* URL */}
                    <p className="flex-1 text-[11px] text-slate-500 truncate min-w-0 font-mono">
                      {url}
                    </p>
                    {/* Controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveBanner(idx, -1)}
                        disabled={idx === 0 || saving}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-25 transition-colors"
                        title="Naikan"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveBanner(idx, 1)}
                        disabled={idx === banners.length - 1 || saving}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-25 transition-colors"
                        title="Turunkan"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeBanner(idx)}
                        disabled={saving}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 disabled:opacity-40 transition-colors"
                        title="Hapus"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add new */}
            <div className="px-4 py-4 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 mb-2">Tambah Banner Baru</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBanner()}
                  placeholder="https://cdn.example.com/banner.jpg"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition font-mono min-w-0"
                />
                <button
                  onClick={addBanner}
                  disabled={!newUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  + Tambah
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Gunakan URL publik yang bisa diakses (CDN, Google Drive public link, dsb). Tekan Enter atau klik Tambah.
              </p>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <span className="text-base flex-shrink-0">💡</span>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                <strong>Tips:</strong> Gunakan gambar dengan rasio <strong>2:1</strong> (contoh: 1200×600 px) agar tampil optimal di carousel.
                Perubahan langsung berlaku di halaman utama setelah disimpan — tanpa perlu restart server.
              </p>
            </div>
          </div>

          {/* Tagline Banner */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">Tagline Banner</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Teks yang tampil di bawah carousel banner pada halaman utama.</p>
            </div>
            <div className="px-5 py-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder={`${siteName} - Tempat Top Up Game dan Jual Beli Produk Digital Terpercaya`}
                  className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                />
                <button
                  onClick={saveTagline}
                  disabled={taglineSaving}
                  className="px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0"
                >
                  {taglineSaving ? "..." : "💾 Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
