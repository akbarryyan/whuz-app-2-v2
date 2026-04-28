"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

type OtpTarget = "whatsapp" | "email";
type Step = "identifier" | "otp" | "new-password" | "success";

// ===================== HELPERS =====================

function getPasswordRules(password: string) {
  return [
    { label: "Terdapat huruf besar", passed: /[A-Z]/.test(password) },
    { label: "Terdapat huruf kecil", passed: /[a-z]/.test(password) },
    { label: "Terdapat angka", passed: /[0-9]/.test(password) },
    { label: "Minimal 8 karakter", passed: password.length >= 8 },
    { label: "Tidak terdapat spasi", passed: !/\s/.test(password) },
  ];
}

function allPasswordRulesPassed(password: string) {
  return getPasswordRules(password).every((r) => r.passed);
}

// ===================== OTP INPUT =====================

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const next = [...value];
    next[idx] = char;
    onChange(next);
    if (char && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...value];
    for (let i = 0; i < 6; i++) next[i] = text[i] || "";
    onChange(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {value.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          className="w-11 h-13 rounded-xl border border-slate-200 bg-slate-50 text-center text-lg font-bold text-slate-800 focus:border-[#003D99] focus:outline-none focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
        />
      ))}
    </div>
  );
}

// ===================== ICONS =====================

const PhoneIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

const EmailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
    />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const EyeIcon = ({ show }: { show: boolean }) =>
  show ? (
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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );

const BackArrowIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ===================== MAIN COMPONENT =====================

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<Step>("identifier");
  const [method, setMethod] = useState<OtpTarget>("whatsapp");
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);

  // New password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ===================== HANDLERS =====================

  /** Step 1: Send OTP */
  const handleSendOtp = async () => {
    if (isLoading) return;

    if (!identifier.trim()) {
      toast.error(method === "whatsapp" ? "Nomor WhatsApp wajib diisi." : "Email wajib diisi.");
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, string> = {
        purpose: "RESET_PASSWORD",
        target: method,
      };
      if (method === "whatsapp") {
        payload.phone = identifier.trim();
      } else {
        payload.email = identifier.trim();
      }

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setStep("otp");
        setOtp(["", "", "", "", "", ""]);
        setCountdown(60);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Koneksi bermasalah.");
    } finally {
      setIsLoading(false);
    }
  };

  /** Resend OTP */
  const handleResendOtp = useCallback(async () => {
    if (isLoading || countdown > 0) return;

    setIsLoading(true);
    try {
      const payload: Record<string, string> = {
        purpose: "RESET_PASSWORD",
        target: method,
      };
      if (method === "whatsapp") {
        payload.phone = identifier.trim();
      } else {
        payload.email = identifier.trim();
      }

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setOtp(["", "", "", "", "", ""]);
        setCountdown(60);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Koneksi bermasalah.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, countdown, method, identifier, toast]);

  /** Step 2: Verify OTP → go to new password step */
  const handleVerifyOtp = () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Masukkan 6 digit kode OTP.");
      return;
    }
    // Move to password step — OTP will be verified on the server when we reset
    setStep("new-password");
  };

  /** Step 3: Reset password (verifies OTP + updates password) */
  const handleResetPassword = async () => {
    if (isLoading) return;

    if (!newPassword) {
      toast.error("Password baru wajib diisi.");
      return;
    }
    if (!allPasswordRulesPassed(newPassword)) {
      toast.error("Password belum memenuhi semua persyaratan.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          method,
          code: otp.join(""),
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setStep("success");
      } else {
        toast.error(data.message);
        // If OTP is wrong/expired, go back to OTP step
        if (data.message?.includes("OTP")) {
          setStep("otp");
        }
      }
    } catch {
      toast.error("Koneksi bermasalah.");
    } finally {
      setIsLoading(false);
    }
  };

  // ===================== RENDER =====================

  return (
    <div className={`${quicksand.className} flex min-h-screen justify-center bg-[#F5F5F5]`}>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="relative w-full max-w-[480px] min-h-screen bg-white shadow-2xl flex flex-col">
        <div className="flex-1 px-6 flex items-center">
          <div className="w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#003D99] to-[#0052CC] px-6 py-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <LockIcon />
              </div>
              <h1 className="text-xl font-bold text-white">Lupa Password</h1>
              <p className="text-sm text-blue-200 mt-1">
                {step === "identifier" && "Verifikasi identitas untuk reset password"}
                {step === "otp" && "Masukkan kode OTP yang dikirim"}
                {step === "new-password" && "Buat password baru"}
                {step === "success" && "Password berhasil direset!"}
              </p>
            </div>

            {/* Step indicator */}
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((s) => {
                  const stepIndex =
                    step === "identifier" ? 1 : step === "otp" ? 2 : step === "new-password" ? 3 : 3;
                  const isActive = s <= stepIndex;
                  return (
                    <div
                      key={s}
                      className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                        isActive ? "bg-[#003D99]" : "bg-slate-200"
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Langkah{" "}
                {step === "identifier" ? "1" : step === "otp" ? "2" : "3"} dari 3
              </p>
            </div>

            <div className="p-6">
              {/* ============ STEP 1: IDENTIFIER ============ */}
              {step === "identifier" && (
                <div className="flex flex-col gap-4">
                  {/* Method toggle */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Verifikasi via
                    </label>
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMethod("whatsapp");
                          setIdentifier("");
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          method === "whatsapp"
                            ? "bg-white text-[#25D366] shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <WhatsAppIcon />
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMethod("email");
                          setIdentifier("");
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          method === "email"
                            ? "bg-white text-[#003D99] shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <EmailIcon />
                        Email
                      </button>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {method === "whatsapp" ? "Nomor WhatsApp" : "Email"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        {method === "whatsapp" ? <PhoneIcon /> : <EmailIcon />}
                      </span>
                      <input
                        type={method === "whatsapp" ? "tel" : "email"}
                        placeholder={method === "whatsapp" ? "08xxxxxxxxxx" : "email@kamu.com"}
                        value={identifier}
                        onChange={(e) =>
                          setIdentifier(
                            method === "whatsapp"
                              ? e.target.value.replace(/[^\d+]/g, "")
                              : e.target.value
                          )
                        }
                        className={`w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                          method === "whatsapp"
                            ? "focus:border-[#25D366] focus:ring-green-100"
                            : "focus:border-[#003D99] focus:ring-blue-100"
                        }`}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      {`Kode OTP reset password akan dikirim ke ${
                        method === "whatsapp" ? "WhatsApp" : "email"
                      } kamu`}
                    </p>
                  </div>

                  {/* Send OTP button */}
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="w-full rounded-xl bg-[#003D99] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#002966] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner />
                        Mengirim...
                      </span>
                    ) : (
                      "Kirim Kode OTP"
                    )}
                  </button>

                  {/* Back to login */}
                  <p className="text-center text-sm text-slate-500">
                    Ingat password?{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="font-semibold text-[#003D99] hover:text-[#002966] transition"
                    >
                      Masuk di sini
                    </button>
                  </p>
                </div>
              )}

              {/* ============ STEP 2: OTP VERIFICATION ============ */}
              {step === "otp" && (
                <div className="flex flex-col gap-4">
                  {/* Back */}
                  <button
                    type="button"
                    onClick={() => {
                      setStep("identifier");
                      setOtp(["", "", "", "", "", ""]);
                    }}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition w-fit"
                  >
                    <BackArrowIcon />
                    Kembali
                  </button>

                  <div className="text-center">
                    <p className="text-sm text-slate-600">
                      Kode OTP dikirim ke{" "}
                      <span className="font-bold text-slate-800">
                        {method === "whatsapp" ? "WhatsApp " : "Email "}
                        {identifier}
                      </span>
                    </p>
                  </div>

                  <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />

                  {/* Countdown & resend */}
                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-xs text-slate-400">
                        Kirim ulang dalam{" "}
                        <span className="font-semibold text-slate-600">{countdown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="text-xs font-semibold text-[#003D99] hover:text-[#002966] transition disabled:opacity-50"
                      >
                        Kirim ulang OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isLoading}
                    className="w-full rounded-xl bg-[#003D99] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#002966] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Lanjutkan
                  </button>
                </div>
              )}

              {/* ============ STEP 3: NEW PASSWORD ============ */}
              {step === "new-password" && (
                <div className="flex flex-col gap-4">
                  {/* Back */}
                  <button
                    type="button"
                    onClick={() => setStep("otp")}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition w-fit"
                  >
                    <BackArrowIcon />
                    Kembali
                  </button>

                  {/* New Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Password Baru
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <LockIcon />
                      </span>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Minimal 8 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-12 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                        autoComplete="new-password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                        tabIndex={-1}
                      >
                        <EyeIcon show={showNewPassword} />
                      </button>
                    </div>

                    {/* Password rules */}
                    {newPassword.length > 0 && (
                      <ul className="flex flex-col gap-1 mt-1">
                        {getPasswordRules(newPassword).map((rule) => (
                          <li key={rule.label} className="flex items-center gap-2">
                            {rule.passed ? (
                              <svg
                                className="w-4 h-4 text-emerald-500 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4 text-slate-300 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <circle cx="12" cy="12" r="9" strokeWidth={2} />
                              </svg>
                            )}
                            <span
                              className={`text-xs transition-colors ${
                                rule.passed ? "text-emerald-600 font-semibold" : "text-slate-400"
                              }`}
                            >
                              {rule.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Konfirmasi Password Baru
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </span>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Ulangi password baru"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full rounded-xl border bg-slate-50 pl-10 pr-12 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                          confirmPassword.length > 0
                            ? confirmPassword === newPassword
                              ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                              : "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                            : "border-slate-200 focus:border-purple-400 focus:ring-purple-100"
                        }`}
                        autoComplete="new-password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                        tabIndex={-1}
                      >
                        <EyeIcon show={showConfirmPassword} />
                      </button>
                      {confirmPassword.length > 0 && (
                        <span className="absolute right-10 top-1/2 -translate-y-1/2">
                          {confirmPassword === newPassword ? (
                            <svg
                              className="w-4 h-4 text-emerald-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4 text-rose-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isLoading}
                    className="w-full rounded-xl bg-[#003D99] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#002966] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner />
                        Mereset password...
                      </span>
                    ) : (
                      "Reset Password"
                    )}
                  </button>
                </div>
              )}

              {/* ============ STEP 4: SUCCESS ============ */}
              {step === "success" && (
                <div className="flex flex-col gap-5 items-center text-center py-4">
                  <CheckCircleIcon />
                  <div>
                    <p className="text-lg font-bold text-slate-800">Password berhasil direset!</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Silakan masuk dengan password baru kamu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="w-full rounded-xl bg-[#003D99] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#002966] active:scale-[0.98]"
                  >
                    Masuk Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
