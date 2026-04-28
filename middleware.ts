import { NextRequest, NextResponse } from "next/server";

// Paths that are NEVER blocked by maintenance mode
const EXCLUDED = [
  "/admin",
  "/api",
  "/login",
  "/maintenance",
  "/_next",
  "/_vercel",
  "/favicon",
  "/robots",
  "/sitemap",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path is excluded from maintenance mode
  const isExcluded = EXCLUDED.some((prefix) => pathname.startsWith(prefix));
  if (isExcluded) return NextResponse.next();

  // Read cheap cookie set by the toggle API
  const maint = request.cookies.get("_maint")?.value;
  if (maint === "1") {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico / public assets with extension
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$).*)",
  ],
};
