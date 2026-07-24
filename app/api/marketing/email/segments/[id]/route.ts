// PUT /api/marketing/email/segments/[id] - Update a segment
// DELETE /api/marketing/email/segments/[id] - Delete a segment
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { EmailSegment } from "@/models/emailCampaign";
import { updateEmailSegmentSchema } from "@/lib/validation/schemas";
import { resolveSegmentRecipients } from "@/lib/emailSegmentResolver";
import {
  forbidden,
  internalError,
  notFound,
  unauthorized,
  badRequest,
  handleValidationError,
} from "@/lib/api/error-handler";
import { requireCsrf } from "@/lib/security/requireCsrf";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "email-segments-update",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

    await dbConnect();

    const segment = await EmailSegment.findById(id);
    if (!segment) {
      return notFound("Segment");
    }
    if (segment.userId.toString() !== session.user.id) {
      return forbidden("Forbidden");
    }

    let validatedData;
    try {
      const body = await req.json();
      validatedData = await updateEmailSegmentSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid request body");
    }

    if (validatedData.name) segment.name = validatedData.name;
    if (validatedData.description !== undefined)
      segment.description = validatedData.description;
    if (validatedData.filters) segment.filters = validatedData.filters;

    const recipients = await resolveSegmentRecipients(
      session.user.id,
      segment.filters,
    );
    segment.recipientCount = recipients.length;

    await segment.save();

    return NextResponse.json({ segment }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error updating segment:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return badRequest("You already have a segment with this name");
    }
    return internalError("Failed to update segment");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    const csrfError = requireCsrf(req, session.user.email);
    if (csrfError) return csrfError;

    const rateLimited = await checkSimpleRateLimit(req, {
      scope: "email-segments-delete",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      actorId: session.user.id,
    });
    if (rateLimited) return rateLimited;

    await dbConnect();

    const segment = await EmailSegment.findById(id);
    if (!segment) {
      return notFound("Segment");
    }
    if (segment.userId.toString() !== session.user.id) {
      return forbidden("Forbidden");
    }

    await EmailSegment.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Segment deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting segment:", error);
    return internalError("Failed to delete segment");
  }
}
