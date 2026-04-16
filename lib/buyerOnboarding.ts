export type BuyerOnboardingStep =
  | "general"
  | "preferences"
  | "availability"
  | "limits"
  | "location";

export const BUYER_ONBOARDING_STEPS: BuyerOnboardingStep[] = [
  "general",
  "preferences",
  "availability",
  "limits",
  "location",
];

const BUYER_ONBOARDING_STATE_PREFIX = "buyerOnboardingState";

const getOnboardingStateStorageKey = (email?: string): string => {
  const normalizedEmail = (email || "anonymous").toLowerCase();
  return `${BUYER_ONBOARDING_STATE_PREFIX}:${normalizedEmail}`;
};

const sanitizeBuyerSteps = (steps: unknown): BuyerOnboardingStep[] => {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.filter((step): step is BuyerOnboardingStep =>
    BUYER_ONBOARDING_STEPS.includes(step as BuyerOnboardingStep),
  );
};

const readOnboardingState = (
  email?: string,
): {
  completedSteps: BuyerOnboardingStep[];
  skippedSteps: BuyerOnboardingStep[];
} => {
  if (typeof window === "undefined") {
    return { completedSteps: [], skippedSteps: [] };
  }

  try {
    const raw = window.localStorage.getItem(
      getOnboardingStateStorageKey(email),
    );

    if (!raw) {
      return { completedSteps: [], skippedSteps: [] };
    }

    const parsed = JSON.parse(raw) as {
      completedSteps?: unknown;
      skippedSteps?: unknown;
    };

    return {
      completedSteps: sanitizeBuyerSteps(parsed.completedSteps),
      skippedSteps: sanitizeBuyerSteps(parsed.skippedSteps),
    };
  } catch {
    return { completedSteps: [], skippedSteps: [] };
  }
};

const writeOnboardingState = (
  email: string | undefined,
  state: {
    completedSteps: BuyerOnboardingStep[];
    skippedSteps: BuyerOnboardingStep[];
  },
): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getOnboardingStateStorageKey(email),
    JSON.stringify(state),
  );
};

export const getBuyerOnboardingState = (email?: string) => {
  return readOnboardingState(email);
};

export const markBuyerOnboardingStepCompleted = (
  email: string | undefined,
  step: BuyerOnboardingStep,
): void => {
  const state = readOnboardingState(email);
  const completedSteps = Array.from(new Set([...state.completedSteps, step]));
  const skippedSteps = state.skippedSteps.filter((s) => s !== step);
  writeOnboardingState(email, { completedSteps, skippedSteps });
};

export const markBuyerOnboardingStepSkipped = (
  email: string | undefined,
  step: BuyerOnboardingStep,
): void => {
  const state = readOnboardingState(email);
  const skippedSteps = Array.from(new Set([...state.skippedSteps, step]));
  writeOnboardingState(email, {
    completedSteps: state.completedSteps,
    skippedSteps,
  });
};

export const isBuyerOnboardingFlowComplete = (email?: string): boolean => {
  const state = readOnboardingState(email);
  const done = new Set([...state.completedSteps, ...state.skippedSteps]);
  return BUYER_ONBOARDING_STEPS.every((step) => done.has(step));
};

export const resetBuyerOnboardingState = (email?: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getOnboardingStateStorageKey(email));
};
