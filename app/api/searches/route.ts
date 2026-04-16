import { NextRequest } from "next/server";
import { Lead } from "@/models/leads";
import dbConnect from "@/lib/connectdb";
import { withAuth } from "@/lib/api/async-handler";
import {
  ApiError,
  ErrorCode,
  badRequest,
  notFound,
  successResponse,
} from "@/lib/api/error-handler";
async function setFavoriteStatus(
  userId: string,
  leadId: string,
  isFavorite: boolean,
) {
  const updatedLead = await Lead.findOneAndUpdate(
    {
      $or: [
        { _id: leadId, userId },
        { leadId, sellerId: userId },
      ],
    },
    { isFavorite },
    { new: true, strict: false },
  );

  if (!updatedLead) {
    return notFound("Lead", "Lead not found.");
  }

  return successResponse(
    {
      message: isFavorite
        ? "Lead marked as favorite."
        : "Lead removed from favorites.",
      lead: updatedLead,
    },
    200,
  );
}

export const POST = withAuth(async (req: NextRequest, session) => {
  await dbConnect();

  const userId = session.user.id;
  if (!userId) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { leadId } = await req.json();
  if (!leadId) {
    return badRequest("leadId is required.");
  }

  return setFavoriteStatus(userId, leadId, true);
});

export const DELETE = withAuth(async (req: NextRequest, session) => {
  await dbConnect();

  const userId = session.user.id;
  if (!userId) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const { leadId } = await req.json();
  if (!leadId) {
    return badRequest("leadId is required.");
  }

  return setFavoriteStatus(userId, leadId, false);
});

export const GET = withAuth(async (req: NextRequest, session) => {
  await dbConnect();

  const userId = session.user.id;
  if (!userId) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const favoriteLeads = await Lead.find({ userId, isFavorite: true }, null, {
    strict: false,
  });

  return successResponse({ leads: favoriteLeads }, 200);
});
