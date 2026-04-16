import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import Form from "@/models/form";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return unauthorized("Authentication required");
    }

    const { formId, fields, formName, leadSource, industry } = await req.json();

    if (!formId) {
      return badRequest("Form ID is required");
    }

    await dbConnect();

    // Find the form to update
    const form = await Form.findOne({ formId });

    if (!form) {
      return notFound("Form");
    }

    // Verify that the user owns the form
    if (form.userId.toString() !== session.user.id) {
      return forbidden("Unauthorized to update this form");
    }

    // Check if formName or industry is being changed to a duplicate
    if (formName !== form.formName || industry !== form.industry) {
      const duplicateCheck = await Form.findOne({
        _id: { $ne: form._id },
        userId: session.user.id,
        $or: [{ formName: formName }, { industry: industry }],
      });

      if (duplicateCheck) {
        return badRequest("A form with this name or industry already exists");
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
    return internalError(
      error instanceof Error
        ? `Failed to update form. ${error.message}`
        : "Failed to update form.",
    );
  }
}
