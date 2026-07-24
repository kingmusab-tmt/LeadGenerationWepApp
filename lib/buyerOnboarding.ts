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

// Fire-and-forget persistence to the server — localStorage stays the fast,
// synchronous read path every call site already relies on; the server call
// just makes the same progress durable across devices/browsers instead of
// living only in this one browser's storage. Errors are swallowed: a failed
// sync shouldn't block the onboarding UI, and hydrateBuyerOnboardingFromServer
// will reconcile on the next load anyway.
const persistStepToServer = (
  step: BuyerOnboardingStep,
  action: "complete" | "skip",
): void => {
  if (typeof window === "undefined") return;
  fetch("/api/buyers/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step, action }),
  }).catch((error) => {
    console.warn("[BuyerOnboarding] Failed to persist step to server:", error);
  });
};

/**
 * Pull server-side onboarding progress into localStorage. Call this once
 * when the buyer dashboard/onboarding page mounts, before relying on the
 * synchronous read functions below, so a new device/browser (or cleared
 * storage) picks up real progress instead of starting over. Merges rather
 * than overwrites, in case the same account has progress recorded locally
 * on this device that hasn't reached the server yet.
 */
export const hydrateBuyerOnboardingFromServer = async (
  email: string | undefined,
): Promise<void> => {
  if (typeof window === "undefined" || !email) return;

  try {
    const response = await fetch("/api/buyers/onboarding");
    if (!response.ok) return;

    const server = (await response.json()) as {
      completedSteps?: unknown;
      skippedSteps?: unknown;
    };
    const serverCompleted = sanitizeBuyerSteps(server.completedSteps);
    const serverSkipped = sanitizeBuyerSteps(server.skippedSteps);

    const local = readOnboardingState(email);
    const mergedCompleted = Array.from(
      new Set([...local.completedSteps, ...serverCompleted]),
    );
    // A step completed anywhere wins over a stale "skipped" on the other side.
    const mergedSkipped = Array.from(
      new Set([...local.skippedSteps, ...serverSkipped]),
    ).filter((step) => !mergedCompleted.includes(step));

    writeOnboardingState(email, {
      completedSteps: mergedCompleted,
      skippedSteps: mergedSkipped,
    });
  } catch (error) {
    console.warn(
      "[BuyerOnboarding] Failed to hydrate progress from server:",
      error,
    );
  }
};

export const markBuyerOnboardingStepCompleted = (
  email: string | undefined,
  step: BuyerOnboardingStep,
): void => {
  const state = readOnboardingState(email);
  const completedSteps = Array.from(new Set([...state.completedSteps, step]));
  const skippedSteps = state.skippedSteps.filter((s) => s !== step);
  writeOnboardingState(email, { completedSteps, skippedSteps });
  persistStepToServer(step, "complete");
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
  persistStepToServer(step, "skip");
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
