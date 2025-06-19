import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Form from "@/models/form";

export async function POST(request: Request) {
  // Ensure the request is a POST request
  if (request.method !== "POST") {
    return NextResponse.json(
      { success: false, message: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    await dbConnect();
    const data = await request.json();
    //(data);
    const form = new Form(data);
    await form.save();
    return NextResponse.json({
      success: true,
      message: "Form saved successfully!",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to save form." },
      { status: 500 }
    );
  }
}
