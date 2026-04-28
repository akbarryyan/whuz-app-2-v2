"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

interface FaqItem {
  question: string;
  answer: string;
}

interface GameTag {
  label: string;
  href: string;
}

interface HomeContent {
  gameTags: GameTag[];
  faqs: FaqItem[];
  aboutText: string;
}

const EMPTY_FAQ: FaqItem = { question: "", answer: "" };
const EMPTY_TAG: GameTag = { label: "", href: "" };

export default function HomeContentPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [gameTags, setGameTags] = useState<GameTag[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [aboutText, setAboutText] = useState("");
  // Tag form
  const [showTagForm, setShowTagForm] = useState(false);
  const [editTagIdx, setEditTagIdx] = useState<number | null>(null);
  const [tagDraft, setTagDraft] = useState<GameTag>(EMPTY_TAG);

  // FAQ form
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editFaqIdx, setEditFaqIdx] = useState<number | null>(null);
  const [faqDraft, setFaqDraft] = useState<FaqItem>(EMPTY_FAQ);

  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/home-content");
      const data = await res.json();
      if (data.success) {
        setGameTags(data.data.gameTags);
        setFaqs(data.data.faqs);
        setAboutText(data.data.aboutText ?? "");
      } else {
        toast.error("Gagal memuat konten");
      }
    } catch {
      toast.error("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save ──────────────────────────────────────────────────────────────────
  async function persistContent(
    content: HomeContent,
    successMessage = "Konten berhasil disimpan"
  ) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/home-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (data.success) toast.success(successMessage);
      else toast.error(data.error ?? "Gagal menyimpan");
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    await persistContent({ gameTags, faqs, aboutText });
  }

  async function resetDefaults() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/home-content", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setGameTags(data.data.gameTags);
        setFaqs(data.data.faqs);
        setAboutText(data.data.aboutText ?? "");
        toast.success("Konten direset ke default");
      } else {
        toast.error("Gagal reset");
      }
    } catch {
      toast.error("Gagal reset");
    } finally {
      setSaving(false);
    }
  }

  // ── Game Tags ─────────────────────────────────────────────────────────────
  function openAddTag() {
    setEditTagIdx(null);
    setTagDraft(EMPTY_TAG);
    setShowTagForm(true);
  }

  function openEditTag(idx: number) {
    setEditTagIdx(idx);
    setTagDraft({ ...gameTags[idx] });
    setShowTagForm(true);
  }

  function submitTag() {
    if (!tagDraft.label.trim() || !tagDraft.href.trim()) {
      toast.error("Label dan URL wajib diisi");
      return;
    }
    if (editTagIdx !== null) {
      setGameTags((prev) => prev.map((t, i) => i === editTagIdx ? tagDraft : t));
    } else {
      setGameTags((prev) => [...prev, tagDraft]);
    }
    setShowTagForm(false);
  }

  function removeTag(idx: number) {
    setGameTags((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveTag(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= gameTags.length) return;
    const arr = [...gameTags];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setGameTags(arr);
  }

  // ── FAQ CRUD ──────────────────────────────────────────────────────────────
  function openAddFaq() {
    setEditFaqIdx(null);
    setFaqDraft(EMPTY_FAQ);
    setShowFaqForm(true);
  }

  function openEditFaq(idx: number) {
    setEditFaqIdx(idx);
    setFaqDraft({ ...faqs[idx] });
    setShowFaqForm(true);
  }

  async function submitFaq() {
    if (!faqDraft.question.trim() || !faqDraft.answer.trim()) {
      toast.error("Pertanyaan dan jawaban wajib diisi");
      return;
    }

    const nextFaqs =
      editFaqIdx !== null
        ? faqs.map((f, i) => (i === editFaqIdx ? faqDraft : f))
        : [...faqs, faqDraft];

    setFaqs(nextFaqs);
    setShowFaqForm(false);
    setEditFaqIdx(null);
    setFaqDraft(EMPTY_FAQ);

    await persistContent(
      { gameTags, faqs: nextFaqs, aboutText },
      editFaqIdx !== null ? "FAQ berhasil diperbarui" : "FAQ berhasil ditambahkan"
    );
  }

  function removeFaq(idx: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveFaq(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= faqs.length) return;
    const arr = [...faqs];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setFaqs(arr);
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
              <h1 className="text-xl font-bold text-slate-800">📝 Konten Halaman Utama</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Kelola tag game dan FAQ yang tampil di halaman utama.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={resetDefaults}
                disabled={saving || loading}
                className="flex-1 sm:flex-none justify-center px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Reset Default
              </button>
              <button
                onClick={save}
                disabled={saving || loading}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#003D99] text-white text-xs font-bold hover:bg-[#002d73] disabled:opacity-50 transition-colors"
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

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-8 w-full bg-slate-100 rounded-xl" />
              <div className="h-4 w-48 bg-slate-200 rounded" />
            </div>
          ) : (
            <>
              {/* ── About Text ───────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-700">📄 Teks About</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Paragraf deskripsi yang tampil di bagian About halaman utama
                  </p>
                </div>
                <div className="px-5 py-4">
                  <textarea
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    rows={5}
                    placeholder="Tulis deskripsi singkat tentang website atau bisnis kamu..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition resize-none"
                  />
                </div>
              </div>

              {/* ── Game Tags ─────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-700">🏷️ Tag Game</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {gameTags.length} tag · Tampil sebagai tombol di bagian About
                    </p>
                  </div>
                  <button
                    onClick={openAddTag}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors"
                  >
                    + Tambah
                  </button>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {/* Tag list */}
                  {gameTags.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4">Belum ada tag. Klik &quot;+ Tambah&quot; untuk menambahkan.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {gameTags.map((tag, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{tag.label}</p>
                            <p className="text-[11px] text-slate-400 truncate">{tag.href}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => moveTag(idx, -1)} disabled={idx === 0}
                              className="w-6 h-6 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-25 transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button onClick={() => moveTag(idx, 1)} disabled={idx === gameTags.length - 1}
                              className="w-6 h-6 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-25 transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <button onClick={() => openEditTag(idx)}
                              className="w-6 h-6 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => removeTag(idx)}
                              className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── FAQ ───────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-700">❓ FAQ</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {faqs.length} pertanyaan<span className="hidden sm:inline"> · 5 pertama tampil, sisanya di &quot;Baca Selengkapnya&quot;</span>
                    </p>
                  </div>
                  <button
                    onClick={openAddFaq}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors"
                  >
                    + Tambah
                  </button>
                </div>

                {faqs.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="text-3xl mb-2">❓</div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">Belum ada FAQ</p>
                    <p className="text-xs text-slate-400">Klik &quot;+ Tambah&quot; untuk menambahkan pertanyaan.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {faqs.map((faq, idx) => (
                      <div key={idx} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-600 flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{faq.question}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{faq.answer}</p>
                          </div>
                        </div>
                        {/* Desktop controls */}
                        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => moveFaq(idx, -1)} disabled={idx === 0}
                            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-25 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button onClick={() => moveFaq(idx, 1)} disabled={idx === faqs.length - 1}
                            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 disabled:opacity-25 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button onClick={() => openEditFaq(idx)}
                            className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => removeFaq(idx)}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {/* Mobile controls */}
                        <div className="flex sm:hidden items-center gap-2">
                          <button onClick={() => moveFaq(idx, -1)} disabled={idx === 0}
                            className="flex-1 py-1.5 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-600 disabled:opacity-25 transition-colors">
                            Naik
                          </button>
                          <button onClick={() => moveFaq(idx, 1)} disabled={idx === faqs.length - 1}
                            className="flex-1 py-1.5 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-600 disabled:opacity-25 transition-colors">
                            Turun
                          </button>
                          <button onClick={() => openEditFaq(idx)}
                            className="flex-1 py-1.5 rounded-lg bg-blue-50 text-[11px] font-semibold text-blue-600 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => removeFaq(idx)}
                            className="flex-1 py-1.5 rounded-lg bg-red-50 text-[11px] font-semibold text-red-500 transition-colors">
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tag Form Modal ──────────────────────────────────────────────────────── */}
      {showTagForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {editTagIdx !== null ? "Edit Tag" : "Tambah Tag"}
              </h3>
              <button onClick={() => setShowTagForm(false)}
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
                  value={tagDraft.label}
                  onChange={(e) => setTagDraft((t) => ({ ...t, label: e.target.value }))}
                  placeholder="Top Up Mobile Legends"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">URL Tujuan</label>
                <input
                  type="text"
                  value={tagDraft.href}
                  onChange={(e) => setTagDraft((t) => ({ ...t, href: e.target.value }))}
                  placeholder="/brand/mobile-legends"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowTagForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button
                onClick={submitTag}
                disabled={!tagDraft.label.trim() || !tagDraft.href.trim()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {editTagIdx !== null ? "Simpan Perubahan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ Form Modal ────────────────────────────────────────────────────── */}
      {showFaqForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {editFaqIdx !== null ? "Edit Pertanyaan" : "Tambah Pertanyaan"}
              </h3>
              <button onClick={() => setShowFaqForm(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Pertanyaan</label>
                <input
                  type="text"
                  value={faqDraft.question}
                  onChange={(e) => setFaqDraft((f) => ({ ...f, question: e.target.value }))}
                  placeholder="Apakah top up game di platform ini aman?"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Jawaban</label>
                <textarea
                  value={faqDraft.answer}
                  onChange={(e) => setFaqDraft((f) => ({ ...f, answer: e.target.value }))}
                  placeholder="Tulis jawaban lengkap di sini..."
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowFaqForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button
                onClick={submitFaq}
                disabled={!faqDraft.question.trim() || !faqDraft.answer.trim()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {editFaqIdx !== null ? "Simpan Perubahan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
