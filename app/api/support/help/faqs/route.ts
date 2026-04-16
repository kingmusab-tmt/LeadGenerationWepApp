import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import FAQ from "@/models/FAQ";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import {
  badRequest,
  forbidden,
  internalError,
  methodNotAllowed,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export async function GET(req: NextRequest) {
  // Ensure the request is a GET request
  if (req.method !== "GET") {
    return methodNotAllowed();
  }
  const session = await getServerSession(authOptions);
  try {
    if (!session) {
      return unauthorized("Authentication required");
    }
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const faqs = await FAQ.find({
      $and: [
        {
          $or: [
            { question: { $regex: search, $options: "i" } },
            { answer: { $regex: search, $options: "i" } },
          ],
        },
        {
          $or: [{ targetAudience: "seller" }, { targetAudience: "both" }],
        },
      ],
    }).sort({ createdAt: -1 });

    return NextResponse.json(faqs);
  } catch {
    return internalError("Failed to fetch FAQs");
  }
}

export async function POST(req: NextRequest) {
  // Ensure the request is a POST request
  if (req.method !== "POST") {
    return methodNotAllowed();
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorized("Authentication required");
  }
  if (session.user.role !== "admin") {
    return forbidden("Forbidden: Only admins can create FAQs");
  }
  try {
    await dbConnect();

    const { question, answer, category } = await req.json();

    if (!question || !answer) {
      return badRequest("Question and answer are required");
    }

    const newFAQ = new FAQ({
      question,
      answer,
      category,
    });

    await newFAQ.save();

    return NextResponse.json(newFAQ, { status: 201 });
  } catch {
    return internalError("Failed to create FAQ");
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorized("Authentication required");
  }
  if (session.user.role !== "admin") {
    return forbidden("Forbidden: Only admins can update FAQs");
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const updateData = await req.json();

    const updatedFAQ = await FAQ.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedFAQ) {
      return notFound("FAQ");
    }

    return NextResponse.json(updatedFAQ);
  } catch {
    return internalError("Failed to update FAQ");
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorized("Authentication required");
  }
  if (session.user.role !== "admin") {
    return forbidden("Forbidden: Only admins can delete FAQs");
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("FAQ ID is required");
    }

    const deletedFAQ = await FAQ.findByIdAndDelete(id);

    if (!deletedFAQ) {
      return notFound("FAQ");
    }

    return NextResponse.json(
      { message: "FAQ deleted successfully" },
      { status: 200 },
    );
  } catch {
    return internalError("Failed to delete FAQ");
  }
}
