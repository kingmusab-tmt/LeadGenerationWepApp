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

const hasText = (value?: string) => Boolean(value && value.trim().length > 0);

/**
 * How much of a seller's business profile is filled in. Derived entirely from
 * the user record — there is no separate wizard state to keep in sync, so this
 * stays accurate no matter where the fields were edited.
 *
 * Rendered by ProfileCompletionCard on the seller overview, which is now the
 * only prompt to finish setup (sellers are no longer gated behind a wizard
 * before reaching their dashboard).
 */
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
