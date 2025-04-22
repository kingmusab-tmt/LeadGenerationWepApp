import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import Form from "@/models/form";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const formId = searchParams.get("formId");

  try {
    await dbConnect();
    const form = await Form.findOne({ formId });
    if (!form) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }
    return NextResponse.json(form);
  } catch (error) {
    console.error("Failed to fetch form:", error);
    return NextResponse.json(
      { message: "Failed to fetch form." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { fields, formName, leadSource, industry } = await request.json();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    await dbConnect();

    // Check for existing form with the same name or industry
    const existingForm = await Form.findOne({
      $or: [{ formName }, { industry }],
    });
    if (existingForm) {
      return NextResponse.json(
        {
          message:
            "Failed to publish form. Duplicate or Existing Form Name or Industry",
          duplicate: existingForm.formName || existingForm.industry,
        },
        { status: 400 }
      );
    }

    const formId = uuidv4();

    await Form.create({
      userId: session?.user?.id,
      formId,
      fields,
      formName,
      leadSource,
      industry,
    });

    const formUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/forms/${formId}`;
    const embedCode = `<iframe src="${formUrl}" width="100%" height="500px" style="border: none;"></iframe>`;

    return NextResponse.json({
      message: "Form published successfully!",
      formUrl,
      embedCode,
      status: 200,
    });
  } catch (error) {
    console.error("Failed to publish form:", error);
    return NextResponse.json(
      { message: "Failed to publish form." },
      { status: 500 }
    );
  }
}
