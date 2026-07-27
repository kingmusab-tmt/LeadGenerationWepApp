import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Lead } from "@/models/leads";
import Call from "@/models/call";
import dbConnects from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { recordAuditLog } from "@/lib/auditLog";
import { badRequest, internalError, notFound } from "@/lib/api/error-handler";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnects();

    const { flagged } = await req.json();
    const { type, id } = await params;

    if (type === "lead") {
      const updatedLead = await Lead.findByIdAndUpdate(
        id,
        { status: flagged ? "flagged" : "available" },
        { new: true },
      ).lean();

      if (!updatedLead) {
        return notFound("Lead");
      }

      await recordAuditLog({
        actor: session!.user,
        action: flagged ? "lead.flagged" : "lead.unflagged",
        targetType: "Lead",
        targetId: id,
        summary: `${flagged ? "Flagged" : "Unflagged"} lead ${id}`,
        req,
      });

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
        { new: true },
      ).lean();

      if (!updatedCall) {
        return notFound("Call");
      }

      await recordAuditLog({
        actor: session!.user,
        action: flagged ? "call.flagged" : "call.unflagged",
        targetType: "Call",
        targetId: id,
        summary: `${flagged ? "Flagged" : "Unflagged"} call ${id}`,
        req,
      });

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
      return badRequest("Invalid content type");
    }
  } catch (error) {
    console.error("Failed to flag content:", error);
    return internalError("Failed to flag content");
  }
}
