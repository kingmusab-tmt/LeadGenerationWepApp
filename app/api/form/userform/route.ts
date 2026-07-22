import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Form from "@/models/form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { internalError, unauthorized } from "@/lib/api/error-handler";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;

  try {
    if (!session) return unauthorized("Authentication required");

    // Connect to MongoDB
    await dbConnect();
    // `fields` is kept even though the "My Forms" list itself doesn't render
    // it — the "Add Lead" dialog (leadform.tsx) also calls this same
    // endpoint to use a seller's existing form as a template for which
    // dynamic fields to show, and needs the real field definitions to do
    // that. submittedLeads is trimmed to just its length (a lead count
    // badge), not the individual lead IDs.
    const forms = await Form.find({ userId })
      .select(
        "formName formId createdAt status leadSource industry submittedLeads fields",
      )
      .sort({ createdAt: -1 })
      .lean();
    const withLeadCount = forms.map(
      ({ submittedLeads, ...form }) => ({
        ...form,
        leadCount: submittedLeads?.length ?? 0,
      }),
    );
    return NextResponse.json(withLeadCount);
  } catch (error) {
    console.error("Failed to fetch forms:", error);
    return internalError("Failed to fetch forms.");
  }
}
