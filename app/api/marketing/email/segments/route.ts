// GET /api/marketing/email/segments - List the seller's saved segments
// POST /api/marketing/email/segments - Create a new segment
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailSegment } from "@/models/emailCampaign";
import { createEmailSegmentSchema } from "@/lib/validation/schemas";
import { resolveSegmentRecipients } from "@/lib/emailSegmentResolver";
import {
  successResponse,
  unauthorized,
  internalError,
  badRequest,
  handleValidationError,
} from "@/lib/api/error-handler";
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized();
    }

    await dbConnect();

    const segments = await EmailSegment.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    // Recompute live counts rather than trusting a possibly-stale stored
    // value — a segment should always reflect the seller's current
    // leads/buyers, not whatever matched when it was created.
    const withCounts = await Promise.all(
      segments.map(async (segment) => {
        const recipients = await resolveSegmentRecipients(
          session.user.id,
          segment.filters,
        );
        return { ...segment, recipientCount: recipients.length };
      }),
    );

    return successResponse({ segments: withCounts });
  } catch (error) {
    console.error("[GET /api/marketing/email/segments]", error);
    return internalError("Failed to fetch segments");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized();
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "email-segments-create",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

    let validatedData;
    try {
      const body = await req.json();
      validatedData = await createEmailSegmentSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid request body");
    }

    await dbConnect();

    const recipients = await resolveSegmentRecipients(
      session.user.id,
      validatedData.filters,
    );

    const segment = await EmailSegment.create({
      userId: session.user.id,
      name: validatedData.name,
      description: validatedData.description,
      filters: validatedData.filters,
      recipientCount: recipients.length,
    });

    return successResponse({ segment }, 201);
  } catch (error: unknown) {
    console.error("[POST /api/marketing/email/segments]", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return badRequest("You already have a segment with this name");
    }
    return internalError("Failed to create segment");
  }
}
