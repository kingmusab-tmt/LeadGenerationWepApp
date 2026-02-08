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
      leadPricing: user.leadPricing || { high: 10, medium: 5, low: 2 },
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

    // Build update object — use dot notation for emailSettings to avoid wiping unaffected fields
    const updateObj: Record<string, any> = {};
    if (typeof validatedData.autoAssignLeads === "boolean") {
      updateObj.autoAssignLeads = validatedData.autoAssignLeads;
    }
    if (typeof validatedData.maxAutoAssignPerDay === "number") {
      updateObj.maxAutoAssignPerDay = validatedData.maxAutoAssignPerDay;
    }
    if (validatedData.distributionMode) {
      updateObj.distributionMode = validatedData.distributionMode;
    }
    if (typeof validatedData.aiQualityThreshold === "number") {
      updateObj.aiQualityThreshold = validatedData.aiQualityThreshold;
    }
    if (typeof validatedData.marketplaceFallback === "boolean") {
      updateObj.marketplaceFallback = validatedData.marketplaceFallback;
    }
    if (validatedData.leadPricing) {
      if (typeof validatedData.leadPricing.high === "number") {
        updateObj["leadPricing.high"] = validatedData.leadPricing.high;
      }
      if (typeof validatedData.leadPricing.medium === "number") {
        updateObj["leadPricing.medium"] = validatedData.leadPricing.medium;
      }
      if (typeof validatedData.leadPricing.low === "number") {
        updateObj["leadPricing.low"] = validatedData.leadPricing.low;
      }
    }
    // Use dot notation for emailSettings to preserve other fields
    if (validatedData.emailSettings) {
      for (const [key, value] of Object.entries(validatedData.emailSettings)) {
        if (value !== undefined) {
          updateObj[`emailSettings.${key}`] = value;
        }
      }
    }
    if (validatedData.apiSettings) {
      for (const [key, value] of Object.entries(validatedData.apiSettings)) {
        if (value !== undefined) {
          updateObj[`apiSettings.${key}`] = value;
        }
      }
    }
    if (validatedData.creditSetup) {
      for (const [key, value] of Object.entries(validatedData.creditSetup)) {
        if (value !== undefined) {
          updateObj[`creditSetup.${key}`] = value;
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateObj },
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
      leadPricing: user.leadPricing || { high: 10, medium: 5, low: 2 },
      emailSettings: user.emailSettings,
      apiSettings: user.apiSettings,
      creditSetup: user.creditSetup,
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    return internalError("Failed to save settings");
  }
}
