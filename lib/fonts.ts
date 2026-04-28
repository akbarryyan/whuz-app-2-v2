import localFont from "next/font/local";

type FontOptions = {
  variable?: string;
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
  subsets?: string[];
  weight?: string[];
};

const quicksandFont = localFont({
  src: [
    { path: "../app/fonts/quicksand-400.ttf", weight: "400", style: "normal" },
    { path: "../app/fonts/quicksand-500.ttf", weight: "500", style: "normal" },
    { path: "../app/fonts/quicksand-600.ttf", weight: "600", style: "normal" },
    { path: "../app/fonts/quicksand-700.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
  fallback: ["Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});

const ibmPlexSansFont = localFont({
  src: [
    { path: "../app/fonts/ibm-plex-sans-400.ttf", weight: "400", style: "normal" },
    { path: "../app/fonts/ibm-plex-sans-500.ttf", weight: "500", style: "normal" },
    { path: "../app/fonts/ibm-plex-sans-600.ttf", weight: "600", style: "normal" },
    { path: "../app/fonts/ibm-plex-sans-700.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-body",
  fallback: ["Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});

const spaceGroteskFont = localFont({
  src: [
    { path: "../app/fonts/space-grotesk-300.ttf", weight: "300", style: "normal" },
    { path: "../app/fonts/space-grotesk-400.ttf", weight: "400", style: "normal" },
    { path: "../app/fonts/space-grotesk-500.ttf", weight: "500", style: "normal" },
    { path: "../app/fonts/space-grotesk-600.ttf", weight: "600", style: "normal" },
    { path: "../app/fonts/space-grotesk-700.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-display",
  fallback: ["Trebuchet MS", "Segoe UI", "Arial", "sans-serif"],
});

export function Quicksand(options?: FontOptions) {
  void options;
  return quicksandFont;
}

export function IBM_Plex_Sans(options?: FontOptions) {
  void options;
  return ibmPlexSansFont;
}

export function Space_Grotesk(options?: FontOptions) {
  void options;
  return spaceGroteskFont;
}
