export function isOtpAuthEnabled() {
  return process.env.AUTH_OTP_ENABLED !== "false";
}

export const isOtpAuthEnabledClient =
  process.env.NEXT_PUBLIC_AUTH_OTP_ENABLED !== "false";
