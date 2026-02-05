import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { updateSettingsSchema } from "@/lib/validation/schemas";
import {
  successResponse,
  unauthorized,
  notFound,
  internalError,
  handleValidationError,
  badRequest,
} from "@/lib/api/error-handler";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return unauthorized();
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return notFound("User");
    }

    return successResponse({
      autoAssignLeads: user.autoAssignLeads,
      maxAutoAssignPerDay: user.maxAutoAssignPerDay,
      distributionMode: user.distributionMode,
      aiQualityThreshold: user.aiQualityThreshold,
      marketplaceFallback: user.marketplaceFallback,
      emailSettings: user.emailSettings || {},
      apiSettings: user.apiSettings || {},
      creditSetup: user.creditSetup || {},
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return internalError("Failed to fetch settings");
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return unauthorized();
    }

    // Validate request body
    let validatedData;
    try {
      const body = await req.json();
      validatedData = await updateSettingsSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid request body");
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        ...(typeof validatedData.autoAssignLeads === "boolean" && {
          autoAssignLeads: validatedData.autoAssignLeads,
        }),
        ...(typeof validatedData.maxAutoAssignPerDay === "number" && {
          maxAutoAssignPerDay: validatedData.maxAutoAssignPerDay,
        }),
        ...(validatedData.distributionMode && {
          distributionMode: validatedData.distributionMode,
        }),
        ...(typeof validatedData.aiQualityThreshold === "number" && {
          aiQualityThreshold: validatedData.aiQualityThreshold,
        }),
        ...(typeof validatedData.marketplaceFallback === "boolean" && {
          marketplaceFallback: validatedData.marketplaceFallback,
        }),
        ...(validatedData.emailSettings && {
          emailSettings: validatedData.emailSettings,
        }),
        ...(validatedData.apiSettings && {
          apiSettings: validatedData.apiSettings,
        }),
        ...(validatedData.creditSetup && {
          creditSetup: validatedData.creditSetup,
        }),
      },
      { new: true },
    );

    if (!user) {
      return notFound("User");
    }

    return successResponse({
      autoAssignLeads: user.autoAssignLeads,
      maxAutoAssignPerDay: user.maxAutoAssignPerDay,
      distributionMode: user.distributionMode,
      aiQualityThreshold: user.aiQualityThreshold,
      marketplaceFallback: user.marketplaceFallback,
      emailSettings: user.emailSettings,
      apiSettings: user.apiSettings,
      creditSetup: user.creditSetup,
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    return internalError("Failed to save settings");
  }
}
