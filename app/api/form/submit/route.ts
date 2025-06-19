import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads";

interface Field {
  id: string;
  label: string;
  value: any; // Allow any type of value
}

interface RequestData {
  userId: string;
  formId: string;
  fields: Field[];
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data: RequestData = await request.json();

    //("Received Data:", data);

    if (!data || !data.userId || !data.fields || !Array.isArray(data.fields)) {
      return NextResponse.json(
        { success: false, message: "Invalid data structure." },
        { status: 400 }
      );
    }

    // Create a new lead
    const lead = new Lead({
      formId: data.formId,
      userId: data.userId,
      fields: data.fields,
      status: "new",
      isFavorite: false,
      isManual: false,
    });

    await lead.save();

    return NextResponse.json({
      success: true,
      message: "Lead captured successfully!",
    });
  } catch (error: any) {
    console.error("Error capturing lead:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to capture lead.",
        error: error.message || "Unknown error occurred.",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
