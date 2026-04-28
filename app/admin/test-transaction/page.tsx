"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderModeInfo {
  effective: "mock" | "real";
  override: "MOCK" | "REAL" | null;
  env: string;
}

interface ProviderModes {
  DIGIFLAZZ: ProviderModeInfo;
  VIP_RESELLER: ProviderModeInfo;
}

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  provider: string;
  providerCode: string;
  sellingPrice: number;
  isActive: boolean;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
}

interface Step {
  step: string;
  status: "ok" | "error" | "skip";
  durationMs: number;
  detail?: unknown;
}

interface TestResult {
  orderCode: string;
  status: string;
  amount: number;
  serialNumber: string | null;
  providerRef: string;
  mode: string;
  paymentUrl?: string;
  paymentNumber?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  PROCESSING_PROVIDER: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
  WAITING_PAYMENT: "bg-blue-100 text-blue-700",
};

const STEP_LABELS: Record<string, string> = {
  fetch_product: "Ambil Data Produk",
  check_balance: "Cek Saldo Wallet",
  create_order: "Buat Order",
  hold_wallet: "Hold Saldo",
  mark_processing: "Proses Provider",
  provider_purchase: "Transaksi Provider",
  finalize_order: "Finalisasi Order",
  create_invoice: "Buat Invoice Poppay",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestTransactionPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modes, setModes] = useState<ProviderModes | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingModes, setLoadingModes] = useState(false);
  const [togglingProvider, setTogglingProvider] = useState<string | null>(null);

  // Form
  const [productId, setProductId] = useState("");
  const [testUserId, setTestUserId] = useState("");
  const [targetNumber, setTargetNumber] = useState("");
  const [targetZone, setTargetZone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "PAYMENT_GATEWAY">("WALLET");
  const [pgMethod, setPgMethod] = useState("qris");
  const [filterProvider, setFilterProvider] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Result
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Load modes ──────────────────────────────────────────────────────────────
  const loadModes = useCallback(async () => {
    setLoadingModes(true);
    try {
      const res = await fetch("/api/admin/provider-mode");
      const json = await res.json();
      if (json.success) setModes(json.data);
    } finally {
      setLoadingModes(false);
    }
  }, []);

  // ── Load products ───────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProducts(json.data.filter((p: Product) => p.isActive));
      }
    } catch {}
  }, []);

  // ── Load users ──────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data);
        // Auto-pilih user pertama
        if (json.data.length > 0 && !testUserId) {
          setTestUserId(json.data[0].id);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadModes();
    loadProducts();
    loadUsers();
  }, [loadModes, loadProducts, loadUsers]);

  // ── Toggle provider mode ────────────────────────────────────────────────────
  const toggleMode = async (provider: "DIGIFLAZZ" | "VIP_RESELLER") => {
    if (!modes) return;
    const current = modes[provider].effective;
    const next = current === "mock" ? "REAL" : "MOCK";
    setTogglingProvider(provider);
    try {
      const res = await fetch("/api/admin/provider-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, mode: next }),
      });
      const json = await res.json();
      if (json.success) await loadModes();
    } finally {
      setTogglingProvider(null);
    }
  };

  // ── Run test ────────────────────────────────────────────────────────────────
  const runTest = async () => {
    if (!productId || !targetNumber) return;

    setRunning(true);
    setSteps([]);
    setResult(null);
    setError(null);

    const targetData =
      targetZone.trim()
        ? { zone: targetZone.trim() }
        : undefined;

    try {
      const res = await fetch("/api/admin/test-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          targetNumber,
          targetData,
          paymentMethod,
          ...(paymentMethod === "PAYMENT_GATEWAY" ? { pgMethod } : {}),
          ...(testUserId ? { userId: testUserId } : {}),
        }),
      });
      const json = await res.json();
      setSteps(json.steps ?? []);
      if (json.result) setResult(json.result);
      if (!json.success) setError(json.error || "Test failed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Test transaction gagal");
    } finally {
      setRunning(false);
    }
  };

  // ── Filtered products ───────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchProvider = filterProvider === "ALL" || p.provider === filterProvider;
    const matchSearch =
      searchQuery === "" ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.providerCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchProvider && matchSearch;
  });

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedUser = users.find((u) => u.id === testUserId);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Test Transaksi</h1>
            <p className="mt-1 text-sm text-slate-500">
              Jalankan transaksi simulasi tanpa antrian — langsung lihat hasilnya
            </p>
          </div>
          <button
            onClick={loadModes}
            disabled={loadingModes}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${loadingModes ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh Mode
          </button>
        </div>

        {/* Provider Mode Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {(["DIGIFLAZZ", "VIP_RESELLER"] as const).map((prov) => {
            const info = modes?.[prov];
            const isReal = info?.effective === "real";
            const toggling = togglingProvider === prov;
            return (
              <div
                key={prov}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${
                      isReal
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {prov === "DIGIFLAZZ" ? "DF" : "VIP"}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {prov === "DIGIFLAZZ" ? "Digiflazz" : "VIP Reseller"}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isReal
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isReal ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {isReal ? "REAL" : "MOCK"}
                      </span>
                      {info?.override && (
                        <span className="text-xs text-slate-400">(override)</span>
                      )}
                      {!info?.override && (
                        <span className="text-xs text-slate-400">(from env)</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleMode(prov)}
                  disabled={toggling || loadingModes}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                    isReal
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  }`}
                >
                  {toggling ? (
                    <svg className="h-3 w-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  )}
                  Switch to {isReal ? "MOCK" : "REAL"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Left: Form ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800">Form Test Transaksi</h2>

            {/* User picker */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                User (Saldo Wallet) <span className="text-red-500">*</span>
              </label>
              <select
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih user --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) — Rp {u.balance.toLocaleString("id-ID")}
                    {u.role === "ADMIN" ? " 👑" : ""}
                  </option>
                ))}
              </select>
              {selectedUser && (
                <p className="mt-1.5 text-xs text-slate-400">
                  Saldo:{" "}
                  <span className={selectedUser.balance > 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                    Rp {selectedUser.balance.toLocaleString("id-ID")}
                  </span>
                </p>
              )}
            </div>

            {/* Provider filter + search */}
            <div className="flex gap-2">
              <select
                value={filterProvider}
                onChange={(e) => { setFilterProvider(e.target.value); setProductId(""); }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Provider</option>
                <option value="DIGIFLAZZ">Digiflazz</option>
                <option value="VIP_RESELLER">VIP Reseller</option>
              </select>
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Product select */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Produk <span className="text-red-500">*</span>
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih produk --</option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.provider === "DIGIFLAZZ" ? "DF" : "VIP"}] {p.name} — Rp{" "}
                    {p.sellingPrice.toLocaleString("id-ID")}
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <p className="mt-1.5 text-xs text-slate-400">
                  Provider code: <code className="font-mono">{selectedProduct.providerCode}</code>{" "}
                  | Mode:{" "}
                  <span
                    className={
                      modes?.[selectedProduct.provider as "DIGIFLAZZ" | "VIP_RESELLER"]?.effective === "real"
                        ? "text-emerald-600 font-semibold"
                        : "text-amber-600 font-semibold"
                    }
                  >
                    {modes?.[selectedProduct.provider as "DIGIFLAZZ" | "VIP_RESELLER"]?.effective?.toUpperCase() ?? "…"}
                  </span>
                </p>
              )}
            </div>

            {/* Target number */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                No. Tujuan / Customer ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={targetNumber}
                onChange={(e) => setTargetNumber(e.target.value)}
                placeholder="e.g. 08123456789 atau 12345678"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Zone (optional) */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Zone / Server ID{" "}
                <span className="text-slate-400 font-normal">(opsional, untuk game)</span>
              </label>
              <input
                type="text"
                value={targetZone}
                onChange={(e) => setTargetZone(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Metode Pembayaran
              </label>
              <div className="flex gap-3">
                {(["WALLET", "PAYMENT_GATEWAY"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
                      paymentMethod === m
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {m === "WALLET" ? "💳 Wallet" : "🏦 Payment Gateway"}
                  </button>
                ))}
              </div>
              {paymentMethod === "PAYMENT_GATEWAY" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Metode Poppay
                  </label>
                  <select
                    value={pgMethod}
                    onChange={(e) => setPgMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="qris">QRIS</option>
                  </select>
                </div>
              )}

              {paymentMethod === "PAYMENT_GATEWAY" && (
                <p className="mt-2 text-xs text-slate-400">
                  Invoice QRIS dibuat di Poppay — callback akan masuk ke{" "}
                  <code className="font-mono">/api/webhook/poppay</code> setelah bayar.
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={runTest}
              disabled={running || !productId || !targetNumber || !testUserId}
              className="flex items-center justify-center gap-2 rounded-full bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Jalankan Test
                </>
              )}
            </button>
          </div>

          {/* ── Right: Result ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800">Hasil Test</h2>

            {/* Empty state */}
            {!running && steps.length === 0 && !result && !error && (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-slate-400">
                <svg className="mb-3 h-10 w-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm">Isi form dan klik <strong>Jalankan Test</strong></p>
              </div>
            )}

            {/* Running spinner */}
            {running && steps.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-slate-400">
                <svg className="mb-3 h-8 w-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-sm">Memproses transaksi...</p>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Steps timeline */}
            {steps.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Pipeline Trace</p>
                {steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {/* Dot + line */}
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className={`h-4 w-4 shrink-0 rounded-full flex items-center justify-center ${
                          s.status === "ok"
                            ? "bg-emerald-500"
                            : s.status === "error"
                            ? "bg-red-500"
                            : "bg-slate-300"
                        }`}
                      >
                        {s.status === "ok" && (
                          <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {s.status === "error" && (
                          <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      {i < steps.length - 1 && (
                        <div className="mt-0.5 w-px flex-1 bg-slate-200 min-h-[16px]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">
                          {STEP_LABELS[s.step] ?? s.step}
                        </span>
                        <span className="text-xs text-slate-400">{s.durationMs}ms</span>
                        {s.status === "skip" && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">skip</span>
                        )}
                      </div>
                      {s.detail != null && (
                        <pre className="mt-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-500 overflow-x-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(s.detail, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Final result card */}
            {result && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Hasil Akhir</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      STATUS_COLORS[result.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {result.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-xs text-slate-400">Order Code</span>
                    <p className="font-mono text-slate-700 text-xs mt-0.5">{result.orderCode}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Nominal</span>
                    <p className="font-semibold text-slate-700 mt-0.5">
                      Rp {result.amount.toLocaleString("id-ID")}
                    </p>
                  </div>
                  {result.serialNumber && (
                    <div className="col-span-2">
                      <span className="text-xs text-slate-400">Serial Number</span>
                      <p className="font-mono text-emerald-600 font-semibold text-xs mt-0.5">
                        {result.serialNumber}
                      </p>
                    </div>
                  )}
                  {result.paymentNumber && (
                    <div className="col-span-2">
                      <span className="text-xs text-slate-400">Nomor Pembayaran (VA / QRIS)</span>
                      <p className="font-mono text-blue-600 font-semibold text-xs mt-0.5">
                        {result.paymentNumber}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-slate-400">Provider Ref</span>
                    <p className="font-mono text-slate-500 text-xs mt-0.5">{result.providerRef}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Mode</span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold mt-0.5 ${
                        result.mode === "poppay" || result.mode === "real"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {result.mode?.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Payment Gateway actions */}
                {result.status === "WAITING_PAYMENT" && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                    {result.paymentUrl && (
                      <a
                        href={result.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Buka Halaman Pembayaran
                      </a>
                    )}
                    <p className="text-center text-xs text-slate-400">
                      Setelah customer membayar, Poppay akan mengirim callback ke <code className="font-mono">/api/webhook/poppay</code>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
