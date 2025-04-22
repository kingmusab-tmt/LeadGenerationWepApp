import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads"; // Import Lead model
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Buyer } from "@/models/leadbuyers"; // Import Buyer model

export async function GET(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    // Check if the session exists and the user is a buyer
    if (!session || session.user.role !== "buyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to the database
    await dbConnect();

    // Fetch the buyerId using the email from the session
    const buyer = await Buyer.findOne({ email: session.user.email }).select(
      "_id"
    );

    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    const buyerId = buyer._id;

    // Fetch leads assigned to the buyer
    const leads = await Lead.find({
      assignedTo: { $elemMatch: { buyerId: buyerId } },
    });

    // Filter leads based on their status
    const filteredLeads = leads.map((lead) => {
      if (lead.status === "sold") {
        // If the lead is sold, return all fields (including contact information)
        return lead;
      } else {
        // If the lead is not sold, filter out sensitive fields (email, phone, address, postcode)
        const filteredFields = lead.fields.filter(
          (field) => !/email|phone|address|postcode/i.test(field.label)
        );
        return { ...lead.toObject(), fields: filteredFields };
      }
    });

    return NextResponse.json({ leads: filteredLeads }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
