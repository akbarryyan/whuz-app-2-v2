"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Quicksand } from "@/lib/fonts";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import { isOtpAuthEnabledClient } from "@/lib/auth-config";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

type Tab = "login" | "register";
type OtpTarget = "whatsapp" | "email";

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

// ===================== OTP INPUT COMPONENT =====================

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

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
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

// ===================== REUSABLE UI PARTS =====================

/** Method toggle (WhatsApp / Email) */
const MethodToggle = ({
  method,
  onChange,
  label,
}: {
  method: OtpTarget;
  onChange: (value: OtpTarget) => void;
  label?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
    )}
    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange("whatsapp")}
        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
          method === "whatsapp" ? "bg-white text-[#25D366] shadow-sm" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <WhatsAppIcon />
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => onChange("email")}
        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
          method === "email" ? "bg-white text-[#003D99] shadow-sm" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <EmailIcon />
        Email
      </button>
    </div>
  </div>
);

/** Submit button */
const SubmitBtn = ({
  label,
  loadingLabel,
  onClick,
  type = "button",
  disabled,
  isLoading,
}: {
  label: string;
  loadingLabel: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  isLoading?: boolean;
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={isLoading || disabled}
    className="w-full rounded-xl bg-[#003D99] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#002966] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {isLoading ? (
      <span className="flex items-center justify-center gap-2">
        <LoadingSpinner />
        {loadingLabel}
      </span>
    ) : (
      label
    )}
  </button>
);

/** Password input field with toggle */
const PasswordField = ({
  label,
  placeholder,
  value,
  onChange,
  show,
  toggleShow,
  autoComplete,
  isLoading,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggleShow: () => void;
  autoComplete: string;
  isLoading?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
        <LockIcon />
      </span>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-12 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
        autoComplete={autoComplete}
        disabled={isLoading}
      />
      <button
        type="button"
        onClick={toggleShow}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
        tabIndex={-1}
      >
        <EyeIcon show={show} />
      </button>
    </div>
  </div>
);

// ===================== MAIN COMPONENT =====================

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const otpEnabled = isOtpAuthEnabledClient;

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<Tab>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [siteName, setSiteName] = useState("Website");

  // ========================
  // LOGIN STATE
  // ========================
  const [loginMethod, setLoginMethod] = useState<OtpTarget>("whatsapp");
  const [loginIdentifier, setLoginIdentifier] = useState(""); // WA or email
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Login OTP state
  const [loginStep, setLoginStep] = useState<"credentials" | "otp">("credentials");
  const [loginOtp, setLoginOtp] = useState(["", "", "", "", "", ""]);
  const [loginCountdown, setLoginCountdown] = useState(0);

  // ========================
  // REGISTER STATE
  // ========================
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Register OTP state
  const [regOtpTarget, setRegOtpTarget] = useState<OtpTarget>("whatsapp");
  const [regStep, setRegStep] = useState<"form" | "otp">("form");
  const [regOtp, setRegOtp] = useState(["", "", "", "", "", ""]);
  const [regCountdown, setRegCountdown] = useState(0);

  useEffect(() => {
    fetch("/api/site-branding")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.site_name) {
          setSiteName(data.data.site_name);
        }
      })
      .catch(() => {});
  }, []);

  // --- Countdown timers ---
  useEffect(() => {
    if (loginCountdown <= 0) return;
    const t = setTimeout(() => setLoginCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [loginCountdown]);

  useEffect(() => {
    if (regCountdown <= 0) return;
    const t = setTimeout(() => setRegCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [regCountdown]);

  // Reset login step when switching methods
  useEffect(() => {
    setLoginStep("credentials");
    setLoginOtp(["", "", "", "", "", ""]);
    setLoginIdentifier("");
    setLoginPassword("");
  }, [loginMethod]);

  // ===================== LOGIN HANDLERS =====================

  /**
   * Step 1: Validate password, then auto-send OTP
   */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!loginIdentifier.trim()) {
      toast.error(
        loginMethod === "whatsapp"
          ? "Nomor WhatsApp wajib diisi."
          : "Email wajib diisi."
      );
      return;
    }
    if (!loginPassword) {
      toast.error("Password wajib diisi.");
      return;
    }
    if (loginPassword.length < 6) {
      toast.error("Password minimal 6 karakter.");
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Validate password
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
          method: loginMethod,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "Login gagal.");
        setIsLoading(false);
        return;
      }

      if (!data.requireOtp) {
        toast.success(data.message || "Login berhasil!");
        setTimeout(() => router.push("/"), 700);
        return;
      }

      // Step 2: Auto-send OTP
      const otpPayload: Record<string, string> = {
        purpose: "LOGIN",
        target: loginMethod,
      };
      if (loginMethod === "whatsapp") {
        otpPayload.phone = loginIdentifier.trim();
      } else {
        otpPayload.email = loginIdentifier.trim();
      }

      const otpRes = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(otpPayload),
      });
      const otpData = await otpRes.json();

      if (otpData.success) {
        toast.success(otpData.message);
        setLoginStep("otp");
        setLoginOtp(["", "", "", "", "", ""]);
        setLoginCountdown(60);
      } else {
        toast.error(otpData.message || "Gagal mengirim OTP.");
      }
    } catch {
      toast.error("Koneksi bermasalah. Periksa jaringan Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resend Login OTP
   */
  const handleResendLoginOtp = useCallback(async () => {
    if (isLoading || loginCountdown > 0) return;

    setIsLoading(true);
    try {
      const otpPayload: Record<string, string> = {
        purpose: "LOGIN",
        target: loginMethod,
      };
      if (loginMethod === "whatsapp") {
        otpPayload.phone = loginIdentifier.trim();
      } else {
        otpPayload.email = loginIdentifier.trim();
      }

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(otpPayload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setLoginOtp(["", "", "", "", "", ""]);
        setLoginCountdown(60);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Koneksi bermasalah.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, loginCountdown, loginMethod, loginIdentifier, toast]);

  /**
   * Verify Login OTP
   */
  const handleVerifyLoginOtp = async () => {
    if (isLoading) return;

    const code = loginOtp.join("");
    if (code.length !== 6) {
      toast.error("Masukkan 6 digit kode OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, string> = {
        code,
        purpose: "LOGIN",
        target: loginMethod,
      };
      if (loginMethod === "whatsapp") {
        payload.phone = loginIdentifier.trim();
      } else {
        payload.email = loginIdentifier.trim();
      }

      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Login berhasil!");
        setTimeout(() => router.push("/"), 1000);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Koneksi bermasalah.");
    } finally {
      setIsLoading(false);
    }
  };

  // ===================== REGISTER HANDLERS =====================

  /**
   * Register Step 1: Validate form & send OTP
   */
  const handleRegisterSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Validate
    if (!regName.trim()) {
      toast.error("Nama wajib diisi.");
      return;
    }
    if (regName.trim().length < 2) {
      toast.error("Nama minimal 2 karakter.");
      return;
    }
    if (!regEmail.trim()) {
      toast.error("Email wajib diisi.");
      return;
    }
    if (!regEmail.includes("@")) {
      toast.error("Format email tidak valid.");
      return;
    }
    if (!regPhone.trim()) {
      toast.error("Nomor WhatsApp wajib diisi.");
      return;
    }
    if (!regPassword) {
      toast.error("Password wajib diisi.");
      return;
    }
    if (!allPasswordRulesPassed(regPassword)) {
      toast.error("Password belum memenuhi semua persyaratan.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);
    try {
      if (!otpEnabled) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: regName.trim(),
            email: regEmail.trim(),
            phone: regPhone.trim(),
            password: regPassword,
            confirmPassword: regConfirmPassword,
          }),
        });
        const data = await res.json();

        if (data.success) {
          toast.success(data.message || "Akun berhasil dibuat!");
          setTimeout(() => router.push("/"), 1000);
        } else {
          toast.error(data.message || "Registrasi gagal.");
        }
        return;
      }

      // Send OTP via selected target
      const otpPayload: Record<string, string> = {
        purpose: "REGISTER",
        target: regOtpTarget,
      };
      if (regOtpTarget === "whatsapp") {
        otpPayload.phone = regPhone.trim();
      } else {
        otpPayload.email = regEmail.trim();
      }

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(otpPayload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setRegStep("otp");
        setRegOtp(["", "", "", "", "", ""]);
        setRegCountdown(60);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Koneksi bermasalah.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resend Register OTP
   */
  const handleResendRegOtp = useCallback(async () => {
    if (isLoading || regCountdown > 0) return;

    setIsLoading(true);
    try {
      const otpPayload: Record<string, string> = {
        purpose: "REGISTER",
        target: regOtpTarget,
      };
      if (regOtpTarget === "whatsapp") {
        otpPayload.phone = regPhone.trim();
      } else {
        otpPayload.email = regEmail.trim();
      }

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(otpPayload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setRegOtp(["", "", "", "", "", ""]);
        setRegCountdown(60);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Koneksi bermasalah.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, regCountdown, regOtpTarget, regPhone, regEmail, toast]);

  /**
   * Verify Register OTP
   */
  const handleVerifyRegOtp = async () => {
    if (isLoading) return;

    const code = regOtp.join("");
    if (code.length !== 6) {
      toast.error("Masukkan 6 digit kode OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, string> = {
        code,
        purpose: "REGISTER",
        target: regOtpTarget,
        name: regName.trim(),
        regPhone: regPhone.trim(),
        regEmail: regEmail.trim(),
      };
      if (regOtpTarget === "whatsapp") {
        payload.phone = regPhone.trim();
      } else {
        payload.email = regEmail.trim();
      }

      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Akun berhasil dibuat!");
        setTimeout(() => router.push("/"), 1200);
      } else {
        toast.error(data.message);
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
            {/* ---- Top Tab Switcher (Masuk / Daftar) ---- */}
            <div className="flex border-b border-slate-100">
              {(["login", "register"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    // Reset states
                    if (tab === "login") {
                      setLoginStep("credentials");
                      setLoginOtp(["", "", "", "", "", ""]);
                    } else {
                      setRegStep("form");
                      setRegOtp(["", "", "", "", "", ""]);
                    }
                  }}
                  className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                    activeTab === tab ? "text-[#003D99]" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab === "login" ? "Masuk" : "Daftar"}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003D99] rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* ============ LOGIN TAB ============ */}
              {activeTab === "login" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-lg font-bold text-slate-800">Selamat datang!</p>
                    <p className="text-sm text-slate-500 mt-0.5">Masuk ke akun {siteName} kamu</p>
                  </div>

                  {loginStep === "credentials" ? (
                    <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                      {/* Login method toggle */}
                      <MethodToggle
                        method={loginMethod}
                        onChange={setLoginMethod}
                        label="Login via"
                      />

                      {/* Identifier (WA / Email) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {loginMethod === "whatsapp" ? "Nomor WhatsApp" : "Email"}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            {loginMethod === "whatsapp" ? <PhoneIcon /> : <EmailIcon />}
                          </span>
                          <input
                            type={loginMethod === "whatsapp" ? "tel" : "email"}
                            placeholder={
                              loginMethod === "whatsapp" ? "08xxxxxxxxxx" : "email@kamu.com"
                            }
                            value={loginIdentifier}
                            onChange={(e) =>
                              setLoginIdentifier(
                                loginMethod === "whatsapp"
                                  ? e.target.value.replace(/[^\d+]/g, "")
                                  : e.target.value
                              )
                            }
                            className={`w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                              loginMethod === "whatsapp"
                                ? "focus:border-[#25D366] focus:ring-green-100"
                                : "focus:border-[#003D99] focus:ring-blue-100"
                            }`}
                            autoComplete={loginMethod === "whatsapp" ? "tel" : "email"}
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <PasswordField
                        label="Password"
                        placeholder="Masukkan password"
                        value={loginPassword}
                        onChange={setLoginPassword}
                        show={showLoginPassword}
                        toggleShow={() => setShowLoginPassword((v) => !v)}
                        autoComplete="current-password"
                        isLoading={isLoading}
                      />

                      {/* Info: OTP otomatis dikirim */}
                      <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-xs text-blue-700">
                          {otpEnabled ? (
                            <>
                              Setelah password valid, kode OTP akan otomatis dikirim ke{" "}
                              <span className="font-bold">
                                {loginMethod === "whatsapp" ? "WhatsApp" : "Email"}
                              </span>{" "}
                              kamu.
                            </>
                          ) : (
                            <>OTP sedang dinonaktifkan. Login akan langsung masuk setelah password valid.</>
                          )}
                        </p>
                      </div>

                      <SubmitBtn
                        label="Masuk"
                        loadingLabel="Memproses..."
                        type="submit"
                        isLoading={isLoading}
                      />
                    </form>
                  ) : (
                    /* ---- LOGIN OTP STEP ---- */
                    <div className="flex flex-col gap-4">
                      {/* Back button */}
                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep("credentials");
                          setLoginOtp(["", "", "", "", "", ""]);
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
                            {loginMethod === "whatsapp" ? "WhatsApp " : "Email "}
                            {loginIdentifier}
                          </span>
                        </p>
                      </div>

                      {/* OTP input */}
                      <OtpInput value={loginOtp} onChange={setLoginOtp} disabled={isLoading} />

                      {/* Countdown & resend */}
                      <div className="text-center">
                        {loginCountdown > 0 ? (
                          <p className="text-xs text-slate-400">
                            Kirim ulang dalam{" "}
                            <span className="font-semibold text-slate-600">{loginCountdown}s</span>
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendLoginOtp}
                            disabled={isLoading}
                            className="text-xs font-semibold text-[#003D99] hover:text-[#002966] transition disabled:opacity-50"
                          >
                            Kirim ulang OTP
                          </button>
                        )}
                      </div>

                      <SubmitBtn
                        label="Verifikasi"
                        loadingLabel="Memverifikasi..."
                        onClick={handleVerifyLoginOtp}
                        isLoading={isLoading}
                      />
                    </div>
                  )}

                  {/* Forgot password */}
                  <p className="text-center">
                    <button
                      type="button"
                      onClick={() => router.push("/forgot-password")}
                      className="text-sm font-semibold text-slate-400 hover:text-[#003D99] transition"
                    >
                      Lupa Password?
                    </button>
                  </p>

                  {/* Switch to register */}
                  <p className="text-center text-sm text-slate-500">
                    Belum punya akun?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("register")}
                      className="font-semibold text-[#003D99] hover:text-[#002366] transition"
                    >
                      Daftar sekarang
                    </button>
                  </p>
                </div>
              )}

              {/* ============ REGISTER TAB ============ */}
              {activeTab === "register" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-lg font-bold text-slate-800">Buat akun baru</p>
                    <p className="text-sm text-slate-500 mt-0.5">Gratis dan cepat</p>
                  </div>

                  {regStep === "form" ? (
                    <form onSubmit={handleRegisterSendOtp} className="flex flex-col gap-4">
                      {otpEnabled && (
                        <MethodToggle
                          method={regOtpTarget}
                          onChange={setRegOtpTarget}
                          label="Verifikasi akun via"
                        />
                      )}

                      {/* Nama */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Nama Lengkap
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <UserIcon />
                          </span>
                          <input
                            type="text"
                            placeholder="Nama lengkap kamu"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                            autoComplete="name"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Email
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <EmailIcon />
                          </span>
                          <input
                            type="email"
                            placeholder="email@kamu.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition"
                            autoComplete="email"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {/* No WA */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Nomor WhatsApp
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <PhoneIcon />
                          </span>
                          <input
                            type="tel"
                            placeholder="08xxxxxxxxxx"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value.replace(/[^\d+]/g, ""))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-green-100 transition"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="flex flex-col gap-1.5">
                        <PasswordField
                          label="Password"
                          placeholder="Minimal 8 karakter"
                          value={regPassword}
                          onChange={setRegPassword}
                          show={showRegPassword}
                          toggleShow={() => setShowRegPassword((v) => !v)}
                          autoComplete="new-password"
                          isLoading={isLoading}
                        />

                        {/* Password validation checklist */}
                        {regPassword.length > 0 && (
                          <ul className="flex flex-col gap-1 mt-1">
                            {getPasswordRules(regPassword).map((rule) => (
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
                          Konfirmasi Password
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
                            type={showRegConfirmPassword ? "text" : "password"}
                            placeholder="Ulangi password kamu"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            className={`w-full rounded-xl border bg-slate-50 pl-10 pr-12 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                              regConfirmPassword.length > 0
                                ? regConfirmPassword === regPassword
                                  ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                                  : "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                                : "border-slate-200 focus:border-purple-400 focus:ring-purple-100"
                            }`}
                            autoComplete="new-password"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegConfirmPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                            tabIndex={-1}
                          >
                            <EyeIcon show={showRegConfirmPassword} />
                          </button>
                          {regConfirmPassword.length > 0 && (
                            <span className="absolute right-10 top-1/2 -translate-y-1/2">
                              {regConfirmPassword === regPassword ? (
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

                      {otpEnabled ? (
                        <div className="flex flex-col gap-2">
                          <MethodToggle
                            method={regOtpTarget}
                            onChange={setRegOtpTarget}
                            label="Kirim OTP via"
                          />
                          <p className="text-xs text-slate-400">
                            Kode verifikasi akan dikirim ke{" "}
                            <span className="font-semibold text-slate-600">
                              {regOtpTarget === "whatsapp" ? "WhatsApp" : "Email"}
                            </span>{" "}
                            kamu
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-50 rounded-xl px-4 py-3 text-xs text-amber-700">
                          OTP sedang dinonaktifkan. Setelah daftar, akun akan langsung dibuat dan login otomatis.
                        </div>
                      )}

                      {/* Terms */}
                      <p className="text-xs text-slate-400 text-center leading-relaxed -mt-1">
                        Dengan mendaftar, kamu menyetujui{" "}
                        <span className="text-[#003D99] font-medium cursor-pointer hover:underline">
                          Syarat & Ketentuan
                        </span>{" "}
                        yang berlaku di {siteName}.
                      </p>

                      <SubmitBtn
                        label="Kirim OTP & Daftar"
                        loadingLabel="Mengirim..."
                        type="submit"
                        isLoading={isLoading}
                      />
                    </form>
                  ) : (
                    /* ---- REGISTER OTP STEP ---- */
                    <div className="flex flex-col gap-4">
                      {/* Back button */}
                      <button
                        type="button"
                        onClick={() => {
                          setRegStep("form");
                          setRegOtp(["", "", "", "", "", ""]);
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
                            {regOtpTarget === "whatsapp"
                              ? `WhatsApp ${regPhone}`
                              : `Email ${regEmail}`}
                          </span>
                        </p>
                      </div>

                      {/* OTP input */}
                      <OtpInput value={regOtp} onChange={setRegOtp} disabled={isLoading} />

                      {/* Countdown & resend */}
                      <div className="text-center">
                        {regCountdown > 0 ? (
                          <p className="text-xs text-slate-400">
                            Kirim ulang dalam{" "}
                            <span className="font-semibold text-slate-600">{regCountdown}s</span>
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendRegOtp}
                            disabled={isLoading}
                            className="text-xs font-semibold text-[#003D99] hover:text-[#002966] transition disabled:opacity-50"
                          >
                            Kirim ulang OTP
                          </button>
                        )}
                      </div>

                      <SubmitBtn
                        label="Verifikasi & Daftar"
                        loadingLabel="Mendaftarkan..."
                        onClick={handleVerifyRegOtp}
                        isLoading={isLoading}
                      />
                    </div>
                  )}

                  {/* Switch to login */}
                  <p className="text-center text-sm text-slate-500">
                    Sudah punya akun?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("login")}
                      className="font-semibold text-[#003D99] hover:text-[#002966] transition"
                    >
                      Masuk di sini
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
