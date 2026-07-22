import { NextRequest } from "next/server";
import { Lead } from "@/models/leads";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { withErrorHandler } from "@/lib/api/async-handler";
import {
  badRequest,
  forbidden,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";
import { mongoIdParamSchema } from "@/lib/validation/schemas";

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return unauthorized("Please log in to update this lead.");
  }

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("id");
  if (!leadId || !mongoIdParamSchema.safeParse(leadId).success) {
    return badRequest("A valid lead ID is required as a query parameter.");
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.exclusive !== "boolean") {
    return badRequest("`exclusive` must be a boolean.");
  }

  const lead = await Lead.findById(leadId);
  if (!lead) {
    return notFound("Lead", `No lead found with ID: ${leadId}`);
  }

  // A lead's Mongo _id is not secret to other authenticated accounts, so
  // without this check any logged-in user — not just the owning seller —
  // could flip another seller's lead exclusivity.
  if (lead.userId.toString() !== session.user.id && session.user.role !== "admin") {
    return forbidden("You do not have permission to update this lead.");
  }

  lead.exclusive = body.exclusive;
  await lead.save();

  return successResponse({
    message: `Lead exclusivity successfully updated to ${lead.exclusive}.`,
    exclusive: lead.exclusive,
  });
});
