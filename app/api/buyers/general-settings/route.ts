import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";

export const dynamic = "force-dynamic";

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item)))
    .filter(Boolean);
};

const sanitizePreferredZones = (
  zones: unknown,
): { city?: string; state?: string; zipCodes?: string[] }[] => {
  if (!Array.isArray(zones)) return [];
  return zones
    .map((zone: any) => ({
      city: zone?.city?.trim?.() || undefined,
      state: zone?.state?.trim?.() || undefined,
      zipCodes: sanitizeStringArray(zone?.zipCodes),
    }))
    .filter((zone) => zone.city || zone.state || (zone.zipCodes || []).length);
};

const sanitizeServiceLocations = (
  locations: unknown,
): {
  city: string;
  state: string;
  country: string;
  zipCodes?: string[];
  radius?: number;
}[] => {
  if (!Array.isArray(locations)) return [];
  return locations
    .map((loc: any) => ({
      city: loc?.city?.trim?.() || "",
      state: loc?.state?.trim?.() || "",
      country: loc?.country?.trim?.() || "USA",
      zipCodes: sanitizeStringArray(loc?.zipCodes),
      radius: typeof loc?.radius === "number" ? loc.radius : 25,
    }))
    .filter((loc) => loc.city || loc.state || (loc.zipCodes || []).length);
};

async function getBuyerFromSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "buyer" || !session.user.email) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const buyer = await Buyer.findOne({ email: session.user.email });
  if (!buyer) {
    return {
      error: NextResponse.json({ error: "Buyer not found" }, { status: 404 }),
    };
  }

  return { buyer };
}

export async function GET() {
  await dbConnect();
  const { buyer, error } = await getBuyerFromSession();
  if (!buyer) return error;

  return NextResponse.json(
    {
      timezone: buyer.timezone,
      preferredDistribution: buyer.preferredDistribution,
      industries: buyer.leadPreferences?.industries || [],
      industryServicePairs: buyer.leadPreferences?.industryServicePairs || [],
      budgetCapType: buyer.budgetCapType,
      budgetLimitAmount: buyer.budgetLimitAmount,
      volumeLimitCount: buyer.volumeLimitCount,
      maxConcurrentLeads: buyer.maxConcurrentLeads,
      maxPricePerLead: buyer.maxPricePerLead,
      maxLeadsPerDay: buyer.maxLeadsPerDay,
      autoAcceptMatchingLeads: buyer.autoAcceptMatchingLeads,
      acceptCallLeads: buyer.acceptCallLeads,
      qualificationScoreMinimum: buyer.qualificationScoreMinimum,
      acceptOnlyDuringBusinessHours: buyer.acceptOnlyDuringBusinessHours,
      workingHours: buyer.workingHours,
      notifyOnWeekends: buyer.notifyOnWeekends,
      vacationMode: buyer.vacationMode,
      locationMatchingStrict: buyer.locationMatchingStrict,
      preferredZones: buyer.preferredZones,
      radiusFlexibility: buyer.radiusFlexibility,
      preferenceMatchingThreshold: buyer.preferenceMatchingThreshold,
      leadTypes: buyer.leadTypes,
      webhookConfig: buyer.webhookConfig,
      serviceLocations: buyer.serviceLocations,
      weeklySchedule: buyer.weeklySchedule,
      maxLeadAge: buyer.maxLeadAge,
      serviceRadius: buyer.serviceRadius,
      preferredContactMethods: buyer.preferredContactMethods,
      priorityBySource: buyer.priorityBySource,
      priorityByIndustry: buyer.priorityByIndustry,
      priorityByLocation: buyer.priorityByLocation,
    },
    { status: 200 },
  );
}

export async function PUT(req: NextRequest) {
  await dbConnect();
  const { buyer, error } = await getBuyerFromSession();
  if (!buyer) return error;

  try {
    const body = await req.json();

    const update: Record<string, unknown> = {};

    if (typeof body.timezone === "string" && body.timezone.trim()) {
      update.timezone = body.timezone.trim();
    }

    if (
      typeof body.preferredDistribution === "string" &&
      body.preferredDistribution.trim() &&
      ["Automatic", "Manual", "Both", "Direct"].includes(
        body.preferredDistribution,
      )
    ) {
      update.preferredDistribution = body.preferredDistribution.trim();
    }

    if (body.leadPreferences) {
      update.leadPreferences = {
        industries: sanitizeStringArray(body.leadPreferences.industries),
        industryServicePairs: body.leadPreferences.industryServicePairs || [],
      };
    }

    if (
      body.budgetCapType &&
      ["daily", "weekly", "monthly"].includes(body.budgetCapType)
    ) {
      update.budgetCapType = body.budgetCapType;
    }

    if (typeof body.budgetLimitAmount === "number") {
      update.budgetLimitAmount = body.budgetLimitAmount;
    }

    if (typeof body.volumeLimitCount === "number") {
      update.volumeLimitCount = body.volumeLimitCount;
    }

    if (typeof body.maxConcurrentLeads === "number") {
      update.maxConcurrentLeads = body.maxConcurrentLeads;
    }

    if (typeof body.maxPricePerLead === "number") {
      update.maxPricePerLead = body.maxPricePerLead;
    }

    if (typeof body.qualificationScoreMinimum === "number") {
      update.qualificationScoreMinimum = body.qualificationScoreMinimum;
    }

    if (typeof body.acceptOnlyDuringBusinessHours === "boolean") {
      update.acceptOnlyDuringBusinessHours = body.acceptOnlyDuringBusinessHours;
    }

    if (body.workingHours) {
      update.workingHours = {
        start: body.workingHours.start || "09:00",
        end: body.workingHours.end || "17:00",
      };
    }

    if (typeof body.notifyOnWeekends === "boolean") {
      update.notifyOnWeekends = body.notifyOnWeekends;
    }

    if (body.vacationMode) {
      update.vacationMode = {
        enabled: Boolean(body.vacationMode.enabled),
        autoReject:
          body.vacationMode.autoReject === undefined
            ? true
            : Boolean(body.vacationMode.autoReject),
        pauseUntil: body.vacationMode.pauseUntil
          ? new Date(body.vacationMode.pauseUntil)
          : undefined,
      };
    }

    if (typeof body.locationMatchingStrict === "boolean") {
      update.locationMatchingStrict = body.locationMatchingStrict;
    }

    if (body.preferredZones) {
      update.preferredZones = sanitizePreferredZones(body.preferredZones);
    }

    if (
      body.radiusFlexibility &&
      ["strict", "soft", "flexible"].includes(body.radiusFlexibility)
    ) {
      update.radiusFlexibility = body.radiusFlexibility;
    }

    if (
      body.preferenceMatchingThreshold &&
      ["strict", "moderate", "flexible"].includes(
        body.preferenceMatchingThreshold,
      )
    ) {
      update.preferenceMatchingThreshold = body.preferenceMatchingThreshold;
    }

    if (body.leadTypes) {
      const allowed = ["exclusive", "shared"];
      const leadTypes = sanitizeStringArray(body.leadTypes).filter((t) =>
        allowed.includes(t),
      );
      if (leadTypes.length) update.leadTypes = leadTypes;
    }

    if (body.webhookConfig) {
      update.webhookConfig = {
        enabled: Boolean(body.webhookConfig.enabled),
        url: body.webhookConfig.url || "",
        authToken: body.webhookConfig.authToken || "",
      };
    }

    if (body.serviceLocations) {
      update.serviceLocations = sanitizeServiceLocations(body.serviceLocations);
    }

    if (typeof body.maxLeadsPerDay === "number") {
      update.maxLeadsPerDay = body.maxLeadsPerDay;
    }

    if (typeof body.autoAcceptMatchingLeads === "boolean") {
      update.autoAcceptMatchingLeads = body.autoAcceptMatchingLeads;
    }

    if (typeof body.acceptCallLeads === "boolean") {
      update.acceptCallLeads = body.acceptCallLeads;
    }

    if (body.weeklySchedule && typeof body.weeklySchedule === "object") {
      update.weeklySchedule = body.weeklySchedule;
    }

    if (typeof body.maxLeadAge === "number" && body.maxLeadAge > 0) {
      update.maxLeadAge = body.maxLeadAge;
    }

    if (typeof body.serviceRadius === "number" && body.serviceRadius > 0) {
      update.serviceRadius = body.serviceRadius;
    }

    if (Array.isArray(body.preferredContactMethods)) {
      const allowed = ["phone", "email", "sms"];
      const methods = sanitizeStringArray(body.preferredContactMethods).filter(
        (m) => allowed.includes(m),
      );
      if (methods.length) update.preferredContactMethods = methods;
    }

    if (Array.isArray(body.priorityBySource)) {
      update.priorityBySource = body.priorityBySource;
    }

    if (Array.isArray(body.priorityByIndustry)) {
      update.priorityByIndustry = body.priorityByIndustry;
    }

    if (Array.isArray(body.priorityByLocation)) {
      update.priorityByLocation = body.priorityByLocation;
    }

    const updatedBuyer = await Buyer.findByIdAndUpdate(
      buyer._id,
      { $set: update },
      { new: true },
    );

    return NextResponse.json(
      {
        timezone: updatedBuyer?.timezone,
        preferredDistribution: updatedBuyer?.preferredDistribution,
        industries: updatedBuyer?.leadPreferences?.industries || [],
        industryServicePairs:
          updatedBuyer?.leadPreferences?.industryServicePairs || [],
        budgetCapType: updatedBuyer?.budgetCapType,
        budgetLimitAmount: updatedBuyer?.budgetLimitAmount,
        volumeLimitCount: updatedBuyer?.volumeLimitCount,
        maxConcurrentLeads: updatedBuyer?.maxConcurrentLeads,
        maxPricePerLead: updatedBuyer?.maxPricePerLead,
        qualificationScoreMinimum: updatedBuyer?.qualificationScoreMinimum,
        acceptOnlyDuringBusinessHours:
          updatedBuyer?.acceptOnlyDuringBusinessHours,
        workingHours: updatedBuyer?.workingHours,
        notifyOnWeekends: updatedBuyer?.notifyOnWeekends,
        vacationMode: updatedBuyer?.vacationMode,
        locationMatchingStrict: updatedBuyer?.locationMatchingStrict,
        preferredZones: updatedBuyer?.preferredZones,
        radiusFlexibility: updatedBuyer?.radiusFlexibility,
        preferenceMatchingThreshold: updatedBuyer?.preferenceMatchingThreshold,
        leadTypes: updatedBuyer?.leadTypes,
        webhookConfig: updatedBuyer?.webhookConfig,
        serviceLocations: updatedBuyer?.serviceLocations,
        maxLeadsPerDay: updatedBuyer?.maxLeadsPerDay,
        autoAcceptMatchingLeads: updatedBuyer?.autoAcceptMatchingLeads,
        acceptCallLeads: updatedBuyer?.acceptCallLeads,
        weeklySchedule: updatedBuyer?.weeklySchedule,
        maxLeadAge: updatedBuyer?.maxLeadAge,
        serviceRadius: updatedBuyer?.serviceRadius,
        preferredContactMethods: updatedBuyer?.preferredContactMethods,
        priorityBySource: updatedBuyer?.priorityBySource,
        priorityByIndustry: updatedBuyer?.priorityByIndustry,
        priorityByLocation: updatedBuyer?.priorityByLocation,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Failed to update buyer settings", err);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
