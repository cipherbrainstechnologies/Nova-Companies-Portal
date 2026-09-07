export type MatchDecision = "SUGGESTED" | "NEEDS_REVIEW";

export interface MatchCandidateInput {
  employeeId: string;
  employeeName: string;
  accountLast4?: string | null;
  expectedNetPay?: number | null;
  hasPriorApprovedMapping?: boolean;
}

export interface MatchTransactionInput {
  particulars: string;
  amount: number;
  accountLast4?: string | null;
}

export interface MatchScore {
  employeeId: string;
  score: number;
  status: MatchDecision;
  breakdown: {
    nameSimilarity: number;
    accountLast4: number;
    expectedNetPay: number;
    priorApprovedMapping: number;
  };
}

export interface LegacyMatchInput {
  particulars: string;
  accountLast4?: string | null;
  employeeName: string;
  employeeAccountLast4?: string | null;
  txnAmount?: number | null;
  expectedNet?: number | null;
  hasPriorMapping?: boolean;
}

export interface MatchBreakdown {
  nameScore: number;
  accountScore: number;
  amountScore: number;
  priorMappingScore: number;
  total: number;
}

const BANK_TOKENS = new Set([
  "AXIS", "BANK", "TRANSFER", "NEFT", "IMPS", "UPI", "RTGS", "INB", "IFT",
  "PAYMENT", "SALARY", "PAYOUT", "REF", "TXN",
]);

export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token && !BANK_TOKENS.has(token) && !/^\d+$/.test(token))
    .join(" ")
    .trim();
}

export function extractBeneficiaryFromParticulars(particulars: string): string {
  const parts = particulars
    .split("/")
    .map((part) => normalizeName(part))
    .filter((part) => /[A-Z]/.test(part) && !/^(?:CR|DR|P2A|P2P|NFS|ACH|CMS)$/.test(part));
  return (
    parts.sort((left, right) => {
      const words = right.split(" ").length - left.split(" ").length;
      return words || right.length - left.length;
    })[0] ?? normalizeName(particulars)
  );
}

function levenshteinDistance(left: string, right: string): number {
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function nameSimilarity(left: string, right: string): number {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return 0;
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const jaccard = intersection / new Set([...aTokens, ...bTokens]).size;
  const compactA = a.replace(/\s/g, "");
  const compactB = b.replace(/\s/g, "");
  const levenshtein =
    1 - levenshteinDistance(compactA, compactB) / Math.max(compactA.length, compactB.length);
  return Math.max(jaccard, Math.max(0, levenshtein));
}

function last4(value?: string | null): string | undefined {
  const digits = value?.replace(/\D/g, "");
  return digits && digits.length >= 4 ? digits.slice(-4) : undefined;
}

export function scoreMatch(input: LegacyMatchInput): MatchBreakdown;
export function scoreMatch(
  transaction: MatchTransactionInput,
  candidate: MatchCandidateInput,
): Omit<MatchScore, "status">;
export function scoreMatch(
  transaction: MatchTransactionInput | LegacyMatchInput,
  candidate?: MatchCandidateInput,
): Omit<MatchScore, "status"> | MatchBreakdown {
  if (!candidate) {
    const legacy = transaction as LegacyMatchInput;
    const scored = scoreMatch(
      {
        particulars: legacy.particulars,
        amount: legacy.txnAmount ?? 0,
        accountLast4: legacy.accountLast4,
      },
      {
        employeeId: "",
        employeeName: legacy.employeeName,
        accountLast4: legacy.employeeAccountLast4,
        expectedNetPay: legacy.expectedNet,
        hasPriorApprovedMapping: legacy.hasPriorMapping,
      },
    );
    return {
      nameScore: scored.breakdown.nameSimilarity,
      accountScore: scored.breakdown.accountLast4,
      amountScore: scored.breakdown.expectedNetPay,
      priorMappingScore: scored.breakdown.priorApprovedMapping,
      total: scored.score,
    };
  }
  const current = transaction as MatchTransactionInput;
  const beneficiary = extractBeneficiaryFromParticulars(current.particulars);
  const namePoints = Math.round(nameSimilarity(beneficiary, candidate.employeeName) * 55);
  const transactionLast4 =
    last4(current.accountLast4) ??
    last4(current.particulars.match(/(?:A\/C|ACCT|ACCOUNT)[^\d]*(\d{4,})/i)?.[1]);
  const candidateLast4 = last4(candidate.accountLast4);
  const accountPoints =
    transactionLast4 && candidateLast4 && transactionLast4 === candidateLast4 ? 20 : 0;
  let payPoints = 0;
  if (candidate.expectedNetPay != null && candidate.expectedNetPay > 0) {
    const variance = Math.abs(current.amount - candidate.expectedNetPay) / candidate.expectedNetPay;
    if (variance <= 0.01) payPoints = 15;
    else if (variance <= 0.05) payPoints = 8;
  }
  const priorPoints = candidate.hasPriorApprovedMapping ? 10 : 0;
  return {
    employeeId: candidate.employeeId,
    score: namePoints + accountPoints + payPoints + priorPoints,
    breakdown: {
      nameSimilarity: namePoints,
      accountLast4: accountPoints,
      expectedNetPay: payPoints,
      priorApprovedMapping: priorPoints,
    },
  };
}

export function decideSuggestionStatus(
  ranked: Array<{ employeeId: string; score: number }>,
  options?: { threshold?: number },
): MatchDecision {
  const threshold = options?.threshold ?? 50;
  if (!ranked.length || ranked[0].score < threshold) return "NEEDS_REVIEW";
  if (ranked.length > 1 && ranked[0].score - ranked[1].score <= 5) return "NEEDS_REVIEW";
  return "SUGGESTED";
}

export function rankMatchSuggestions(
  transaction: MatchTransactionInput,
  candidates: MatchCandidateInput[],
  threshold = 50,
): MatchScore[] {
  const ranked = candidates
    .map((candidate) => scoreMatch(transaction, candidate))
    .sort((left, right) => right.score - left.score || left.employeeId.localeCompare(right.employeeId));
  const topScore = ranked[0]?.score ?? 0;
  const collision = ranked.length > 1 && topScore - ranked[1].score <= 5;
  return ranked.map((result, index) => ({
    ...result,
    status:
      index === 0 && result.score >= threshold && !collision ? "SUGGESTED" : "NEEDS_REVIEW",
  }));
}
