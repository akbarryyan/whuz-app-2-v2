"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

export interface InputFieldDef {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  width: "flex" | "fixed";
}

interface BrandRow {
  brand: string;
  category: string;
  slug: string;
  imageUrl: string | null;
  inputFields: InputFieldDef[] | null;
  updatedAt: string | null;
}

const FIELD_TEMPLATES: InputFieldDef[] = [
  { key: "userId",   label: "User ID",   placeholder: "Masukkan User ID",   required: true, width: "flex"  },
  { key: "zoneId",   label: "Zone ID",   placeholder: "Masukkan Zone ID",   required: true, width: "fixed" },
  { key: "serverId", label: "Server ID", placeholder: "Masukkan Server ID", required: true, width: "fixed" },
  { key: "username", label: "Username",  placeholder: "Masukkan Username",  required: true, width: "flex"  },
  { key: "email",    label: "Email",     placeholder: "Masukkan Email",     required: true, width: "flex"  },
  { key: "gameId",   label: "Game ID",   placeholder: "Masukkan Game ID",   required: true, width: "flex"  },
];

export default function AdminBrandsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBrand, setEditingBrand] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();

  const [configBrand, setConfigBrand] = useState<BrandRow | null>(null);
  const [configFields, setConfigFields] = useState<InputFieldDef[]>([]);
  const [configSaving, setConfigSaving] = useState(false);

  const fetchBrands = async () => {
    try {
      const brandsRes = await fetch("/api/admin/brands");
      const brandsData = await brandsRes.json();

      if (brandsData.success) setBrands(brandsData.data);
      else toast.error("Gagal memuat data brand.");
    } catch {
      toast.error("Gagal memuat data brand.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (brand: BrandRow) => {
    setEditingBrand(brand.brand);
    setEditUrl(brand.imageUrl ?? "");
  };
  const cancelEdit = () => {
    setEditingBrand(null);
    setEditUrl("");
  };

  const saveImage = async (brandName: string) => {
    setSaving(true);
    try {
      const payload = {
        brand: brandName,
        imageUrl: editUrl.trim(),
      };
      const res = await fetch("/api/admin/brands", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        toast.success("Gambar brand berhasil disimpan.");
        setBrands((prev) => prev.map((b) => b.brand === brandName ? {
          ...b,
          imageUrl: editUrl.trim() || null,
        } : b));
        cancelEdit();
      } else toast.error(data.error ?? "Gagal menyimpan.");
    } catch { toast.error("Gagal menyimpan."); } finally { setSaving(false); }
  };

  const clearImage = async (brandName: string) => {
    if (!confirm(`Hapus gambar untuk "${brandName}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/brands", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand: brandName }) });
      const data = await res.json();
      if (data.success) {
        toast.success("Gambar brand dihapus.");
        setBrands((prev) => prev.map((b) => b.brand === brandName ? { ...b, imageUrl: null } : b));
        if (editingBrand === brandName) cancelEdit();
      } else toast.error(data.error ?? "Gagal menghapus.");
    } catch { toast.error("Gagal menghapus."); } finally { setSaving(false); }
  };

  const openConfig = (brand: BrandRow) => {
    setConfigBrand(brand);
    setConfigFields(brand.inputFields && brand.inputFields.length > 0 ? brand.inputFields : [{ ...FIELD_TEMPLATES[0] }]);
  };
  const closeConfig = () => { setConfigBrand(null); setConfigFields([]); };

  const isFieldActive = (key: string) => configFields.some((f) => f.key === key);

  const toggleField = (template: InputFieldDef) => {
    if (isFieldActive(template.key)) {
      if (configFields.length === 1) { toast.error("Minimal harus ada 1 field input."); return; }
      setConfigFields((prev) => prev.filter((f) => f.key !== template.key));
    } else {
      setConfigFields((prev) => [...prev, { ...template }]);
    }
  };

  const updateFieldProp = (key: string, prop: "label" | "placeholder" | "width", value: string) =>
    setConfigFields((prev) => prev.map((f) => f.key === key ? { ...f, [prop]: value } : f));

  const moveField = (key: string, dir: "up" | "down") => {
    const idx = configFields.findIndex((f) => f.key === key);
    if (idx < 0) return;
    const next = [...configFields];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setConfigFields(next);
  };

  const saveConfig = async () => {
    if (!configBrand) return;
    setConfigSaving(true);
    try {
      const res = await fetch("/api/admin/brands", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand: configBrand.brand, inputFields: configFields }) });
      const data = await res.json();
      if (data.success) {
        toast.success(`Konfigurasi "${configBrand.brand}" disimpan.`);
        setBrands((prev) => prev.map((b) => b.brand === configBrand.brand ? { ...b, inputFields: configFields } : b));
        closeConfig();
      } else toast.error(data.error ?? "Gagal menyimpan.");
    } catch { toast.error("Gagal menyimpan."); } finally { setConfigSaving(false); }
  };

  const filteredBrands = brands.filter((b) =>
    b.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const withImage = brands.filter((b) => b.imageUrl).length;
  const withConfig = brands.filter((b) => b.inputFields && b.inputFields.length > 0).length;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Kelola Brand</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {brands.length} brand · {withImage} ada gambar · {withConfig} ada konfigurasi input
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-blue-700 leading-relaxed">
              Atur <strong>gambar</strong> dan <strong>konfigurasi input checkout</strong> per brand. Semua konfigurasi brand disimpan di
              <code className="bg-blue-100 px-1 rounded text-xs"> brand_meta </code>.
            </p>
          </div>

          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Cari nama brand..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 shadow-sm" />
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-3 animate-pulse shadow-sm border border-slate-100">
                  <div className="w-14 h-14 rounded-lg bg-slate-200 flex-shrink-0" />
                  <div className="flex-1"><div className="h-4 w-32 bg-slate-200 rounded mb-2" /><div className="h-3 w-24 bg-slate-200 rounded" /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filteredBrands.map((brand) => {
                const isEditing = editingBrand === brand.brand;
                const previewUrl = isEditing ? editUrl : brand.imageUrl;
                const hasConfig = brand.inputFields && brand.inputFields.length > 0;

                return (
                  <div key={brand.brand} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
                        {previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewUrl} alt={brand.brand} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100">
                            <span className="text-purple-500 font-bold text-base">{brand.brand.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{brand.brand}</p>
                        <p className="text-xs text-slate-400 truncate">{brand.category}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${brand.imageUrl ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                            {brand.imageUrl ? "✓ Gambar" : "No gambar"}
                          </span>
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${hasConfig ? "bg-purple-50 text-purple-600" : "bg-slate-100 text-slate-500"}`}>
                            {hasConfig ? `✓ ${brand.inputFields!.map((f) => f.label).join(" + ")}` : "No config"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {!isEditing ? (
                          <button onClick={() => startEdit(brand)}
                            className="px-2.5 py-1.5 bg-[#2563eb] text-white text-[11px] font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                            Gambar
                          </button>
                        ) : (
                          <button onClick={cancelEdit}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                            Batal
                          </button>
                        )}
                        <button onClick={() => openConfig(brand)}
                          className="px-2.5 py-1.5 bg-purple-50 text-purple-700 text-[11px] font-semibold rounded-lg hover:bg-purple-100 transition-colors whitespace-nowrap">
                          ⚙ Input Fields
                        </button>
                        {!isEditing && brand.imageUrl && (
                          <button onClick={() => clearImage(brand.brand)} disabled={saving}
                            className="px-2.5 py-1.5 bg-rose-50 text-rose-600 text-[11px] font-semibold rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50">
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                        <label className="text-xs text-slate-500 font-medium block mb-1.5">URL Gambar (HTTPS)</label>
                        <input type="url" placeholder="https://example.com/image.png" value={editUrl} onChange={(e) => setEditUrl(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                          autoFocus onKeyDown={(e) => e.key === "Enter" && saveImage(brand.brand)} />
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => saveImage(brand.brand)} disabled={saving}
                            className="px-4 py-2 bg-[#2563eb] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {saving ? "..." : "Simpan"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredBrands.length === 0 && (
                <div className="sm:col-span-2 bg-white rounded-xl p-10 text-center shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500">Tidak ada brand ditemukan.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input Fields Config Modal */}
      {configBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Konfigurasi Input Fields</h2>
                <p className="text-xs text-slate-500 mt-0.5">{configBrand.brand}</p>
              </div>
              <button onClick={closeConfig} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Toggle fields */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Aktifkan field yang dibutuhkan brand ini:</p>
                <div className="flex flex-wrap gap-2">
                  {FIELD_TEMPLATES.map((tmpl) => {
                    const active = isFieldActive(tmpl.key);
                    return (
                      <button key={tmpl.key} onClick={() => toggleField(tmpl)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${active ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 bg-white text-slate-500 hover:border-purple-300"}`}>
                        {active ? "✓ " : "+ "}{tmpl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field detail config */}
              {configFields.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Detail field aktif (edit label &amp; placeholder, atur urutan):</p>
                  <div className="flex flex-col gap-2">
                    {configFields.map((field, idx) => (
                      <div key={field.key} className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">{field.key}</span>
                          <div className="flex items-center gap-1">
                            <button title="Toggle lebar" onClick={() => updateFieldProp(field.key, "width", field.width === "flex" ? "fixed" : "flex")}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors ${field.width === "fixed" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>
                              {field.width === "fixed" ? "Lebar tetap" : "Lebar penuh"}
                            </button>
                            <button onClick={() => moveField(field.key, "up")} disabled={idx === 0}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-colors text-sm">↑</button>
                            <button onClick={() => moveField(field.key, "down")} disabled={idx === configFields.length - 1}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-colors text-sm">↓</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 font-medium block mb-0.5">Label</label>
                            <input type="text" value={field.label} onChange={(e) => updateFieldProp(field.key, "label", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-medium block mb-0.5">Placeholder</label>
                            <input type="text" value={field.placeholder} onChange={(e) => updateFieldProp(field.key, "placeholder", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Preview tampilan input di halaman brand:</p>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex gap-2 flex-wrap">
                    {configFields.map((field) => (
                      <div key={field.key} className={field.width === "fixed" ? "w-28 flex-shrink-0" : "flex-1 min-w-[120px]"}>
                        <label className="text-[10px] text-slate-500 font-medium mb-1 block">{field.label}</label>
                        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">{field.placeholder}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button onClick={closeConfig} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
              <button onClick={saveConfig} disabled={configSaving || configFields.length === 0}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {configSaving ? "Menyimpan..." : "Simpan Konfigurasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
