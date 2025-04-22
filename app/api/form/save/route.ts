import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import Form from "@/models/form";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();
    console.log(data);
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
