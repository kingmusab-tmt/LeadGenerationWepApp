import { successResponse, internalError } from "@/lib/api/error-handler";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";

// function isMongoConnectivityError(error: unknown): boolean {
//   if (!(error instanceof Error)) {
//     return false;
//   }

//   const errorMessage = error.message.toLowerCase();
//   const errorCode =
//     "code" in error && typeof error.code === "string"
//       ? error.code.toLowerCase()
//       : "";

//   return (
//     errorMessage.includes("querysrv") ||
//     errorMessage.includes("mongoserverselectionerror") ||
//     errorCode === "econnrefused" ||
//     errorCode === "enotfound"
//   );
// }

export async function GET() {
  try {
    await dbConnect();
    const tiers = await Tier.find({ isActive: true }).sort({ order: 1 });
    return successResponse({ tiers });
  } catch (error) {
    console.error("Error fetching pricing tiers:", error);

    return internalError("Failed to fetch pricing tiers");
  }
}
