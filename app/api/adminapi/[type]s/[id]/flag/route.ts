import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Lead } from "@/models/leads";
import Call from "@/models/call";
import dbConnects from "@/lib/connectdb";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  try {
    await dbConnects();

    const { flagged } = await req.json();
    const { type, id } = await params;

    if (type === "lead") {
      const updatedLead = await Lead.findByIdAndUpdate(
        id,
        { status: flagged ? "flagged" : "available" },
        { new: true }
      ).lean();

      if (!updatedLead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      return NextResponse.json({
        lead: {
          ...updatedLead,
          id: updatedLead._id.toString(),
          _id: undefined,
        },
      });
    } else if (type === "call") {
      const updatedCall = await Call.findByIdAndUpdate(
        id,
        { status: flagged ? "flagged" : "completed" },
        { new: true }
      ).lean();

      if (!updatedCall) {
        return NextResponse.json({ error: "Call not found" }, { status: 404 });
      }

      // Handle both array and object cases for updatedCall
      const callObj = Array.isArray(updatedCall) ? updatedCall[0] : updatedCall;
      return NextResponse.json({
        call: {
          ...callObj,
          id: callObj?._id?.toString?.(),
          _id: undefined,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Failed to flag content:", error);
    return NextResponse.json(
      { error: "Failed to flag content" },
      { status: 500 }
    );
  }
}
