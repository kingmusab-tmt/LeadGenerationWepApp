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

const sanitizeSellerSteps = (steps: unknown): SellerOnboardingStep[] => {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.filter((step): step is SellerOnboardingStep =>
    SELLER_ONBOARDING_STEPS.includes(step as SellerOnboardingStep),
  );
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
      completedSteps?: unknown;
      skippedSteps?: unknown;
    };

    return {
      completedSteps: sanitizeSellerSteps(parsed.completedSteps),
      skippedSteps: sanitizeSellerSteps(parsed.skippedSteps),
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

// Fire-and-forget persistence to the server — see the matching comment in
// lib/buyerOnboarding.ts for why this stays synchronous/localStorage-first.
const persistStepToServer = (
  step: SellerOnboardingStep,
  action: "complete" | "skip",
): void => {
  if (typeof window === "undefined") return;
  fetch("/api/sellers/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step, action }),
  }).catch((error) => {
    console.warn("[SellerOnboarding] Failed to persist step to server:", error);
  });
};

/**
 * Pull server-side onboarding progress into localStorage — see
 * hydrateBuyerOnboardingFromServer in lib/buyerOnboarding.ts for the same
 * pattern and rationale.
 */
export const hydrateSellerOnboardingFromServer = async (
  email: string | undefined,
): Promise<void> => {
  if (typeof window === "undefined" || !email) return;

  try {
    const response = await fetch("/api/sellers/onboarding");
    if (!response.ok) return;

    const server = (await response.json()) as {
      completedSteps?: unknown;
      skippedSteps?: unknown;
    };
    const serverCompleted = sanitizeSellerSteps(server.completedSteps);
    const serverSkipped = sanitizeSellerSteps(server.skippedSteps);

    const local = readOnboardingState(email);
    const mergedCompleted = Array.from(
      new Set([...local.completedSteps, ...serverCompleted]),
    );
    const mergedSkipped = Array.from(
      new Set([...local.skippedSteps, ...serverSkipped]),
    ).filter((step) => !mergedCompleted.includes(step));

    writeOnboardingState(email, {
      completedSteps: mergedCompleted,
      skippedSteps: mergedSkipped,
    });
  } catch (error) {
    console.warn(
      "[SellerOnboarding] Failed to hydrate progress from server:",
      error,
    );
  }
};

export const markSellerOnboardingStepCompleted = (
  email: string | undefined,
  step: SellerOnboardingStep,
): void => {
  const state = readOnboardingState(email);
  const completedSteps = Array.from(new Set([...state.completedSteps, step]));
  const skippedSteps = state.skippedSteps.filter((s) => s !== step);
  writeOnboardingState(email, { completedSteps, skippedSteps });
  persistStepToServer(step, "complete");
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
  persistStepToServer(step, "skip");
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
