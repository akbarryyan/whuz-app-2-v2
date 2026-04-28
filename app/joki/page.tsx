"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import AppHeader from "@/components/AppHeader";
import PageFooter from "@/components/PageFooter";
import {
  calculatePaymentGatewayFee,
  DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG,
  PaymentGatewayFeeConfig,
} from "@/lib/payment-gateway-fee";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface JokiProduct {
  id: string;
  providerCode: string;
  name: string;
  category: string;
  brand: string;
  type: string;
  providerPrice: number;
  sellingPrice: number;
  description: string | null;
}

interface BrandInfo {
  name: string;
  imageUrl: string | null;
  productCount: number;
}

interface VoucherItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscount: number | null;
  minPurchase: number;
  quota: number | null;
  usedCount: number;
  endDate: string | null;
  claimStatus: string | null;
  isFull: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JokiPage() {
  const router = useRouter();
  const toast = useToast();

  // Catalog state
  const [brands, setBrands] = useState<BrandInfo[]>([]);
  const [products, setProducts] = useState<JokiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<JokiProduct | null>(null);

  // Joki form fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [additionalData, setAdditionalData] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [whatsapp, setWhatsapp] = useState("");

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "PAYMENT_GATEWAY" | null>(null);
  const [pgMethod, setPgMethod] = useState<string>("qris");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [feeConfig, setFeeConfig] = useState<PaymentGatewayFeeConfig>(DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG);
  const [pgMethods, setPgMethods] = useState<
    { id: string; key: string; label: string; group: string; imageUrl: string | null }[]
  >([]);

  // Voucher state
  const [claimedVouchers, setClaimedVouchers] = useState<VoucherItem[]>([]);
  const [showVoucherSheet, setShowVoucherSheet] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    title: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    discountAmount: number;
  } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<{
    orderCode: string;
    status: string;
    amount: number;
    productName: string;
    paymentUrl?: string;
    invoiceId?: string;
    mode: string;
  } | null>(null);

  // ── Load catalog ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/catalog/joki")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setBrands(d.brands);
          setProducts(d.products);
        } else {
          setError(d.error || "Gagal memuat katalog joki.");
        }
      })
      .catch(() => setError("Gagal memuat data. Periksa koneksi Anda."))
      .finally(() => setLoading(false));
  }, []);

  // ── Load payment methods ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPgMethods(d.data);
          setFeeConfig(d.feeConfig ?? DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG);
        }
      })
      .catch(() => {});
  }, []);

  // ── Load wallet + auth state ──────────────────────────────────────────────
  useEffect(() => {
    setWalletLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.isLoggedIn) {
          setIsLoggedIn(true);
          if (d.user?.balance != null) setWalletBalance(Number(d.user.balance));
        } else {
          setIsLoggedIn(false);
          setWalletBalance(null);
        }
      })
      .catch(() => { setIsLoggedIn(false); setWalletBalance(null); })
      .finally(() => setWalletLoading(false));
  }, []);

  // ── Load claimed vouchers ─────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/vouchers")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setClaimedVouchers(d.data.filter((v: VoucherItem) => v.claimStatus === "CLAIMED"));
        }
      })
      .catch(() => {});
  }, []);

  // Reset voucher when product changes
  useEffect(() => {
    setAppliedVoucher(null);
    setVoucherError(null);
  }, [selectedProduct?.id]);

  // Products filtered by selected brand
  const brandProducts = useMemo(() => {
    if (!selectedBrand) return [];
    return products.filter((p) => p.brand === selectedBrand);
  }, [products, selectedBrand]);

  // Final price after voucher
  const finalPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    if (!appliedVoucher) return selectedProduct.sellingPrice;
    return Math.max(1, selectedProduct.sellingPrice - appliedVoucher.discountAmount);
  }, [selectedProduct, appliedVoucher]);

  // Can checkout?
  const canCheckout =
    !!selectedProduct &&
    !!paymentMethod &&
    !checkoutLoading &&
    username.trim().length >= 2 &&
    password.trim().length >= 1 &&
    quantity >= 1;

  // ── Voucher handlers ──────────────────────────────────────────────────────
  const handleSelectVoucher = async (voucher: VoucherItem) => {
    if (!selectedProduct) {
      setVoucherError("Pilih produk terlebih dahulu sebelum menggunakan voucher.");
      return;
    }
    setVoucherLoading(true);
    setVoucherError(null);
    try {
      const res = await fetch(
        `/api/vouchers/validate?code=${encodeURIComponent(voucher.code)}&amount=${selectedProduct.sellingPrice}`
      );
      const data = await res.json();
      if (!data.success) {
        setVoucherError(data.error ?? "Voucher tidak valid.");
        setAppliedVoucher(null);
      } else {
        setAppliedVoucher({
          code: data.data.code,
          title: data.data.title,
          discountType: data.data.discountType,
          discountValue: data.data.discountValue,
          discountAmount: data.data.discountAmount,
        });
        setVoucherError(null);
        setShowVoucherSheet(false);
      }
    } catch {
      setVoucherError("Gagal memvalidasi voucher. Coba lagi.");
    } finally {
      setVoucherLoading(false);
    }
  };

  // ── Checkout handler ──────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!selectedProduct) { toast.error("Pilih layanan joki terlebih dahulu."); return; }
    if (!username.trim()) { toast.error("Masukkan Username/Email akun game."); return; }
    if (!password.trim()) { toast.error("Masukkan Password akun game."); return; }
    if (quantity < 1) { toast.error("Quantity minimal 1."); return; }
    if (!paymentMethod) { toast.error("Pilih metode pembayaran terlebih dahulu."); return; }

    setCheckoutLoading(true);
    try {
      const body: Record<string, unknown> = {
        productId: selectedProduct.id,
        targetNumber: username.trim(),
        targetData: {
          password: password.trim(),
          additional_data: additionalData.trim(),
          quantity: Number(quantity),
        },
        paymentMethod,
        whatsapp: whatsapp.trim() || undefined,
        voucherCode: appliedVoucher?.code || undefined,
      };

      if (paymentMethod === "PAYMENT_GATEWAY") {
        body.paymentGatewayMethod = pgMethod;
        body.redirectUrl = `${window.location.origin}/akun/pesanan`;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error ?? "Checkout gagal. Coba lagi.");
        return;
      }

      const result = data.data as {
        orderCode: string;
        status: string;
        amount: number;
        paymentUrl?: string;
        invoiceId?: string;
        viewToken?: string;
      };

      if (paymentMethod === "PAYMENT_GATEWAY") {
        const orderUrl = result.viewToken
          ? `/akun/pesanan/${encodeURIComponent(result.orderCode)}?token=${encodeURIComponent(result.viewToken)}`
          : `/akun/pesanan/${encodeURIComponent(result.orderCode)}`;

        window.location.href = orderUrl;
        return;
      }

      setCheckoutResult({
        ...result,
        productName: selectedProduct.name,
        mode: data.mode ?? "mock",
      });
    } catch {
      toast.error("Terjadi kesalahan. Periksa koneksi Anda.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5]`}>
        <div className="relative w-full max-w-[480px] min-h-screen bg-white shadow-2xl flex flex-col">
          <div className="px-3 py-3 flex items-center gap-2" style={{ backgroundColor: "#003D99" }}>
            <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse flex-shrink-0" />
            <div className="flex-1 flex items-center justify-center gap-2">
              <div className="h-4 w-28 bg-white/20 rounded-lg animate-pulse" />
            </div>
            <div className="flex gap-1">
              <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse" />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm font-medium">Memuat layanan joki…</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5]`}>
        <div className="relative w-full max-w-[480px] min-h-screen bg-white shadow-2xl flex flex-col">
          <AppHeader />
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <div className="text-4xl mb-3">😵</div>
              <p className="text-slate-600 font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success overlay ────────────────────────────────────────────────────────
  if (checkoutResult) {
    return (
      <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5]`}>
        <div className="relative w-full max-w-[480px] min-h-screen bg-white shadow-2xl flex flex-col">
          <AppHeader />
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl">
              🎮
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-1">Pesanan Diterima!</h2>
              <p className="text-slate-500 text-sm">
                Tim joki kami akan segera memproses pesanan Anda.
              </p>
            </div>
            <div className="w-full rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Kode Pesanan</span>
                <span className="font-bold text-slate-800">{checkoutResult.orderCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Layanan</span>
                <span className="font-semibold text-slate-700 text-right max-w-[55%]">{checkoutResult.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Bayar</span>
                <span className="font-bold text-blue-700">Rp {formatPrice(checkoutResult.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-yellow-600">Sedang Diproses</span>
              </div>
            </div>
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => router.push(`/akun/pesanan/${encodeURIComponent(checkoutResult.orderCode)}`)}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm"
              >
                Lihat Detail Pesanan
              </button>
              <button
                onClick={() => {
                  setCheckoutResult(null);
                  setSelectedProduct(null);
                  setUsername("");
                  setPassword("");
                  setAdditionalData("");
                  setQuantity(1);
                  setAppliedVoucher(null);
                  setPaymentMethod(null);
                }}
                className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm"
              >
                Pesan Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  const pgFee = paymentMethod === "PAYMENT_GATEWAY"
    ? calculatePaymentGatewayFee(pgMethod, finalPrice, feeConfig)
    : 0;
  const totalAmount = finalPrice + pgFee;

  const pgGroups = pgMethods.reduce<Record<string, typeof pgMethods>>(
    (acc, m) => { (acc[m.group] ??= []).push(m); return acc; },
    {}
  );

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5]`}>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="relative w-full max-w-[480px] min-h-screen bg-white shadow-2xl flex flex-col pb-4">
        <AppHeader />

        <div className="flex-1 flex flex-col gap-4 px-4 py-4 bg-slate-50 overflow-y-auto">

          {/* ── Step 1: Pilih Game ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              Pilih Game
            </h2>

            {brands.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Belum ada layanan joki tersedia.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {brands.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => {
                      setSelectedBrand(b.name);
                      setSelectedProduct(null);
                    }}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                      selectedBrand === b.name
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    {b.imageUrl ? (
                      <img
                        src={b.imageUrl}
                        alt={b.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-slate-700 text-center leading-tight line-clamp-2">
                      {b.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Step 2: Pilih Layanan Joki ────────────────────────────── */}
          {selectedBrand && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Pilih Layanan Joki
              </h2>
              <div className="flex flex-col gap-2">
                {brandProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      selectedProduct?.id === p.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-3 text-right">
                      <p className="font-bold text-blue-700 text-sm">
                        Rp {formatPrice(p.sellingPrice)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Data Akun Game ─────────────────────────────────── */}
          {selectedProduct && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                Data Akun Game
              </h2>

              {/* Username / Email */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Username / Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau email akun game"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              {/* Password */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Password Akun <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password akun game"
                    className="w-full px-4 py-2.5 pr-12 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                  >
                    {showPassword ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Data akun hanya digunakan untuk proses joki dan tidak disimpan permanen.
                </p>
              </div>

              {/* Additional Data */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  value={additionalData}
                  onChange={(e) => setAdditionalData(e.target.value)}
                  placeholder="Login|Nickname|Hero yang diminta|Catatan lain"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Format: Login | Nickname | Hero | Catatan (pisahkan dengan "|")
                </p>
              </div>

              {/* Quantity */}
              <div className="mb-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Jumlah <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold text-lg flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center px-2 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold text-lg flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: WhatsApp ──────────────────────────────────────── */}
          {selectedProduct && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">4</span>
                Nomor WhatsApp
                <span className="text-xs font-normal text-slate-400">(opsional)</span>
              </h2>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
              <p className="text-xs text-slate-400 mt-1">
                Untuk notifikasi dan update status joki.
              </p>
            </div>
          )}

          {/* ── Step 5: Voucher ────────────────────────────────────────── */}
          {selectedProduct && isLoggedIn && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">5</span>
                Voucher
              </h2>
              {appliedVoucher ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-green-700">{appliedVoucher.title}</p>
                    <p className="text-xs text-green-600">
                      Hemat Rp {formatPrice(appliedVoucher.discountAmount)}
                    </p>
                  </div>
                  <button
                    onClick={() => { setAppliedVoucher(null); setVoucherError(null); }}
                    className="text-slate-400 hover:text-red-500 text-lg font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowVoucherSheet(true)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 text-sm hover:bg-slate-100 transition-colors"
                >
                  <span>Pilih voucher diskon</span>
                  <span className="text-blue-500 font-semibold text-xs">Lihat</span>
                </button>
              )}
              {voucherError && (
                <p className="text-xs text-red-500 mt-1.5">{voucherError}</p>
              )}
            </div>
          )}

          {/* ── Step 6: Metode Pembayaran ──────────────────────────────── */}
          {selectedProduct && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  {isLoggedIn ? "6" : "5"}
                </span>
                Metode Pembayaran
              </h2>

              <div className="flex flex-col gap-2">
                {/* Wallet option */}
                {isLoggedIn && (
                  <button
                    onClick={() => setPaymentMethod("WALLET")}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                      paymentMethod === "WALLET"
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">₩</div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-800">Saldo Dompet</p>
                        <p className="text-xs text-slate-400">
                          {walletLoading ? "Memuat…" : `Rp ${formatPrice(walletBalance ?? 0)}`}
                        </p>
                      </div>
                    </div>
                    {paymentMethod === "WALLET" && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                )}

                {/* Payment gateway option */}
                <button
                  onClick={() => {
                    setPaymentMethod("PAYMENT_GATEWAY");
                    setShowPaymentSheet(true);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                    paymentMethod === "PAYMENT_GATEWAY"
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-100 bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">💳</div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-800">Transfer / QRIS</p>
                      <p className="text-xs text-slate-400">
                        {paymentMethod === "PAYMENT_GATEWAY"
                          ? pgMethods.find((m) => m.key === pgMethod)?.label ?? pgMethod
                          : "Pilih metode"}
                      </p>
                    </div>
                  </div>
                  {paymentMethod === "PAYMENT_GATEWAY" && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Order Summary ──────────────────────────────────────────── */}
          {selectedProduct && paymentMethod && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-slate-700 text-sm mb-3">Ringkasan Pesanan</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Layanan</span>
                  <span className="font-medium text-slate-800 text-right max-w-[55%]">
                    {selectedProduct.name}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Harga</span>
                  <span className="font-medium">Rp {formatPrice(selectedProduct.sellingPrice)}</span>
                </div>
                {appliedVoucher && (
                  <div className="flex justify-between text-green-600">
                    <span>Diskon Voucher</span>
                    <span className="font-medium">− Rp {formatPrice(appliedVoucher.discountAmount)}</span>
                  </div>
                )}
                {pgFee > 0 && (
                  <div className="flex justify-between text-slate-500 text-xs">
                    <span>Biaya pembayaran (est.)</span>
                    <span>+ Rp {formatPrice(pgFee)}</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-800">
                  <span>Total</span>
                  <span className="text-blue-700">Rp {formatPrice(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Checkout Button ─────────────────────────────────────────── */}
          {selectedProduct && (
            <button
              onClick={handleCheckout}
              disabled={!canCheckout}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all shadow-sm ${
                canCheckout
                  ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {checkoutLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Memproses…
                </span>
              ) : (
                "Pesan Sekarang"
              )}
            </button>
          )}

        </div>

        <PageFooter />
      </div>

      {/* ── Payment Method Sheet ───────────────────────────────────────── */}
      {showPaymentSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowPaymentSheet(false)}
        >
          <div
            className="w-full max-w-[480px] bg-white rounded-t-3xl px-5 py-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-base">Pilih Metode Pembayaran</h3>
              <button
                onClick={() => setShowPaymentSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold"
              >
                ×
              </button>
            </div>
            {Object.keys(pgGroups).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Belum ada metode tersedia.</p>
            ) : (
              Object.entries(pgGroups).map(([group, methods]) => (
                <div key={group} className="mb-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{group}</p>
                  <div className="flex flex-col gap-1.5">
                    {methods.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => { setPgMethod(m.key); setShowPaymentSheet(false); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                          pgMethod === m.key
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-100 bg-slate-50 hover:border-slate-200"
                        }`}
                      >
                        {m.imageUrl && (
                          <img src={m.imageUrl} alt={m.label} className="w-8 h-8 object-contain rounded-md" />
                        )}
                        <span className="text-sm font-semibold text-slate-700">{m.label}</span>
                        {pgMethod === m.key && (
                          <div className="ml-auto w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Voucher Sheet ────────────────────────────────────────────────── */}
      {showVoucherSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowVoucherSheet(false)}
        >
          <div
            className="w-full max-w-[480px] bg-white rounded-t-3xl px-5 py-6 max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-base">Pilih Voucher</h3>
              <button
                onClick={() => setShowVoucherSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold"
              >
                ×
              </button>
            </div>
            {claimedVouchers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-3xl mb-2">🎟️</div>
                <p className="text-sm">Belum ada voucher yang bisa digunakan.</p>
                <button
                  onClick={() => { setShowVoucherSheet(false); router.push("/voucher"); }}
                  className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  Klaim Voucher
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {claimedVouchers.map((v) => {
                  const canApply = selectedProduct
                    ? selectedProduct.sellingPrice >= v.minPurchase && !v.isFull
                    : false;
                  return (
                    <button
                      key={v.id}
                      onClick={() => canApply && handleSelectVoucher(v)}
                      disabled={!canApply || voucherLoading}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                        canApply
                          ? "border-green-200 bg-green-50 hover:border-green-300"
                          : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{v.title}</p>
                        <p className="text-xs text-slate-500">
                          {v.discountType === "FIXED"
                            ? `Diskon Rp ${formatPrice(v.discountValue)}`
                            : `Diskon ${v.discountValue}%${v.maxDiscount ? ` (maks Rp ${formatPrice(v.maxDiscount)})` : ""}`}
                        </p>
                        <p className="text-xs text-slate-400">
                          Min. Rp {formatPrice(v.minPurchase)}
                          {v.endDate && ` · Berlaku s/d ${new Date(v.endDate).toLocaleDateString("id-ID")}`}
                        </p>
                      </div>
                      {canApply && (
                        <span className="text-xs font-bold text-green-600">Pakai</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
