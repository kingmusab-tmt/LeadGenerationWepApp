import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { AuditLog } from "@/models/auditLog";
import { requireAdmin } from "@/lib/api/adminAuth";
import { internalError } from "@/lib/api/error-handler";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const actorEmail = searchParams.get("actorEmail");
    const limitParam = Number(searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 200)
      : 50;

    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (actorEmail) {
      filter.actorEmail = { $regex: actorEmail, $options: "i" };
    }

    const [entries, actions] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      AuditLog.distinct("action"),
    ]);

    return NextResponse.json({
      success: true,
      data: { entries, actions: actions.sort() },
    });
  } catch (err) {
    console.error("Failed to fetch audit log:", err);
    return internalError("Failed to fetch audit log");
  }
}
