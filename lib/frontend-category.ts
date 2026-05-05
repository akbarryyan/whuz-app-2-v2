export type FrontendTypeGroup = "game" | "pulsa" | "ewallet" | "listrik";

const TYPE_GROUP_MAP: Record<FrontendTypeGroup, string[]> = {
  game: ["game"],
  pulsa: [
    "paket-internet",
    "paket-telepon",
    "pulsa-reguler",
    "pulsa-transfer",
    "pulsa-internasional",
    "paket-lainnya",
  ],
  ewallet: ["saldo-emoney"],
  listrik: ["token-pln"],
};

const CATEGORY_KEYWORDS: Array<{ group: FrontendTypeGroup; patterns: RegExp[] }> = [
  {
    group: "listrik",
    patterns: [/token listrik/i, /\bpln\b/i, /listrik/i],
  },
  {
    group: "ewallet",
    patterns: [/e-wallet/i, /ewallet/i, /qris/i, /dana/i, /gopay/i, /ovo/i, /shopeepay/i, /linkaja/i],
  },
  {
    group: "pulsa",
    patterns: [/pulsa/i, /paket data/i, /data/i, /internet/i, /telkomsel/i, /indosat/i, /\bxl\b/i, /axis/i, /smartfren/i, /by\.u/i, /\btri\b/i, /\bthree\b/i],
  },
  {
    group: "game",
    patterns: [/top up game/i, /\bgame\b/i, /voucher/i, /membership/i, /diamond/i, /joki/i],
  },
];

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function matchesFrontendCategory(
  categoryName: string,
  input: { category?: string | null; brandCategory?: string | null }
) {
  const selected = normalize(categoryName);
  const effectiveCategory = normalize(input.brandCategory ?? input.category);
  return Boolean(selected) && effectiveCategory === selected;
}

export function matchesFrontendTypeGroup(
  typeGroup: string,
  input: { type?: string | null; category?: string | null; brandCategory?: string | null }
) {
  return resolveFrontendTypeGroup(input) === typeGroup;
}

export function resolveFrontendTypeGroup(input: {
  type?: string | null;
  category?: string | null;
  brandCategory?: string | null;
}): FrontendTypeGroup | null {
  const type = normalize(input.type);
  const category = input.brandCategory ?? input.category;
  const normalizedCategory = normalize(category);

  for (const [group, types] of Object.entries(TYPE_GROUP_MAP) as Array<[FrontendTypeGroup, string[]]>) {
    if (types.includes(type)) return group;
  }

  for (const { group, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some((pattern) => pattern.test(normalizedCategory))) {
      return group;
    }
  }

  return null;
}
