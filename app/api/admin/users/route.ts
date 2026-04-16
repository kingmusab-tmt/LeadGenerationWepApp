import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";
import { requireAdmin, escapeRegex } from "@/lib/api/adminAuth";
import { internalError } from "@/lib/api/error-handler";

const toIsoDateOrNull = (value: unknown): string | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "all";
    const status = searchParams.get("status") || "all";

    // Base query conditions
    const conditions: Record<string, unknown> = {};

    if (search) {
      conditions.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    if (role !== "all") {
      conditions.role = role;
    }

    if (status !== "all") {
      conditions.status = status;
    }

    // Fetch users with conditions
    const users = await User.find(conditions)
      .select("name email role status image createdAt lastLogin verified")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch buyers separately if needed
    let buyers: Array<Record<string, unknown>> = [];
    if (role === "all" || role === "buyer") {
      const buyerConditions: Record<string, unknown> = {};
      if (search) {
        buyerConditions.$or = [
          { name: { $regex: escapeRegex(search), $options: "i" } },
          { email: { $regex: escapeRegex(search), $options: "i" } },
        ];
      }
      if (status !== "all") {
        buyerConditions.status = status;
      }

      buyers = await Buyer.find(buyerConditions)
        .select("name email status")
        .sort({ createdAt: -1 })
        .lean();
    }

    const normalizedUserDateByEmail = new Map<
      string,
      { createdAt: string | null; lastLogin: string | null }
    >();

    users.forEach((userDoc) => {
      const email =
        typeof userDoc.email === "string" ? userDoc.email.toLowerCase() : "";
      if (!email) return;
      normalizedUserDateByEmail.set(email, {
        createdAt: toIsoDateOrNull(userDoc.createdAt),
        lastLogin: toIsoDateOrNull(userDoc.lastLogin),
      });
    });

    const buyerEmailsMissingDates = buyers
      .map((buyerDoc) =>
        typeof buyerDoc.email === "string" ? buyerDoc.email.toLowerCase() : "",
      )
      .filter(
        (email): email is string =>
          Boolean(email) && !normalizedUserDateByEmail.has(email),
      );

    if (buyerEmailsMissingDates.length > 0) {
      const userDateRecords = await User.find({
        email: { $in: buyerEmailsMissingDates },
      })
        .select("email createdAt lastLogin")
        .lean();

      userDateRecords.forEach((userDoc) => {
        const email =
          typeof userDoc.email === "string" ? userDoc.email.toLowerCase() : "";
        if (!email) return;
        normalizedUserDateByEmail.set(email, {
          createdAt: toIsoDateOrNull(userDoc.createdAt),
          lastLogin: toIsoDateOrNull(userDoc.lastLogin),
        });
      });
    }

    // Combine results
    const combinedUsers = [
      ...users.map((u) => ({
        ...u,
        id: u._id.toString(),
        _id: undefined,
        createdAt: toIsoDateOrNull(u.createdAt),
        lastLogin: toIsoDateOrNull(u.lastLogin),
      })),
      ...buyers.map((b) => {
        const userDates = normalizedUserDateByEmail.get(
          typeof b.email === "string" ? b.email.toLowerCase() : "",
        );

        return {
          ...b,
          id: String(b._id),
          _id: undefined,
          role: "buyer",
          verified: undefined,
          image: undefined,
          createdAt: userDates?.createdAt ?? null,
          lastLogin: userDates?.lastLogin ?? null,
        };
      }),
    ];

    return NextResponse.json({ users: combinedUsers });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return internalError("Failed to fetch users");
  }
}
