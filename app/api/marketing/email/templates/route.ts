// GET /api/email/templates - List templates
// POST /api/email/templates - Create template
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailTemplate } from "@/models/emailCampaign";

export const dynamic = "force-dynamic";

/**
 * GET /api/email/templates
 * Fetch all email templates
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const templates = await EmailTemplate.find()
      .sort({ createdAt: -1 })
      .select("_id name category subject previewText createdAt")
      .lean();

    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/email/templates
 * Create new email template
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      subject,
      htmlContent,
      textContent,
      previewText,
      category,
      variables,
    } = body;

    if (!name || !subject || !htmlContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if template already exists
    const existingTemplate = await EmailTemplate.findOne({ name });
    if (existingTemplate) {
      return NextResponse.json(
        { error: "Template with this name already exists" },
        { status: 400 }
      );
    }

    const template = new EmailTemplate({
      name,
      subject,
      htmlContent,
      textContent,
      previewText,
      category: category || "custom",
      variables: variables || [],
    });

    const savedTemplate = await template.save();

    return NextResponse.json(
      {
        message: "Template created successfully",
        template: savedTemplate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
