import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/connectdb";
import { Buyer } from "@/models/leadbuyers";
import { Transaction, ITransaction } from "@/models/transactions";
import { User } from "@/models/userModel";
import { IdempotencyKey } from "@/models/idempotencyKey";
import { sendBuyerEmail } from "@/lib/buyerEmail";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { recordAuditLog } from "@/lib/auditLog";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import { manualCreditSchema } from "@/lib/validation/schemas";
import { withErrorHandler } from "@/lib/api/async-handler";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";

const IDEMPOTENCY_SCOPE = "sellers:manual-credit";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isMongoDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorized("Authentication required");
  }
  if (session.user.role !== "seller") {
    return forbidden("Only sellers can perform this action");
  }

  const rateLimited = await checkSimpleRateLimit(req, {
    scope: IDEMPOTENCY_SCOPE,
    limit: 15,
    windowMs: 10 * 60 * 1000,
    actorId: session.user.id,
  });
  if (rateLimited) return rateLimited;

  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (!idempotencyKey || !UUID_PATTERN.test(idempotencyKey)) {
    return badRequest("A valid Idempotency-Key header (UUID) is required");
  }

  await connectDB();

  const body = await req.json();
  const parsed = manualCreditSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  }
  const { buyerId, cashPaid, numberOfCredits, description } = parsed.data;

  const seller = await User.findById(session.user.id);
  if (!seller || seller.role !== "seller") {
    return forbidden("Only sellers can perform this action");
  }

  // The insert IS the atomic claim — a unique index on (key, scope) means
  // at most one request with this key can ever create this document, no
  // matter how many arrive concurrently (double-click, a client retry
  // racing the original, etc.).
  try {
    await IdempotencyKey.create({
      key: idempotencyKey,
      scope: IDEMPOTENCY_SCOPE,
      actorId: seller._id,
      status: "processing",
    });
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      const existing = await IdempotencyKey.findOne({
        key: idempotencyKey,
        scope: IDEMPOTENCY_SCOPE,
      }).lean();
      if (existing?.status === "completed") {
        // Same request, already processed — return the original result
        // instead of crediting the buyer a second time.
        return successResponse(existing.responseBody);
      }
      return conflict(
        "A request with this idempotency key is already being processed. Please wait and try again.",
      );
    }
    throw error;
  }

  // From here on, any early return or thrown error must release the claim
  // above — otherwise a legitimate retry (e.g. after a transient DB error)
  // would be locked out for the full 24h TTL instead of being able to
  // proceed immediately.
  try {
    const buyer = await Buyer.findById(buyerId);
    if (!buyer) {
      await IdempotencyKey.deleteOne({
        key: idempotencyKey,
        scope: IDEMPOTENCY_SCOPE,
      });
      return notFound("Buyer");
    }

    // Ownership is required unconditionally — a buyer with no registeredWith
    // (an independent buyer) is not creditable by any seller, only one that
    // mismatches a DIFFERENT seller was ever rejected before, which let any
    // seller credit an independent buyer's wallet and fabricate matching
    // "seller income" for cash they may never have collected.
    if (String(buyer.registeredWith) !== String(seller._id)) {
      await IdempotencyKey.deleteOne({
        key: idempotencyKey,
        scope: IDEMPOTENCY_SCOPE,
      });
      return forbidden(
        "This buyer does not belong to the authenticated seller",
      );
    }

    const previousBalance = buyer.walletUnit || 0;
    const currentBalance = previousBalance + numberOfCredits;
    const sellerPreviousBalance = seller.walletBalance || 0;
    const sellerCurrentBalance = sellerPreviousBalance + cashPaid;

    // The buyer's wallet, both transaction records, and the seller's wallet
    // balance are one logical operation — wrapped in a session so a mid-flight
    // failure can't leave a credited wallet with no matching transaction
    // record (or vice versa), matching the pattern already used for
    // wallet-affecting writes in lib/autoAcceptPurchaseService.ts.
    const dbSession = await mongoose.startSession();
    let buyerTransaction: ITransaction | undefined;
    try {
      await dbSession.withTransaction(async () => {
        buyer.walletUnit = currentBalance;
        await buyer.save({ session: dbSession });

        const [createdBuyerTransaction] = await Transaction.create(
          [
            {
              type: "units_purchase",
              userId: buyer._id,
              amount: cashPaid,
              currency: "usd",
              previousBalance,
              currentBalance,
              paymentGateway: "manual",
              status: "completed",
              metadata: {
                unitsPurchased: numberOfCredits,
                sellerId: seller._id,
                sellerName: seller.name || "Unknown",
                sellerEmail: seller.email || "N/A",
                buyerId: buyer._id,
                buyerName: buyer.name || "Unknown",
                buyerEmail: buyer.email || "N/A",
                refund: false,
                adminNote: `Manual credit by seller: ${description}`,
                transferVerified: true,
                transferAmount: cashPaid,
              },
            },
          ],
          { session: dbSession },
        );
        buyerTransaction = createdBuyerTransaction;

        await Transaction.create(
          [
            {
              type: "seller_income",
              userId: seller._id,
              amount: cashPaid,
              currency: "usd",
              previousBalance: sellerPreviousBalance,
              currentBalance: sellerCurrentBalance,
              paymentGateway: "manual",
              status: "completed",
              metadata: {
                unitsPurchased: numberOfCredits,
                buyerId: buyer._id,
                buyerName: buyer.name || "Unknown",
                buyerEmail: buyer.email || "N/A",
                sellerId: seller._id,
                sellerName: seller.name || "Unknown",
                sellerEmail: seller.email || "N/A",
                refund: false,
                adminNote: `Manual credit to buyer ${buyer.name}: ${description}`,
                transferVerified: true,
                transferAmount: cashPaid,
              },
            },
          ],
          { session: dbSession },
        );

        await User.updateOne(
          { _id: seller._id },
          { $set: { walletBalance: sellerCurrentBalance } },
          { session: dbSession },
        );
      });
    } finally {
      await dbSession.endSession();
    }

    await recordAuditLog({
      actor: { email: session.user.email, role: session.user.role },
      action: "buyer.manualCredit",
      targetType: "Buyer",
      targetId: String(buyer._id),
      summary: `Manually credited ${numberOfCredits} unit(s) to "${buyer.name}" for $${cashPaid}`,
      metadata: { cashPaid, numberOfCredits, description },
      req,
    });

    // Best-effort notification — a failed send doesn't undo the credit, but
    // the outcome is reported back so the seller knows whether to follow up
    // with the buyer directly.
    let emailSent = true;
    try {
      const signInUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/sign-in`;

      await sendBuyerEmail({
        variant: "credit",
        buyerEmail: buyer.email,
        buyerName: buyer.name,
        buyerCompany: buyer.company || "Your Company",
        buyerPhone: buyer.phone || "",
        sellerName: seller.name || "Your Seller",
        sellerCompany: seller.businessName || "Lead Seller",
        signInUrl,
        creditedUnits: numberOfCredits,
        currentBalance,
      });
    } catch (emailError) {
      console.error("Failed to send manual credit email:", emailError);
      emailSent = false;
    }

    const responseBody = {
      buyerId: String(buyer._id),
      buyerName: buyer.name,
      creditedUnits: numberOfCredits,
      cashPaid,
      newBalance: currentBalance,
      transactionId: buyerTransaction?._id
        ? String(buyerTransaction._id)
        : undefined,
      emailSent,
    };

    await IdempotencyKey.updateOne(
      { key: idempotencyKey, scope: IDEMPOTENCY_SCOPE },
      { $set: { status: "completed", responseBody } },
    );

    return successResponse(responseBody);
  } catch (error) {
    await IdempotencyKey.deleteOne({
      key: idempotencyKey,
      scope: IDEMPOTENCY_SCOPE,
    }).catch(() => {});
    throw error;
  }
});
