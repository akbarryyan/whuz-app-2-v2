export function slugifyBrand(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function normalizeBrandKey(value: string) {
  return slugifyBrand(value);
}
