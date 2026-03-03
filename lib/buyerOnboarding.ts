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
      completedSteps?: BuyerOnboardingStep[];
      skippedSteps?: BuyerOnboardingStep[];
    };

    return {
      completedSteps: Array.isArray(parsed.completedSteps)
        ? parsed.completedSteps
        : [],
      skippedSteps: Array.isArray(parsed.skippedSteps)
        ? parsed.skippedSteps
        : [],
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
