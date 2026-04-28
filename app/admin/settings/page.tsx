"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteConfigData {
  raw: Record<string, string>;
  modes: {
    DIGIFLAZZ: "mock" | "real";
    VIP_RESELLER: "mock" | "real";
  };
  envDefaults: Record<string, string>;
}

interface ProviderDef {
  key: string;               // site-config key in DB
  label: string;
  description: string;
  icon: string;
  modeKey: keyof SiteConfigData["modes"];
  envKey: string;
  /** Nilai saat toggle "off" (default/aman) */
  offValue: string;
  /** Nilai saat toggle "on" (aktif/live) */
  onValue: string;
  /** Label badge saat off */
  offLabel: string;
  /** Label badge saat on */
  onLabel: string;
}

const PROVIDERS: ProviderDef[] = [
  {
    key: "PROVIDER_DIGIFLAZZ_MODE",
    label: "Digiflazz",
    description: "Provider utama untuk produk game & pulsa",
    icon: "⚡",
    modeKey: "DIGIFLAZZ",
    envKey: "PROVIDER_DIGIFLAZZ_MODE",
    offValue: "mock",
    onValue: "real",
    offLabel: "MOCK",
    onLabel: "REAL",
  },
  {
    key: "PROVIDER_VIP_MODE",
    label: "VIP Reseller",
    description: "Provider alternatif untuk produk digital",
    icon: "🏆",
    modeKey: "VIP_RESELLER",
    envKey: "PROVIDER_VIP_MODE",
    offValue: "mock",
    onValue: "real",
    offLabel: "MOCK",
    onLabel: "REAL",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [config, setConfig] = useState<SiteConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Website settings state
  const [siteName, setSiteName] = useState("");
  const [siteLogo, setSiteLogo] = useState("");
  const [siteFavicon, setSiteFavicon] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [siteKeywords, setSiteKeywords] = useState("");
  const [siteSaving, setSiteSaving] = useState<string | null>(null);

  // Fonnte WhatsApp token
  const [fonnteToken, setFonnteToken] = useState("");
  const [showFonnteToken, setShowFonnteToken] = useState(false);

  // SMTP Email settings
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpTestSending, setSmtpTestSending] = useState(false);
  const [poppayApiBaseUrl, setPoppayApiBaseUrl] = useState("");
  const [poppayUrl, setPoppayUrl] = useState("");
  const [poppayPort, setPoppayPort] = useState("");
  const [poppayVersion, setPoppayVersion] = useState("");
  const [poppayIntegratorToken, setPoppayIntegratorToken] = useState("");
  const [poppayAggregatorCode, setPoppayAggregatorCode] = useState("");
  const [poppaySecretKey, setPoppaySecretKey] = useState("");
  const [poppayMerchantAccountNumber, setPoppayMerchantAccountNumber] = useState("");
  const [poppayEmail, setPoppayEmail] = useState("");
  const [poppayPassword, setPoppayPassword] = useState("");
  const [paymentGatewayQrisFeeType, setPaymentGatewayQrisFeeType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [paymentGatewayQrisFeeValue, setPaymentGatewayQrisFeeValue] = useState("0");
  const [showPoppayIntegratorToken, setShowPoppayIntegratorToken] = useState(false);
  const [showPoppaySecretKey, setShowPoppaySecretKey] = useState(false);
  const [showPoppayPassword, setShowPoppayPassword] = useState(false);
  const [digiflazzUsername, setDigiflazzUsername] = useState("");
  const [digiflazzApiKey, setDigiflazzApiKey] = useState("");
  const [digiflazzBaseUrl, setDigiflazzBaseUrl] = useState("https://api.digiflazz.com/v1");
  const [showDigiflazzApiKey, setShowDigiflazzApiKey] = useState(false);
  const [vipApiId, setVipApiId] = useState("");
  const [vipApiKey, setVipApiKey] = useState("");
  const [vipSign, setVipSign] = useState("");
  const [vipBaseUrl, setVipBaseUrl] = useState("https://vip-reseller.co.id/api");
  const [showVipApiKey, setShowVipApiKey] = useState(false);
  const [showVipSign, setShowVipSign] = useState(false);

  const toast = useToast();

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-config");
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        const raw = data.data?.raw ?? {};
        const envDefaults = data.data?.envDefaults ?? {};

        setSiteName(raw.site_name ?? "Website");
        setSiteLogo(raw.site_logo ?? "");
        setSiteFavicon(raw.site_favicon ?? "");
        setSiteDescription(raw.site_description ?? "");
        setSiteKeywords(raw.site_keywords ?? "");
        setFonnteToken(raw.FONNTE_TOKEN ?? "");
        setSmtpHost(raw.SMTP_HOST ?? "");
        setSmtpPort(raw.SMTP_PORT ?? "587");
        setSmtpUser(raw.SMTP_USER ?? "");
        setSmtpPass(raw.SMTP_PASS ?? "");
        setSmtpFrom(raw.SMTP_FROM ?? "");
        setPoppayApiBaseUrl(raw.POPPAY_API_BASE_URL ?? envDefaults.POPPAY_API_BASE_URL ?? "");
        setPoppayUrl(raw.POPPAY_URL ?? envDefaults.POPPAY_URL ?? "");
        setPoppayPort(raw.POPPAY_PORT ?? envDefaults.POPPAY_PORT ?? "");
        setPoppayVersion(raw.POPPAY_VERSION ?? envDefaults.POPPAY_VERSION ?? "");
        setPoppayIntegratorToken(raw.POPPAY_INTEGRATOR_TOKEN ?? envDefaults.POPPAY_INTEGRATOR_TOKEN ?? "");
        setPoppayAggregatorCode(raw.POPPAY_AGGREGATOR_CODE ?? envDefaults.POPPAY_AGGREGATOR_CODE ?? "");
        setPoppaySecretKey(raw.POPPAY_SECRET_KEY ?? envDefaults.POPPAY_SECRET_KEY ?? "");
        setPoppayMerchantAccountNumber(raw.POPPAY_MERCHANT_ACCOUNT_NUMBER ?? envDefaults.POPPAY_MERCHANT_ACCOUNT_NUMBER ?? "");
        setPoppayEmail(raw.POPPAY_EMAIL ?? envDefaults.POPPAY_EMAIL ?? "");
        setPoppayPassword(raw.POPPAY_PASSWORD ?? envDefaults.POPPAY_PASSWORD ?? "");
        setPaymentGatewayQrisFeeType(
          (raw.PAYMENT_GATEWAY_QRIS_FEE_TYPE ?? envDefaults.PAYMENT_GATEWAY_QRIS_FEE_TYPE ?? "FIXED") === "PERCENT"
            ? "PERCENT"
            : "FIXED"
        );
        setPaymentGatewayQrisFeeValue(raw.PAYMENT_GATEWAY_QRIS_FEE_VALUE ?? envDefaults.PAYMENT_GATEWAY_QRIS_FEE_VALUE ?? "0");
        setDigiflazzUsername(raw.DIGIFLAZZ_USERNAME ?? envDefaults.DIGIFLAZZ_USERNAME ?? "");
        setDigiflazzApiKey(raw.DIGIFLAZZ_API_KEY ?? envDefaults.DIGIFLAZZ_API_KEY ?? "");
        setDigiflazzBaseUrl(raw.DIGIFLAZZ_BASE_URL ?? envDefaults.DIGIFLAZZ_BASE_URL ?? "https://api.digiflazz.com/v1");
        setVipApiId(raw.VIP_API_ID ?? envDefaults.VIP_API_ID ?? "");
        setVipApiKey(raw.VIP_API_KEY ?? envDefaults.VIP_API_KEY ?? "");
        setVipSign(raw.VIP_SIGN ?? envDefaults.VIP_SIGN ?? "");
        setVipBaseUrl(raw.VIP_BASE_URL ?? envDefaults.VIP_BASE_URL ?? "https://vip-reseller.co.id/api");
      } else {
        toast.error("Gagal memuat konfigurasi");
      }
    } catch {
      toast.error("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function toggleMode(provider: ProviderDef, currentMode: string) {
    const newMode = currentMode === provider.offValue ? provider.onValue : provider.offValue;
    setSaving((s) => ({ ...s, [provider.key]: true }));
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: provider.key, value: newMode }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                raw: { ...prev.raw, [provider.key]: newMode },
                modes: { ...prev.modes, [provider.modeKey]: newMode },
              }
            : prev
        );
        toast.success(
          `${provider.label} beralih ke mode ${newMode.toUpperCase()}`
        );
      } else {
        toast.error(data.error ?? "Gagal menyimpan");
      }
    } catch {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setSaving((s) => ({ ...s, [provider.key]: false }));
    }
  }

  async function resetToEnvDefault(provider: ProviderDef) {
    setSaving((s) => ({ ...s, [provider.key]: true }));
    try {
      const res = await fetch(`/api/admin/site-config?key=${encodeURIComponent(provider.key)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setConfig((prev) => {
          if (!prev) return prev;
          const newRaw = { ...prev.raw };
          delete newRaw[provider.key];
          return { ...prev, raw: newRaw, modes: data.data.modes };
        });
        toast.success(`${provider.label} direset ke default .env`);
      } else {
        toast.error(data.error ?? "Gagal reset");
      }
    } catch {
      toast.error("Gagal reset");
    } finally {
      setSaving((s) => ({ ...s, [provider.key]: false }));
    }
  }

  // ── Website setting save helper ────────────────────────────────────────────

  async function saveSiteSetting(key: string, value: string, label: string) {
    setSiteSaving(key);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (data.success) toast.success(`${label} disimpan`);
      else toast.error(`Gagal menyimpan ${label}`);
    } catch {
      toast.error(`Gagal menyimpan ${label}`);
    } finally {
      setSiteSaving(null);
    }
  }

  // ── Save all SMTP settings at once ─────────────────────────────────────────

  async function saveSmtpSettings() {
    setSiteSaving("smtp_all");
    try {
      const pairs: { key: string; value: string }[] = [
        { key: "SMTP_HOST", value: smtpHost },
        { key: "SMTP_PORT", value: smtpPort },
        { key: "SMTP_USER", value: smtpUser },
        { key: "SMTP_PASS", value: smtpPass },
        { key: "SMTP_FROM", value: smtpFrom },
      ];
      for (const { key, value } of pairs) {
        const res = await fetch("/api/admin/site-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(`Gagal menyimpan ${key}`);
          setSiteSaving(null);
          return;
        }
      }
      toast.success("Konfigurasi SMTP berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan konfigurasi SMTP");
    } finally {
      setSiteSaving(null);
    }
  }

  async function saveConfigPairs(pairs: { key: string; value: string }[], successMessage: string, savingKey: string) {
    setSiteSaving(savingKey);
    try {
      for (const { key, value } of pairs) {
        const res = await fetch("/api/admin/site-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(`Gagal menyimpan ${key}`);
          setSiteSaving(null);
          return;
        }
      }
      toast.success(successMessage);
      await loadConfig();
    } catch {
      toast.error(`Gagal menyimpan ${successMessage.toLowerCase()}`);
    } finally {
      setSiteSaving(null);
    }
  }

  async function saveProviderCredentials() {
    await saveConfigPairs(
      [
        { key: "DIGIFLAZZ_USERNAME", value: digiflazzUsername },
        { key: "DIGIFLAZZ_API_KEY", value: digiflazzApiKey },
        { key: "DIGIFLAZZ_BASE_URL", value: digiflazzBaseUrl },
        { key: "VIP_API_ID", value: vipApiId },
        { key: "VIP_API_KEY", value: vipApiKey },
        { key: "VIP_SIGN", value: vipSign },
        { key: "VIP_BASE_URL", value: vipBaseUrl },
      ],
      "Kredensial provider berhasil disimpan",
      "provider_credentials"
    );
  }

  async function sendTestEmail() {
    if (!smtpUser) {
      toast.error("Simpan konfigurasi SMTP terlebih dahulu");
      return;
    }
    setSmtpTestSending(true);
    try {
      const res = await fetch("/api/admin/smtp-test", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Email test berhasil dikirim ke ${data.to}`);
      } else {
        toast.error(data.error ?? "Gagal mengirim email test");
      }
    } catch {
      toast.error("Gagal mengirim email test");
    } finally {
      setSmtpTestSending(false);
    }
  }

  async function savePoppaySettings() {
    setSiteSaving("poppay_all");
    try {
      const pairs: { key: string; value: string }[] = [
        { key: "POPPAY_API_BASE_URL", value: poppayApiBaseUrl },
        { key: "POPPAY_URL", value: poppayUrl },
        { key: "POPPAY_PORT", value: poppayPort },
        { key: "POPPAY_VERSION", value: poppayVersion },
        { key: "POPPAY_INTEGRATOR_TOKEN", value: poppayIntegratorToken },
        { key: "POPPAY_AGGREGATOR_CODE", value: poppayAggregatorCode },
        { key: "POPPAY_SECRET_KEY", value: poppaySecretKey },
        { key: "POPPAY_MERCHANT_ACCOUNT_NUMBER", value: poppayMerchantAccountNumber },
        { key: "POPPAY_EMAIL", value: poppayEmail },
        { key: "POPPAY_PASSWORD", value: poppayPassword },
        { key: "PAYMENT_GATEWAY_QRIS_FEE_TYPE", value: paymentGatewayQrisFeeType },
        { key: "PAYMENT_GATEWAY_QRIS_FEE_VALUE", value: paymentGatewayQrisFeeValue },
      ];
      for (const { key, value } of pairs) {
        const res = await fetch("/api/admin/site-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(`Gagal menyimpan ${key}`);
          setSiteSaving(null);
          return;
        }
      }
      toast.success("Konfigurasi Poppay berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan konfigurasi Poppay");
    } finally {
      setSiteSaving(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Page title */}
          <div>
            <h1 className="text-xl font-bold text-slate-800">⚙️ Pengaturan Sistem</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola mode operasi provider, kredensial API, dan pengaturan sistem.<span className="hidden sm:inline"> Perubahan disimpan ke database dan berlaku segera tanpa perlu restart.</span>
            </p>
          </div>

          {/* Mode legend */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
              <span className="text-base">🧪</span>
              <div>
                <p className="text-xs font-bold text-amber-700">MOCK / SANDBOX</p>
                <p className="text-[11px] text-amber-600">Simulasi / uji coba, aman untuk testing</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5">
              <span className="text-base">🌐</span>
              <div>
                <p className="text-xs font-bold text-green-700">REAL</p>
                <p className="text-[11px] text-green-600">Live — call API nyata / transaksi sungguhan</p>
              </div>
            </div>
          </div>

          {/* Provider cards */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
            <div className="px-5 py-4">
              <h2 className="text-sm font-bold text-slate-700">Mode Provider</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Toggle sakelar untuk beralih antara simulasi (mock) dan API nyata (real).
                Nilai di database override nilai di file .env.
              </p>
            </div>

            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3.5 w-32 bg-slate-200 rounded mb-1.5" />
                    <div className="h-2.5 w-48 bg-slate-100 rounded" />
                  </div>
                  <div className="w-12 h-6 bg-slate-200 rounded-full" />
                </div>
              ))
            ) : (
              PROVIDERS.map((provider) => {
                const effectiveMode = config?.modes[provider.modeKey] ?? provider.offValue;
                const dbValue = config?.raw[provider.key];
                const envDefault = config?.envDefaults[provider.envKey] ?? provider.offValue;
                const isFromDB = !!dbValue;
                const isSaving = saving[provider.key] ?? false;
                const isReal = effectiveMode === provider.onValue;

                return (
                  <div key={provider.key} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                      isReal ? "bg-green-100" : "bg-amber-50"
                    }`}>
                      {provider.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{provider.label}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isReal
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {isReal ? provider.onLabel : provider.offLabel}
                        </span>
                        {isFromDB ? (
                          <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
                            dari DB
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full">
                            dari .env ({envDefault})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{provider.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isFromDB && (
                        <button
                          onClick={() => resetToEnvDefault(provider)}
                          disabled={isSaving}
                          className="text-[11px] text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-40"
                          title="Reset ke .env default"
                        >
                          Reset
                        </button>
                      )}

                      <button
                        onClick={() => toggleMode(provider, effectiveMode)}
                        disabled={isSaving}
                        role="switch"
                        aria-checked={isReal}
                        aria-label={`Toggle ${provider.label} mode`}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                          isReal ? "bg-green-500" : "bg-slate-300"
                        }`}
                      >
                        {isSaving ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent text-slate-400" />
                          </span>
                        ) : (
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                              isReal ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">🔑 Kredensial Provider</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kredensial Digiflazz dan VIP Reseller disimpan di database dan akan override nilai di `.env`.
              </p>
            </div>

            <div className="px-5 py-4 space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <h3 className="text-sm font-bold text-slate-800">Digiflazz</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Username</label>
                    <input
                      type="text"
                      value={digiflazzUsername}
                      onChange={(e) => setDigiflazzUsername(e.target.value)}
                      placeholder="username Digiflazz"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">API Key</label>
                    <div className="relative">
                      <input
                        type={showDigiflazzApiKey ? "text" : "password"}
                        value={digiflazzApiKey}
                        onChange={(e) => setDigiflazzApiKey(e.target.value)}
                        placeholder="api key Digiflazz"
                        className="w-full px-3 py-2.5 pr-14 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDigiflazzApiKey((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition"
                        tabIndex={-1}
                      >
                        {showDigiflazzApiKey ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Base URL</label>
                    <input
                      type="text"
                      value={digiflazzBaseUrl}
                      onChange={(e) => setDigiflazzBaseUrl(e.target.value)}
                      placeholder="https://api.digiflazz.com/v1"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <h3 className="text-sm font-bold text-slate-800">VIP Reseller</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">API ID</label>
                    <input
                      type="text"
                      value={vipApiId}
                      onChange={(e) => setVipApiId(e.target.value)}
                      placeholder="api id VIP"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">API Key</label>
                    <div className="relative">
                      <input
                        type={showVipApiKey ? "text" : "password"}
                        value={vipApiKey}
                        onChange={(e) => setVipApiKey(e.target.value)}
                        placeholder="api key VIP"
                        className="w-full px-3 py-2.5 pr-14 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowVipApiKey((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition"
                        tabIndex={-1}
                      >
                        {showVipApiKey ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Sign</label>
                    <div className="relative">
                      <input
                        type={showVipSign ? "text" : "password"}
                        value={vipSign}
                        onChange={(e) => setVipSign(e.target.value)}
                        placeholder="static sign VIP (opsional)"
                        className="w-full px-3 py-2.5 pr-14 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowVipSign((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition"
                        tabIndex={-1}
                      >
                        {showVipSign ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Kosongkan jika ingin signature dihitung otomatis dari API ID + API Key.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Base URL</label>
                    <input
                      type="text"
                      value={vipBaseUrl}
                      onChange={(e) => setVipBaseUrl(e.target.value)}
                      placeholder="https://vip-reseller.co.id/api"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-[10px] text-slate-500 font-medium">Prioritas pembacaan adapter: database → .env</span>
                </div>
                <button
                  onClick={saveProviderCredentials}
                  disabled={siteSaving === "provider_credentials"}
                  className="px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0"
                >
                  {siteSaving === "provider_credentials" ? "Menyimpan…" : "💾 Simpan Kredensial Provider"}
                </button>
              </div>
            </div>
          </div>

          {/* ─── Website Settings ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">🌐 Pengaturan Website</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nama, logo, favicon, deskripsi, dan identitas visual website.
              </p>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Site Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nama Website</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Nama website"
                    className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => saveSiteSetting("site_name", siteName, "Nama Website")}
                    disabled={siteSaving === "site_name"}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0"
                  >
                    {siteSaving === "site_name" ? "..." : "💾 Simpan"}
                  </button>
                </div>
              </div>

              {/* Site Logo */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">URL Logo</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={siteLogo}
                    onChange={(e) => setSiteLogo(e.target.value)}
                    placeholder="https://cdn.example.com/logo.png"
                    className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                  <button
                    onClick={() => saveSiteSetting("site_logo", siteLogo, "Logo")}
                    disabled={siteSaving === "site_logo"}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0"
                  >
                    {siteSaving === "site_logo" ? "..." : "💾 Simpan"}
                  </button>
                </div>
                {siteLogo && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl inline-flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={siteLogo} alt="Logo preview" className="h-10 w-auto object-contain" />
                    <span className="text-[10px] text-slate-400">Preview logo</span>
                  </div>
                )}
              </div>

              {/* Site Favicon */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">URL Favicon</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={siteFavicon}
                    onChange={(e) => setSiteFavicon(e.target.value)}
                    placeholder="https://cdn.example.com/favicon.ico"
                    className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                  <button
                    onClick={() => saveSiteSetting("site_favicon", siteFavicon, "Favicon")}
                    disabled={siteSaving === "site_favicon"}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0"
                  >
                    {siteSaving === "site_favicon" ? "..." : "💾 Simpan"}
                  </button>
                </div>
                {siteFavicon && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-xl inline-flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={siteFavicon} alt="Favicon preview" className="h-6 w-6 object-contain" />
                    <span className="text-[10px] text-slate-400">Preview favicon</span>
                  </div>
                )}
              </div>

              {/* Site Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Deskripsi (Meta Description)</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    placeholder="Top up game murah, voucher digital, dan bayar tagihan PPOB terpercaya di website Anda."
                    rows={2}
                    className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none"
                  />
                  <button
                    onClick={() => saveSiteSetting("site_description", siteDescription, "Deskripsi")}
                    disabled={siteSaving === "site_description"}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0 sm:self-start"
                  >
                    {siteSaving === "site_description" ? "..." : "💾 Simpan"}
                  </button>
                </div>
              </div>

              {/* Site Keywords */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Keywords (Meta Keywords)</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={siteKeywords}
                    onChange={(e) => setSiteKeywords(e.target.value)}
                    placeholder="top up game, voucher digital, ppob, whuzpay"
                    className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => saveSiteSetting("site_keywords", siteKeywords, "Keywords")}
                    disabled={siteSaving === "site_keywords"}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0"
                  >
                    {siteSaving === "site_keywords" ? "..." : "💾 Simpan"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Pisahkan dengan koma. Digunakan untuk SEO.</p>
              </div>
            </div>
          </div>

          {/* ─── Fonnte WhatsApp Token ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">📱 Fonnte WhatsApp (OTP)</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Token untuk mengirim OTP via WhatsApp. Dapatkan dari{" "}
                <a
                  href="https://fonnte.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline font-medium"
                >
                  fonnte.com
                </a>
                {" "}→ Dashboard → Device → copy Token.
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Token input */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Fonnte API Token
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showFonnteToken ? "text" : "password"}
                      value={fonnteToken}
                      onChange={(e) => setFonnteToken(e.target.value)}
                      placeholder="Masukkan token dari dashboard Fonnte"
                      className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFonnteToken((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showFonnteToken ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => saveSiteSetting("FONNTE_TOKEN", fonnteToken, "Fonnte Token")}
                    disabled={siteSaving === "FONNTE_TOKEN"}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#1da851] transition disabled:opacity-50 flex-shrink-0"
                  >
                    {siteSaving === "FONNTE_TOKEN" ? "..." : "💾 Simpan"}
                  </button>
                </div>
                {fonnteToken ? (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="text-[10px] text-green-600 font-medium">Token sudah dikonfigurasi</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-[10px] text-amber-600 font-medium">Token belum diisi — login OTP WhatsApp tidak akan berfungsi</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── SMTP Email Configuration ──────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">📧 SMTP Email (OTP)</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Konfigurasi SMTP untuk mengirim OTP dan notifikasi via email.
                Disarankan menggunakan Gmail App Password atau layanan SMTP transactional.
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* SMTP Host */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    SMTP Port
                  </label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">587 (TLS) atau 465 (SSL)</p>
                </div>
              </div>

              {/* SMTP User */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  SMTP Username / Email
                </label>
                <input
                  type="email"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                />
              </div>

              {/* SMTP Pass */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  SMTP Password / App Password
                </label>
                <div className="relative">
                  <input
                    type={showSmtpPass ? "text" : "password"}
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="App Password dari Google atau password SMTP"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showSmtpPass ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Untuk Gmail, gunakan{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline font-medium"
                  >
                    App Password
                  </a>{" "}
                  (bukan password akun biasa).
                </p>
              </div>

              {/* SMTP From */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Sender / From Email
                </label>
                <input
                  type="email"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="noreply@whuzpay.com"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Alamat email pengirim yang ditampilkan pada email OTP. Biasanya sama dengan SMTP Username.
                </p>
              </div>

              {/* Status & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div>
                  {smtpUser && smtpPass ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <span className="text-[10px] text-green-600 font-medium">SMTP sudah dikonfigurasi</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="text-[10px] text-amber-600 font-medium">SMTP belum dikonfigurasi — OTP Email tidak akan berfungsi</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={sendTestEmail}
                    disabled={smtpTestSending || !smtpUser || !smtpPass}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition disabled:opacity-50 flex-shrink-0"
                  >
                    {smtpTestSending ? "Mengirim…" : "📤 Kirim Test Email"}
                  </button>
                  <button
                    onClick={saveSmtpSettings}
                    disabled={siteSaving === "smtp_all"}
                    className="px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0"
                  >
                    {siteSaving === "smtp_all" ? "Menyimpan…" : "💾 Simpan Semua"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">💠 Poppay QRIS</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kredensial Poppay disimpan di database dan akan override nilai di `.env`. Saat Poppay aktif, metode pembayaran public akan dibatasi ke QRIS.
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={poppayApiBaseUrl}
                  onChange={(e) => setPoppayApiBaseUrl(e.target.value)}
                  placeholder="https://api.example.com:443"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Jika diisi, sistem langsung pakai base URL ini. Jika kosong, sistem akan memakai Host + Port di bawah.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Host / URL
                  </label>
                  <input
                    type="text"
                    value={poppayUrl}
                    onChange={(e) => setPoppayUrl(e.target.value)}
                    placeholder="api.example.com"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Port
                  </label>
                  <input
                    type="text"
                    value={poppayPort}
                    onChange={(e) => setPoppayPort(e.target.value)}
                    placeholder="443"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Version
                  </label>
                  <input
                    type="text"
                    value={poppayVersion}
                    onChange={(e) => setPoppayVersion(e.target.value)}
                    placeholder="v1"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Integrator Token
                </label>
                <div className="relative">
                  <input
                    type={showPoppayIntegratorToken ? "text" : "password"}
                    value={poppayIntegratorToken}
                    onChange={(e) => setPoppayIntegratorToken(e.target.value)}
                    placeholder="Bearer token dari Poppay"
                    className="w-full px-3 py-2.5 pr-14 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPoppayIntegratorToken((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPoppayIntegratorToken ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Aggregator Code
                  </label>
                  <input
                    type="text"
                    value={poppayAggregatorCode}
                    onChange={(e) => setPoppayAggregatorCode(e.target.value)}
                    placeholder="3BnbE0lmRLRL1GltciUlTaVqbCV"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Merchant Account Number
                  </label>
                  <input
                    type="text"
                    value={poppayMerchantAccountNumber}
                    onChange={(e) => setPoppayMerchantAccountNumber(e.target.value)}
                    placeholder="1775127696315"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Login Email
                  </label>
                  <input
                    type="email"
                    value={poppayEmail}
                    onChange={(e) => setPoppayEmail(e.target.value)}
                    placeholder="finance@poppay.com"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Email akun API/login Poppay untuk mengambil access token.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Login Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPoppayPassword ? "text" : "password"}
                      value={poppayPassword}
                      onChange={(e) => setPoppayPassword(e.target.value)}
                      placeholder="Password akun Poppay"
                      className="w-full px-3 py-2.5 pr-14 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPoppayPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showPoppayPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showPoppaySecretKey ? "text" : "password"}
                    value={poppaySecretKey}
                    onChange={(e) => setPoppaySecretKey(e.target.value)}
                    placeholder="Secret key untuk verifikasi callback/signature"
                    className="w-full px-3 py-2.5 pr-14 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPoppaySecretKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPoppaySecretKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Biaya Admin QRIS</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    Berlaku global untuk checkout Payment Gateway Poppay QRIS dan top up saldo.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Tipe Biaya
                    </label>
                    <select
                      value={paymentGatewayQrisFeeType}
                      onChange={(e) => setPaymentGatewayQrisFeeType(e.target.value === "PERCENT" ? "PERCENT" : "FIXED")}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                    >
                      <option value="FIXED">Nominal Tetap</option>
                      <option value="PERCENT">Persentase</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Nilai Biaya
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={paymentGatewayQrisFeeType === "PERCENT" ? "0.01" : "1"}
                      value={paymentGatewayQrisFeeValue}
                      onChange={(e) => setPaymentGatewayQrisFeeValue(e.target.value)}
                      placeholder={paymentGatewayQrisFeeType === "PERCENT" ? "Contoh: 2.5" : "Contoh: 1000"}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      {paymentGatewayQrisFeeType === "PERCENT"
                        ? "Biaya dihitung persen dari nilai transaksi."
                        : "Biaya ditambahkan sebagai nominal tetap per transaksi."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div>
                  {poppayIntegratorToken && poppayAggregatorCode && poppayMerchantAccountNumber && poppayEmail && poppayPassword ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <span className="text-[10px] text-green-600 font-medium">Poppay sudah dikonfigurasi di database</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="text-[10px] text-amber-600 font-medium">Konfigurasi Poppay belum lengkap</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={savePoppaySettings}
                  disabled={siteSaving === "poppay_all"}
                  className="px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0"
                >
                  {siteSaving === "poppay_all" ? "Menyimpan…" : "💾 Simpan Konfigurasi Poppay"}
                </button>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full border-2 border-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-500 text-[9px] font-bold">i</span>
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                <strong>Prioritas konfigurasi:</strong> Nilai database (dari halaman ini) selalu
                override nilai di file <code className="bg-blue-100 px-1 rounded">.env</code>.
                Mode mock aman untuk testing — tidak mengirim request ke API provider sesungguhnya
                dan tidak mendebit saldo.
                Aktifkan mode <strong>REAL</strong> hanya saat siap produksi dan API key sudah dikonfigurasi.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
