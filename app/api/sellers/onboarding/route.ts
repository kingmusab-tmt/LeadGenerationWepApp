import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { badRequest, internalError, unauthorized } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

const VALID_STEPS = [
  "general",
  "lead-distribution",
  "units-settings",
  "email-settings",
  "stripe-onboarding",
];

/**
 * GET /api/sellers/onboarding
 * Server-side source of truth for seller-onboarding progress (see
 * lib/sellerOnboarding.ts) — previously tracked only in localStorage, so
 * it reset on a new device/browser or cleared storage.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized("Authentication required");
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email })
      .select("onboardingProgress")
      .lean();

    return NextResponse.json({
      completedSteps: user?.onboardingProgress?.completedSteps || [],
      skippedSteps: user?.onboardingProgress?.skippedSteps || [],
    });
  } catch (error) {
    console.error("Error fetching seller onboarding progress:", error);
    return internalError("Failed to fetch onboarding progress");
  }
}

/**
 * POST /api/sellers/onboarding
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

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      update,
      { new: true },
    ).select("onboardingProgress");

    if (!user) {
      return badRequest("User not found for this account");
    }

    return NextResponse.json({
      completedSteps: user.onboardingProgress?.completedSteps || [],
      skippedSteps: user.onboardingProgress?.skippedSteps || [],
    });
  } catch (error) {
    console.error("Error updating seller onboarding progress:", error);
    return internalError("Failed to update onboarding progress");
  }
}
