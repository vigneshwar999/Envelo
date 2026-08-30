/** Small display helpers shared across screens. */

/** "125.5" → "125.50"; keeps more decimals when the value has them. */
export function formatUsdc(amount: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "\u2014";
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  const decimals = (amount.split(".")[1] ?? "").replace(/0+$/, "").length;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.max(2, Math.min(decimals, 6)),
  });
}

/** 0xabcdef…1234 style truncation for hashes and addresses. */
export function shortHex(value: string | null | undefined, lead = 8, tail = 6): string {
  if (!value) return "\u2014";
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}\u2026${value.slice(-tail)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso.replace("T", " ").slice(0, 16);
  }
}
