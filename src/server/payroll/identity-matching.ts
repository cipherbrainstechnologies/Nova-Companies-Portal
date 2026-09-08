/**
 * Identity-first payment matching: decide *who* a debit belongs to before comparing amounts.
 * Amount equality alone must never auto-link a payment.
 *
 * Auto-link requires:
 * - All employee-name tokens match whole beneficiary tokens (order-independent)
 * - At least two meaningful tokens
 * - Unique among company employees / aliases
 * - Bank identifiers do not contradict
 */

export type IdentityEvidence = {
  score: number;
  explanation: string;
  matchKind:
    | "exact_token_set"
    | "employee_covered_extra"
    | "alias_exact"
    | "partial"
    | "none";
  matchedVia: Array<"display_name" | "account_holder" | "alias" | "prior_mapping" | "account_last4">;
  /** True when identity is strong enough to auto-link (before uniqueness / bank checks). */
  autoLinkEligible: boolean;
};

const BANK_TOKENS = new Set([
  "AXIS",
  "BANK",
  "TRANSFER",
  "NEFT",
  "IMPS",
  "UPI",
  "RTGS",
  "INB",
  "IFT",
  "PAYMENT",
  "SALARY",
  "PAYOUT",
  "REF",
  "TXN",
  "HDFC",
  "ICICI",
  "SBI",
  "YES",
  "KOTAK",
  "INDUSIND",
  "P2A",
  "P2P",
  "NFS",
  "ACH",
  "CMS",
  "CR",
  "DR",
  "EB",
  "VIA",
  "TO",
  "FROM",
  "ACCT",
  "AC",
]);

const HONORIFICS = new Set([
  "MR",
  "MRS",
  "MS",
  "MISS",
  "DR",
  "SHRI",
  "SMT",
  "SRI",
  "KUMARI",
  "MD",
  "MOHD",
  "MOHAMMED",
]);

/** Compound given-name suffixes allowed for soft equality (HARDIK ↔ HARDIKKUMAR). */
const COMPOUND_SUFFIXES = [
  "KUMAR",
  "BHAI",
  "BEN",
  "JI",
  "LAL",
  "SINGH",
  "RAO",
  "REDDY",
  "NATH",
  "DAS",
];

/** Unique high-confidence identity — amount is irrelevant for this gate. */
export const IDENTITY_AUTO_LINK_THRESHOLD = 70;
export const IDENTITY_SUGGEST_THRESHOLD = 40;
export const IDENTITY_COLLISION_MARGIN = 12;

export function normalizePersonTokens(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\r\n]+/g, " ")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token &&
        !BANK_TOKENS.has(token) &&
        !HONORIFICS.has(token) &&
        !/^\d+$/.test(token) &&
        !(token.length <= 3 && /[0-9]/.test(token)),
    );
}

export function normalizePersonName(value: string): string {
  return normalizePersonTokens(value).join(" ");
}

/**
 * Soft token equality for compound given names only.
 * Harsh must NOT match Harshal; Hardik may match Hardikkumar.
 */
export function tokensSoftEqual(left: string, right: string): boolean {
  if (left === right) return true;
  const [shorter, longer] =
    left.length <= right.length ? [left, right] : [right, left];
  if (shorter.length < 4 || !longer.startsWith(shorter)) return false;
  const rest = longer.slice(shorter.length);
  return COMPOUND_SUFFIXES.some((suffix) => rest === suffix || rest.startsWith(suffix));
}

export function tokensExactOrSoft(left: string, right: string): boolean {
  return left === right || tokensSoftEqual(left, right);
}

/** Ordered-permutation / compound-name aware token coverage in [0, 1]. */
export function tokenCoverage(queryTokens: string[], haystackTokens: string[]): number {
  if (!queryTokens.length || !haystackTokens.length) return 0;
  const used = new Set<number>();
  let matched = 0;
  for (const query of queryTokens) {
    const index = haystackTokens.findIndex(
      (candidate, i) => !used.has(i) && tokensExactOrSoft(query, candidate),
    );
    if (index >= 0) {
      used.add(index);
      matched += 1;
    }
  }
  return matched / queryTokens.length;
}

export type NameTokenMatchKind =
  | "exact_token_set"
  | "employee_covered_extra"
  | "partial"
  | "none";

export type NameTokenMatch = {
  kind: NameTokenMatchKind;
  matchedCount: number;
  employeeTokenCount: number;
  /** All employee tokens matched as whole beneficiary tokens, ≥2 tokens. */
  autoLinkEligible: boolean;
};

/**
 * Compare meaningful whole-name tokens regardless of order.
 * Harsh Thakkar ↔ THAKKAR HARSH → exact_token_set
 * Jainil Solanki ↔ SOLANKI JAINIL ALPESHBHAI → employee_covered_extra
 */
export function matchEmployeeNameTokens(
  employeeName: string,
  beneficiaryTokens: string[],
): NameTokenMatch {
  const employeeTokens = normalizePersonTokens(employeeName);
  if (!employeeTokens.length || !beneficiaryTokens.length) {
    return { kind: "none", matchedCount: 0, employeeTokenCount: 0, autoLinkEligible: false };
  }

  const used = new Set<number>();
  let matchedCount = 0;
  for (const token of employeeTokens) {
    const index = beneficiaryTokens.findIndex(
      (candidate, i) => !used.has(i) && tokensExactOrSoft(token, candidate),
    );
    if (index >= 0) {
      used.add(index);
      matchedCount += 1;
    }
  }

  const allMatched = matchedCount === employeeTokens.length;
  const autoLinkEligible = allMatched && employeeTokens.length >= 2;

  if (autoLinkEligible && matchedCount === beneficiaryTokens.length) {
    return {
      kind: "exact_token_set",
      matchedCount,
      employeeTokenCount: employeeTokens.length,
      autoLinkEligible: true,
    };
  }
  if (autoLinkEligible) {
    return {
      kind: "employee_covered_extra",
      matchedCount,
      employeeTokenCount: employeeTokens.length,
      autoLinkEligible: true,
    };
  }
  if (matchedCount > 0) {
    return {
      kind: "partial",
      matchedCount,
      employeeTokenCount: employeeTokens.length,
      autoLinkEligible: false,
    };
  }
  return {
    kind: "none",
    matchedCount: 0,
    employeeTokenCount: employeeTokens.length,
    autoLinkEligible: false,
  };
}

/**
 * Extract beneficiary name tokens from bank narration.
 * Prefers the richest person-name segment; strips transfer prefixes / UTR / bank labels.
 */
export function extractBeneficiaryTokens(particulars: string): string[] {
  const cleaned = particulars
    .replace(/[\r\n]+/g, " ")
    .replace(/\bUTR[:\s-]*[A-Z0-9]+\b/gi, "/")
    .replace(/\b(?:REF|TXN|RRN)[:\s-]*[A-Z0-9]+\b/gi, "/");

  const parts = cleaned
    .split(/[\/|]+/)
    .map((part) => normalizePersonTokens(part))
    .filter((tokens) => tokens.length > 0);

  if (!parts.length) return normalizePersonTokens(particulars);

  parts.sort((left, right) => {
    const leftPerson = left.filter((t) => t.length >= 3 && !/[0-9]/.test(t)).length;
    const rightPerson = right.filter((t) => t.length >= 3 && !/[0-9]/.test(t)).length;
    return (
      rightPerson - leftPerson ||
      right.length - left.length ||
      right.join("").length - left.join("").length
    );
  });
  return parts[0];
}

export function extractBeneficiaryName(particulars: string): string {
  return extractBeneficiaryTokens(particulars).join(" ");
}

export type IdentityCandidate = {
  employeeId: string;
  displayName: string;
  accountHolderName?: string | null;
  paymentAliases?: string[];
  accountLast4?: string | null;
  priorNormalizedNames?: string[];
};

/**
 * Identity confidence 0–100. Does not consider payment amount.
 */
export function scoreEmployeeIdentity(
  particulars: string,
  candidate: IdentityCandidate,
  options?: { transactionAccountLast4?: string | null },
): IdentityEvidence {
  const beneficiaryTokens = extractBeneficiaryTokens(particulars);
  const beneficiary = beneficiaryTokens.join(" ");
  const matchedVia: IdentityEvidence["matchedVia"] = [];
  let score = 0;
  const parts: string[] = [];
  let matchKind: IdentityEvidence["matchKind"] = "none";
  let autoLinkEligible = false;

  if (!beneficiary) {
    return {
      score: 0,
      explanation: "No beneficiary tokens extracted from narration",
      matchKind: "none",
      matchedVia,
      autoLinkEligible: false,
    };
  }

  const txnLast4 = (options?.transactionAccountLast4 ?? "").replace(/\D/g, "").slice(-4);
  const empLast4 = (candidate.accountLast4 ?? "").replace(/\D/g, "").slice(-4);
  const last4Contradicts =
    txnLast4.length === 4 && empLast4.length === 4 && txnLast4 !== empLast4;

  const displayMatch = matchEmployeeNameTokens(candidate.displayName, beneficiaryTokens);
  if (displayMatch.kind !== "none") {
    matchedVia.push("display_name");
    if (displayMatch.kind === "exact_token_set") {
      score += 75;
      matchKind = "exact_token_set";
      autoLinkEligible = true;
      parts.push("exact name-token match (+75)");
    } else if (displayMatch.kind === "employee_covered_extra") {
      score += 72;
      matchKind = "employee_covered_extra";
      autoLinkEligible = true;
      parts.push("employee name matched; additional middle name (+72)");
    } else {
      score += Math.round(
        (displayMatch.matchedCount / Math.max(1, displayMatch.employeeTokenCount)) * 45,
      );
      matchKind = "partial";
      parts.push(
        `partial name tokens ${displayMatch.matchedCount}/${displayMatch.employeeTokenCount}`,
      );
    }
  }

  if (candidate.accountHolderName) {
    const holderMatch = matchEmployeeNameTokens(candidate.accountHolderName, beneficiaryTokens);
    if (holderMatch.autoLinkEligible) {
      score += 12;
      matchedVia.push("account_holder");
      autoLinkEligible = true;
      if (matchKind === "none" || matchKind === "partial") {
        matchKind =
          holderMatch.kind === "exact_token_set" ? "exact_token_set" : "employee_covered_extra";
      }
      parts.push("account-holder name tokens (+12)");
    } else if (holderMatch.kind === "partial") {
      score += 5;
      matchedVia.push("account_holder");
      parts.push("account-holder partial (+5)");
    }
  }

  for (const alias of candidate.paymentAliases ?? []) {
    const aliasNorm = normalizePersonName(alias);
    if (!aliasNorm) continue;
    if (aliasNorm === beneficiary) {
      score += 22;
      matchedVia.push("alias");
      matchKind = "alias_exact";
      autoLinkEligible = true;
      parts.push("approved alias exact (+22)");
      break;
    }
    const aliasMatch = matchEmployeeNameTokens(alias, beneficiaryTokens);
    if (aliasMatch.autoLinkEligible) {
      score += 20;
      matchedVia.push("alias");
      matchKind = "alias_exact";
      autoLinkEligible = true;
      parts.push("approved alias token match (+20)");
      break;
    }
  }

  const prior = (candidate.priorNormalizedNames ?? []).map(normalizePersonName);
  if (prior.includes(beneficiary)) {
    score += 18;
    matchedVia.push("prior_mapping");
    autoLinkEligible = true;
    if (matchKind === "none" || matchKind === "partial") matchKind = "alias_exact";
    parts.push("prior approved narration (+18)");
  }

  if (txnLast4.length === 4 && empLast4.length === 4 && txnLast4 === empLast4) {
    score += 20;
    matchedVia.push("account_last4");
    parts.push("account last-4 (+20)");
  }

  if (last4Contradicts) {
    autoLinkEligible = false;
    score = Math.min(score, IDENTITY_SUGGEST_THRESHOLD - 1);
    parts.push("account last-4 contradicts — auto-link blocked");
  }

  if (normalizePersonTokens(candidate.displayName).length < 2 && matchKind !== "alias_exact") {
    autoLinkEligible = false;
  }

  if (!autoLinkEligible && score >= IDENTITY_AUTO_LINK_THRESHOLD) {
    score = Math.min(score, IDENTITY_AUTO_LINK_THRESHOLD - 1);
  }
  if (autoLinkEligible) {
    score = Math.max(score, IDENTITY_AUTO_LINK_THRESHOLD);
  }

  score = Math.min(100, score);
  return {
    score,
    explanation:
      `beneficiary "${beneficiary}" vs "${candidate.displayName}"` +
      (parts.length ? `; ${parts.join("; ")}` : ""),
    matchKind,
    matchedVia,
    autoLinkEligible,
  };
}

export type AmountRelation = "exact" | "below" | "above" | "unknown";

export function comparePaymentAmount(
  actual: number | null | undefined,
  expected: number | null | undefined,
): { relation: AmountRelation; variance: number | null } {
  if (actual == null || !Number.isFinite(actual)) {
    return { relation: "unknown", variance: null };
  }
  if (expected == null || !Number.isFinite(expected) || expected <= 0) {
    return { relation: "unknown", variance: null };
  }
  const variance = Math.round((actual - expected) * 100) / 100;
  if (Math.abs(variance) <= 0.01) return { relation: "exact", variance: 0 };
  return { relation: variance < 0 ? "below" : "above", variance };
}

export type MatchOutcomeStatus =
  | "EXACT_MATCH"
  | "BELOW_EXPECTED_NET"
  | "ABOVE_EXPECTED_NET"
  | "MULTIPLE_CANDIDATES"
  | "NO_CANDIDATE"
  | "HISTORICAL_SALARY_REQUIRED"
  | "PAYMENT_ALREADY_ALLOCATED"
  | "IDENTITY_UNCERTAIN";

export function outcomeFromIdentityAndAmount(input: {
  identityScore: number;
  unique: boolean;
  amountRelation: AmountRelation;
  historicalSalaryMissing: boolean;
  alreadyAllocated: boolean;
  autoLinkEligible?: boolean;
}): MatchOutcomeStatus {
  if (input.alreadyAllocated) return "PAYMENT_ALREADY_ALLOCATED";
  const eligible =
    input.autoLinkEligible === true || input.identityScore >= IDENTITY_AUTO_LINK_THRESHOLD;
  if (!eligible) {
    return input.identityScore >= IDENTITY_SUGGEST_THRESHOLD ? "IDENTITY_UNCERTAIN" : "NO_CANDIDATE";
  }
  if (!input.unique) return "MULTIPLE_CANDIDATES";
  if (input.historicalSalaryMissing) return "HISTORICAL_SALARY_REQUIRED";
  if (input.amountRelation === "exact") return "EXACT_MATCH";
  if (input.amountRelation === "below") return "BELOW_EXPECTED_NET";
  if (input.amountRelation === "above") return "ABOVE_EXPECTED_NET";
  return "HISTORICAL_SALARY_REQUIRED";
}
