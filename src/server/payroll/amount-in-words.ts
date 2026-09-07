const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
] as const;
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
] as const;

function belowThousand(value: number): string {
  const words: string[] = [];
  if (value >= 100) {
    words.push(ONES[Math.floor(value / 100)], "Hundred");
    value %= 100;
  }
  if (value >= 20) {
    words.push(TENS[Math.floor(value / 10)]);
    value %= 10;
  }
  if (value) words.push(ONES[value]);
  return words.join(" ");
}

function integerWords(value: number): string {
  if (!value) return "Zero";
  const words: string[] = [];
  for (const group of [
    { divisor: 10_000_000, label: "Crore" },
    { divisor: 100_000, label: "Lakh" },
    { divisor: 1_000, label: "Thousand" },
  ] as const) {
    if (value >= group.divisor) {
      const count = Math.floor(value / group.divisor);
      words.push(group.label === "Crore" ? integerWords(count) : belowThousand(count), group.label);
      value %= group.divisor;
    }
  }
  if (value) words.push(belowThousand(value));
  return words.join(" ");
}

export function amountInWords(amount: number | string): string {
  const numeric = typeof amount === "number" ? amount : Number(amount.replace(/[,₹\s]/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("Amount must be a non-negative finite number");
  }
  const totalPaise = Math.round(numeric * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  if (!Number.isSafeInteger(rupees)) throw new Error("Amount exceeds the supported safe range");
  const paiseWords = paise ? ` and ${integerWords(paise)} Paise` : "";
  return `${rupees === 1 ? "Rupee" : "Rupees"} ${integerWords(rupees)}${paiseWords} Only`;
}

export const indianCurrencyInWords = amountInWords;
export const amountInWordsInr = amountInWords;
