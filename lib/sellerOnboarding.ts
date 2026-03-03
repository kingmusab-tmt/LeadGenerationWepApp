export interface SellerOnboardingUser {
  role?: string;
  name?: string;
  mobileNumber?: string;
  mobile?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessWebsite?: string;
  companyDescription?: string;
  industryNiche?: string;
  businessAddress?: {
    addressLine1?: string;
    city?: string;
    country?: string;
  };
}

export type SellerOnboardingStep =
  | "general"
  | "lead-distribution"
  | "units-settings"
  | "email-settings"
  | "stripe-onboarding";

export const SELLER_ONBOARDING_STEPS: SellerOnboardingStep[] = [
  "general",
  "lead-distribution",
  "units-settings",
  "email-settings",
  "stripe-onboarding",
];

const SELLER_ONBOARDING_STATE_PREFIX = "sellerOnboardingState";

const hasText = (value?: string) => Boolean(value && value.trim().length > 0);

export const getSellerOnboardingCompletion = (
  user?: SellerOnboardingUser | null,
) => {
  if (!user) {
    return {
      completed: 0,
      total: 9,
      percent: 0,
      complete: false,
    };
  }

  const checks = [
    hasText(user.name),
    hasText(user.mobileNumber || user.mobile),
    hasText(user.businessName),
    hasText(user.businessEmail),
    hasText(user.businessPhone),
    hasText(user.businessWebsite),
    hasText(user.industryNiche),
    hasText(user.businessAddress?.addressLine1),
    hasText(user.businessAddress?.city) &&
      hasText(user.businessAddress?.country),
  ];

  const completed = checks.filter(Boolean).length;
  const total = checks.length;
  const percent = Math.round((completed / total) * 100);

  return {
    completed,
    total,
    percent,
    complete: completed === total,
  };
};

export const isSellerOnboardingComplete = (
  user?: SellerOnboardingUser | null,
): boolean => {
  return getSellerOnboardingCompletion(user).complete;
};

const getOnboardingStateStorageKey = (email?: string): string => {
  const normalizedEmail = (email || "anonymous").toLowerCase();
  return `${SELLER_ONBOARDING_STATE_PREFIX}:${normalizedEmail}`;
};

const readOnboardingState = (
  email?: string,
): {
  completedSteps: SellerOnboardingStep[];
  skippedSteps: SellerOnboardingStep[];
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
      completedSteps?: SellerOnboardingStep[];
      skippedSteps?: SellerOnboardingStep[];
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
    completedSteps: SellerOnboardingStep[];
    skippedSteps: SellerOnboardingStep[];
  },
): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getOnboardingStateStorageKey(email),
    JSON.stringify(state),
  );
};

export const getSellerOnboardingState = (email?: string) => {
  return readOnboardingState(email);
};

export const markSellerOnboardingStepCompleted = (
  email: string | undefined,
  step: SellerOnboardingStep,
): void => {
  const state = readOnboardingState(email);
  const completedSteps = Array.from(new Set([...state.completedSteps, step]));
  const skippedSteps = state.skippedSteps.filter((s) => s !== step);
  writeOnboardingState(email, { completedSteps, skippedSteps });
};

export const markSellerOnboardingStepSkipped = (
  email: string | undefined,
  step: SellerOnboardingStep,
): void => {
  const state = readOnboardingState(email);
  const skippedSteps = Array.from(new Set([...state.skippedSteps, step]));
  writeOnboardingState(email, {
    completedSteps: state.completedSteps,
    skippedSteps,
  });
};

export const isSellerOnboardingFlowComplete = (email?: string): boolean => {
  const state = readOnboardingState(email);
  const done = new Set([...state.completedSteps, ...state.skippedSteps]);
  return SELLER_ONBOARDING_STEPS.every((step) => done.has(step));
};

export const resetSellerOnboardingState = (email?: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getOnboardingStateStorageKey(email));
};
