import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/connectdb";
import { Buyer, IBuyer } from "@/models/leadbuyers";
import { User } from "@/models";
import { authOptions } from "@/auth";
import mongoose from "mongoose";
import { sendBuyerEmail } from "@/lib/buyerEmail";
import { recordAuditLog } from "@/lib/auditLog";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import {
  createBuyerSchema,
  updateBuyerSchema,
  getBuyersQuerySchema,
} from "@/lib/validation/schemas";
import { withErrorHandler } from "@/lib/api/async-handler";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";

export const GET = withErrorHandler(async (req: NextRequest) => {
  await dbConnect();

  // "business-admin" was previously allowed here too, but there is no data
  // model linking a business-admin/staff account to a parent seller — the
  // query below is scoped to session.user.id, which for a business-admin
  // account has no buyers registered against it at all. That made this a
  // non-functional branch that looked like a working sub-account feature
  // but never actually returned anything. Revisit once a real
  // parent-seller association exists.
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "seller") {
    return unauthorized("Authentication required");
  }

  const parsedQuery = getBuyersQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsedQuery.success) {
    return badRequest(
      parsedQuery.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  }
  const { buyerId, page = 1, limit = 20, status, search } = parsedQuery.data;

  if (buyerId) {
    if (!mongoose.Types.ObjectId.isValid(buyerId)) {
      return badRequest("Invalid buyer ID");
    }

    const buyer = await Buyer.findOne({
      _id: buyerId,
      registeredWith: session.user.id,
    });

    if (!buyer) {
      return notFound("Buyer");
    }

    return successResponse(buyer);
  }

  // Previously this fetched every buyer for the seller unbounded — fine at
  // small scale, but a seller with hundreds/thousands of buyers would pull
  // the entire collection on every page load. Now paginated server-side,
  // with search/status applied to the query rather than the full result set.
  const query: mongoose.FilterQuery<IBuyer> = {
    registeredWith: session.user.id,
  };
  if (status) query.status = status;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ name: regex }, { email: regex }, { company: regex }];
  }

  const skip = (page - 1) * limit;
  const [total, buyers, statusCounts] = await Promise.all([
    Buyer.countDocuments(query),
    Buyer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    // Unfiltered by search/status and computed separately from the paginated
    // list — these back the seller's "Total/Active/Inactive/New" summary
    // cards, which must reflect the whole account, not just the current page.
    Buyer.aggregate([
      {
        $match: {
          registeredWith: new mongoose.Types.ObjectId(session.user.id),
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const counts = { total: 0, new: 0, active: 0, inactive: 0, suspended: 0 };
  for (const entry of statusCounts as { _id: string; count: number }[]) {
    counts.total += entry.count;
    if (entry._id && entry._id in counts) {
      counts[entry._id as keyof typeof counts] = entry.count;
    }
  }

  return successResponse({
    buyers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    counts,
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user?.role) {
    return unauthorized("Authentication required");
  }

  if (session.user.role !== "seller" && session.user.role !== "admin") {
    return forbidden("Only sellers can add buyers");
  }

  const rateLimited = await checkSimpleRateLimit(req, {
    scope: "buyers:create",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    actorId: session.user.id,
  });
  if (rateLimited) return rateLimited;

  const registrationSellerId =
    session.user.role === "admin" && sellerId ? sellerId : session.user.id;

  if (
    session.user.role !== "admin" &&
    sellerId &&
    String(sellerId) !== String(session.user.id)
  ) {
    return forbidden("You can only add buyers to your own account");
  }

  const body = await req.json();
  const parsed = createBuyerSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  const {
    name,
    company,
    email,
    phone,
    leadPreferences = { location: [], industries: [] },
    preferredDistribution = "Automatic",
    notificationPreferences = ["Email"],
    workingHours = { start: "09:00", end: "17:00" },
    timezone = "America/New_York",
    maxLeadsPerDay = 5,
  } = parsed.data;

  // Verify seller exists
  const seller = await User.findById(registrationSellerId);
  if (!seller || seller.role !== "seller") {
    return badRequest("Invalid seller");
  }

  // Live buyer count against the seller's tier limit — computed fresh from
  // the Buyer collection rather than a separately-tracked counter, so
  // deleting a buyer immediately frees up real capacity and a bulk import
  // can never blow past the cap by charging usage before rows are inserted.
  const buyerLimit = seller.subscription?.subscriptionLimits?.buyers ?? 0;
  if (buyerLimit > 0) {
    const currentBuyerCount = await Buyer.countDocuments({
      registeredWith: registrationSellerId,
    });
    if (currentBuyerCount >= buyerLimit) {
      return forbidden(
        `Buyer limit reached (${currentBuyerCount}/${buyerLimit}). Please upgrade your plan.`,
      );
    }
  }

  // Map leadPreferences.location array to preferredZones
  const locationList = Array.isArray(leadPreferences.location)
    ? leadPreferences.location
    : leadPreferences.location
      ? [leadPreferences.location]
      : [];
  const preferredZones =
    locationList.length > 0 ? locationList.map((city: string) => ({ city })) : [];

  // Create weeklySchedule from workingHours - apply to all weekdays
  const weekday = { enabled: true, start: workingHours.start, end: workingHours.end };
  const weeklySchedule = {
    Monday: weekday,
    Tuesday: weekday,
    Wednesday: weekday,
    Thursday: weekday,
    Friday: weekday,
    Saturday: { enabled: false, start: "09:00", end: "17:00" },
    Sunday: { enabled: false, start: "09:00", end: "17:00" },
  };

  let newBuyer;
  try {
    newBuyer = new Buyer({
      name,
      company,
      email,
      phone,
      // A brand-new buyer can never have purchase history yet, so "active"
      // (purchase-gated, see PUT above) or any other non-default status
      // can't legitimately apply at creation — every buyer starts "new"
      // regardless of what the caller sends.
      status: "new",
      leadPreferences,
      preferredDistribution,
      notificationPreferences,
      workingHours,
      timezone,
      maxLeadsPerDay,
      registeredWith: registrationSellerId,
      preferredZones,
      weeklySchedule,
    });
    await newBuyer.save();
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "MongoServerError" &&
      (error as unknown as { code?: number }).code === 11000
    ) {
      return conflict("A buyer with this email already exists");
    }
    throw error;
  }

  // Add buyer ID to the user's list, and sync the usage counter to the live
  // count (rather than incrementing it) so it can never drift from reality —
  // the actual limit check above already uses a live count, this just keeps
  // subscriptionUsage.buyers accurate for the account-usage dashboard.
  const liveBuyerCount = await Buyer.countDocuments({
    registeredWith: registrationSellerId,
  });
  await User.findByIdAndUpdate(registrationSellerId, {
    $push: { buyers: newBuyer._id },
    $set: { "subscription.subscriptionUsage.buyers": liveBuyerCount },
  });

  await recordAuditLog({
    actor: { email: session.user.email, role: session.user.role },
    action: "buyer.create",
    targetType: "Buyer",
    targetId: String(newBuyer._id),
    summary: `Created buyer "${name}" (${email})`,
    req,
  });

  // Send welcome email to buyer when registered by a seller
  try {
    const signInUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/sign-in`;

    await sendBuyerEmail({
      variant: "welcome",
      buyerEmail: email,
      buyerName: name,
      buyerCompany: company,
      buyerPhone: phone,
      sellerName: seller?.name || "Your Seller",
      sellerCompany: seller?.businessName || "Lead Seller",
      signInUrl,
    });

    return NextResponse.json(
      { ...newBuyer.toObject(), emailSent: true },
      { status: 201 },
    );
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError);
    // Return success even if email fails - buyer was still created
    return NextResponse.json(
      { ...newBuyer.toObject(), emailSent: false },
      { status: 201 },
    );
  }
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return badRequest("Invalid buyer ID");
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorized("Authentication required");
  }

  const body = await req.json();
  const parsed = updateBuyerSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  const data = parsed.data;

  const buyer = await Buyer.findById(id);
  if (!buyer) {
    return notFound("Buyer");
  }

  const user = await User.findById(session.user.id);
  const isBuyerOwner = buyer.email === user?.email;
  const isSeller =
    session.user.role === "seller" &&
    buyer.registeredWith?.toString() === session.user.id;

  if (!isBuyerOwner && !isSeller) {
    return forbidden(
      "Unauthorized - you can only update your own profile or buyers you registered",
    );
  }

  const updateFields: Record<string, unknown> = {};
  if (data.name !== undefined) updateFields.name = data.name;
  if (data.company !== undefined) updateFields.company = data.company;
  if (data.email !== undefined) updateFields.email = data.email;
  if (data.phone !== undefined) updateFields.phone = data.phone;
  if (data.status !== undefined) {
    // Activation is purchase-gated: /api/sellers/update-buyer-status is the
    // only path allowed to move a buyer from "new" into "active", and only
    // once they have a real purchase on record. Without this check, this
    // general-purpose edit endpoint could rubber-stamp "active" on a buyer
    // who never bought anything, silently bypassing that rule.
    if (data.status === "active" && buyer.status !== "active") {
      return badRequest(
        'Buyers can only be activated after a purchase. Status "active" cannot be set manually — it updates automatically once the buyer makes their first purchase.',
      );
    }
    updateFields.status = data.status;
    // isActive and status describe overlapping concepts but were only kept
    // in sync at CSV-import time — every other path (this one, and the
    // dedicated status-update route) changed status without touching
    // isActive, so the two fields could drift apart indefinitely.
    updateFields.isActive = data.status === "active";
  }
  if (data.leadPreferences !== undefined) {
    const loc = data.leadPreferences.location;
    const locationList = Array.isArray(loc) ? loc : loc ? [loc] : [];
    updateFields.leadPreferences = {
      location: locationList,
      industries: data.leadPreferences.industries ?? [],
      industryServicePairs: data.leadPreferences.industryServicePairs ?? [],
    };
    // preferredZones — not leadPreferences.location — is what the matching
    // engine actually reads. Keep it in sync with the simple location list
    // by default; a caller that sends explicit per-zone data (city/state/
    // zipCodes) via preferredZones below overrides this.
    if (data.preferredZones === undefined) {
      updateFields.preferredZones = locationList.map((city) => ({ city }));
    }
  }
  if (data.preferredZones !== undefined) {
    updateFields.preferredZones = data.preferredZones;
  }
  if (data.preferredDistribution !== undefined)
    updateFields.preferredDistribution = data.preferredDistribution;
  if (data.notificationPreferences !== undefined) {
    updateFields.notificationPreferences = data.notificationPreferences;
    // Tracking only — see models/leadbuyers.ts. Piggybacks on the
    // preference toggle the buyer already controls here rather than adding
    // a separate consent UI: choosing to receive Email/SMS notifications is
    // treated as marketing consent for that channel, and unchecking it is
    // treated as withdrawing it.
    const now = new Date();
    updateFields.marketingConsent = {
      email: {
        granted: data.notificationPreferences.includes("Email"),
        grantedAt: now,
        source: "settings_preference",
      },
      sms: {
        granted: data.notificationPreferences.includes("SMS"),
        grantedAt: now,
        source: "settings_preference",
      },
    };
  }
  if (data.workingHours !== undefined) updateFields.workingHours = data.workingHours;
  if (data.timezone !== undefined) updateFields.timezone = data.timezone;
  if (data.maxLeadsPerDay !== undefined)
    updateFields.maxLeadsPerDay = data.maxLeadsPerDay;
  if (data.businessDescription !== undefined)
    updateFields.businessDescription = data.businessDescription;
  if (data.companyRegNo !== undefined) updateFields.companyRegNo = data.companyRegNo;
  if (data.vatTaxRegNo !== undefined) updateFields.vatTaxRegNo = data.vatTaxRegNo;
  if (data.businessWebsite !== undefined)
    updateFields.businessWebsite = data.businessWebsite;
  if (data.contactAddress !== undefined)
    updateFields.contactAddress = data.contactAddress;

  // The schema declares updatedAt with a static create-time default rather
  // than Mongoose's automatic timestamps, so nothing bumps it unless a write
  // path does so explicitly — set it here so "last updated" is meaningful.
  updateFields.updatedAt = new Date();

  const updatedBuyer = await Buyer.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true },
  );

  await recordAuditLog({
    actor: { email: session.user.email, role: session.user.role },
    action: "buyer.update",
    targetType: "Buyer",
    targetId: id,
    summary: `Updated buyer "${updatedBuyer?.name || id}" (fields: ${Object.keys(updateFields).join(", ")})`,
    metadata: { changedFields: Object.keys(updateFields) },
    req,
  });

  return NextResponse.json(updatedBuyer, { status: 200 });
});

export const DELETE = withErrorHandler(async (req: NextRequest) => {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorized("Authentication required");
  }
  // Only "seller" here, not "admin" — unlike POST (which resolves an
  // explicit sellerId query param for admin-on-behalf-of-seller creation),
  // this query is scoped to session.user.id directly. Allowing "admin"
  // without that resolution would look like it works but actually query
  // for buyers registered to the admin's own account, which has none —
  // the same class of non-functional role check fixed elsewhere in this
  // file. Revisit together with PUT/import if admin-on-behalf-of support
  // is wanted here too.
  if (session.user.role !== "seller") {
    return forbidden("Only sellers can delete buyers");
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return badRequest("Invalid buyer ID");
  }

  const existingBuyer = await Buyer.findOne({
    _id: id,
    registeredWith: session.user.id,
  }).select("purchaseHistory name email");

  if (!existingBuyer) {
    return notFound("Buyer");
  }

  // Buyer deletion is a hard delete with no cascade handling, and historical
  // Transaction records reference buyers by ID (metadata.buyerId), which
  // would become a permanent dangling reference. Rather than build out full
  // soft-delete (which would touch every buyer query in the app), block
  // deleting a buyer with real purchase history — the seller should mark
  // them inactive/suspended instead, which is reversible and doesn't orphan
  // financial records.
  if (existingBuyer.purchaseHistory && existingBuyer.purchaseHistory.length > 0) {
    return conflict(
      `${existingBuyer.name} has ${existingBuyer.purchaseHistory.length} purchase(s) on record and can't be deleted. Set their status to "Suspended" or "Inactive" instead.`,
    );
  }

  const deletedBuyer = await Buyer.findOneAndDelete({
    _id: id,
    registeredWith: session.user.id,
  });

  if (!deletedBuyer) {
    return notFound("Buyer");
  }

  // Remove buyer from user's buyers list and sync the usage counter to the
  // live count — this is what actually fixes the "delete never frees up a
  // slot" bug, since enforcement (in POST) now reads the live count directly
  // rather than this cached field, but keeping it in sync matters for the
  // account-usage dashboard.
  const liveBuyerCount = await Buyer.countDocuments({
    registeredWith: session.user.id,
  });
  await User.findByIdAndUpdate(session.user.id, {
    $pull: { buyers: id },
    $set: { "subscription.subscriptionUsage.buyers": liveBuyerCount },
  });

  await recordAuditLog({
    actor: { email: session.user.email, role: session.user.role },
    action: "buyer.delete",
    targetType: "Buyer",
    targetId: id,
    summary: `Deleted buyer "${deletedBuyer.name}" (${deletedBuyer.email})`,
    req,
  });

  return successResponse({ message: "Buyer deleted successfully" });
});
