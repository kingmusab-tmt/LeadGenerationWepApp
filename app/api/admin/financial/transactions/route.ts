import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Transaction } from "@/models/transactions";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { requireAdmin } from "@/lib/api/adminAuth";
import { internalError } from "@/lib/api/error-handler";

// Unbounded before this — fetching every transaction ever created on
// every page load risked OOM/timeout as the collection grows. Defaults to
// a bounded recent window (matching today's frontend, which reads
// `transactions` as a plain array); pass ?page=&limit= for real pagination.
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || "", 10) || DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find()
        .populate<{
          userId: { _id: mongoose.Types.ObjectId; name: string } | null;
        }>("userId", "name", User)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(),
    ]);

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

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return internalError("Failed to fetch transactions");
  }
}
