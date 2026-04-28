export type FooterLinkType = "page" | "link";

export interface FooterLinkItem {
  label: string;
  href: string;
  type?: FooterLinkType;
  slug?: string;
}

export function slugifyFooterLabel(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeFooterLink(item: Partial<FooterLinkItem>): FooterLinkItem {
  const label = (item.label ?? "").trim();
  const rawHref = (item.href ?? "").trim();
  const explicitType = item.type === "page" || item.type === "link" ? item.type : undefined;
  const inferredType: FooterLinkType =
    explicitType ?? (rawHref.startsWith("/info/") ? "page" : "link");

  if (inferredType === "page") {
    const slug =
      (item.slug ?? "").trim() ||
      (rawHref.startsWith("/info/") ? rawHref.replace("/info/", "").trim() : "") ||
      slugifyFooterLabel(label);

    return {
      label,
      type: "page",
      slug,
      href: slug ? `/info/${slug}` : "/info/",
    };
  }

  return {
    label,
    type: "link",
    href: rawHref || "#",
  };
}

export function normalizeFooterLinks(items: unknown, fallback: FooterLinkItem[] = []): FooterLinkItem[] {
  if (!Array.isArray(items)) return fallback;
  return items
    .map((item) => normalizeFooterLink((item ?? {}) as Partial<FooterLinkItem>))
    .filter((item) => item.label && item.href);
}

export function getFooterPageLinks(...groups: FooterLinkItem[][]): FooterLinkItem[] {
  const seen = new Set<string>();
  const items: FooterLinkItem[] = [];

  for (const group of groups) {
    for (const item of group) {
      const normalized = normalizeFooterLink(item);
      if (normalized.type !== "page" || !normalized.slug || seen.has(normalized.slug)) continue;
      seen.add(normalized.slug);
      items.push(normalized);
    }
  }

  return items;
}

export function findFooterPageBySlug(slug: string, ...groups: FooterLinkItem[][]): FooterLinkItem | null {
  return getFooterPageLinks(...groups).find((item) => item.slug === slug) ?? null;
}
