/** Normalize Indian mobile numbers to E.164-ish +91########## form without spaces. */
export function normalizeIndianPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (input.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  throw new Error("Invalid Indian mobile number");
}

export function isValidIndianPhone(input: string): boolean {
  try {
    const n = normalizeIndianPhone(input);
    return /^\+91\d{10}$/.test(n);
  } catch {
    return false;
  }
}
