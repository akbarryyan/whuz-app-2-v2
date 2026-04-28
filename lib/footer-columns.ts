import { FooterLinkItem, normalizeFooterLink } from "@/lib/footer-links";

export interface FooterColumnItem {
  title: string;
  links: FooterLinkItem[];
}

export function normalizeFooterColumn(input?: Partial<FooterColumnItem>): FooterColumnItem {
  return {
    title: (input?.title ?? "").trim(),
    links: Array.isArray(input?.links)
      ? input!.links
          .map((item) => normalizeFooterLink(item))
          .filter((item) => item.label && item.href)
      : [],
  };
}

export function normalizeFooterColumns(input: unknown, fallback: FooterColumnItem[] = []): FooterColumnItem[] {
  if (!Array.isArray(input)) return fallback;
  return input
    .map((item) => normalizeFooterColumn((item ?? {}) as Partial<FooterColumnItem>))
    .filter((item) => item.title || item.links.length > 0);
}

export function collectFooterColumnPageLinks(columns: FooterColumnItem[]): FooterLinkItem[] {
  const seen = new Set<string>();
  const pages: FooterLinkItem[] = [];

  for (const column of columns) {
    for (const link of column.links) {
      const item = normalizeFooterLink(link);
      if (item.type !== "page" || !item.slug || seen.has(item.slug)) continue;
      seen.add(item.slug);
      pages.push(item);
    }
  }

  return pages;
}

export const DEFAULT_FOOTER_COLUMNS: FooterColumnItem[] = [
  {
    title: "AYOBORONG",
    links: [
      { label: "Tentang Kami", type: "page", slug: "tentang-kami", href: "/info/tentang-kami" },
      { label: "Hubungi Kami", type: "page", slug: "hubungi-kami", href: "/info/hubungi-kami" },
      { label: "Aturan Penggunaan", type: "page", slug: "aturan-penggunaan", href: "/info/aturan-penggunaan" },
      { label: "Kebijakan Pengembalian Dana", type: "page", slug: "kebijakan-pengembalian-dana", href: "/info/kebijakan-pengembalian-dana" },
    ],
  },
  {
    title: "PEMBELI",
    links: [
      { label: "Cara Belanja", type: "page", slug: "cara-belanja", href: "/info/cara-belanja" },
      { label: "Cara Bayar", type: "page", slug: "cara-bayar", href: "/info/cara-bayar" },
    ],
  },
  {
    title: "PENJUAL",
    links: [
      { label: "Cara Jadi Penjual", type: "page", slug: "cara-jadi-penjual", href: "/info/cara-jadi-penjual" },
      { label: "Metode Pengiriman Produk", type: "page", slug: "metode-pengiriman-produk", href: "/info/metode-pengiriman-produk" },
      { label: "Metode Pencairan Saldo", type: "page", slug: "metode-pencairan-saldo", href: "/info/metode-pencairan-saldo" },
      { label: "Biaya Berjualan", type: "page", slug: "biaya-berjualan", href: "/info/biaya-berjualan" },
    ],
  },
];
