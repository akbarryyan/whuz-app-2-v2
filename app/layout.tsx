import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "@/lib/fonts";
import { getSiteConfig, getSiteName } from "@/lib/site-config";
import VisitorTracker from "@/components/VisitorTracker";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [siteName, siteDescription, siteKeywords, siteFavicon] =
    await Promise.all([
      getSiteName(),
      getSiteConfig("site_description"),
      getSiteConfig("site_keywords"),
      getSiteConfig("site_favicon"),
    ]);

  const title = siteName;
  const description =
    siteDescription ||
    "Top up game murah, voucher digital, dan bayar tagihan PPOB terpercaya.";
  const keywords = siteKeywords
    ? siteKeywords.split(",").map((k) => k.trim())
    : ["top up game", "voucher digital", "ppob", siteName.toLowerCase()];
  const favicon = siteFavicon || "/favicon.ico";

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    keywords,
    icons: { icon: favicon },
    openGraph: {
      siteName: title,
      title,
      description,
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} antialiased`}
      >
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}
