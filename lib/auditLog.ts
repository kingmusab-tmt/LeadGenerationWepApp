import { AuditLog } from "@/models/auditLog";
import dbConnect from "@/lib/connectdb";

export type AuditActor = {
  _id?: unknown;
  id?: unknown;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

/**
 * Records an admin/sensitive action for later review. Best-effort and
 * non-blocking by design: a logging failure must never fail the underlying
 * action (a refund/tier update should still succeed even if the audit
 * write hiccups), so this only logs the failure and swallows it.
 */
export async function recordAuditLog({
  actor,
  action,
  targetType,
  targetId,
  summary,
  metadata,
  req,
}: {
  actor: AuditActor;
  action: string;
  targetType: string;
  targetId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  try {
    await dbConnect();

    const ip =
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req?.headers.get("x-real-ip") ||
      undefined;

    await AuditLog.create({
      actorId: actor._id ?? actor.id,
      actorEmail: actor.email || "unknown",
      actorName: actor.name || undefined,
      actorRole: actor.role || undefined,
      action,
      targetType,
      targetId,
      summary,
      metadata: metadata || {},
      ip,
    });
  } catch (error) {
    console.error("[auditLog] Failed to record audit entry:", error);
  }
}
