/** Spoken forms of what whisper writes as digits, so "85-90%" can line up with "eighty five to ninety percent". */

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const UNITS: Record<string, string> = { kg: "kilograms", g: "grams", km: "kilometres", m: "metres", cm: "centimetres", mm: "millimetres", t: "tonnes", "%": "percent" };

export function numberToWords(n: number): string[] {
  if (!Number.isInteger(n) || n < 0) return [String(n)];
  if (n < 20) return [ONES[n]!];
  if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10)]!, ONES[n % 10]!] : [TENS[n / 10]!];
  if (n < 1000) return [...numberToWords(Math.floor(n / 100)), "hundred", ...(n % 100 ? numberToWords(n % 100) : [])];
  for (const [value, name] of [
    [1_000_000_000, "billion"],
    [1_000_000, "million"],
    [1000, "thousand"],
  ] as const) {
    if (n >= value) return [...numberToWords(Math.floor(n / value)), name, ...(n % value ? numberToWords(n % value) : [])];
  }
  return [String(n)];
}

/**
 * A heard token as it would be spoken: digits become words, "-" between numbers becomes "to",
 * other hyphens split, "%" and unit suffixes get their names. Plain words come back as themselves.
 */
export function spokenWords(token: string): string[] {
  let t = token.toLowerCase().replace(/(\d),(\d)/g, "$1$2");
  t = t.replace(/(\d)\s*-\s*(\d)/g, "$1 to $2");
  t = t.replace(/(\d)(kg|km|cm|mm|g|m|t|%)\b/g, (_, d, u) => `${d} ${UNITS[u] ?? u}`);
  t = t.replace(/%/g, " percent ");
  t = t.replace(/-/g, " ");
  return t
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => {
      const m = w.match(/^(\d+)(\.\d+)?([a-z]*)$/);
      if (!m) return [w];
      const words = numberToWords(parseInt(m[1]!, 10));
      if (m[2]) words.push("point", ...m[2].slice(1).split("").map((d) => ONES[parseInt(d, 10)]!));
      return m[3] ? [...words, m[3]] : words;
    });
}
