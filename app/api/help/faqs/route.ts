import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import FAQ from "@/models/FAQ";
import { requireAdmin } from "@/lib/api/adminAuth";
import { recordAuditLog } from "@/lib/auditLog";
import { badRequest, internalError, notFound, unauthorized } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/help/faqs
 * Returns frequently asked questions, optionally filtered by
 * targetAudience. Canonical implementation — see api/help/videos/route.ts
 * for why this absorbed the old /api/support/help/faqs duplicate.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const targetAudience = searchParams.get("targetAudience");

    let filter = {};
    if (targetAudience && targetAudience !== "all") {
      // Return FAQs for the specific audience or "both"
      filter = {
        $or: [{ targetAudience: targetAudience }, { targetAudience: "both" }],
      };
    }

    const faqs = await FAQ.find(filter).sort({ createdAt: -1 });

    return NextResponse.json(faqs, { status: 200 });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return internalError("Failed to fetch FAQs");
  }
}

/**
 * POST /api/help/faqs
 * Create a new FAQ
 */
export async function POST(req: NextRequest) {
  try {
    const { error, session } = await requireAdmin();
    if (error) return error;

    await dbConnect();

    const body = await req.json();
    const { question, answer, category, targetAudience } = body;

    if (!question || !answer) {
      return badRequest("Question and answer are required");
    }

    const newFaq = await FAQ.create({
      question,
      answer,
      category,
      targetAudience: targetAudience || "both",
    });

    await recordAuditLog({
      actor: session!.user,
      action: "help.faq.created",
      targetType: "FAQ",
      targetId: String(newFaq._id),
      summary: `Created FAQ "${question}"`,
      req,
    });

    return NextResponse.json(newFaq, { status: 201 });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return internalError("Failed to create FAQ");
  }
}

/**
 * PUT /api/help/faqs
 * Update an existing FAQ
 */
export async function PUT(req: NextRequest) {
  try {
    const { error, session } = await requireAdmin();
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("FAQ ID is required");
    }

    const body = await req.json();
    const { question, answer, category, targetAudience } = body;

    const updatedFaq = await FAQ.findByIdAndUpdate(
      id,
      {
        question,
        answer,
        category,
        targetAudience,
      },
      { new: true, runValidators: true },
    );

    if (!updatedFaq) {
      return notFound("FAQ");
    }

    await recordAuditLog({
      actor: session!.user,
      action: "help.faq.updated",
      targetType: "FAQ",
      targetId: id,
      summary: `Updated FAQ "${updatedFaq.question}"`,
      req,
    });

    return NextResponse.json(updatedFaq, { status: 200 });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return internalError("Failed to update FAQ");
  }
}

/**
 * DELETE /api/help/faqs
 * Delete a FAQ
 */
export async function DELETE(req: NextRequest) {
  try {
    const { error, session } = await requireAdmin();
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("FAQ ID is required");
    }

    const deletedFaq = await FAQ.findByIdAndDelete(id);

    if (!deletedFaq) {
      return notFound("FAQ");
    }

    await recordAuditLog({
      actor: session!.user,
      action: "help.faq.deleted",
      targetType: "FAQ",
      targetId: id,
      summary: `Deleted FAQ "${deletedFaq.question}"`,
      req,
    });

    return NextResponse.json(
      { message: "FAQ deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return internalError("Failed to delete FAQ");
  }
}
