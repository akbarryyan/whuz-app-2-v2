import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  role?: string; // "MEMBER" | "ADMIN"
  isLoggedIn?: boolean;
}

function shouldUseSecureCookies(): boolean {
  if (process.env.NODE_ENV !== "production") return false;

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return appUrl.startsWith("https://");
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "whuzpay_session",
  cookieOptions: {
    secure: shouldUseSecureCookies(),
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}
