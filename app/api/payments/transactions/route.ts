import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { Buyer } from "@/models/leadbuyers";
import { Transaction } from "@/models/transactions";
import { ZodError } from "zod";
import { withErrorHandler } from "@/lib/api/async-handler";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import {
  badRequest,
  forbidden,
  handleValidationError,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";
import {
  getTransactionsQuerySchema,
  mongoIdParamSchema,
} from "@/lib/validation/schemas";

import { isSellerRole } from "@/lib/roles";
// Fields the transactions list/detail UI actually renders — deliberately
// excludes internal payment-gateway identifiers (stripeAccountId,
// gatewayTransactionId, and the gateway-internal metadata sub-fields) that
// have no reason to be handed to the browser.
const TRANSACTION_LIST_PROJECTION =
  "type userId amount previousBalance currentBalance currency metadata.leadId metadata.unitsPurchased metadata.sellerId metadata.sellerName metadata.sellerEmail metadata.buyerName metadata.buyerEmail metadata.buyerId metadata.refund metadata.refundReason metadata.adminNote metadata.subscriptionPlan metadata.subscriptionDuration metadata.subscriptionYears metadata.tierName metadata.tierType metadata.userEmail metadata.payoutId metadata.tierRenewalDate paymentGateway status createdAt updatedAt";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return unauthorized("Authentication required");
  }

  const rateLimited = await checkSimpleRateLimit(req, {
    scope: "payments-transactions",
    limit: 60,
    windowMs: 60 * 1000,
    actorId: session.user.email,
  });
  if (rateLimited) return rateLimited;

  await dbConnect();

  const currentUser = await User.findOne({
    email: session.user.email,
  }).select("_id role");

  if (!currentUser) {
    return notFound("User");
  }

  const parsedQuery = getTransactionsQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsedQuery.success) {
    return badRequest(
      parsedQuery.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  }
  const { buyerId, page = 1, limit = 25, type, status } = parsedQuery.data;

  let userId: string | undefined;

  if (buyerId) {
    try {
      mongoIdParamSchema.parse(buyerId);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid buyerId");
    }

    if (currentUser.role === "buyer") {
      const buyer = await Buyer.findOne({ email: session.user.email }).select(
        "_id",
      );

      if (!buyer) {
        return notFound("Buyer");
      }

      if (String(buyer._id) !== buyerId) {
        return forbidden("You do not have access to these transactions");
      }
    } else if (isSellerRole(currentUser.role)) {
      const managedBuyer = await Buyer.findOne({
        _id: buyerId,
        registeredWith: currentUser._id,
      }).select("_id");

      if (!managedBuyer) {
        return forbidden("You do not have access to these transactions");
      }
    } else if (currentUser.role !== "admin") {
      return forbidden("Buyer transaction history is restricted");
    }

    userId = buyerId;
  } else {
    if (!isSellerRole(currentUser.role)) {
      return forbidden("Seller transaction history requires a seller account");
    }

    userId = String(currentUser._id);
  }

  // Previously fetched every transaction for this user unbounded — now
  // paginated server-side, with type/status filters applied to the query
  // rather than the full result set. .select() drops internal payment-gateway
  // identifiers the UI never renders; .lean() skips unnecessary document
  // hydration on a read-only list.
  const query: Record<string, unknown> = { userId };
  if (type) query.type = type;
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [total, transactions] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.find(query)
      .select(TRANSACTION_LIST_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return successResponse({
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});
