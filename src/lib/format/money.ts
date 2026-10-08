const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatMoney = (n: number | null | undefined) => (n === null || n === undefined ? "—" : usd.format(n));

/** Parse a user-typed money amount ("$1,250.50"). Empty -> null; invalid -> undefined. */
export function parseMoneyInput(input: string): number | null | undefined {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  return n > 0 && n <= 1_000_000 ? n : undefined;
}
