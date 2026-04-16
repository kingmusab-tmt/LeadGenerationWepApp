import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { Transaction } from "@/models/transactions";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { internalError } from "@/lib/api/error-handler";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    // Get transactions with optional population
    const transactions = await Transaction.find()
      .populate<{
        userId: { _id: mongoose.Types.ObjectId; name: string } | null;
      }>("userId", "name", User)
      .sort({ createdAt: -1 })
      .lean();

    // Safely format transactions with null checks
    const formattedTransactions = transactions.map((txn) => {
      const baseTransaction = {
        id: txn._id.toString(),
        type: txn.type,
        amount: txn.amount,
        status: txn.status,
        createdAt: txn.createdAt.toISOString(),
        gateway: txn.paymentGateway,
        metadata: txn.metadata,
      };

      // Handle cases where userId might be null/undefined
      if (txn.userId && txn.userId._id) {
        return {
          ...baseTransaction,
          userId: txn.userId._id.toString(),
          userName: txn.userId.name || "Unknown User",
        };
      } else {
        return {
          ...baseTransaction,
          userId: null,
          userName: "Unknown User",
        };
      }
    });

    return NextResponse.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return internalError("Failed to fetch transactions");
  }
}
