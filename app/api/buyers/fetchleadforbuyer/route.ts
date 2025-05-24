// import { NextRequest, NextResponse } from "next/server";
// import dbConnect from "@/lib/connectdb";
// import { Lead } from "@/models/leads"; // Adjust the path based on your project structure
// import { Buyer } from "@/models/leadbuyers"; // Import the Buyer model
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/auth";
// import { Types } from "mongoose"; // Import Types from mongoose for ObjectId

// export async function GET(req: NextRequest) {
//   try {
//     await dbConnect(); // Ensure database connection

//     const session = await getServerSession(authOptions);

//     if (!session || session.user.role !== "buyer") {
//       // Check if the user is a buyer
//       return NextResponse.json(
//         { success: false, message: "Unauthorized" },
//         { status: 401 }
//       );
//     }

//     // Fetch the buyerId using the email from the session
//     const buyer = await Buyer.findOne({ email: session.user.email }).select(
//       "_id"
//     );

//     if (!buyer) {
//       return NextResponse.json(
//         { success: false, message: "Buyer not found" },
//         { status: 404 }
//       );
//     }

//     const buyerId = buyer._id.toString(); // Convert buyerId to string for comparison

//     // Extract query parameters
//     const { searchParams } = new URL(req.url);
//     const page = parseInt(searchParams.get("page") || "1"); // Default to page 1
//     const limit = parseInt(searchParams.get("limit") || "10"); // Default to 10 leads per page
//     const sort = searchParams.get("sort") || "newest"; // Default to "newest"

//     // Calculate skip value for pagination
//     const skip = (page - 1) * limit;

//     // Define sort order
//     const sortOrder = sort === "newest" ? -1 : 1;

//     // Fetch leads that meet the criteria
//     const leads = await Lead.find({
//       distributionMethod: "marketplace",
//       status: { $in: ["available", "sold"] }, // Fetch both available and sold leads
//       exclusive: false,
//       $or: [
//         { status: "available", $expr: { $lt: ["$soldCount", "$shareNumber"] } }, // For available leads, ensure soldCount < shareNumber
//         { status: "sold" }, // For sold leads, ignore the soldCount and shareNumber condition
//       ],
//     })
//       .sort({ createdAt: sortOrder }) // Sort by creation date
//       .skip(skip) // Skip leads for pagination
//       .limit(limit) // Limit the number of leads per page
//       .select("fields status unit shareNumber soldCount soldTo createdAt"); // Include createdAt for sorting

//     console.log("Fetched Leads:", leads);

//     // Filter leads based on the buyer's ID and lead status
//     const filteredLeads = leads
//       .map((lead) => {
//         if (lead.status === "sold") {
//           // If the lead is sold, only include it if the buyer is in the soldTo array
//           console.log(`This is the soldTo field:`, lead.soldTo);
//           console.log(`This is the actual buyerId: ${buyerId}`);

//           // Convert soldTo.buyerId to string for comparison
//           if (lead.soldTo.some((sold) => sold.buyerId.toString() === buyerId)) {
//             console.log("This lead is sold to this buyer");
//             // Return all fields (including contact information) for the buyer who purchased the lead
//             return {
//               ...lead.toObject(),
//               cost: lead.unit,
//             };
//           } else {
//             console.log("This lead is not sold to this buyer");
//             // Exclude sold leads for buyers who did not purchase them
//             return null;
//           }
//         } else {
//           // If the lead is available, filter out sensitive fields (email, phone, address, postcode)
//           const filteredFields = lead.fields.filter(
//             (field) => !/email|phone|address|postcode/i.test(field.label)
//           );
//           return {
//             ...lead.toObject(),
//             fields: filteredFields,
//             cost: lead.unit,
//           };
//         }
//       })
//       .filter((lead) => lead !== null); // Remove null entries (excluded sold leads)

//     console.log("Filtered Leads:", filteredLeads);

//     // Get the total count of leads for pagination
//     const totalLeads = await Lead.countDocuments({
//       distributionMethod: "marketplace",
//       status: { $in: ["available", "sold"] },
//       exclusive: false,
//       $or: [
//         { status: "available", $expr: { $lt: ["$soldCount", "$shareNumber"] } }, // For available leads, ensure soldCount < shareNumber
//         { status: "sold" }, // For sold leads, ignore the soldCount and shareNumber condition
//       ],
//     });

//     // Return the filtered leads with pagination metadata
//     return NextResponse.json({
//       success: true,
//       data: filteredLeads,
//       pagination: {
//         page,
//         limit,
//         total: totalLeads,
//         totalPages: Math.ceil(totalLeads / limit),
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching leads for buyer:", error);
//     return NextResponse.json(
//       { success: false, message: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Lead } from "@/models/leads";
import { Buyer } from "@/models/leadbuyers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "buyer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const buyer = await Buyer.findOne({ email: session.user.email }).select(
      "_id"
    );

    if (!buyer) {
      return NextResponse.json(
        { success: false, message: "Buyer not found" },
        { status: 404 }
      );
    }

    const buyerId = buyer._id.toString();

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sort = searchParams.get("sort") || "newest";
    const status = searchParams.get("status") || "available";

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Define sort criteria based on the sort parameter
    let sortCriteria = {};
    switch (sort) {
      case "newest":
        sortCriteria = { createdAt: -1 };
        break;
      case "oldest":
        sortCriteria = { createdAt: 1 };
        break;
      case "price-high":
        sortCriteria = { unit: -1 };
        break;
      case "price-low":
        sortCriteria = { unit: 1 };
        break;
      default:
        sortCriteria = { createdAt: -1 };
    }

    // Build the base query
    const baseQuery: { [key: string]: any } = {
      distributionMethod: "marketplace",
      exclusive: false,
    };

    // Add status-specific conditions
    if (status === "available") {
      baseQuery.status = "available";
      baseQuery.$expr = { $lt: ["$soldCount", "$shareNumber"] };
    } else if (status === "sold") {
      baseQuery.status = "sold";
      baseQuery["soldTo.buyerId"] = new Types.ObjectId(buyerId);
    }

    // Fetch leads with pagination and sorting
    const leads = await Lead.find(baseQuery)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .select("fields status unit shareNumber soldCount soldTo createdAt");

    // Process the leads based on their status
    const processedLeads = leads.map((lead) => {
      if (lead.status === "sold") {
        // For sold leads, include all fields
        return {
          ...lead.toObject(),
          cost: lead.unit,
        };
      } else {
        // For available leads, filter out sensitive fields
        const filteredFields = lead.fields.filter(
          (field) => !/email|phone|address|postcode/i.test(field.label)
        );
        return {
          ...lead.toObject(),
          fields: filteredFields,
          cost: lead.unit,
        };
      }
    });

    // Get the total count of leads for pagination
    const totalLeads = await Lead.countDocuments(baseQuery);

    return NextResponse.json({
      success: true,
      data: processedLeads,
      pagination: {
        page,
        limit,
        total: totalLeads,
        totalPages: Math.ceil(totalLeads / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching leads for buyer:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
