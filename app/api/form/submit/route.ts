import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads";
import Form from "@/models/form";
import { User } from "@/models/userModel";
import { processLeadDistribution } from "@/lib/leadAssignmentService";
import { checkFeatureAccess } from "@/lib/subscriptionLimitsService";
import { sendNotification } from "@/lib/notificationService";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import { withErrorHandler } from "@/lib/api/async-handler";
import { verifyFormLoadToken } from "@/lib/formLoadToken";
import { ZapierTriggerHelper } from "@/lib/integrations/zapierTriggerHelper";

import { normalizeAiQualityResult } from "@/lib/aiQualityScoring";
import { badRequest } from "@/lib/api/error-handler";

interface Field {
  id: string;
  label: string;
  value: unknown;
}

interface RequestData {
  formId: string;
  fields: Field[];
  honeypot?: string; // Anti-spam honeypot field
  formLoadToken?: string; // Server-signed form-load timestamp (see lib/formLoadToken.ts)
  timestamp?: number; // Legacy unsigned form load timestamp — fallback only
  recaptchaToken?: string; // Google reCAPTCHA token
}

const MAX_FIELDS = 50;
const MAX_FIELD_VALUE_LENGTH = 5000;

// Accepts either a bare domain ("example.com", as a seller would type it in
// the builder) or a full origin/URL ("https://example.com") and returns just
// the hostname, so both forms compare equal.
function safeHostname(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).hostname.toLowerCase();
  } catch {
    // Not a full URL — treat the value itself as a bare hostname.
    return trimmed.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  }
}

async function verifyRecaptcha(params: {
  token?: string;
  secret: string;
  remoteIp?: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!params.token) {
    return {
      success: false,
      message: "Please complete the reCAPTCHA challenge.",
    };
  }

  try {
    const body = new URLSearchParams();
    body.append("secret", params.secret);
    body.append("response", params.token);
    if (params.remoteIp) {
      body.append("remoteip", params.remoteIp);
    }

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body,
      },
    );

    const verification = await response.json();

    if (!verification.success) {
      console.error("reCAPTCHA verification failed:", verification);
      return {
        success: false,
        message: "reCAPTCHA verification failed. Please try again.",
      };
    }

    // For v3, check the score (0.0 to 1.0, where 1.0 is very likely a good interaction)
    if (typeof verification.score === "number" && verification.score < 0.5) {
      console.warn(`reCAPTCHA score too low: ${verification.score}`);
      return {
        success: false,
        message: "Security verification failed. Please try again.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return {
      success: false,
      message: "Unable to verify reCAPTCHA. Please retry.",
    };
  }
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  await dbConnect();
  const data: RequestData = await request.json();

  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const clientIp = ip.split(",")[0].trim();

  const rateLimited = checkSimpleRateLimit(request, {
    scope: "form-submit",
    limit: 5,
    windowMs: 60 * 1000,
    actorId: clientIp,
  });
  if (rateLimited) return rateLimited;

  // Honeypot check — a real visitor never sees or fills this field, so any
  // value here means a bot. Return a fake success so bots aren't tipped off
  // that they were caught, without creating a Lead.
  if (data.honeypot && data.honeypot.trim() !== "") {
    return NextResponse.json(
      { success: true, message: "Thank you! Your information has been submitted successfully." },
      { status: 200 },
    );
  }

  // Timing check (form submitted too quickly might be a bot). Prefer the
  // server-signed load token — a raw client-supplied timestamp can be
  // fabricated to claim more elapsed time than actually passed, so an
  // unsigned value only remains trusted as a fallback for any client bundle
  // cached from before this token existed.
  if (data.formLoadToken) {
    const verification = verifyFormLoadToken(data.formLoadToken);
    if (!verification.valid || Date.now() - verification.issuedAt < 3000) {
      return badRequest("Please take your time filling out the form.");
    }
  } else if (data.timestamp) {
    const timeDiff = Date.now() - data.timestamp;
    if (timeDiff < 3000) {
      return badRequest("Please take your time filling out the form.");
    }
  }

  if (!data || !data.fields || !Array.isArray(data.fields)) {
    return badRequest("Invalid data structure.");
  }

  if (data.fields.length === 0) {
    return badRequest("Form cannot be empty.");
  }
  if (data.fields.length > MAX_FIELDS) {
    return badRequest(`A form submission cannot have more than ${MAX_FIELDS} fields.`);
  }
  for (const field of data.fields) {
    if (
      typeof field.value === "string" &&
      field.value.length > MAX_FIELD_VALUE_LENGTH
    ) {
      return badRequest(
        `"${field.label}" exceeds the maximum allowed length of ${MAX_FIELD_VALUE_LENGTH} characters.`,
      );
    }
  }

  // The form must exist — previously, a missing/invalid formId silently
  // fell back to trusting the client-supplied userId as the lead's owner,
  // letting anyone attribute a lead (and its quota/notification effects) to
  // an arbitrary account.
  if (!data.formId || typeof data.formId !== "string") {
    return badRequest("A valid form is required to submit this data.");
  }

  const formRecord = (await Form.findOne({ formId: data.formId })
    .select("_id userId recaptchaEnabled status allowedOrigins")
    .lean()) as {
    _id: unknown;
    userId: unknown;
    recaptchaEnabled?: boolean;
    status?: "draft" | "published";
    allowedOrigins?: string[];
  } | null;

  if (!formRecord) {
    return badRequest("This form no longer exists or is unavailable.");
  }

  // Documents saved before `status` existed have no value for it at all —
  // only an explicit "draft" blocks submission, so a pre-existing live form
  // never silently stops accepting leads.
  if (formRecord.status === "draft") {
    return badRequest("This form is not yet published.");
  }

  // Opt-in hardening: a form with no configured origins accepts submissions
  // from anywhere (unchanged default behavior). This only narrows things
  // down once a seller explicitly lists domains in the builder. Note this
  // guards against non-browser scripted submissions bypassing the embed
  // entirely — it does not restrict which sites may iframe the form itself.
  if (formRecord.allowedOrigins && formRecord.allowedOrigins.length > 0) {
    const originHeader =
      request.headers.get("origin") || request.headers.get("referer");
    const originHost = originHeader ? safeHostname(originHeader) : null;
    const isAllowed =
      !!originHost &&
      formRecord.allowedOrigins.some(
        (allowed) => safeHostname(allowed) === originHost,
      );
    if (!isAllowed) {
      return badRequest("This form cannot accept submissions from this site.");
    }
  }

  const formObjectId = formRecord._id;
  const formOwnerId = formRecord.userId as unknown as string;
  const recaptchaRequired = Boolean(formRecord.recaptchaEnabled);

  if (recaptchaRequired) {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

    if (!recaptchaSecret) {
      console.error(
        "reCAPTCHA is enabled for this form but RECAPTCHA_SECRET_KEY is not configured.",
      );
      return badRequest(
        "This form is temporarily unavailable. Please try again later.",
      );
    }

    const recaptchaResult = await verifyRecaptcha({
      token: data.recaptchaToken,
      secret: recaptchaSecret,
      remoteIp: clientIp !== "unknown" ? clientIp : undefined,
    });

    if (!recaptchaResult.success) {
      return badRequest(
        recaptchaResult.message || "reCAPTCHA verification failed.",
      );
    }
  }

  // Extract location data from fields if available
  const locationData: {
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    address?: string;
  } = {};

  data.fields.forEach((field) => {
    const label = field.label.toLowerCase();
    const value = field.value?.toString() || "";

    if (label.includes("city") && value) {
      locationData.city = value;
    } else if (label.includes("state") && value) {
      locationData.state = value;
    } else if (label.includes("country") && value) {
      locationData.country = value;
    } else if ((label.includes("zip") || label.includes("postal")) && value) {
      locationData.zipCode = value;
    } else if (label.includes("address") && value) {
      locationData.address = value;
    }
  });

  let industry = "";
  const industryField = data.fields.find((field) =>
    field.label.toLowerCase().includes("industry"),
  );
  if (industryField) {
    industry = industryField.value?.toString() || "";
  }

  const nameField = data.fields.find((f) => f.label.toLowerCase() === "name");
  const emailField = data.fields.find((f) => f.label.toLowerCase() === "email");
  const phoneField = data.fields.find((f) => f.label.toLowerCase() === "phone");
  const companyField = data.fields.find(
    (f) => f.label.toLowerCase() === "company",
  );

  const lead = new Lead({
    formId: formObjectId,
    userId: formOwnerId,
    name: nameField?.value?.toString() || undefined,
    email: emailField?.value?.toString() || undefined,
    phone: phoneField?.value?.toString() || undefined,
    company: companyField?.value?.toString() || undefined,
    fields: data.fields,
    status: "new",
    isFavorite: false,
    isManual: false,
    submittedAt: new Date(),
    ipAddress: clientIp,
    location: Object.keys(locationData).length > 0 ? locationData : undefined,
    industry: industry || undefined,
  });

  await lead.save();

  // ========================================
  // 1. AI-BASED LEAD QUALITY EVALUATION
  // ========================================
  const hasLeadScoringFeature = await checkFeatureAccess(
    formOwnerId,
    "leadScoringEnabled",
  );

  if (hasLeadScoringFeature.allowed) {
    try {
      const allFieldsData = data.fields.reduce(
        (acc, field) => {
          acc[field.label] = field.value || "";
          return acc;
        },
        {} as Record<string, unknown>,
      );

      const filterResponse = await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/filter-lead`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(allFieldsData),
        },
      );

      const filterResult = await filterResponse.json();
      const normalized = normalizeAiQualityResult(filterResult);

      await Lead.findByIdAndUpdate(lead._id, {
        aiQualityScore: normalized.spamScore,
        qualityLevel: normalized.qualityLevel,
        aiQualityReason: normalized.reason,
        aiQualityAssessment: {
          isValid: normalized.isValid,
          spamScore: normalized.spamScore,
          reason: normalized.reason,
          evaluatedAt: new Date(),
        },
        exclusive: normalized.qualityLevel === "High",
        shared: normalized.qualityLevel !== "High",
      });

      try {
        const seller = await User.findById(formOwnerId)
          .select("leadPricing")
          .lean();
        const pricing =
          seller && typeof seller === "object"
            ? (
                seller as {
                  leadPricing?: {
                    high?: number;
                    medium?: number;
                    low?: number;
                  };
                }
              ).leadPricing || {
                high: 10,
                medium: 5,
                low: 2,
              }
            : {
                high: 10,
                medium: 5,
                low: 2,
              };
        const unitPrice =
          normalized.qualityLevel === "High"
            ? pricing.high
            : normalized.qualityLevel === "Low"
              ? pricing.low
              : pricing.medium;
        await Lead.findByIdAndUpdate(lead._id, { unit: unitPrice });
      } catch (pricingError) {
        console.error("⚠️ Error setting lead pricing:", pricingError);
      }
    } catch (aiError) {
      console.error("❌ Error in AI quality assessment:", aiError);
      await Lead.findByIdAndUpdate(lead._id, {
        aiQualityScore: 50,
        qualityLevel: "Medium",
        aiQualityReason: "AI evaluation unavailable - using default",
        exclusive: false,
        shared: true,
      });
    }
  } else {
    await Lead.findByIdAndUpdate(lead._id, {
      aiQualityScore: 50,
      qualityLevel: "Medium",
      aiQualityReason: "AI scoring not enabled in subscription",
      exclusive: false,
      shared: true,
    });
  }

  // ========================================
  // 2. UPDATE FORM'S submittedLeads ARRAY
  // ========================================
  try {
    await Form.findByIdAndUpdate(formObjectId, {
      $push: { submittedLeads: lead._id },
    });
  } catch (formError) {
    console.error("❌ Error updating form's submittedLeads:", formError);
  }

  // ========================================
  // 3. AUTOMATIC LEAD DISTRIBUTION & ASSIGNMENT
  // ========================================
  try {
    const scoredLead = await Lead.findById(lead._id);
    if (!scoredLead) {
      throw new Error(`Lead ${lead._id} not found after AI scoring`);
    }

    const distributionResult = await processLeadDistribution(scoredLead);

    if (distributionResult.errors.length > 0) {
      console.warn("⚠️ Distribution errors:", distributionResult.errors);
    }
  } catch (distributionError) {
    console.error(
      "❌ Error processing lead distribution:",
      distributionError,
    );
  }

  // ========================================
  // 4. SEND NOTIFICATION TO SELLER
  // ========================================
  try {
    const leadName = lead.fields?.find(
      (f) => f.label.toLowerCase() === "name",
    )?.value;
    const leadEmail = lead.fields?.find(
      (f) => f.label.toLowerCase() === "email",
    )?.value;

    await sendNotification({
      userId: formOwnerId,
      type: "alert",
      title: "New Lead Submitted",
      message:
        `A new lead has been submitted through your form. ${leadName ? `Contact: ${leadName}` : ""} ${leadEmail ? `(${leadEmail})` : ""}`.trim(),
      metadata: {
        leadId: lead._id,
        formId: formObjectId,
        leadName,
        leadEmail,
      },
    });
  } catch (notificationError) {
    console.error("❌ Error sending notification:", notificationError);
  }

  // ========================================
  // 5. NOTIFY ZAPIER (New Lead trigger)
  // ========================================
  Lead.findById(lead._id)
    .then((finalLead) => {
      if (finalLead) {
        return ZapierTriggerHelper.triggerLeadCreated(finalLead, formOwnerId);
      }
    })
    .catch((zapierError) => {
      console.error("❌ Error dispatching Zapier leadCreated trigger:", zapierError);
    });

  return NextResponse.json({
    success: true,
    message: "Thank you! Your information has been submitted successfully.",
  });
});
