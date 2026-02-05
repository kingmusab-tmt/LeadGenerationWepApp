import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import Form from "@/models/form";
import { authOptions } from "@/auth";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { formId, fields, formName, leadSource, industry } = await req.json();

    if (!formId) {
      return NextResponse.json(
        { success: false, message: "Form ID is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Find the form to update
    const form = await Form.findOne({ formId });

    if (!form) {
      return NextResponse.json(
        { success: false, message: "Form not found" },
        { status: 404 },
      );
    }

    // Verify that the user owns the form
    if (form.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to update this form" },
        { status: 403 },
      );
    }

    // Check if formName or industry is being changed to a duplicate
    if (formName !== form.formName || industry !== form.industry) {
      const duplicateCheck = await Form.findOne({
        _id: { $ne: form._id },
        userId: session.user.id,
        $or: [{ formName: formName }, { industry: industry }],
      });

      if (duplicateCheck) {
        return NextResponse.json(
          {
            success: false,
            message: "A form with this name or industry already exists",
          },
          { status: 400 },
        );
      }
    }

    // Update the form
    form.fields = fields;
    form.formName = formName;
    form.leadSource = leadSource;
    form.industry = industry;

    await form.save();

    return NextResponse.json({
      success: true,
      message: "Form updated successfully!",
    });
  } catch (error) {
    console.error("Failed to update form:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update form.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
