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
  manualProductCount: number;
  providerProductCount: number;
  canDelete: boolean;
}

interface ManualCategory {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  brandCount: number;
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
  const [newBrand, setNewBrand] = useState("");
  const [newBrandImage, setNewBrandImage] = useState("");
  const [newBrandCategory, setNewBrandCategory] = useState("Top Up Game");
  const [manualCategories, setManualCategories] = useState<ManualCategory[]>([]);
  const [editingCategoryBrand, setEditingCategoryBrand] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [editingManualCategoryId, setEditingManualCategoryId] = useState<string | null>(null);
  const [manualCategoryDraft, setManualCategoryDraft] = useState({ name: "", sortOrder: "0" });
  const toast = useToast();

  const [configBrand, setConfigBrand] = useState<BrandRow | null>(null);
  const [configFields, setConfigFields] = useState<InputFieldDef[]>([]);
  const [configSaving, setConfigSaving] = useState(false);

  const fetchBrands = async () => {
    try {
      const [brandsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/brands"),
        fetch("/api/admin/manual-categories"),
      ]);
      const brandsData = await brandsRes.json();

      if (brandsData.success) setBrands(brandsData.data);
      else toast.error("Gagal memuat data brand.");

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        if (categoriesData.success && Array.isArray(categoriesData.data)) {
          setManualCategories(sortedCategories(categoriesData.data));
          setNewBrandCategory(categoriesData.data.find((item: ManualCategory) => item.isActive)?.name ?? "Top Up Game");
        }
      }
    } catch {
      toast.error("Gagal memuat data brand.");
    } finally {
      setLoading(false);
    }
  };

  const sortedCategories = (items: ManualCategory[]) =>
    [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

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

  const startCategoryEdit = (brand: BrandRow) => {
    setEditingCategoryBrand(brand.brand);
    setCategoryDraft(brand.category);
  };

  const startManualCategoryEdit = (category: ManualCategory) => {
    setEditingManualCategoryId(category.id);
    setManualCategoryDraft({
      name: category.name,
      sortOrder: String(category.sortOrder),
    });
  };

  const cancelManualCategoryEdit = () => {
    setEditingManualCategoryId(null);
    setManualCategoryDraft({ name: "", sortOrder: "0" });
  };

  const saveCategory = async (brandName: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/brands", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brandName, category: categoryDraft }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchBrands();
        setEditingCategoryBrand(null);
        setCategoryDraft("");
        toast.success("Kategori brand berhasil disimpan.");
      } else {
        toast.error(data.error ?? "Gagal menyimpan kategori.");
      }
    } catch {
      toast.error("Gagal menyimpan kategori.");
    } finally {
      setSaving(false);
    }
  };

  const clearImage = async (brandName: string) => {
    if (!confirm(`Hapus gambar untuk "${brandName}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/brands", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand: brandName, mode: "image" }) });
      const data = await res.json();
      if (data.success) {
        toast.success("Gambar brand dihapus.");
        setBrands((prev) => prev.map((b) => b.brand === brandName ? { ...b, imageUrl: null } : b));
        if (editingBrand === brandName) cancelEdit();
      } else toast.error(data.error ?? "Gagal menghapus.");
    } catch { toast.error("Gagal menghapus."); } finally { setSaving(false); }
  };

  const createBrand = async () => {
    if (!newBrand.trim()) {
      toast.error("Nama brand wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: newBrand.trim(), imageUrl: newBrandImage.trim(), category: newBrandCategory }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchBrands();
        setNewBrand("");
        setNewBrandImage("");
        setNewBrandCategory(manualCategories.find((category) => category.isActive)?.name ?? "Top Up Game");
        toast.success("Brand manual berhasil dibuat.");
      } else {
        toast.error(data.error ?? "Gagal membuat brand.");
      }
    } catch {
      toast.error("Gagal membuat brand.");
    } finally {
      setSaving(false);
    }
  };

  const createManualCategory = async () => {
    const name = manualCategoryDraft.name.trim();
    if (!name) {
      toast.error("Nama kategori wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/manual-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sortOrder: Number(manualCategoryDraft.sortOrder) || manualCategories.length + 1,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat kategori");
      }

      setManualCategories((prev) => sortedCategories([...prev, data.data]));
      setManualCategoryDraft({ name: "", sortOrder: String((manualCategories.length || 0) + 1) });
      toast.success("Kategori frontend berhasil dibuat.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat kategori.");
    } finally {
      setSaving(false);
    }
  };

  const saveManualCategory = async (id: string) => {
    const name = manualCategoryDraft.name.trim();
    if (!name) {
      toast.error("Nama kategori wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/manual-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          sortOrder: Number(manualCategoryDraft.sortOrder) || 0,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan kategori");
      }

      setManualCategories((prev) => sortedCategories(prev.map((item) => item.id === id ? { ...item, ...data.data } : item)));
      cancelManualCategoryEdit();
      await fetchBrands();
      toast.success("Kategori frontend berhasil disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan kategori.");
    } finally {
      setSaving(false);
    }
  };

  const toggleManualCategory = async (category: ManualCategory) => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/manual-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: category.id, isActive: !category.isActive }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal mengubah status kategori");
      }

      setManualCategories((prev) => sortedCategories(prev.map((item) => item.id === category.id ? data.data : item)));
      if (!category.isActive) {
        setNewBrandCategory(data.data.name);
      }
      toast.success(`Kategori ${category.isActive ? "disembunyikan" : "ditampilkan"} di frontend.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah status kategori.");
    } finally {
      setSaving(false);
    }
  };

  const removeManualCategory = async (category: ManualCategory) => {
    if (!confirm(`Hapus kategori "${category.name}" dari pengaturan frontend?`)) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/manual-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: category.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus kategori");
      }

      await fetchBrands();
      toast.success(data.softDeleted ? "Kategori dipindahkan ke nonaktif karena masih dipakai." : "Kategori berhasil dihapus.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus kategori.");
    } finally {
      setSaving(false);
    }
  };

  const deleteBrand = async (brand: BrandRow) => {
    if (!confirm(`Hapus brand "${brand.brand}"? Produk manual tanpa transaksi juga akan ikut dihapus.`)) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/brands", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brand.brand, mode: "brand" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus brand");
      }

      await fetchBrands();
      toast.success("Brand berhasil dihapus.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus brand.");
    } finally {
      setSaving(false);
    }
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
      <div className="admin-page-padding px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
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
              Atur <strong>tab kategori frontend</strong>, <strong>gambar brand</strong>, dan <strong>konfigurasi input checkout</strong> di sini.
              Kategori aktif di bawah akan otomatis menjadi tab homepage kalau sudah dipakai brand/produk.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">Kategori Frontend</p>
                  <p className="mt-1 text-xs text-slate-500">Kategori aktif di sini akan menjadi sumber tab kategori homepage.</p>
                </div>
                <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {manualCategories.filter((item) => item.isActive).length} aktif
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
                <input
                  value={editingManualCategoryId ? manualCategoryDraft.name : manualCategoryDraft.name}
                  onChange={(e) => setManualCategoryDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nama kategori frontend"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <input
                  type="number"
                  min={0}
                  value={manualCategoryDraft.sortOrder}
                  onChange={(e) => setManualCategoryDraft((prev) => ({ ...prev, sortOrder: e.target.value }))}
                  placeholder="Urutan"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <div className="flex gap-2">
                  {editingManualCategoryId ? (
                    <>
                      <button
                        onClick={() => saveManualCategory(editingManualCategoryId)}
                        disabled={saving}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={cancelManualCategoryEdit}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                      >
                        Batal
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={createManualCategory}
                      disabled={saving}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      Tambah
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {sortedCategories(manualCategories).map((category) => (
                  <div key={category.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{category.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${category.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {category.isActive ? "Tampil" : "Nonaktif"}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Urutan {category.sortOrder}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {category.brandCount} brand
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Slug: {category.slug}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleManualCategory(category)}
                        disabled={saving}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                      >
                        {category.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        onClick={() => startManualCategoryEdit(category)}
                        className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeManualCategory(category)}
                        disabled={saving}
                        className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-slate-800">Tambah Brand Manual</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
                <input
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="Nama brand"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <input
                  value={newBrandImage}
                  onChange={(e) => setNewBrandImage(e.target.value)}
                  placeholder="URL gambar brand"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                <select
                  value={newBrandCategory}
                  onChange={(e) => setNewBrandCategory(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {manualCategories.filter((category) => category.isActive).map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={createBrand}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  Tambah Brand
                </button>
              </div>
            </div>
          </div>

          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Cari nama brand..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 shadow-sm" />
          </div>

          {loading ? (
            <div className="admin-brands-grid grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-3 animate-pulse shadow-sm border border-slate-100">
                  <div className="w-14 h-14 rounded-lg bg-slate-200 flex-shrink-0" />
                  <div className="flex-1"><div className="h-4 w-32 bg-slate-200 rounded mb-2" /><div className="h-3 w-24 bg-slate-200 rounded" /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-brands-grid grid sm:grid-cols-2 gap-3">
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
                        {editingCategoryBrand === brand.brand ? (
                          <div className="mt-1 flex gap-1.5">
                            <select
                              value={categoryDraft}
                              onChange={(e) => setCategoryDraft(e.target.value)}
                              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                              {manualCategories.filter((category) => category.isActive).map((category) => (
                                <option key={category.id} value={category.name}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => saveCategory(brand.brand)}
                              disabled={saving}
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startCategoryEdit(brand)}
                            className="mt-0.5 block max-w-full truncate text-left text-xs text-slate-400 transition hover:text-blue-600"
                            title="Klik untuk ubah kategori"
                          >
                            {brand.category}
                          </button>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${brand.imageUrl ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                            {brand.imageUrl ? "✓ Gambar" : "No gambar"}
                          </span>
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${hasConfig ? "bg-purple-50 text-purple-600" : "bg-slate-100 text-slate-500"}`}>
                            {hasConfig ? `✓ ${brand.inputFields!.map((f) => f.label).join(" + ")}` : "No config"}
                          </span>
                          <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700">
                            Manual {brand.manualProductCount}
                          </span>
                          <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Provider {brand.providerProductCount}
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
                            Hapus Gambar
                          </button>
                        )}
                        <button
                          onClick={() => deleteBrand(brand)}
                          disabled={saving || !brand.canDelete}
                          title={brand.canDelete ? "Hapus brand manual" : "Brand provider tidak bisa dihapus"}
                          className="px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg hover:bg-black transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Hapus Brand
                        </button>
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
                <div className="admin-brands-empty sm:col-span-2 bg-white rounded-xl p-10 text-center shadow-sm border border-slate-100">
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
