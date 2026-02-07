import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailTemplate } from "@/models/emailCampaign";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/email/templates/[id]
 * Get a single template
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const template = await EmailTemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(template, { status: 200 });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/marketing/email/templates/[id]
 * Update a template
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const template = await EmailTemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { name, subject, htmlContent, textContent, previewText, category } =
      body;

    if (name) template.name = name;
    if (subject) template.subject = subject;
    if (htmlContent) template.htmlContent = htmlContent;
    if (textContent !== undefined) template.textContent = textContent;
    if (previewText !== undefined) template.previewText = previewText;
    if (category) template.category = category;

    const updatedTemplate = await template.save();

    return NextResponse.json(
      { message: "Template updated successfully", template: updatedTemplate },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/marketing/email/templates/[id]
 * Delete a template
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const template = await EmailTemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    await EmailTemplate.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Template deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
}
