import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailSegment } from "@/models/emailCampaign";
import { resolveSegmentRecipients } from "@/lib/emailSegmentResolver";
import {
  forbidden,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/email/recipients
 * Fetch lead buyers, leads, or both for recipient selection in email campaigns
 * Query params:
 *   source: "buyers" | "leads" | "both" (default: "both")
 *   segmentId: resolve a saved segment's filters instead of returning
 *              everything (source is ignored when segmentId is set — the
 *              segment's own saved source filter applies)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const segmentId = searchParams.get("segmentId");

    if (segmentId) {
      const segment = await EmailSegment.findById(segmentId);
      if (!segment) {
        return notFound("Segment");
      }
      if (segment.userId.toString() !== session.user.id) {
        return forbidden("Forbidden");
      }
      const recipients = await resolveSegmentRecipients(
        session.user.id,
        segment.filters,
      );
      const buyers = recipients.filter((r) => r.type === "buyer");
      const leads = recipients.filter((r) => r.type === "lead");
      return NextResponse.json({ buyers, leads }, { status: 200 });
    }

    const source = searchParams.get("source") || "both";
    const results = await (async () => {
      if (source === "leads") {
        return {
          buyers: [],
          leads: (
            await resolveSegmentRecipients(session.user.id, {
              source: "leads",
            })
          ).filter((r) => r.type === "lead"),
        };
      }
      if (source === "buyers") {
        return {
          buyers: (
            await resolveSegmentRecipients(session.user.id, {
              source: "buyers",
              buyerActiveOnly: true,
            })
          ).filter((r) => r.type === "buyer"),
          leads: [],
        };
      }
      const recipients = await resolveSegmentRecipients(session.user.id, {
        source: "both",
        buyerActiveOnly: true,
      });
      return {
        buyers: recipients.filter((r) => r.type === "buyer"),
        leads: recipients.filter((r) => r.type === "lead"),
      };
    })();

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error fetching recipients:", error);
    return internalError("Failed to fetch recipients");
  }
}
