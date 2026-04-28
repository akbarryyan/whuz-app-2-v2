"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import BannerCarousel from "@/components/home/BannerCarousel";
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

// Reuse BRAND_IMAGES from GameGrid
const BRAND_IMAGES: Record<string, string> = {
  "Mobile Legends": "https://i.ibb.co.com/9wX5jZm/ml.png",
  "Free Fire": "https://i.ibb.co.com/yhRfk3L/ff.png",
  "PUBG Mobile": "https://i.ibb.co.com/fSLq9YH/pubg.png",
  "Genshin Impact": "https://i.ibb.co.com/YdBvqLZ/genshin.png",
  "Roblox": "https://i.ibb.co.com/k8sFvHN/roblox.png",
  "Valorant": "https://i.ibb.co.com/sH7p8WY/valorant.png",
  "Call of Duty": "https://i.ibb.co.com/d6NqZ3m/cod.png",
  "Arena of Valor": "https://i.ibb.co.com/HPfYg2J/aov.png",
  "Honor of Kings": "https://i.ibb.co.com/ZxtRv9n/hok.png",
  "Magic Chess": "https://i.ibb.co.com/fYbHq8B/magic-chess.png",
  "Soul Land": "https://i.ibb.co.com/j8Zy3Hq/soul-land.png",
  "Blood Strike": "https://i.ibb.co.com/LNjtGZy/blood-strike.png",
};

// InputFieldDef — matches admin/brands/page.tsx
interface InputFieldDef {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  width: "flex" | "fixed";
}

const DEFAULT_INPUT_FIELDS: InputFieldDef[] = [
  { key: "userId", label: "User ID", placeholder: "Masukkan User ID", required: true, width: "flex" },
];

interface Product {
  id: string;
  sellerProductId?: string;
  merchantName?: string;
  merchantSlug?: string | null;
  providerCode: string;
  name: string;
  category: string;
  brand: string;
  type: string;
  providerPrice: number;
  sellingPrice: number;
  discount: number;
  description: string | null;
}

interface SellerStoreInfo {
  slug: string;
  displayName: string;
  description: string | null;
}

interface BrandCatalogResponse {
  success: boolean;
  brand: string;
  imageUrl: string | null;
  inputFields: InputFieldDef[] | null;
  hasMerchantProducts?: boolean;
  data: Product[];
  error?: string;
}

interface ReviewItem {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ReviewMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  avgRating: number;
  totalRatings: number;
  distribution: Record<number, number>;
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

function formatPrice(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default function BrandDetailPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [brandSlug, setBrandSlug] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("Website");
  const [brandImageUrl, setBrandImageUrl] = useState<string | null>(null);
  const [sellerStore, setSellerStore] = useState<SellerStoreInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & input state
  const [activeType, setActiveType] = useState<string>("Semua");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inputFields, setInputFields] = useState<InputFieldDef[]>(DEFAULT_INPUT_FIELDS);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "PAYMENT_GATEWAY" | null>(null);
  const [pgMethod, setPgMethod] = useState<string>("qris");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [feeConfig, setFeeConfig] = useState<PaymentGatewayFeeConfig>(DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG);
  const [pgMethods, setPgMethods] = useState<{ id: string; key: string; label: string; group: string; imageUrl: string | null }[]>([]);

  // WhatsApp number state
  const [whatsapp, setWhatsapp] = useState<string>("");

  // Voucher state
  const [claimedVouchers, setClaimedVouchers] = useState<VoucherItem[]>([]);
  const [claimedVouchersLoading, setClaimedVouchersLoading] = useState(false);
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

  // Review state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewMeta, setReviewMeta] = useState<ReviewMeta | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [userReview, setUserReview] = useState<{ rating: number; comment: string; isApproved: boolean } | null>(null);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/site-branding")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.site_name) setSiteName(data.data.site_name);
      })
      .catch(() => {});
  }, []);

  // Resolve params + fetch products in a single effect
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const { brand: slug } = await params;
      if (cancelled) return;
      setBrandSlug(slug);
      const sellerSlug = searchParams.get("seller");
      const selectedSellerProductId = searchParams.get("sellerProductId");

      try {
        const res = await fetch(`/api/catalog/brands/${slug}/products`);
        const data = await res.json() as BrandCatalogResponse;
        if (cancelled) return;

        if (data.success) {
          setBrandName(data.brand);
          setBrandImageUrl(data.imageUrl ?? null);
          let finalProducts: Product[] = data.data;

          if (sellerSlug) {
            try {
              const sellerRes = await fetch(`/api/catalog/sellers/${sellerSlug}/products`);
              const sellerData = await sellerRes.json();

              if (sellerData.success) {
                setSellerStore({
                  slug: sellerData.seller.slug,
                  displayName: sellerData.seller.displayName,
                  description: sellerData.seller.description ?? null,
                });

                finalProducts = (data.data as Product[]).filter((item) => item.merchantSlug === sellerSlug);
              }
            } catch {
              setSellerStore(null);
            }
          } else {
            setSellerStore(null);
          }

          setProducts(finalProducts);
          setTypes(Array.from(new Set(finalProducts.map((product) => product.type))));
          const fields: InputFieldDef[] =
            data.inputFields && data.inputFields.length > 0
              ? data.inputFields
              : DEFAULT_INPUT_FIELDS;
          setInputFields(fields);
          // Initialize all field values to empty string
          const initValues: Record<string, string> = {};
          for (const f of fields) initValues[f.key] = "";
          setFieldValues(initValues);

          if (selectedSellerProductId) {
            const matchedProduct = finalProducts.find((product) => product.sellerProductId === selectedSellerProductId);
            if (matchedProduct) setSelectedProduct(matchedProduct);
          }
        } else {
          setError(data.error || "Brand tidak ditemukan.");
        }
      } catch {
        if (!cancelled) {
          setError("Gagal memuat data. Periksa koneksi Anda.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [params, searchParams]);

  // Fetch payment methods from DB
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

  // Fetch wallet balance once
  useEffect(() => {
    setWalletLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.isLoggedIn) {
          setIsLoggedIn(true);
          if (d.user?.balance != null) {
            setWalletBalance(Number(d.user.balance));
          }
        } else {
          setIsLoggedIn(false);
          setWalletBalance(null);
        }
      })
      .catch(() => { setIsLoggedIn(false); setWalletBalance(null); })
      .finally(() => setWalletLoading(false));
  }, []);

  // Fetch user's claimed vouchers
  useEffect(() => {
    setClaimedVouchersLoading(true);
    fetch("/api/vouchers")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setClaimedVouchers(d.data.filter((v: VoucherItem) => v.claimStatus === "CLAIMED"));
        }
      })
      .catch(() => {})
      .finally(() => setClaimedVouchersLoading(false));
  }, []);

  // Fetch reviews for this brand
  const fetchReviews = React.useCallback(async (slug: string) => {
    if (!slug) return;
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/catalog/brands/${slug}/reviews`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.data);
        setReviewMeta(data.meta);
        setUserReview(data.userReview ?? null);
      }
    } catch { /* silently fail */ }
    finally { setReviewLoading(false); }
  }, []);

  useEffect(() => {
    if (brandSlug) fetchReviews(brandSlug);
  }, [brandSlug, fetchReviews]);

  // Reset voucher when product changes (discount is per-product)
  useEffect(() => {
    if (appliedVoucher) {
      setAppliedVoucher(null);
      setVoucherError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id]);

  // Filtered products by active type
  const filteredProducts = useMemo(() => {
    if (activeType === "Semua") return products;
    return products.filter((p) => p.type === activeType);
  }, [products, activeType]);

  // Final price after voucher discount
  const finalPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    if (!appliedVoucher) return selectedProduct.sellingPrice;
    return Math.max(1, selectedProduct.sellingPrice - appliedVoucher.discountAmount);
  }, [selectedProduct, appliedVoucher]);

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

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError(null);
  };

  const handleSubmitReview = async () => {
    setReviewSubmitError(null);
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/catalog/brands/${brandSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const data = await res.json();
      if (!data.success) {
        setReviewSubmitError(data.error ?? "Gagal mengirim ulasan.");
      } else {
        setReviewSubmitSuccess(true);
        setShowReviewSheet(false);
        // Refresh reviews so userReview state updates
        fetchReviews(brandSlug);
      }
    } catch {
      setReviewSubmitError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Brand image or initials — prefer DB imageUrl, fallback to hardcoded map
  const brandImage = brandImageUrl ?? BRAND_IMAGES[brandName] ?? null;
  const brandInitials = brandName
    ? brandName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  // Description expand state
  const [showDescription, setShowDescription] = useState(false);

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

  // Can proceed to checkout? — all required fields filled + product selected + payment method chosen
  const canCheckout =
    !!selectedProduct &&
    !!paymentMethod &&
    !checkoutLoading &&
    inputFields.every((f) => !f.required || (fieldValues[f.key]?.trim().length ?? 0) >= 2);

  const handleCheckout = async () => {
    if (!selectedProduct) {
      toast.error("Pilih produk terlebih dahulu.");
      return;
    }
    for (const f of inputFields) {
      if (f.required && !fieldValues[f.key]?.trim()) {
        toast.error(`Masukkan ${f.label} yang valid.`);
        return;
      }
    }
    if (!paymentMethod) {
      toast.error("Pilih metode pembayaran terlebih dahulu.");
      return;
    }

    setCheckoutLoading(true);
    try {
      // targetNumber = first input field (primary identifier)
      const targetNumber = fieldValues[inputFields[0]?.key ?? "userId"]?.trim() ?? "";
      // targetData = all field values (for providers that need extra data like zone/server)
      const targetData = Object.fromEntries(
        inputFields.map((f) => [f.key, fieldValues[f.key]?.trim() ?? ""])
      );

      const body: Record<string, unknown> = {
        productId: selectedProduct.id,
        sellerProductId: selectedProduct.sellerProductId,
        targetNumber,
        targetData,
        paymentMethod,
        whatsapp: whatsapp.trim() || undefined,
        voucherCode: appliedVoucher?.code || undefined,
      };
      if (paymentMethod === "PAYMENT_GATEWAY") {
        body.paymentGatewayMethod = pgMethod;
        // redirectUrl for after payment — point to orders page or current page
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

      // Wallet or no paymentUrl — show success overlay
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

  // ===================== LOADING STATE =====================
  if (loading) {
    return (
      <div
        className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}
      >
        <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
          {/* Header skeleton */}
          <div className="px-3 py-3 flex items-center gap-2" style={{ backgroundColor: "#003D99" }}>
            <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse flex-shrink-0" />
            <div className="flex-1 flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 animate-pulse" />
              <div className="h-4 w-28 bg-white/20 rounded-lg animate-pulse" />
            </div>
            <div className="flex gap-1">
              <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse" />
              <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse" />
            </div>
          </div>
          {/* Content skeleton */}
          <div className="flex-1 bg-slate-50 px-4 py-4 lg:mx-auto lg:w-full lg:max-w-6xl lg:bg-transparent lg:px-0 lg:pt-10">
            {/* Tab skeleton */}
            <div className="flex gap-2 mb-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 w-20 bg-slate-200 rounded-full animate-pulse"
                />
              ))}
            </div>
            {/* Grid skeleton */}
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white p-3 shadow-sm animate-pulse lg:border lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none"
                >
                  <div className="h-3 w-full bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-slate-200 rounded mb-3" />
                  <div className="h-5 w-1/2 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== ERROR STATE =====================
  if (error) {
    return (
      <div
        className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}
      >
        <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <svg
              className="w-16 h-16 text-slate-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="mb-1 font-semibold text-slate-600 lg:text-white">{error}</p>
            <p className="mb-6 text-sm text-slate-400">
              Coba kembali ke halaman utama.
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== MAIN RENDER =====================
  return (
    <div
      className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5] lg:bg-[#161B22]`}
    >
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl lg:max-w-7xl lg:bg-transparent lg:shadow-none">
        {/* ---- Brand Header ---- */}
        <AppHeader onBack={() => router.back()} />

        {/* Spacer for fixed header */}
        <div className="h-[60px]" />

        {/* ---- Main Content ---- */}
        <div className="flex-1 bg-slate-50 pb-12 lg:bg-transparent">
          <BannerCarousel />

          {/* == Brand Hero Section == */}
          <div className="bg-white px-4 pt-4 pb-4 border-b border-slate-100 -mt-3 lg:mx-auto lg:mt-6 lg:w-full lg:max-w-6xl lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:px-6 lg:pt-5 lg:pb-5">
            {/* Breadcrumb */}
            <div className="flex items-center justify-between gap-2 mb-3 lg:mb-4">
              <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] text-slate-400 lg:text-[12px]">
                <button onClick={() => router.push("/")} className="hover:text-purple-600 transition-colors">
                  Home
                </button>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <button onClick={() => router.back()} className="hover:text-purple-600 transition-colors">
                  Daftar Brand
                </button>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium text-slate-600 truncate lg:text-slate-200">{brandName}</span>
              </div>
            </div>

            {sellerStore && (
              <div className="mb-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 lg:mb-4 lg:border-emerald-500/20 lg:bg-emerald-500/10 lg:px-5 lg:py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 lg:text-[10px] lg:tracking-[0.28em] lg:text-emerald-200">Toko Merchant</p>
                <p className="mt-1 text-sm font-bold text-slate-900 lg:mt-1.5 lg:text-base lg:text-white">{sellerStore.displayName}</p>
                {sellerStore.description && (
                  <p className="mt-1 text-xs text-slate-600 lg:mt-1.5 lg:max-w-3xl lg:text-[12px] lg:leading-5 lg:text-emerald-50/80">{sellerStore.description}</p>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/seller/${sellerStore.slug}`)}
                  className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 lg:text-emerald-200 lg:hover:text-white"
                >
                  Kembali ke storefront merchant
                </button>
              </div>
            )}

            {/* Brand info row */}
            <div className="flex items-center gap-3 lg:gap-4">
              {/* Brand image */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100 shadow-sm lg:h-20 lg:w-20 lg:rounded-[24px] lg:shadow-none">
                {brandImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={brandImage} alt={brandName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50">
                    <span className="text-purple-600 font-bold text-xl">{brandInitials}</span>
                  </div>
                )}
              </div>

              {/* Title + guarantee */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-bold leading-snug text-slate-800 lg:text-[20px] lg:leading-7 lg:text-white">
                      Top Up {brandName} Murah
                    </h1>
                    <p className="mt-0.5 text-[11px] text-slate-400 lg:mt-1 lg:text-[12px] lg:text-slate-400">{products.length} produk tersedia</p>
                  </div>
                </div>
              </div>
              {/* Guarantee badge */}
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://i.ibb.co.com/fBwdY2k/Tanpa-judul-256-x-256-piksel.png"
                  alt="Dijamin Aman 100% Uang Kembali"
                  className="h-14 w-auto object-contain"
                />
              </div>
            </div>

            {/* Rating row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 lg:mt-4 lg:border-white/10 lg:pt-4">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <span className="text-yellow-400 text-base lg:text-lg">★</span>
                <span className="text-sm font-bold text-slate-800 lg:text-[15px] lg:text-white">
                  {reviewMeta && reviewMeta.totalRatings > 0
                    ? reviewMeta.avgRating.toFixed(1)
                    : "-"}
                </span>
                <span className="text-[11px] text-slate-400 lg:text-[12px] lg:text-slate-400">
                  {reviewMeta && reviewMeta.totalRatings > 0
                    ? `dari ${reviewMeta.totalRatings.toLocaleString("id-ID")} Ulasan Pembeli`
                    : "Belum ada ulasan"}
                </span>
              </div>
              {/* Write review CTA */}
              <button
                onClick={() => {
                  if (!isLoggedIn) { router.push("/login"); return; }
                  // Prefill with existing review if any
                  if (userReview) {
                    setReviewRating(userReview.rating);
                    setReviewComment(userReview.comment);
                  } else {
                    setReviewRating(5);
                    setReviewComment("");
                  }
                  setReviewSubmitError(null);
                  setReviewSubmitSuccess(false);
                  setShowReviewSheet(true);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 transition-colors hover:text-purple-800 lg:gap-1.5 lg:text-[12px] lg:text-slate-200 lg:hover:text-white"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {userReview ? "Edit Ulasan" : "Tulis Ulasan"}
              </button>
            </div>

            {/* Review cards horizontal scroll */}
            {reviewLoading ? (
              <div className="flex gap-2.5 mt-2.5 overflow-x-auto hide-scrollbar pb-1 lg:mt-3 lg:gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-[72px] w-[160px] flex-shrink-0 rounded-xl bg-slate-100 p-2.5 animate-pulse lg:bg-white/[0.05]" />
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="flex gap-2.5 mt-2.5 overflow-x-auto hide-scrollbar pb-1">
                {reviews.map((review) => {
                  // Mask name: show first char + asterisks
                  const masked = review.userName.length > 1
                    ? review.userName[0] + "*".repeat(Math.min(review.userName.length - 1, 6))
                    : review.userName;
                  return (
                    <div
                      key={review.id}
                      className="flex-shrink-0 w-[160px] rounded-xl border border-slate-100 bg-slate-50 p-2.5 lg:w-[190px] lg:rounded-2xl lg:border-white/10 lg:bg-white/5 lg:p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="max-w-[90px] truncate text-[11px] font-semibold text-slate-700 lg:max-w-[112px] lg:text-[12px] lg:text-white">{masked}</span>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, s) => (
                            <span key={s} className={`text-[10px] ${s < review.rating ? "text-yellow-400" : "text-slate-200"}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500 lg:text-[11px] lg:leading-5 lg:text-slate-400">{review.comment}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2.5 py-3 text-center">
                <p className="text-[11px] text-slate-400 lg:text-slate-500">Jadilah yang pertama memberi ulasan!</p>
              </div>
            )}
          </div>

          {/* == Cara Top Up Section == */}
          <div className="bg-blue-50 px-4 py-3.5 border-b border-blue-100 lg:mx-auto lg:mt-5 lg:w-full lg:max-w-6xl lg:rounded-[24px] lg:border lg:border-blue-500/20 lg:bg-blue-500/10 lg:px-6 lg:py-5">
            <div className="flex items-start gap-2 lg:gap-3">
              {/* Info icon */}
              <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-500 text-[10px] font-bold">i</span>
              </div>
              <div className="flex-1 min-w-0">
                {/* Title */}
                <p className="mb-1.5 cursor-pointer text-[12px] font-bold text-blue-700 underline underline-offset-2 lg:mb-2 lg:text-[13px] lg:text-blue-100">
                  Cara Top Up {brandName} Murah
                </p>
                {/* Steps */}
                <ol className="flex flex-col gap-0.5 list-none">
                  {[
                    `Pilih produk ${brandName} sesuai kebutuhan`,
                    "Pilih Metode Pembayaran",
                    `Masukkan ${inputFields.map((f) => f.label).join(" dan ")} kamu`,
                    `Cek total bayar, lalu klik "Bayar"`,
                    "Selesai",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[11px] text-blue-600 font-semibold flex-shrink-0">{i + 1}.</span>
                      <span className="text-[11px] text-blue-800 leading-relaxed">
                        {step.split(/\*\*(.*?)\*\*/).map((part, j) =>
                          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                        )}
                      </span>
                    </li>
                  ))}
                </ol>

                {/* Promo / description teaser */}
                <div className="mt-3">
                  <p className="mb-0.5 text-[11px] font-bold text-blue-700 lg:mb-1 lg:text-[12px] lg:text-blue-100">
                    Top Up {brandName} Murah Bayar Pakai ShopeePay
                  </p>
                  <p
                    className={`text-[11px] leading-relaxed uppercase font-semibold text-blue-800 lg:text-[12px] lg:leading-6 lg:text-blue-50 ${
                      showDescription ? "" : "line-clamp-2"
                    }`}
                  >
                    BERLAKU UNTUK SEMUA PENGGUNA YANG BARU PERTAMA KALI TOP UP MENGGUNAKAN
                    SHOPEEPAY DI {siteName.toUpperCase()} (KUOTA HARIAN TERBATAS). DAPATKAN HARGA TERBAIK UNTUK
                    SEMUA PRODUK {brandName.toUpperCase()} DI SINI.
                  </p>
                  <button
                    onClick={() => setShowDescription((v) => !v)}
                    className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-blue-600 transition-colors hover:text-blue-800 lg:text-blue-100 lg:hover:text-white"
                  >
                    {showDescription ? "Sembunyikan" : "Baca Selengkapnya"}
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${
                        showDescription ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* == Dynamic Input Fields Section == */}
          <div className="bg-white px-4 py-4 border-b border-slate-100 lg:mx-auto lg:mt-5 lg:w-full lg:max-w-6xl lg:rounded-[24px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:px-6 lg:py-5">
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700 lg:text-[15px] lg:text-white">Masukkan Data Akun</span>
            </div>

            <div className={inputFields.length > 1 ? "flex flex-col gap-2 lg:gap-3" : "flex gap-2 lg:gap-3"}>
              {inputFields.map((field) => (
                <div key={field.key} className={inputFields.length > 1 ? "w-full" : field.width === "fixed" ? "w-28 flex-shrink-0" : "flex-1 min-w-[120px]"}>
                  <label className="mb-1 block text-xs font-medium text-slate-500 lg:mb-1.5 lg:text-[12px] lg:text-slate-300">{field.label}</label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition lg:rounded-2xl lg:border-white/10 lg:bg-white/5 lg:px-4 lg:py-3 lg:text-[14px] lg:text-white lg:placeholder:text-slate-500"
                  />
                </div>
              ))}
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-slate-400 lg:mt-3 lg:max-w-3xl lg:text-[12px] lg:leading-5 lg:text-slate-400">
              Pastikan {inputFields.map((f) => f.label).join(" dan ")} yang kamu masukkan sudah benar.
              Kesalahan input bukan tanggung jawab kami.
            </p>
          </div>

          {/* == Product Type Tabs == */}
          <div className="px-4 pt-4 pb-2 lg:mx-auto lg:mt-5 lg:w-full lg:max-w-6xl">
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-semibold text-slate-700 lg:text-[15px] lg:text-white">Pilih Produk</span>
            </div>
            {!(types.length === 1 && ["game", "saldo-emoney"].includes(types[0].toLowerCase())) && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar lg:gap-2.5">
              <button
                onClick={() => setActiveType("Semua")}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all lg:px-5 lg:py-2.5 lg:text-[12px] ${
                  activeType === "Semua"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-purple-300 hover:text-purple-600 lg:border-white/10 lg:bg-white/[0.04] lg:text-slate-200 lg:hover:text-white"
                }`}
              >
                Semua
              </button>
              {types.map((type) => {
                const label = type
                  .replace(/[-_]/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap lg:px-5 lg:py-2.5 lg:text-[12px] ${
                      activeType === type
                        ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-purple-300 hover:text-purple-600 lg:border-white/10 lg:bg-white/[0.04] lg:text-slate-200 lg:hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            )}
          </div>

          {/* == Product Grid == */}
          <div className="px-4 py-2 lg:mx-auto lg:w-full lg:max-w-6xl lg:pb-0">
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm lg:border lg:border-white/10 lg:bg-white/[0.04] lg:shadow-none">
                <svg
                  className="w-10 h-10 text-slate-300 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <p className="text-sm text-slate-500 lg:text-slate-300">
                  {products.length === 0
                    ? "Belum ada merchant yang menjual brand ini."
                    : "Tidak ada produk untuk kategori ini."}
                </p>
                {products.length === 0 && (
                  <p className="mt-1 text-xs text-slate-400 lg:text-slate-500">
                    Brand sudah tersedia di katalog, tetapi produk merchant untuk brand ini belum dipublikasikan.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 lg:gap-3.5">
                {filteredProducts.map((product) => {
                  const isSelected = (selectedProduct?.sellerProductId ?? selectedProduct?.id) === (product.sellerProductId ?? product.id);
                  const productMerchantName = product.merchantName ?? sellerStore?.displayName ?? null;

                  return (
                    <button
                      key={product.sellerProductId ?? product.id}
                      onClick={() =>
                        setSelectedProduct(isSelected ? null : product)
                      }
                      className={`relative text-left rounded-xl p-3 transition-all border-2 lg:rounded-2xl lg:p-4 ${
                        isSelected
                          ? "border-purple-500 bg-purple-50 shadow-md shadow-purple-100"
                          : "border-transparent bg-white shadow-sm hover:shadow-md hover:border-purple-200 lg:bg-white/[0.04] lg:shadow-none lg:hover:bg-white/[0.06]"
                      }`}
                    >
                      {/* Discount badge */}
                      {product.discount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
                          -{product.discount}%
                        </div>
                      )}

                      {/* Selected check */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Product name */}
                      <p
                        className={`text-xs font-semibold leading-tight mb-2 pr-5 ${
                          isSelected ? "text-purple-700 lg:text-white" : "text-slate-700 lg:text-slate-100"
                        }`}
                      >
                        {product.name}
                      </p>

                      {productMerchantName && (
                        <div className="mb-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 lg:mb-2.5 lg:px-3 lg:py-1.5">
                          Merchant: {productMerchantName}
                        </div>
                      )}

                      {/* Price */}
                      <p
                        className={`text-sm font-bold lg:text-[16px] ${
                          isSelected ? "text-purple-600" : "text-slate-800"
                        }`}
                      >
                        Rp {formatPrice(product.sellingPrice)}
                      </p>

                      {productMerchantName ? (
                        <p className="mt-0.5 text-[10px] text-emerald-600">
                          Harga jual merchant
                        </p>
                      ) : (
                        product.discount > 0 && (
                          <p className="mt-0.5 text-[10px] text-slate-400 line-through">
                            Rp {formatPrice(product.providerPrice)}
                          </p>
                        )
                      )}

                      {productMerchantName && (
                          <p className="mt-2 text-[10px] text-slate-400 lg:text-slate-500">
                          Produk ini dijual oleh {productMerchantName}.
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* == Payment Method == */}
          <div className="bg-white px-4 py-4 border-b border-slate-100 lg:mx-auto lg:mt-5 lg:w-full lg:max-w-6xl lg:rounded-[24px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:px-6 lg:py-5">
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700 lg:text-[15px] lg:text-white">Metode Pembayaran</span>
            </div>

            {/* Saldo Wallet — inline */}
            {(() => {
              const isLoggedIn = !walletLoading && walletBalance !== null;
              const isDisabled = !isLoggedIn;
              return (
                <div className={`relative rounded-xl border mb-3 overflow-hidden transition-all lg:mb-4 lg:rounded-2xl ${
                  isDisabled ? "border-slate-200 bg-slate-50 opacity-60 lg:border-white/10 lg:bg-white/5" : "border-slate-200 bg-white lg:border-white/10 lg:bg-white/[0.04]"
                }`}>
                  {/* Gratis Biaya Admin badge */}
                  <div className="absolute top-0 right-0">
                    <span className="block bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-xl rounded-tr-xl tracking-wide">
                      Gratis Biaya Admin
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (isDisabled) return;
                      setPaymentMethod(paymentMethod === "WALLET" ? null : "WALLET");
                    }}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-3.5 pt-7 pb-3 lg:gap-3.5 lg:px-4 lg:pt-8 lg:pb-4 ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDisabled ? "bg-slate-200" : "bg-purple-100"
                    }`}>
                      <svg className={`w-4 h-4 ${isDisabled ? "text-slate-400" : "text-purple-600"}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                    </div>
                    {/* Text */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[12px] text-slate-500 lg:text-slate-300">
                        Saldo Pembeli:{" "}
                        <span className={
                          isDisabled
                            ? "text-slate-400 font-medium"
                            : walletBalance !== null
                            ? "text-slate-700 font-semibold"
                            : "text-purple-500 font-medium"
                        }>
                          {walletLoading
                            ? "Memuat..."
                            : walletBalance !== null
                            ? `Rp ${formatPrice(walletBalance)}`
                            : "Login untuk lihat saldo"}
                        </span>
                      </p>
                      {isDisabled && (
                        <p className="mt-0.5 text-[10px] text-slate-400 lg:text-slate-500">Login terlebih dahulu untuk menggunakan saldo</p>
                      )}
                      {!isDisabled && selectedProduct && walletBalance !== null && walletBalance < finalPrice && (
                        <p className="mt-0.5 text-[10px] text-rose-500">Saldo tidak cukup</p>
                      )}
                    </div>
                    {/* Toggle switch */}
                    <div
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                        isDisabled ? "bg-slate-200" : paymentMethod === "WALLET" ? "bg-purple-500" : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${
                          isDisabled ? "bg-slate-300 translate-x-1" : paymentMethod === "WALLET" ? "bg-white translate-x-6" : "bg-white translate-x-1"
                        }`}
                      />
                    </div>
                  </button>
                </div>
              );
            })()}

            {/* Metode pembayaran gateway — opens bottom sheet */}
            {(() => {
              const activePg = paymentMethod === "PAYMENT_GATEWAY" ? pgMethods.find((m) => m.key === pgMethod) : null;
              const abbr = activePg ? activePg.key.replace(/_va$/, "").toUpperCase().slice(0, 4) : null;
              return (
                <button
                  onClick={() => setShowPaymentSheet(true)}
                  className={`w-full flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 transition-all lg:rounded-2xl lg:px-4 lg:py-3.5 ${
                    paymentMethod === "PAYMENT_GATEWAY"
                      ? "border-purple-500 bg-purple-50 lg:bg-[#2E5F95]/16"
                      : "border-slate-200 bg-white hover:border-purple-200 lg:border-white/10 lg:bg-white/[0.04] lg:hover:bg-white/[0.06]"
                  }`}
                >
                  {/* Icon — show selected method logo or generic icon */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white lg:border-white/10 lg:bg-white/5">
                    {activePg?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activePg.imageUrl} alt={activePg.label} className="w-full h-full object-contain p-1" />
                    ) : abbr ? (
                      <span className="text-[9px] font-black text-slate-600">{abbr}</span>
                    ) : (
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    {activePg ? (
                      <>
                        <p className="mb-0.5 text-[10px] leading-none text-slate-400 lg:text-slate-500">Metode Pembayaran</p>
                        <p className="truncate text-[13px] font-bold text-slate-800 lg:text-white">{activePg.label}</p>
                      </>
                    ) : (
                      <p className="text-[13px] font-semibold text-slate-700 lg:text-slate-100">Metode Pembayaran Lainnya</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })()}
          </div>

          {/* == WhatsApp Number == */}
          <div className="bg-white px-4 py-4 border-b border-slate-100 lg:mx-auto lg:mt-5 lg:w-full lg:max-w-6xl lg:rounded-[24px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:px-6 lg:py-5">
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-sm font-semibold text-slate-700 lg:text-[15px] lg:text-white">Nomor WhatsApp</span>
              <span className="text-[10px] text-slate-400 lg:text-slate-500">(opsional)</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">+62</span>
              <input
                type="tel"
                placeholder="8xxxxxxxxxx"
                value={whatsapp}
                onChange={(e) => {
                  // Only allow digits
                  const val = e.target.value.replace(/\D/g, "");
                  setWhatsapp(val);
                }}
                maxLength={15}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100 transition lg:rounded-2xl lg:border-white/10 lg:bg-white/5 lg:py-3 lg:text-[14px] lg:text-white lg:placeholder:text-slate-500"
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400 lg:mt-3 lg:max-w-3xl lg:text-[12px] lg:leading-5 lg:text-slate-400">
              Notifikasi status pesanan akan dikirim via WhatsApp ke nomor ini.
            </p>
          </div>

          {/* == Voucher Section == */}
          <div className="bg-white px-4 py-4 border-b border-slate-100 lg:mx-auto lg:mt-5 lg:w-full lg:max-w-6xl lg:rounded-[24px] lg:border lg:border-white/10 lg:bg-white/[0.04] lg:px-6 lg:py-5">
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700 lg:text-[15px] lg:text-white">Voucher</span>
              {claimedVouchers.length > 0 && !appliedVoucher && (
                <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                  {claimedVouchers.length} tersedia
                </span>
              )}
            </div>

            {/* Applied voucher chip */}
            {appliedVoucher ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5 lg:rounded-2xl lg:px-4 lg:py-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-green-800 truncate">{appliedVoucher.code}</p>
                  <p className="text-[11px] text-green-600 truncate">{appliedVoucher.title}</p>
                  <p className="text-[11px] font-semibold text-green-700">
                    Hemat Rp {formatPrice(appliedVoucher.discountAmount)}
                  </p>
                </div>
                <button
                  onClick={handleRemoveVoucher}
                  className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : walletLoading || claimedVouchersLoading ? (
              <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ) : !isLoggedIn ? (
              <button
                onClick={() => router.push("/login")}
                className="w-full flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 hover:border-orange-300 hover:bg-orange-50 transition-all lg:rounded-2xl lg:border-white/15 lg:bg-white/5 lg:px-4 lg:py-3.5 lg:hover:bg-white/[0.08]"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <p className="flex-1 text-left text-[12px] text-slate-500">Login untuk menggunakan voucher</p>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : claimedVouchers.length === 0 ? (
              <button
                onClick={() => router.push("/voucher")}
                className="w-full flex items-center gap-3 rounded-xl border border-dashed border-orange-200 bg-orange-50 px-3.5 py-3 hover:bg-orange-100 transition-all lg:rounded-2xl lg:border-orange-500/20 lg:bg-orange-500/10 lg:px-4 lg:py-3.5"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[12px] font-semibold text-orange-700">Belum punya voucher</p>
                  <p className="text-[11px] text-orange-500">Klaim voucher diskon di sini →</p>
                </div>
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setShowVoucherSheet(true)}
                className="w-full flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 px-3.5 py-3 hover:border-orange-400 hover:bg-orange-100 transition-all lg:rounded-2xl lg:border-orange-500/20 lg:bg-orange-500/10 lg:px-4 lg:py-3.5"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[12px] font-semibold text-orange-700">Pilih Voucher</p>
                  <p className="text-[11px] text-orange-500">{claimedVouchers.length} voucher siap digunakan</p>
                </div>
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {voucherError && (
              <p className="mt-2 flex items-center gap-1 text-[11px] text-red-500">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {voucherError}
              </p>
            )}
          </div>

          {/* == Footer == */}
          <div className="lg:mx-auto lg:mt-8 lg:w-full lg:max-w-6xl">
            <PageFooter />
          </div>
        </div>

        {/* ---- Payment Bottom Sheet ---- */}
        <div
          className={`fixed top-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 transition-all duration-300 lg:max-w-7xl ${
            showPaymentSheet ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{ bottom: 0, height: "100%" }}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-300 ${
              showPaymentSheet ? "opacity-40" : "opacity-0"
            }`}
            onClick={() => setShowPaymentSheet(false)}
          />
          {/* Sheet */}
          <div
            className={`absolute bottom-0 left-0 right-0 flex flex-col rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out lg:mx-auto lg:max-w-3xl lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-[#171D25] lg:shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${
              showPaymentSheet ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ maxHeight: "78vh" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 lg:bg-white/20" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <p className="text-[14px] font-bold text-[#003D99] lg:text-white">Metode Pembayaran Lainnya</p>
              <button
                onClick={() => setShowPaymentSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors lg:bg-white/5 lg:hover:bg-white/10"
              >
                <svg className="w-4 h-4 text-slate-500 lg:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Info banner */}
            <div className="mx-4 mb-3 flex gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5 flex-shrink-0 lg:border-blue-400/20 lg:bg-blue-500/10">
              <div className="w-4 h-4 rounded-full border-2 border-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5 lg:border-blue-300">
                <span className="text-blue-500 text-[9px] font-bold">i</span>
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed lg:text-blue-100">
                Biaya Total belanja adalah jumlah dari total pembelian, biaya layanan fitur, dan biaya admin pembayaran
              </p>
            </div>
            {/* QRIS section — fixed, does NOT scroll */}
            {(() => {
              const qrisItems = pgMethods.filter((m) => m.group === "QRIS");
              if (qrisItems.length === 0) return null;
              return (
                <div className="px-4 flex-shrink-0 border-b border-slate-100 lg:border-white/10">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide pt-3 pb-2 lg:text-slate-400">E-Wallet &amp; QRIS</p>
                  {qrisItems.map((m) => {
                    const isActive = paymentMethod === "PAYMENT_GATEWAY" && pgMethod === m.key;
                    const base = selectedProduct?.sellingPrice ?? 0;
                    const fee = base > 0 ? calculatePaymentGatewayFee(m.key, base, feeConfig) : 0;
                    const total = base + fee;
                    return (
                      <button
                        key={m.key}
                        onClick={() => { setPaymentMethod("PAYMENT_GATEWAY"); setPgMethod(m.key); setShowPaymentSheet(false); }}
                        className="w-full flex items-center gap-3 py-3 border-b border-slate-100 last:border-b-0 lg:border-white/10 lg:hover:bg-white/[0.03]"
                      >
                        <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center flex-shrink-0 overflow-hidden lg:border-white/10 lg:bg-white/5">
                          {m.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.imageUrl} alt={m.label} className="w-full h-full object-contain p-1" />
                          ) : (
                            <svg className="w-5 h-5 text-slate-600 lg:text-slate-300" viewBox="0 0 24 20" fill="none" stroke="currentColor">
                              <rect x="1" y="1" width="8" height="8" rx="1" strokeWidth={2} />
                              <rect x="15" y="1" width="8" height="8" rx="1" strokeWidth={2} />
                              <rect x="1" y="12" width="8" height="8" rx="1" strokeWidth={2} />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12h3v3M21 12v-.01M15 15v3h3M21 17v3h-3" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-slate-800 lg:text-white">{m.label}</p>
                          {fee > 0 && (
                            <p className="text-[10px] text-slate-400 mt-0.5 lg:text-slate-400">+biaya Rp {formatPrice(fee)}</p>
                          )}
                        </div>
                        {base > 0 && (
                          <div className="text-right flex-shrink-0 mr-2">
                            <p className="text-sm font-bold text-slate-800 lg:text-white">Rp {formatPrice(total)}</p>
                            {fee > 0 && (
                              <p className="text-[10px] text-slate-400 lg:text-slate-400">harga + biaya</p>
                            )}
                          </div>
                        )}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isActive ? "border-purple-600 bg-purple-600" : "border-slate-300 lg:border-white/20"
                        }`}>
                          {isActive && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Virtual Account section — scrollable */}
            {(() => {
              const vaItems = pgMethods.filter((m) => m.group === "VIRTUAL_ACCOUNT");
              if (vaItems.length === 0) return <div className="flex-1" />;
              return (
                <div
                  className="flex-1 overflow-y-auto px-4 pb-6"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
                >
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide pt-3 pb-2 lg:text-slate-400">Virtual Account</p>
                  {vaItems.map((m) => {
                    const isActive = paymentMethod === "PAYMENT_GATEWAY" && pgMethod === m.key;
                    const base = selectedProduct?.sellingPrice ?? 0;
                    const fee = base > 0 ? calculatePaymentGatewayFee(m.key, base, feeConfig) : 0;
                    const total = base + fee;
                    const abbr = m.key.replace(/_va$/, "").toUpperCase().slice(0, 4);
                    return (
                      <button
                        key={m.key}
                        onClick={() => { setPaymentMethod("PAYMENT_GATEWAY"); setPgMethod(m.key); setShowPaymentSheet(false); }}
                        className="w-full flex items-center gap-3 py-3 border-b border-slate-100 last:border-b-0 lg:border-white/10 lg:hover:bg-white/[0.03]"
                      >
                        <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center flex-shrink-0 overflow-hidden lg:border-white/10 lg:bg-white/5">
                          {m.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.imageUrl} alt={m.label} className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-[9px] font-black text-slate-600 lg:text-slate-300">{abbr}</span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-slate-800 lg:text-white">{m.label}</p>
                          {fee > 0 && (
                            <p className="text-[10px] text-slate-400 mt-0.5 lg:text-slate-400">+biaya Rp {formatPrice(fee)}</p>
                          )}
                        </div>
                        {base > 0 && (
                          <div className="text-right flex-shrink-0 mr-2">
                            <p className="text-sm font-bold text-slate-800 lg:text-white">Rp {formatPrice(total)}</p>
                            {fee > 0 && (
                              <p className="text-[10px] text-slate-400 lg:text-slate-400">harga + biaya</p>
                            )}
                          </div>
                        )}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isActive ? "border-purple-600 bg-purple-600" : "border-slate-300 lg:border-white/20"
                        }`}>
                          {isActive && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ---- Voucher Selection Sheet ---- */}
        <div
          className={`fixed top-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 transition-all duration-300 lg:max-w-7xl ${
            showVoucherSheet ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{ bottom: 0, height: "100%" }}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-300 ${
              showVoucherSheet ? "opacity-40" : "opacity-0"
            }`}
            onClick={() => setShowVoucherSheet(false)}
          />
          {/* Sheet */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out lg:mx-auto lg:max-w-3xl lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-[#171D25] lg:shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${
              showVoucherSheet ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ maxHeight: "78vh" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 lg:bg-white/20" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-slate-100 lg:border-white/10">
              <div>
                <p className="text-[14px] font-bold text-orange-600 lg:text-orange-300">Voucher Saya</p>
                <p className="text-[11px] text-slate-400">{claimedVouchers.length} voucher dapat digunakan</p>
              </div>
              <button
                onClick={() => setShowVoucherSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors lg:bg-white/5 lg:hover:bg-white/10"
              >
                <svg className="w-4 h-4 text-slate-500 lg:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Voucher list */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
            >
              {claimedVouchers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3 lg:bg-orange-500/15">
                    <svg className="w-6 h-6 text-orange-400 lg:text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-600 mb-1 lg:text-white">Belum ada voucher</p>
                  <p className="text-xs text-slate-400">Klaim voucher di halaman Voucher</p>
                </div>
              ) : (
                claimedVouchers.map((v) => {
                  const discountLabel = v.discountType === "PERCENT"
                    ? `${v.discountValue}%${v.maxDiscount ? ` (maks Rp ${formatPrice(v.maxDiscount)})` : ""}`
                    : `Rp ${formatPrice(v.discountValue)}`;
                  const isInvalid = !!(selectedProduct && v.minPurchase > 0 && selectedProduct.sellingPrice < v.minPurchase);
                  return (
                    <button
                      key={v.id}
                      onClick={() => { if (!isInvalid && !voucherLoading) handleSelectVoucher(v); }}
                      disabled={isInvalid || voucherLoading}
                      className={`w-full text-left rounded-2xl border-2 overflow-hidden transition-all ${
                        isInvalid
                          ? "border-slate-200 opacity-60 cursor-not-allowed lg:border-white/10"
                          : "border-orange-200 hover:border-orange-400 hover:shadow-md active:scale-[0.99] cursor-pointer lg:border-orange-400/30 lg:bg-white/[0.04] lg:hover:border-orange-300"
                      }`}
                    >
                      <div className={`h-1.5 ${
                        isInvalid ? "bg-slate-200" : "bg-gradient-to-r from-orange-400 to-yellow-400"
                      }`} />
                      <div className="px-3.5 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-slate-800 truncate lg:text-white">{v.title}</p>
                            <p className="text-[11px] font-mono font-semibold text-orange-600 mt-0.5 tracking-wider">{v.code}</p>
                          </div>
                          <div className="flex-shrink-0 bg-orange-100 rounded-xl px-2.5 py-1.5 text-right lg:bg-orange-500/15">
                            <p className="text-[12px] font-black text-orange-600 leading-tight whitespace-nowrap">{discountLabel}</p>
                            <p className="text-[9px] text-orange-400 leading-tight">diskon</p>
                          </div>
                        </div>
                        {v.description && (
                          <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 lg:text-slate-300">{v.description}</p>
                        )}
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-100 lg:border-white/10">
                          {v.minPurchase > 0 && (
                            <span className={`text-[10px] font-semibold ${
                              isInvalid ? "text-red-400" : "text-slate-500"
                            }`}>
                              Min. Rp {formatPrice(v.minPurchase)}
                            </span>
                          )}
                          {v.endDate && (
                            <span className="text-[10px] text-slate-400">
                              s/d {new Date(v.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {isInvalid && (
                            <span className="text-[10px] font-bold text-red-400 ml-auto">Tidak memenuhi syarat</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ---- Sticky Bottom Bar ---- */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 lg:max-w-7xl">
          <div className="bg-white border-t border-slate-200 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:mx-auto lg:max-w-6xl lg:rounded-t-[24px] lg:border lg:border-white/10 lg:bg-[#171D25] lg:shadow-[0_-24px_48px_rgba(0,0,0,0.25)]">
            {selectedProduct ? (
              <div className="flex items-center gap-3">
                {/* Selected product info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 truncate lg:text-slate-400">
                    {selectedProduct.name}
                  </p>
                  {appliedVoucher ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-lg font-bold text-slate-800 lg:text-white">
                        Rp {formatPrice(finalPrice)}
                      </p>
                      <p className="text-xs text-slate-400 line-through lg:text-slate-500">
                        Rp {formatPrice(selectedProduct.sellingPrice)}
                      </p>
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                        Hemat Rp {formatPrice(appliedVoucher.discountAmount)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-slate-800 lg:text-white">
                      Rp {formatPrice(selectedProduct.sellingPrice)}
                    </p>
                  )}
                </div>

                {/* CTA button */}
                <button
                  onClick={handleCheckout}
                  disabled={!canCheckout || checkoutLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                    canCheckout && !checkoutLoading
                      ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-200 hover:from-purple-700 hover:to-purple-600 active:scale-[0.97]"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {checkoutLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Beli Sekarang"
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-1">
                <p className="text-sm text-slate-400 lg:text-slate-500">
                  Pilih produk untuk melanjutkan
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---- Review Submit Sheet ---- */}
        <div
          className={`fixed top-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 transition-all duration-300 lg:max-w-7xl ${
            showReviewSheet ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{ bottom: 0, height: "100%" }}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-300 ${
              showReviewSheet ? "opacity-40" : "opacity-0"
            }`}
            onClick={() => setShowReviewSheet(false)}
          />
          {/* Sheet */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out lg:mx-auto lg:max-w-3xl lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-[#171D25] lg:shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${
              showReviewSheet ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ maxHeight: "80vh" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300 lg:bg-white/20" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-slate-100 lg:border-white/10">
              <div>
                <p className="text-[14px] font-bold text-purple-700 lg:text-white">
                  {userReview ? "Edit Ulasan" : "Tulis Ulasan"}
                </p>
                <p className="text-[11px] text-slate-400">{brandName}</p>
              </div>
              <button
                onClick={() => setShowReviewSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors lg:bg-white/5 lg:hover:bg-white/10"
              >
                <svg className="w-4 h-4 text-slate-500 lg:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {/* Star rating picker */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 lg:text-slate-200">Rating kamu</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-3xl transition-transform active:scale-90 ${
                        star <= reviewRating ? "text-yellow-400" : "text-slate-200 lg:text-white/15"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {["", "Sangat Buruk", "Buruk", "Cukup", "Bagus", "Sangat Bagus"][reviewRating]}
                </p>
              </div>
              {/* Comment */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2 lg:text-slate-200">Komentar</p>
                <textarea
                  rows={4}
                  maxLength={500}
                  placeholder="Bagikan pengalaman kamu top up di sini..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition resize-none lg:border-white/10 lg:bg-white/5 lg:text-white lg:placeholder:text-slate-500"
                />
                <p className="text-[11px] text-slate-400 text-right mt-1">{reviewComment.length}/500</p>
              </div>

              {/* Pending notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 flex gap-2 items-start lg:border-amber-400/25 lg:bg-amber-500/10">
                <div className="w-4 h-4 rounded-full border-2 border-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5 lg:border-amber-300">
                  <span className="text-amber-600 text-[9px] font-bold">i</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed lg:text-amber-100">
                  Ulasan akan tampil setelah disetujui admin. Terima kasih telah berbagi pengalaman!
                </p>
              </div>

              {reviewSubmitError && (
                <p className="text-[12px] text-red-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {reviewSubmitError}
                </p>
              )}
            </div>
            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 lg:border-white/10">
              <button
                onClick={handleSubmitReview}
                disabled={reviewSubmitting || reviewComment.trim().length < 5}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  reviewSubmitting || reviewComment.trim().length < 5
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700 active:scale-[0.98]"
                }`}
              >
                {reviewSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Mengirim...
                  </span>
                ) : userReview ? "Perbarui Ulasan" : "Kirim Ulasan"}
              </button>
            </div>
          </div>
        </div>

        {/* ---- Review Submit Success Toast ---- */}
        {reviewSubmitSuccess && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-[440px]">
            <div className="bg-green-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">Ulasan berhasil dikirim!</p>
                <p className="text-[11px] opacity-80">Menunggu persetujuan admin.</p>
              </div>
              <button onClick={() => setReviewSubmitSuccess(false)} className="flex-shrink-0 opacity-70 hover:opacity-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ---- Checkout Success Overlay ---- */}
        {checkoutResult && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setCheckoutResult(null)}
            />
            {/* Sheet */}
            <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl px-5 py-6 shadow-2xl animate-in slide-in-from-bottom duration-300 lg:max-w-3xl lg:rounded-[28px] lg:border lg:border-white/10 lg:bg-[#171D25] lg:text-white">
              {/* Handle */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300 lg:bg-white/20" />

              {/* Status icon */}
              <div className="flex flex-col items-center text-center mt-2 mb-5">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3 lg:bg-green-500/15">
                  <svg className="w-9 h-9 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-1 lg:text-white">
                  {checkoutResult.status === "PAID" ? "Pesanan Dibuat!" : "Menunggu Pembayaran"}
                </h2>
                <p className="text-sm text-slate-500 lg:text-slate-300">
                  {checkoutResult.status === "PAID"
                    ? "Pesananmu sedang diproses. Serial number akan dikirim segera."
                    : "Selesaikan pembayaran untuk memproses pesananmu."}
                </p>
                {checkoutResult.mode === "mock" && (
                  <span className="mt-2 text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                    🧪 MODE SIMULASI
                  </span>
                )}
              </div>

              {/* Order details */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-2 lg:bg-white/[0.04] lg:border lg:border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 lg:text-slate-400">Produk</span>
                  <span className="text-xs font-semibold text-slate-700 text-right max-w-[60%] truncate lg:text-slate-100">{checkoutResult.productName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 lg:text-slate-400">Kode Pesanan</span>
                  <span className="text-xs font-mono font-bold text-purple-700">{checkoutResult.orderCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 lg:text-slate-400">Total Bayar</span>
                  <span className="text-sm font-bold text-slate-800 lg:text-white">Rp {formatPrice(checkoutResult.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 lg:text-slate-400">Status</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    checkoutResult.status === "PAID"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {checkoutResult.status}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => router.push("/akun/pesanan")}
                  className="w-full py-3 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors"
                >
                  Lihat Pesanan
                </button>
                <button
                  onClick={() => {
                    setCheckoutResult(null);
                    setSelectedProduct(null);
                    setPaymentMethod(null);
                    setAppliedVoucher(null);
                    setVoucherError(null);
                    setFieldValues(Object.fromEntries(inputFields.map((f) => [f.key, ""])));
                  }}
                  className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Beli Lagi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
