import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads";
import Form from "@/models/form";
import { User } from "@/models/userModel";
import { processLeadDistribution } from "@/lib/leadAssignmentService";
import { checkFeatureAccess } from "@/lib/subscriptionLimitsService";
import { sendNotification } from "@/lib/notificationService";

import { normalizeAiQualityResult } from "@/lib/aiQualityScoring";
import {
  badRequest,
  internalError,
  methodNotAllowed,
} from "@/lib/api/error-handler";

interface Field {
  id: string;
  label: string;
  value: unknown;
}

interface RequestData {
  userId: string;
  formId: string;
  fields: Field[];
  honeypot?: string; // Anti-spam honeypot field
  timestamp?: number; // Form load timestamp for spam detection
  recaptchaToken?: string; // Google reCAPTCHA token
}

// Simple in-memory rate limiting (use Redis in production)
const submissionTracker = new Map<
  string,
  { count: number; resetTime: number }
>();

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

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = submissionTracker.get(ip);

  if (!limit || now > limit.resetTime) {
    submissionTracker.set(ip, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }

  if (limit.count >= 5) {
    // Max 5 submissions per minute
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(request: Request) {
  // Ensure the request is a POST request
  if (request.method !== "POST") {
    return methodNotAllowed();
  }

  try {
    await dbConnect();
    const data: RequestData = await request.json();

    // Get IP address for rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const clientIp = ip.split(",")[0].trim();

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return badRequest("Too many submissions. Please try again later.");
    }

    // Honeypot check (if honeypot field has value, it's likely a bot)
    if (data.honeypot && data.honeypot.trim() !== "") {
      // console.log("Honeypot triggered - possible spam");
      // return NextResponse.json(
      //   { success: true, message: "Lead captured successfully!" }, // Return success to fool bots
      //   { status: 200 },
      // );
    }

    // Timing check (form submitted too quickly might be a bot)
    if (data.timestamp) {
      const submissionTime = Date.now();
      const timeDiff = submissionTime - data.timestamp;

      if (timeDiff < 3000) {
        // Submitted in less than 3 seconds
        // console.log("Form submitted too quickly - possible spam");
        return badRequest("Please take your time filling out the form.");
      }
    }

    if (!data || !data.userId || !data.fields || !Array.isArray(data.fields)) {
      return badRequest("Invalid data structure.");
    }

    const formRecord =
      data.formId && typeof data.formId === "string"
        ? ((await Form.findOne({ formId: data.formId })
            .select("_id userId recaptchaEnabled")
            .lean()) as {
            _id: unknown;
            userId: unknown;
            recaptchaEnabled?: boolean;
          } | null)
        : null;

    const formObjectId = formRecord?._id ?? null;
    const formOwnerId =
      (formRecord?.userId as unknown as string | undefined) || data.userId;
    const recaptchaRequired = Boolean(formRecord?.recaptchaEnabled);

    if (recaptchaRequired) {
      const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

      if (!recaptchaSecret) {
        return internalError(
          "reCAPTCHA is enabled for this form but not configured on the server.",
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

    // Validate fields
    if (data.fields.length === 0) {
      return badRequest("Form cannot be empty.");
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

      // Try to identify location-related fields
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

    // Extract industry if available
    let industry = "";
    const industryField = data.fields.find((field) =>
      field.label.toLowerCase().includes("industry"),
    );
    if (industryField) {
      industry = industryField.value?.toString() || "";
    }

    // Create a new lead
    const nameField = data.fields.find((f) => f.label.toLowerCase() === "name");
    const emailField = data.fields.find(
      (f) => f.label.toLowerCase() === "email",
    );
    const phoneField = data.fields.find(
      (f) => f.label.toLowerCase() === "phone",
    );
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
    // Check if seller has leadScoringEnabled feature
    const hasLeadScoringFeature = await checkFeatureAccess(
      formOwnerId,
      "leadScoringEnabled",
    );

    if (hasLeadScoringFeature.allowed) {
      try {
        // Get all field values for AI evaluation
        const allFieldsData = data.fields.reduce(
          (acc, field) => {
            acc[field.label] = field.value || "";
            return acc;
          },
          {} as Record<string, unknown>,
        );

        // Call the Gatekeeper API to get AI quality score
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

        // Update the lead with AI quality assessment
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

        // console.log("✅ AI quality assessment completed:", {
        //   leadId: lead._id,
        //   qualityLevel: normalized.qualityLevel,
        //   spamScore: normalized.spamScore,
        //   isValid: normalized.isValid,
        //   reason: normalized.reason,
        // });
        // console.log("[AI Scoring][Metric]", {
        //   event: "success",
        //   context: "form_submit",
        //   ...recordAiScoringMetric("success"),
        // });

        // Apply seller's quality-based lead pricing
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
          // console.log("✅ Lead unit price set:", {
          //   qualityLevel: normalized.qualityLevel,
          //   unitPrice,
          // });
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
        // console.log("[AI Scoring][Metric]", {
        //   event: "fallback",
        //   context: "form_submit",
        //   reason: "exception",
        //   ...recordAiScoringMetric("fallback"),
        // });
      }
    } else {
      // User doesn't have lead scoring feature - set default values without AI
      // console.log(
      //   "⏭️ AI lead scoring skipped - feature not enabled for user:",
      //   formOwnerId,
      // );
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
      if (formObjectId) {
        await Form.findByIdAndUpdate(formObjectId, {
          $push: { submittedLeads: lead._id },
        });

        // console.log("✅ Form submittedLeads updated:", {
        //   formId: formObjectId,
        //   leadId: lead._id,
        // });
      }
    } catch (formError) {
      console.error("❌ Error updating form's submittedLeads:", formError);
      // Don't fail the entire request due to form update error
    }

    // ========================================
    // 3. AUTOMATIC LEAD DISTRIBUTION & ASSIGNMENT
    // ========================================
    try {
      // Re-fetch the lead to get the updated AI quality scores
      const scoredLead = await Lead.findById(lead._id);
      if (!scoredLead) {
        throw new Error(`Lead ${lead._id} not found after AI scoring`);
      }

      const distributionResult = await processLeadDistribution(scoredLead);

      // console.log("✅ Lead distribution processed:", {
      //   leadId: lead._id,
      //   assignedBuyers: distributionResult.assignedBuyers.length,
      //   notified: distributionResult.notified.length,
      //   errors: distributionResult.errors.length,
      // });

      if (distributionResult.errors.length > 0) {
        console.warn("⚠️ Distribution errors:", distributionResult.errors);
      }

      // ========================================
      // 3a. MARKETPLACE & AUTO-ACCEPT FALLBACK
      // ========================================

      // Refresh lead to get current status
      const updatedLead = await Lead.findById(lead._id);

      // If lead is not assigned and is low quality or unmatched,
      // make it available in marketplace
      if (
        updatedLead &&
        distributionResult.assignedBuyers.length === 0 &&
        updatedLead.qualityLevel === "Low"
      ) {
        try {
          // console.log(
          //   `📢 Low quality lead ${lead._id} - making available in marketplace`,
          // );
          // const marketplaceResult = await makeLeadAvailableInMarketplace(
          //   updatedLead,
          //   "low_quality",
          // );
          // console.log(
          //   `✅ Marketplace notifications sent to ${marketplaceResult.notificationResult?.notifiedBuyers.length || 0} buyers`,
          // );
        } catch (marketplaceError) {
          console.error(
            "⚠️ Error making lead available in marketplace:",
            marketplaceError,
          );
        }
      }
    } catch (distributionError) {
      console.error(
        "❌ Error processing lead distribution:",
        distributionError,
      );
      // Don't fail the entire request due to distribution error
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

      console.log("✅ Seller notification sent:", {
        userId: formOwnerId,
        leadId: lead._id,
      });
    } catch (notificationError) {
      console.error("❌ Error sending notification:", notificationError);
      // Don't fail the entire request due to notification error
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! Your information has been submitted successfully.",
    });
  } catch (error) {
    console.error("Error capturing lead:", error);

    return internalError(
      error instanceof Error
        ? `Failed to capture lead. ${error.message}`
        : "Failed to capture lead.",
    );
  }
}
