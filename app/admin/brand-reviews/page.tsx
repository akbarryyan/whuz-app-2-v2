"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface ReviewRow {
  id: string;
  brandSlug: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
}

interface Meta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type StatusFilter = "all" | "pending" | "approved";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "text-yellow-400" : "text-slate-200"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function slugToLabel(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AdminBrandReviewsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [detailReview, setDetailReview] = useState<ReviewRow | null>(null);

  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/admin/brand-reviews?${params}`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.data);
        setMeta(data.meta);
      } else {
        toast.error(data.error ?? "Gagal memuat ulasan.");
      }
    } catch {
      toast.error("Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, search]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    setActionLoading(id + "-approve");
    try {
      const res = await fetch("/api/admin/brand-reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approve" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Ulasan disetujui dan akan tampil di halaman brand.");
        setDetailReview(null);
        load();
      } else {
        toast.error(data.error ?? "Gagal menyetujui ulasan.");
      }
    } catch {
      toast.error("Terjadi kesalahan.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(id + "-delete");
    try {
      const res = await fetch(`/api/admin/brand-reviews?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Ulasan dihapus.");
        setDeleteConfirmId(null);
        setDetailReview(null);
        load();
      } else {
        toast.error(data.error ?? "Gagal menghapus ulasan.");
      }
    } catch {
      toast.error("Terjadi kesalahan.");
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCount = statusFilter === "all" ? reviews.filter((r) => !r.isApproved).length : 0;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Page Header */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Ulasan Brand</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Moderasi ulasan dari pembeli — setujui untuk ditampilkan di halaman brand.
              </p>
            </div>
            {meta && (
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {meta.total} total
                </span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Status tabs */}
            <div className="flex gap-1 rounded-xl bg-white border border-slate-200 p-1 text-sm">
              {(["all", "pending", "approved"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                    statusFilter === s
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {s === "all" ? "Semua" : s === "pending" ? "Menunggu" : "Disetujui"}
                  {s === "pending" && pendingCount > 0 && statusFilter === "all" && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <form
              onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
              className="flex flex-1 gap-2"
            >
              <div className="relative flex-1 max-w-sm">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari brand, nama, komentar..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Cari
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition"
                >
                  Reset
                </button>
              )}
            </form>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 px-6 py-4 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 bg-slate-100 rounded" />
                      <div className="h-3 w-2/3 bg-slate-100 rounded" />
                      <div className="h-3 w-1/2 bg-slate-100 rounded" />
                    </div>
                    <div className="h-8 w-24 bg-slate-100 rounded-lg flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg className="h-12 w-12 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
                <p className="text-sm font-semibold text-slate-500">Belum ada ulasan</p>
                <p className="text-xs text-slate-400 mt-1">
                  {search ? "Tidak ada hasil untuk pencarian ini." : "Ulasan dari pembeli akan muncul di sini."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className={`flex items-start gap-4 px-4 py-4 sm:px-6 transition-colors hover:bg-slate-50/60 ${
                      !review.isApproved ? "border-l-4 border-amber-400" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">
                        {review.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-slate-800 truncate">{review.userName}</span>
                        <span className="text-[11px] text-slate-400">•</span>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                          {slugToLabel(review.brandSlug)}
                        </span>
                        <StarDisplay rating={review.rating} />
                        {!review.isApproved && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            Menunggu
                          </span>
                        )}
                        {review.isApproved && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                            Disetujui
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed line-clamp-2">{review.comment}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatDate(review.createdAt)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-shrink-0 items-center gap-2 mt-0.5">
                      {/* Detail */}
                      <button
                        onClick={() => setDetailReview(review)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                        title="Lihat detail"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>

                      {/* Approve */}
                      {!review.isApproved && (
                        <button
                          onClick={() => handleApprove(review.id)}
                          disabled={actionLoading === review.id + "-approve"}
                          className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 transition disabled:opacity-60"
                          title="Setujui ulasan"
                        >
                          {actionLoading === review.id + "-approve" ? (
                            <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                            </svg>
                          )}
                          Setujui
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirmId(review.id)}
                        disabled={actionLoading === review.id + "-delete"}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition disabled:opacity-60"
                        title="Hapus ulasan"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
                <p className="text-xs text-slate-400">
                  Halaman {meta.page} dari {meta.totalPages} ({meta.total} ulasan)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={page === meta.totalPages}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Detail Modal ---- */}
      {detailReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailReview(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Detail Ulasan</h2>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(detailReview.createdAt)}</p>
              </div>
              <button
                onClick={() => setDetailReview(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">
                    {detailReview.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{detailReview.userName}</p>
                  <p className="text-xs text-slate-400">User ID: {detailReview.userId.slice(0, 12)}…</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Brand</span>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {slugToLabel(detailReview.brandSlug)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Rating</span>
                  <StarDisplay rating={detailReview.rating} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Status</span>
                  {detailReview.isApproved ? (
                    <span className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Disetujui</span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Menunggu Persetujuan</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">Komentar</p>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3">{detailReview.comment}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {!detailReview.isApproved && (
                <button
                  onClick={() => handleApprove(detailReview.id)}
                  disabled={actionLoading === detailReview.id + "-approve"}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-600 transition disabled:opacity-60"
                >
                  {actionLoading === detailReview.id + "-approve" ? (
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                  Setujui
                </button>
              )}
              <button
                onClick={() => setDeleteConfirmId(detailReview.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-100 transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Delete Confirm Modal ---- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-7 w-7 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Hapus Ulasan?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Ulasan ini akan dihapus permanen dan tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={actionLoading === deleteConfirmId + "-delete"}
                className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white hover:bg-rose-600 transition disabled:opacity-60"
              >
                {actionLoading === deleteConfirmId + "-delete" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menghapus...
                  </span>
                ) : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
