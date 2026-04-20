export type LeadQualityLevel = "High" | "Medium" | "Low";

export const AI_QUALITY_SCORE_DEFAULT = 50;
export const AI_QUALITY_SCORE_MIN = 0;
export const AI_QUALITY_SCORE_MAX = 100;

export const AI_QUALITY_THRESHOLDS = {
  highMax: 40,
  lowMin: 70,
} as const;

export const AI_QUALITY_RANGES = {
  high: "0-40",
  medium: "41-69",
  low: "70-100",
} as const;

export interface NormalizedAiQualityResult {
  spamScore: number;
  qualityLevel: LeadQualityLevel;
  isValid: boolean;
  reason: string;
}

const aiScoringMetrics = {
  success: 0,
  fallback: 0,
};

function toClampedScore(value: number): number {
  const clamped = Math.min(
    AI_QUALITY_SCORE_MAX,
    Math.max(AI_QUALITY_SCORE_MIN, value),
  );
  return Math.round(clamped);
}

export function normalizeSpamScore(rawScore: unknown): number {
  if (typeof rawScore !== "number" || !Number.isFinite(rawScore)) {
    return AI_QUALITY_SCORE_DEFAULT;
  }
  return toClampedScore(rawScore);
}

export function mapSpamScoreToQualityLevel(
  spamScore: number,
): LeadQualityLevel {
  if (spamScore <= AI_QUALITY_THRESHOLDS.highMax) {
    return "High";
  }
  if (spamScore >= AI_QUALITY_THRESHOLDS.lowMin) {
    return "Low";
  }
  return "Medium";
}

export function normalizeAiQualityResult(
  payload: Record<string, unknown>,
): NormalizedAiQualityResult {
  const spamScore = normalizeSpamScore(
    typeof payload.spam_score === "number"
      ? payload.spam_score
      : payload.spamScore,
  );

  const reason =
    typeof payload.reason === "string"
      ? payload.reason
      : typeof payload.debug_reason === "string"
        ? payload.debug_reason
        : typeof payload.message === "string"
          ? payload.message
          : "";

  const isValid =
    typeof payload.is_valid === "boolean"
      ? payload.is_valid
      : typeof payload.isValid === "boolean"
        ? payload.isValid
        : true;

  return {
    spamScore,
    qualityLevel: mapSpamScoreToQualityLevel(spamScore),
    isValid,
    reason,
  };
}

export function recordAiScoringMetric(event: "success" | "fallback") {
  aiScoringMetrics[event] += 1;
  return { ...aiScoringMetrics };
}
