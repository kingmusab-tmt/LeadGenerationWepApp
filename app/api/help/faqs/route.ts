import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import FAQ from "@/models/FAQ";

export const dynamic = "force-dynamic";

/**
 * GET /api/help/faqs
 * Returns frequently asked questions, optionally filtered by targetAudience
 */
export async function GET(req: NextRequest) {
  try {
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
    return NextResponse.json(
      { error: "Failed to fetch FAQs" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/help/faqs
 * Create a new FAQ
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { question, answer, category, targetAudience } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 },
      );
    }

    const newFaq = await FAQ.create({
      question,
      answer,
      category,
      targetAudience: targetAudience || "both",
    });

    return NextResponse.json(newFaq, { status: 201 });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return NextResponse.json(
      { error: "Failed to create FAQ" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/help/faqs
 * Update an existing FAQ
 */
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "FAQ ID is required" },
        { status: 400 },
      );
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
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json(updatedFaq, { status: 200 });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return NextResponse.json(
      { error: "Failed to update FAQ" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/help/faqs
 * Delete a FAQ
 */
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "FAQ ID is required" },
        { status: 400 },
      );
    }

    const deletedFaq = await FAQ.findByIdAndDelete(id);

    if (!deletedFaq) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "FAQ deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json(
      { error: "Failed to delete FAQ" },
      { status: 500 },
    );
  }
}
