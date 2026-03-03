import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";
import { User } from "@/models/userModel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { sendNotification } from "@/lib/notificationService";

export async function POST(req: NextRequest) {
  try {
    // Authenticate the seller
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    const seller = await User.findOne({ email: session.user.email });

    if (!seller || seller.role !== "seller") {
      return NextResponse.json(
        { success: false, message: "Only sellers can perform this action" },
        { status: 403 },
      );
    }

    // Parse request body
    const { buyerId, cashPaid, numberOfCredits, description } =
      await req.json();

    // Validate inputs
    if (!buyerId || !cashPaid || !numberOfCredits || !description) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 },
      );
    }

    if (cashPaid <= 0 || numberOfCredits <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cash paid and credits must be positive numbers",
        },
        { status: 400 },
      );
    }

    // Find the buyer
    const buyer = await Buyer.findById(buyerId);

    if (!buyer) {
      return NextResponse.json(
        { success: false, message: "Buyer not found" },
        { status: 404 },
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

    // Create a transaction record for the seller (income)
    const sellerTransaction = new Transaction({
      type: "seller_income",
      userId: seller._id,
      amount: cashPaid,
      currency: "usd",
      previousBalance: seller.walletBalance || 0,
      currentBalance: (seller.walletBalance || 0) + cashPaid,
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

    // Update seller's wallet balance
    seller.walletBalance = (seller.walletBalance || 0) + cashPaid;
    await seller.save();

    // Get buyer's user account for notification
    const buyerUser = await User.findById(buyer.registeredWith);

    // Send notification to the buyer
    if (buyerUser) {
      await sendNotification({
        userId: (buyerUser._id as any).toString(),
        title: "Wallet Credited",
        message: `Your wallet has been credited with ${numberOfCredits} units. ${description}`,
        type: "info",
        metadata: {
          amount: cashPaid,
          units: numberOfCredits,
          transactionId: buyerTransaction._id.toString(),
          sellerId: (seller._id as any).toString(),
          sellerName: seller.name,
        },
      });
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
  } catch (error: any) {
    console.error("Error processing manual credit:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
