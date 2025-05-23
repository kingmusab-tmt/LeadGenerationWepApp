import { NextRequest, NextResponse } from "next/server";
import { Lead } from "@/models/leads";
import dbConnect from "@/lib/connectdb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

// GET /api/leads - Fetch all leads
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    if (session.user.role !== "admin") {
      const leads = await Lead.find({ userId: session.user.id });
      return NextResponse.json(leads, { status: 200 });
    }

    const leads = await Lead.find();
    return NextResponse.json(leads, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch leads." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const body = await req.json();
    const newLead = new Lead(body);
    await newLead.save();
    return NextResponse.json(
      { message: "Lead added successfully.", lead: newLead },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error adding lead:", error);
    return NextResponse.json(
      {
        error: "Failed to add lead.",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// PUT /api/leads/:leadId - Update an existing lead
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("id");

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required." },
        { status: 400 }
      );
    }

    await dbConnect();
    const body = await req.json();

    // Ensure leadId is a valid ObjectId
    if (!ObjectId.isValid(leadId)) {
      return NextResponse.json({ error: "Invalid Lead ID." }, { status: 400 });
    }

    // Remove _id from body to prevent modifying the immutable field
    if ("_id" in body) {
      delete body._id;
    }

    const updatedLead = await Lead.findOneAndUpdate(
      { _id: leadId }, // Correctly filter by _id
      { $set: body }, // Use $set to prevent overwriting unintended fields
      { new: true } // Return updated document
    );

    if (!updatedLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Lead updated successfully.", lead: updatedLead },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating lead:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update lead.",
        error: error.message || "Unknown error occurred.",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/:leadId - Remove a lead by ID
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("id");

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const deletedLead = await Lead.deleteOne({ leadId });

    if (deletedLead.deletedCount === 0) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Lead removed successfully." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove lead." },
      { status: 500 }
    );
  }
}
