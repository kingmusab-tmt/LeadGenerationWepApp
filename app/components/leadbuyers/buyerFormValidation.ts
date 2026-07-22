import { IBuyer } from "@/models/leadbuyers";

// Shared between BuyerForm.tsx (public self-registration) and
// BuyerFormEnhanced.tsx (seller-managed) so the two forms can't silently
// drift into accepting different data for the same fields on the same
// model — merging the components themselves isn't appropriate given their
// different auth/security contexts, but the validation rules for the
// fields they share should still be one source of truth.
export const BUYER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const BUYER_PHONE_REGEX = /^\+?[\d\s\-()]{10,20}$/;

export function validateBuyerCoreFields(
  formData: Partial<IBuyer>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!formData.name) errors.name = "Full Name is required";
  if (!formData.company) errors.company = "Company is required";

  if (!formData.email) {
    errors.email = "Email is required";
  } else if (!BUYER_EMAIL_REGEX.test(formData.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!formData.phone) {
    errors.phone = "Phone Number is required";
  } else if (!BUYER_PHONE_REGEX.test(formData.phone)) {
    errors.phone = "Enter a valid phone number";
  }

  if (!formData.timezone) errors.timezone = "Timezone is required";

  if (formData.maxLeadsPerDay !== undefined && formData.maxLeadsPerDay < 0) {
    errors.maxLeadsPerDay = "Cannot be negative";
  }

  return errors;
}
