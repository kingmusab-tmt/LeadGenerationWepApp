import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { badRequest, internalError, unauthorized } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

const VALID_STEPS = [
  "general",
  "preferences",
  "availability",
  "limits",
  "location",
];

/**
 * GET /api/buyers/onboarding
 * Server-side source of truth for buyer-onboarding progress (see
 * lib/buyerOnboarding.ts) — previously tracked only in localStorage, so
 * it reset on a new device/browser or cleared storage.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    await dbConnect();
    const buyer = await Buyer.findOne({ email: session.user.email })
      .select("onboardingProgress")
      .lean();

    return NextResponse.json({
      completedSteps: buyer?.onboardingProgress?.completedSteps || [],
      skippedSteps: buyer?.onboardingProgress?.skippedSteps || [],
    });
  } catch (error) {
    console.error("Error fetching buyer onboarding progress:", error);
    return internalError("Failed to fetch onboarding progress");
  }
}

/**
 * POST /api/buyers/onboarding
 * Body: { step: string, action: "complete" | "skip" }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    const { step, action } = await req.json();

    if (!VALID_STEPS.includes(step)) {
      return badRequest(`Invalid step. Must be one of: ${VALID_STEPS.join(", ")}`);
    }
    if (action !== "complete" && action !== "skip") {
      return badRequest('action must be "complete" or "skip"');
    }

    await dbConnect();

    // A step being marked complete is no longer "skipped" and vice versa —
    // update both arrays atomically in one call so a step never ends up in
    // both lists.
    const update =
      action === "complete"
        ? {
            $addToSet: { "onboardingProgress.completedSteps": step },
            $pull: { "onboardingProgress.skippedSteps": step },
          }
        : {
            $addToSet: { "onboardingProgress.skippedSteps": step },
            $pull: { "onboardingProgress.completedSteps": step },
          };

    const buyer = await Buyer.findOneAndUpdate(
      { email: session.user.email },
      update,
      { new: true },
    ).select("onboardingProgress");

    if (!buyer) {
      return badRequest("Buyer profile not found for this account");
    }

    return NextResponse.json({
      completedSteps: buyer.onboardingProgress?.completedSteps || [],
      skippedSteps: buyer.onboardingProgress?.skippedSteps || [],
    });
  } catch (error) {
    console.error("Error updating buyer onboarding progress:", error);
    return internalError("Failed to update onboarding progress");
  }
}
