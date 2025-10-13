// import { NextRequest, NextResponse } from "next/server";
// import dbConnect from "@/lib/connectdb";
// import { Lead } from "@/models/leads";
// import { Buyer } from "@/models/leadbuyers";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/auth";
// import { Types } from "mongoose";

// export async function GET(req: NextRequest) {
//   try {
//     await dbConnect();

//     const session = await getServerSession(authOptions);

//     if (!session || session.user.role !== "buyer") {
//       return NextResponse.json(
//         { success: false, message: "Unauthorized" },
//         { status: 401 }
//       );
//     }

//     const buyer = await Buyer.findOne({ email: session.user.email }).select(
//       "_id"
//     );

//     if (!buyer) {
//       return NextResponse.json(
//         { success: false, message: "Buyer not found" },
//         { status: 404 }
//       );
//     }

//     const buyerId = buyer._id.toString();

//     // Extract query parameters
//     const { searchParams } = new URL(req.url);
//     const page = parseInt(searchParams.get("page") || "1");
//     const limit = parseInt(searchParams.get("limit") || "10");
//     const sort = searchParams.get("sort") || "newest";
//     const status = searchParams.get("status") || "available";

//     // Calculate skip value for pagination
//     const skip = (page - 1) * limit;

//     // Define sort criteria based on the sort parameter
//     let sortCriteria = {};
//     switch (sort) {
//       case "newest":
//         sortCriteria = { createdAt: -1 };
//         break;
//       case "oldest":
//         sortCriteria = { createdAt: 1 };
//         break;
//       case "price-high":
//         sortCriteria = { unit: -1 };
//         break;
//       case "price-low":
//         sortCriteria = { unit: 1 };
//         break;
//       default:
//         sortCriteria = { createdAt: -1 };
//     }

//     // Build the base query
//     const baseQuery: { [key: string]: any } = {
//       distributionMethod: "marketplace",
//       exclusive: false,
//     };

//     // Add status-specific conditions
//     if (status === "available") {
//       baseQuery.status = "available";
//       baseQuery.$expr = { $lt: ["$soldCount", "$shareNumber"] };
//     } else if (status === "sold") {
//       baseQuery.status = "sold";
//       baseQuery["soldTo.buyerId"] = new Types.ObjectId(buyerId);
//     }

//     // Fetch leads with pagination and sorting
//     const leads = await Lead.find(baseQuery)
//       .sort(sortCriteria)
//       .skip(skip)
//       .limit(limit)
//       .select("fields status unit shareNumber soldCount soldTo createdAt");

//     // Process the leads based on their status
//     const processedLeads = leads.map((lead) => {
//       if (lead.status === "sold") {
//         // For sold leads, include all fields
//         return {
//           ...lead.toObject(),
//           cost: lead.unit,
//         };
//       } else {
//         // For available leads, filter out sensitive fields
//         const filteredFields = lead.fields.filter(
//           (field) => !/email|phone|address|postcode/i.test(field.label)
//         );
//         return {
//           ...lead.toObject(),
//           fields: filteredFields,
//           cost: lead.unit,
//         };
//       }
//     });

//     // Get the total count of leads for pagination
//     const totalLeads = await Lead.countDocuments(baseQuery);

//     return NextResponse.json({
//       success: true,
//       data: processedLeads,
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
      "_id registeredWith"
    );

    if (!buyer) {
      return NextResponse.json(
        { success: false, message: "Buyer not found" },
        { status: 404 }
      );
    }

    if (!buyer.registeredWith) {
      return NextResponse.json(
        { success: false, message: "Buyer is not registered with any seller" },
        { status: 400 }
      );
    }

    const buyerId = buyer._id.toString();
    const sellerId = buyer.registeredWith.toString();

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

    // Build the base query - ADDED userId FILTER FOR THE SELLER
    const baseQuery: { [key: string]: any } = {
      distributionMethod: "marketplace",
      exclusive: false,
      userId: sellerId, // Only fetch leads belonging to the seller the buyer is registered with
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
