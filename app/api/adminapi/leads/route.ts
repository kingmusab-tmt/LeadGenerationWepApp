import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Lead } from "@/models/leads";
import { User } from "@/models/user";
import dbConnect from "@/lib/connectdb";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const leads = await Lead.find()
      .populate("userId", "name", User)
      .sort({ createdAt: -1 })
      .lean();

    const formattedLeads = leads.map((lead) => ({
      id: lead._id.toString(),
      status: lead.status,
      qualityScore: lead.leadScore,
      source: lead.leadSource || "Unknown",
      createdAt: lead.createdAt.toISOString(),
      seller:
        typeof lead.userId === "object" && lead.userId !== null
          ? {
              id: (
                lead.userId as { _id: mongoose.Types.ObjectId }
              )._id.toString(),
              name: (lead.userId as { name: string }).name,
            }
          : {
              id: lead.userId?.toString?.() || "",
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

    return NextResponse.json({ leads: formattedLeads });
  } catch (error) {
    console.error("Failed to fetch leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
