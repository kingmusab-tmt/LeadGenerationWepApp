import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Lead } from "@/models/leads";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { internalError } from "@/lib/api/error-handler";

// Unbounded before this — see admin/financial/transactions/route.ts for
// the same fix and reasoning.
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || "", 10) || DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      Lead.find()
        .populate("userId", "name", User)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(),
    ]);

    const formattedLeads = leads.map((lead) => ({
      id: lead._id.toString(),
      status: lead.status,
      qualityScore: lead.aiQualityScore,
      qualityLevel: lead.qualityLevel || "Medium",
      source: lead.leadSource || "Unknown",
      createdAt: lead.createdAt.toISOString(),
      seller:
        typeof lead.userId === "object" && lead.userId !== null
          ? {
              id: (
                lead.userId as unknown as { _id: mongoose.Types.ObjectId }
              )._id.toString(),
              name: (lead.userId as unknown as { name: string }).name,
            }
          : {
              id:
                typeof lead.userId === "string"
                  ? lead.userId
                  : lead.userId
                    ? String(lead.userId)
                    : "",
              name: "",
            },
      buyer:
        lead.soldTo.length > 0
          ? {
              id: lead.soldTo[0].buyerId,
              name: "Buyer", // Would need to populate from Buyer model in a real implementation
            }
          : undefined,
      fields: lead.fields.map((f) => ({
        label: f.label,
        value: f.value.toString(),
      })),
    }));

    return NextResponse.json({
      leads: formattedLeads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to fetch leads:", error);
    return internalError("Failed to fetch leads");
  }
}
