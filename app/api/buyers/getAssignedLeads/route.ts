import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads"; // Import Lead model
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Buyer } from "@/models/leadbuyers"; // Import Buyer model
import { internalError, notFound, unauthorized } from "@/lib/api/error-handler";

export async function GET() {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    // Check if the session exists and the user is a buyer
    if (!session || session.user.role !== "buyer") {
      return unauthorized("Authentication required");
    }

    // Connect to the database
    await dbConnect();

    // Fetch the buyerId using the email from the session
    const buyer = await Buyer.findOne({ email: session.user.email }).select(
      "_id",
    );

    if (!buyer) {
      return notFound("Buyer");
    }

    const buyerId = buyer._id;

    // Fetch leads assigned to the buyer
    const leads = await Lead.find({
      assignedTo: { $elemMatch: { buyerId: buyerId } },
    });

    // Filter leads based on their status and buyer assignment
    const filteredLeads = leads.map((lead) => {
      const assignment = lead.assignedTo?.find(
        (a) => a.buyerId.toString() === buyerId.toString(),
      );
      const canRespond =
        !!assignment && !assignment.accepted && !assignment.rejected;
      const hasAccepted = !!assignment?.accepted;

      if (lead.status === "sold" || hasAccepted) {
        // If the lead is sold or accepted by this buyer, return all fields
        return {
          ...lead.toObject(),
          assignment,
          canRespond,
        };
      }

      // If the lead is not sold/accepted, filter out sensitive fields
      const filteredFields = lead.fields.filter(
        (field) => !/email|phone|address|postcode/i.test(field.label),
      );
      return {
        ...lead.toObject(),
        fields: filteredFields,
        assignment,
        canRespond,
      };
    });

    return NextResponse.json(
      { success: true, data: { leads: filteredLeads } },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return internalError("Internal server error");
  }
}
