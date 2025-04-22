import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Form from "@/models/form";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to update this lead." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const deletedForm = await Form.findOneAndDelete({ formId: id });

    if (!deletedForm) {
      return NextResponse.json(
        {
          success: false,
          message: "Form not found.",
          error: `No form found with formId: ${id}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Form deleted successfully!",
      deletedForm,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete form.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
