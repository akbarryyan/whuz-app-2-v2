"use client";

import { FormEvent, useEffect, useState } from "react";
import Header from "@/components/admin/Header";
import Sidebar from "@/components/admin/Sidebar";

type AuthDebugResponse = {
  success: boolean;
  stage?: string;
  message?: string;
  error?: string;
  missing?: string[];
  config?: {
    baseUrl: string;
    versionPath: string;
    hasIntegratorToken: boolean;
    hasAggregatorCode: boolean;
    hasMerchantAccountNumber: boolean;
    hasSecretKey: boolean;
    hasEmail: boolean;
    hasPassword: boolean;
  };
  data?: {
    email?: string | null;
    roleName?: string | null;
    tokenPreview?: string | null;
  };
};

type GenericJson = {
  success?: boolean;
  error?: string;
  message?: string;
  gateway?: string;
  data?: {
    refId?: string;
    status?: string;
    [key: string]: unknown;
  } | unknown;
};

async function parseJsonSafely(response: Response): Promise<GenericJson> {
  try {
    return (await response.json()) as GenericJson;
  } catch {
    return {
      success: false,
      error: `HTTP ${response.status} ${response.statusText}`,
    };
  }
}

function PrettyJson({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function StatPill({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <div
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        ready
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {label}: {ready ? "OK" : "Kosong"}
    </div>
  );
}

export default function AdminPoppayDebugPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [banksLoading, setBanksLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);

  const [authResult, setAuthResult] = useState<AuthDebugResponse | null>(null);
  const [banksResult, setBanksResult] = useState<GenericJson | null>(null);
  const [createResult, setCreateResult] = useState<GenericJson | null>(null);
  const [inquiryResult, setInquiryResult] = useState<GenericJson | null>(null);

  const [amount, setAmount] = useState("10000");
  const [notes, setNotes] = useState("Admin Debug Poppay");
  const [inquiryUid, setInquiryUid] = useState("");

  const createRefId =
    createResult &&
    typeof createResult.data === "object" &&
    createResult.data !== null &&
    "refId" in createResult.data &&
    typeof createResult.data.refId === "string"
      ? createResult.data.refId
      : "";

  const inquiryStatus =
    inquiryResult &&
    typeof inquiryResult.data === "object" &&
    inquiryResult.data !== null &&
    "status" in inquiryResult.data &&
    typeof inquiryResult.data.status === "string"
      ? inquiryResult.data.status
      : "";

  const testAuth = async () => {
    setAuthLoading(true);
    try {
      const response = await fetch("/api/admin/payment-gateway/poppay/auth");
      const json = (await parseJsonSafely(response)) as AuthDebugResponse;
      setAuthResult(json);
    } finally {
      setAuthLoading(false);
    }
  };

  const testBanks = async () => {
    setBanksLoading(true);
    try {
      const response = await fetch(
        "/api/admin/payment-gateway/poppay/banks?start=0&length=10&currency=IDR"
      );
      setBanksResult(await parseJsonSafely(response));
    } finally {
      setBanksLoading(false);
    }
  };

  const createIncoming = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateLoading(true);
    try {
      const response = await fetch("/api/admin/payment-gateway/poppay/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(amount),
          notes,
          payorName: "Admin Debug",
          expirationInterval: 30,
        }),
      });
      setCreateResult(await parseJsonSafely(response));
    } finally {
      setCreateLoading(false);
    }
  };

  const runInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inquiryUid.trim()) return;

    setInquiryLoading(true);
    try {
      const response = await fetch(
        `/api/admin/payment-gateway/poppay/inquiry/${encodeURIComponent(
          inquiryUid.trim()
        )}`
      );
      setInquiryResult(await parseJsonSafely(response));
    } finally {
      setInquiryLoading(false);
    }
  };

  useEffect(() => {
    if (!createRefId) return;

    const finalStatuses = new Set(["completed", "expired", "failed"]);
    if (finalStatuses.has(inquiryStatus)) return;

    setInquiryUid(createRefId);

    const poll = async () => {
      setInquiryLoading(true);
      try {
        const response = await fetch(
          `/api/admin/payment-gateway/poppay/inquiry/${encodeURIComponent(createRefId)}`
        );
        setInquiryResult(await parseJsonSafely(response));
      } finally {
        setInquiryLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, 7000);
    return () => clearInterval(interval);
  }, [createRefId, inquiryStatus]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Debug Poppay
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Cek konfigurasi, login auth, bank list, create incoming, dan
                inquiry langsung dari dashboard admin.
              </p>
            </div>
            <button
              onClick={testAuth}
              disabled={authLoading}
              className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authLoading ? "Mengecek..." : "Tes Auth Sekarang"}
            </button>
          </div>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Status Auth & Konfigurasi
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Endpoint: <code>/api/admin/payment-gateway/poppay/auth</code>
                </p>
              </div>
            </div>

            {authResult?.config ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <StatPill
                  label="Base URL"
                  ready={Boolean(authResult.config.baseUrl)}
                />
                <StatPill
                  label="Version"
                  ready={Boolean(authResult.config.versionPath)}
                />
                <StatPill
                  label="Integrator Token"
                  ready={authResult.config.hasIntegratorToken}
                />
                <StatPill
                  label="Aggregator Code"
                  ready={authResult.config.hasAggregatorCode}
                />
                <StatPill
                  label="Merchant Acc"
                  ready={authResult.config.hasMerchantAccountNumber}
                />
                <StatPill
                  label="Secret Key"
                  ready={authResult.config.hasSecretKey}
                />
                <StatPill
                  label="Email"
                  ready={authResult.config.hasEmail}
                />
                <StatPill
                  label="Password"
                  ready={authResult.config.hasPassword}
                />
              </div>
            ) : null}

            {authResult?.missing?.length ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Konfigurasi belum lengkap</p>
                <ul className="mt-2 list-disc pl-5">
                  {authResult.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {authResult ? (
              <div className="mt-4 space-y-4">
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    authResult.success
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  <p className="font-semibold">
                    {authResult.success
                      ? authResult.message || "Login berhasil"
                      : authResult.error || "Auth gagal"}
                  </p>
                  {authResult.data?.email ? (
                    <p className="mt-1">
                      Email: <span className="font-medium">{authResult.data.email}</span>
                      {authResult.data.roleName
                        ? ` • Role: ${authResult.data.roleName}`
                        : ""}
                    </p>
                  ) : null}
                </div>

                <PrettyJson value={authResult} />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Belum ada hasil. Jalankan <span className="font-medium">Tes Auth Sekarang</span> untuk melihat diagnosa config dan login Poppay.
              </div>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Bank List
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Ambil 10 bank pertama dari API Poppay.
                  </p>
                </div>
                <button
                  onClick={testBanks}
                  disabled={banksLoading}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {banksLoading ? "Mengambil..." : "Tes Bank List"}
                </button>
              </div>

              <div className="mt-4">
                {banksResult ? (
                  <PrettyJson value={banksResult} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Belum ada hasil bank list.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Create Incoming
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Buat transaksi incoming kecil untuk memastikan auth + create
                  invoice benar-benar lolos.
                </p>
              </div>

              <form className="mt-4 space-y-4" onSubmit={createIncoming}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Amount
                  </label>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:bg-white"
                    placeholder="10000"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Notes
                  </label>
                  <input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:bg-white"
                    placeholder="Admin Debug Poppay"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createLoading ? "Membuat..." : "Create Incoming"}
                </button>
              </form>

              <div className="mt-4">
                {createResult ? (
                  <div className="space-y-3">
                    {createRefId ? (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                        <p className="font-semibold">Auto inquiry aktif</p>
                        <p className="mt-1">
                          Ref ID: <span className="font-mono">{createRefId}</span>
                          {inquiryStatus ? ` • Status terakhir: ${inquiryStatus}` : ""}
                        </p>
                      </div>
                    ) : null}
                    <PrettyJson value={createResult} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Belum ada hasil create incoming.
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Inquiry UID</h2>
              <p className="mt-1 text-sm text-slate-500">
                Masukkan <code>uid/refid</code> hasil create incoming untuk cek
                status transaksi langsung dari Poppay.
              </p>
            </div>

            <form
              className="mt-4 flex flex-col gap-3 sm:flex-row"
              onSubmit={runInquiry}
            >
              <input
                value={inquiryUid}
                onChange={(event) => setInquiryUid(event.target.value)}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2563eb] focus:bg-white"
                placeholder="Masukkan uid/refid Poppay"
              />
              <button
                type="submit"
                disabled={inquiryLoading || !inquiryUid.trim()}
                className="rounded-full bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inquiryLoading ? "Mengecek..." : "Jalankan Inquiry"}
              </button>
            </form>

            <div className="mt-4">
              {inquiryResult ? (
                <PrettyJson value={inquiryResult} />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada hasil inquiry.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
