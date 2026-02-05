import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import Form from "@/models/form";
import { authOptions } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { formId } = await req.json();

    if (!formId) {
      return NextResponse.json(
        { success: false, message: "Form ID is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Find the original form
    const originalForm = await Form.findOne({ formId });

    if (!originalForm) {
      return NextResponse.json(
        { success: false, message: "Original form not found" },
        { status: 404 },
      );
    }

    // Verify that the user owns the form or is authorized to clone it
    if (originalForm.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to clone this form" },
        { status: 403 },
      );
    }

    // Generate a new formId for the cloned form
    const newFormId = uuidv4();

    // Create the cloned form with a modified name
    const clonedForm = new Form({
      formId: newFormId,
      userId: session.user.id,
      formName: `${originalForm.formName} (Copy)`,
      leadSource: originalForm.leadSource,
      industry: `${originalForm.industry}_copy_${Date.now()}`, // Make industry unique
      fields: originalForm.fields.map(
        (field: {
          id: string;
          type: string;
          label: string;
          required?: boolean;
          options?: string[];
        }) => ({
          id: field.id,
          type: field.type,
          label: field.label,
          required: field.required,
          options: field.options,
        }),
      ),
    });

    await clonedForm.save();

    return NextResponse.json({
      success: true,
      message: "Form cloned successfully!",
      formId: newFormId,
      formName: clonedForm.formName,
    });
  } catch (error) {
    console.error("Failed to clone form:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to clone form.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
