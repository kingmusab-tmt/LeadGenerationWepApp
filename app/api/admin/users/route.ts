import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";
import { requireAdmin, escapeRegex } from "@/lib/api/adminAuth";

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
    const conditions: any = {};

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
    let buyers: any[] = [];
    if (role === "all" || role === "buyer") {
      const buyerConditions: any = {};
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
        .select("name email status createdAt lastLogin")
        .sort({ createdAt: -1 })
        .lean();
    }

    // Combine results
    const combinedUsers = [
      ...users.map((u) => ({ ...u, id: u._id.toString(), _id: undefined })),
      ...buyers.map((b) => ({
        ...b,
        id: b._id.toString(),
        _id: undefined,
        role: "buyer",
        verified: undefined,
        image: undefined,
      })),
    ];

    return NextResponse.json({ users: combinedUsers });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
