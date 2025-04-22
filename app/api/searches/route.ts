import { NextRequest, NextResponse } from "next/server";
import { Lead } from "@/models/leads";
import dbConnect from "@/lib/connectdb";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { leadId, sellerId } = await req.json();

    const updatedLead = await Lead.findOneAndUpdate(
      { leadId, sellerId },
      { isFavorite: true },
      { new: true }
    );

    if (!updatedLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Lead marked as favorite.", lead: updatedLead },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to mark lead as favorite." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { leadId, sellerId } = await req.json();

  try {
    await dbConnect();
    const updatedLead = await Lead.findOneAndUpdate(
      { leadId, sellerId },
      { isFavorite: false },
      { new: true }
    );

    if (!updatedLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Lead removed from favorites.", lead: updatedLead },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove lead from favorites." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const sellerId = req.nextUrl.searchParams.get("sellerId");

  try {
    await dbConnect();
    const favoriteLeads = await Lead.find({ sellerId, isFavorite: true });

    return NextResponse.json(favoriteLeads, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch favorite leads." },
      { status: 500 }
    );
  }
}
