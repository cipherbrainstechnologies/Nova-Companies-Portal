/**
 * Identity-first payment matching: decide *who* a debit belongs to before comparing amounts.
 * Amount equality alone must never auto-link a payment.
 */

export type IdentityEvidence = {
  score: number;
  explanation: string;
  matchedVia: Array<"display_name" | "account_holder" | "alias" | "prior_mapping" | "account_last4">;
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
]);

/** Tokens that are bank noise when extracting a beneficiary from narration. */
export function normalizePersonTokens(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token && !BANK_TOKENS.has(token) && !/^\d+$/.test(token));
}

export function normalizePersonName(value: string): string {
  return normalizePersonTokens(value).join(" ");
}

/**
 * Soft token equality: exact match, or shared prefix of length ≥ 4
 * (HARDIK ↔ HARDIKKUMAR, JAY ↔ not JA).
 */
export function tokensSoftEqual(left: string, right: string): boolean {
  if (left === right) return true;
  const min = Math.min(left.length, right.length);
  if (min < 4) return false;
  return left.startsWith(right) || right.startsWith(left);
}

/** Ordered-permutation / compound-name aware token coverage in [0, 1]. */
export function tokenCoverage(queryTokens: string[], haystackTokens: string[]): number {
  if (!queryTokens.length || !haystackTokens.length) return 0;
  const used = new Set<number>();
  let matched = 0;
  for (const query of queryTokens) {
    const index = haystackTokens.findIndex(
      (candidate, i) => !used.has(i) && tokensSoftEqual(query, candidate),
    );
    if (index >= 0) {
      used.add(index);
      matched += 1;
    }
  }
  // Prefer covering the employee name (query), not punishing long father-name tails.
  return matched / queryTokens.length;
}

export function extractBeneficiaryTokens(particulars: string): string[] {
  const parts = particulars
    .split("/")
    .map((part) => normalizePersonTokens(part))
    .filter((tokens) => tokens.length > 0);
  if (!parts.length) return normalizePersonTokens(particulars);
  parts.sort((left, right) => right.length - left.length || right.join("").length - left.join("").length);
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

function bestCoverageAgainstNames(beneficiaryTokens: string[], names: string[]): number {
  let best = 0;
  for (const name of names) {
    const tokens = normalizePersonTokens(name);
    if (!tokens.length) continue;
    best = Math.max(best, tokenCoverage(tokens, beneficiaryTokens));
    // Also score beneficiary → name (reordered father-name heavy strings).
    best = Math.max(best, tokenCoverage(beneficiaryTokens.slice(0, tokens.length), tokens) * 0.95);
  }
  return best;
}

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

  if (!beneficiary) {
    return { score: 0, explanation: "No beneficiary tokens extracted from narration", matchedVia };
  }

  const displayCoverage = bestCoverageAgainstNames(beneficiaryTokens, [candidate.displayName]);
  if (displayCoverage > 0) {
    const points = Math.round(displayCoverage * 70);
    score += points;
    matchedVia.push("display_name");
    parts.push(`display name coverage ${(displayCoverage * 100).toFixed(0)}% (+${points})`);
  }

  if (candidate.accountHolderName) {
    const holderCoverage = bestCoverageAgainstNames(beneficiaryTokens, [candidate.accountHolderName]);
    if (holderCoverage >= 0.99) {
      score += 15;
      matchedVia.push("account_holder");
      parts.push("account-holder exact (+15)");
    } else if (holderCoverage >= 0.66) {
      score += 8;
      matchedVia.push("account_holder");
      parts.push(`account-holder partial (+8)`);
    }
  }

  for (const alias of candidate.paymentAliases ?? []) {
    const aliasNorm = normalizePersonName(alias);
    if (!aliasNorm) continue;
    if (aliasNorm === beneficiary) {
      score += 20;
      matchedVia.push("alias");
      parts.push(`approved alias exact (+20)`);
      break;
    }
    const aliasCoverage = bestCoverageAgainstNames(beneficiaryTokens, [alias]);
    if (aliasCoverage >= 0.99) {
      score += 18;
      matchedVia.push("alias");
      parts.push(`approved alias coverage (+18)`);
      break;
    }
  }

  const prior = (candidate.priorNormalizedNames ?? []).map(normalizePersonName);
  if (prior.includes(beneficiary)) {
    score += 15;
    matchedVia.push("prior_mapping");
    parts.push("prior approved narration (+15)");
  }

  const txnLast4 = (options?.transactionAccountLast4 ?? "").replace(/\D/g, "").slice(-4);
  const empLast4 = (candidate.accountLast4 ?? "").replace(/\D/g, "").slice(-4);
  if (txnLast4.length === 4 && empLast4.length === 4 && txnLast4 === empLast4) {
    score += 20;
    matchedVia.push("account_last4");
    parts.push("account last-4 (+20)");
  }

  score = Math.min(100, score);
  return {
    score,
    explanation: `beneficiary "${beneficiary}" vs "${candidate.displayName}"` +
      (parts.length ? `; ${parts.join("; ")}` : ""),
    matchedVia,
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

/** Unique high-confidence identity — amount is irrelevant for this gate. */
export const IDENTITY_AUTO_LINK_THRESHOLD = 62;
export const IDENTITY_COLLISION_MARGIN = 12;

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
}): MatchOutcomeStatus {
  if (input.alreadyAllocated) return "PAYMENT_ALREADY_ALLOCATED";
  if (input.identityScore < IDENTITY_AUTO_LINK_THRESHOLD) {
    return input.identityScore > 0 ? "IDENTITY_UNCERTAIN" : "NO_CANDIDATE";
  }
  if (!input.unique) return "MULTIPLE_CANDIDATES";
  if (input.historicalSalaryMissing) return "HISTORICAL_SALARY_REQUIRED";
  if (input.amountRelation === "exact") return "EXACT_MATCH";
  if (input.amountRelation === "below") return "BELOW_EXPECTED_NET";
  if (input.amountRelation === "above") return "ABOVE_EXPECTED_NET";
  return "HISTORICAL_SALARY_REQUIRED";
}
