import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";
import { User } from "@/models/userModel";
import { sendBuyerEmail } from "@/lib/buyerEmail";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export async function POST(req: NextRequest) {
  try {
    // Authenticate the seller
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return unauthorized("Authentication required");
    }

    await connectDB();

    const seller = await User.findOne({ email: session.user.email });

    if (!seller || seller.role !== "seller") {
      return forbidden("Only sellers can perform this action");
    }

    // Parse request body
    const { buyerId, cashPaid, numberOfCredits, description } =
      await req.json();

    // Validate inputs
    if (!buyerId || !cashPaid || !numberOfCredits || !description) {
      return badRequest("All fields are required");
    }

    if (cashPaid <= 0 || numberOfCredits <= 0) {
      return badRequest("Cash paid and credits must be positive numbers");
    }

    // Find the buyer
    const buyer = await Buyer.findById(buyerId);

    if (!buyer) {
      return notFound("Buyer");
    }

    if (
      buyer.registeredWith &&
      String(buyer.registeredWith) !== String(seller._id)
    ) {
      return forbidden(
        "This buyer does not belong to the authenticated seller",
      );
    }

    // Get current wallet balance before update
    const previousBalance = buyer.walletUnit || 0;

    // Update buyer's wallet units
    buyer.walletUnit = previousBalance + numberOfCredits;
    await buyer.save();

    const currentBalance = buyer.walletUnit;

    // Create transaction record for the buyer
    const buyerTransaction = new Transaction({
      type: "units_purchase",
      userId: buyer._id,
      amount: cashPaid,
      currency: "usd",
      previousBalance: previousBalance,
      currentBalance: currentBalance,
      paymentGateway: "manual",
      status: "completed",
      metadata: {
        unitsPurchased: numberOfCredits,
        sellerId: seller._id,
        sellerName: seller.name || "Unknown",
        sellerEmail: seller.email || "N/A",
        buyerId: buyer._id,
        buyerName: buyer.name || "Unknown",
        buyerEmail: buyer.email || "N/A",
        refund: false,
        adminNote: `Manual credit by seller: ${description}`,
        transferVerified: true,
        transferAmount: cashPaid,
      },
    });

    await buyerTransaction.save();

    const sellerPreviousBalance = seller.walletBalance || 0;
    const sellerCurrentBalance = sellerPreviousBalance + cashPaid;

    // Create a transaction record for the seller (income)
    const sellerTransaction = new Transaction({
      type: "seller_income",
      userId: seller._id,
      amount: cashPaid,
      currency: "usd",
      previousBalance: sellerPreviousBalance,
      currentBalance: sellerCurrentBalance,
      paymentGateway: "manual",
      status: "completed",
      metadata: {
        unitsPurchased: numberOfCredits,
        buyerId: buyer._id,
        buyerName: buyer.name || "Unknown",
        buyerEmail: buyer.email || "N/A",
        sellerId: seller._id,
        sellerName: seller.name || "Unknown",
        sellerEmail: seller.email || "N/A",
        refund: false,
        adminNote: `Manual credit to buyer ${buyer.name}: ${description}`,
        transferVerified: true,
        transferAmount: cashPaid,
      },
    });

    await sellerTransaction.save();

    // Update seller wallet balance without re-validating unrelated profile fields.
    await User.updateOne(
      { _id: seller._id },
      { $set: { walletBalance: sellerCurrentBalance } },
    );

    // Send email directly to the credited buyer using the same formatted buyer email template.
    try {
      const signInUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/sign-in`;

      await sendBuyerEmail({
        variant: "credit",
        buyerEmail: buyer.email,
        buyerName: buyer.name,
        buyerCompany: buyer.company || "Your Company",
        buyerPhone: buyer.phone || "",
        sellerName: seller.name || "Your Seller",
        sellerCompany: seller.businessName || "Lead Seller",
        signInUrl,
        creditedUnits: numberOfCredits,
        currentBalance,
      });
    } catch (emailError) {
      console.error("Failed to send manual credit email:", emailError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Credits successfully added to buyer's account",
        data: {
          buyerId: buyer._id,
          buyerName: buyer.name,
          creditedUnits: numberOfCredits,
          cashPaid: cashPaid,
          newBalance: currentBalance,
          transactionId: buyerTransaction._id,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing manual credit:", error);
    return internalError(
      error instanceof Error
        ? `Internal server error: ${error.message}`
        : "Internal server error",
    );
  }
}
