import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Form from "@/models/form";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { internalError, notFound, unauthorized } from "@/lib/api/error-handler";

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized("Authentication required");
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const deletedForm = await Form.findOneAndDelete({ formId: id });

    if (!deletedForm) {
      return notFound("Form", `No form found with formId: ${id}`);
    }

    return NextResponse.json({
      success: true,
      message: "Form deleted successfully!",
      deletedForm,
    });
  } catch (error) {
    return internalError(
      error instanceof Error
        ? `Failed to delete form. ${error.message}`
        : "Failed to delete form.",
    );
  }
}
