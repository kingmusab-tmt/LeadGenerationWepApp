// import dbConnect from "@/lib/connectdb";
// import { User } from "@/models/user";
// import { NextRequest, NextResponse } from "next/server";

// export async function POST(req: NextRequest) {
//   try {
//     await dbConnect();

//     // Parse the request body
//     const {
//       sellerId,
//       phoneNumber,
//       industry,
//       forwardingType,
//       method,
//       recordCall,
//       reconnectCaller,
//       passCallerId,
//       leadSource,
//       welcomeMessage,
//       callWhisper,
//       requireResponse,
//       forwardingNumbers,
//       leadBuyers,
//     } = await req.json();

//     // Find the seller
//     const seller = await User.findById(sellerId);
//     if (!seller) {
//       return new NextResponse(JSON.stringify({ error: "Seller not found" }), {
//         status: 404,
//       });
//     }

//     // Find the tracking number
//     const number = seller.trackingNumbers.find(
//       (num) => num.phoneNumber === phoneNumber
//     );
//     if (!number) {
//       return new NextResponse(JSON.stringify({ error: "Number not found" }), {
//         status: 404,
//       });
//     }

//     // Update the tracking number fields
//     number.industry = industry || number.industry;
//     number.forwardingType = forwardingType;
//     number.method = method || number.method;
//     number.recordCall = recordCall || false;
//     number.reconnectCaller = reconnectCaller || false;
//     number.passCallerId = passCallerId || false;
//     number.leadSource = leadSource || "";
//     number.welcomeMessage = welcomeMessage || "";
//     number.callWhisper = callWhisper || "";
//     number.requireResponse = requireResponse || false;

//     // Update forwarding numbers (if applicable)
//     if (forwardingType === "single_multiple" && forwardingNumbers) {
//       number.forwardingNumbers = forwardingNumbers;
//     } else {
//       number.forwardingNumbers = undefined; // Clear if not applicable
//     }

//     // Update lead buyers (if applicable)
//     if (forwardingType === "specific_lead" && leadBuyers) {
//       number.leadBuyers = leadBuyers.map((buyer: { id: any; name: any }) => ({
//         id: buyer.id,
//         name: buyer.name,
//       }));
//     } else {
//       number.leadBuyers = undefined; // Clear if not applicable
//     }

//     // Save the updated seller document
//     await seller.save();

//     return new NextResponse(
//       JSON.stringify({
//         success: true,
//         message: "Forwarding updated successfully",
//       }),
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error updating forwarding:", error);
//     return new NextResponse(
//       JSON.stringify({ error: "Failed to update forwarding" }),
//       { status: 500 }
//     );
//   }
// }
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/user";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Parse the request body with new fields
    const {
      sellerId,
      phoneNumber,
      industry,
      forwardingType,
      method,
      recordCall,
      reconnectCaller,
      passCallerId,
      leadSource,
      welcomeMessage,
      callWhisper,
      requireResponse,
      buyerResponses,
      leadResponses,
      forwardingNumbers,
      leadBuyers,
    } = await req.json();

    // Find the seller
    const seller = await User.findById(sellerId);
    if (!seller) {
      return new NextResponse(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
      });
    }

    // Find the tracking number
    const number = seller.trackingNumbers.find(
      (num: any) => num.phoneNumber === phoneNumber
    );
    if (!number) {
      return new NextResponse(JSON.stringify({ error: "Number not found" }), {
        status: 404,
      });
    }

    // Update the tracking number fields
    number.industry = industry || number.industry;
    number.forwardingType = forwardingType;
    number.method = method || number.method;
    number.recordCall = recordCall || false;
    number.reconnectCaller = reconnectCaller || false;
    number.passCallerId = passCallerId || false;
    number.leadSource = leadSource || "";
    number.welcomeMessage = welcomeMessage || "";
    number.callWhisper = callWhisper || "";
    number.requireResponse = requireResponse || false;

    // Handle response verification settings
    if (requireResponse) {
      // Validate and set buyer responses
      if (buyerResponses && Array.isArray(buyerResponses)) {
        number.buyerResponses = buyerResponses
          .filter((res: any) => res.message && res.digit)
          .map((res: any) => ({
            message: res.message.trim(),
            digit: res.digit.trim(),
          }));
      } else {
        number.buyerResponses = undefined;
      }

      // Validate and set lead responses
      if (leadResponses && Array.isArray(leadResponses)) {
        number.leadResponses = leadResponses
          .filter((res: any) => res.message && res.digit)
          .map((res: any) => ({
            message: res.message.trim(),
            digit: res.digit.trim(),
          }));
      } else {
        number.leadResponses = undefined;
      }
    } else {
      // Clear responses if verification is disabled
      number.buyerResponses = undefined;
      number.leadResponses = undefined;
    }

    // Update forwarding numbers (if applicable)
    if (forwardingType === "single_multiple" && forwardingNumbers) {
      number.forwardingNumbers = forwardingNumbers
        .filter((num: string) => num.trim())
        .map((num: string) => num.trim());
    } else {
      number.forwardingNumbers = undefined;
    }

    // Update lead buyers (if applicable)
    if (forwardingType === "specific_lead" && leadBuyers) {
      number.leadBuyers = leadBuyers
        .filter((buyer: any) => buyer.id && buyer.name)
        .map((buyer: any) => ({
          id: buyer.id,
          name: buyer.name,
          phone: buyer.phone || "", // Include phone if available
        }));
    } else {
      number.leadBuyers = undefined;
    }

    // Save the updated seller document
    await seller.save();

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Forwarding settings updated successfully",
        data: {
          phoneNumber,
          requireResponse,
          hasBuyerResponses: (number.buyerResponses ?? []).length > 0,
          hasLeadResponses: (number.leadResponses ?? []).length > 0,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating forwarding:", error);
    return new NextResponse(
      JSON.stringify({
        error: "Failed to update forwarding",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
