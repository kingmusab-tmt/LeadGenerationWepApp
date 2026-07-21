//description: This file contains the API routes for handling individual tier operations such as GET, PUT, and DELETE.
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { Tier } from "@/models/tier";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";
import { requireSuperAdmin } from "@/lib/api/adminAuth";
import { recordAuditLog } from "@/lib/auditLog";

// Get single tier
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return unauthorized("Authentication required");
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("Id");
    if (!id) {
      return badRequest("Tier ID is required");
    }

    await dbConnect();
    const tier = await Tier.findById(id);
    if (!tier) {
      return notFound("Tier");
    }
    return NextResponse.json(tier);
  } catch (error) {
    console.error("Error fetching tier:", error);
    return internalError("Failed to fetch tier");
  }
}

// Update tier
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return unauthorized("Authentication required");
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("Id");
    if (!id) {
      return badRequest("Tier ID is required");
    }

    const data = await req.json();
    await dbConnect();

    const tier = await Tier.findByIdAndUpdate(id, data, { new: true });
    if (!tier) {
      return notFound("Tier");
    }

    await recordAuditLog({
      actor: {
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      },
      action: "tier.update",
      targetType: "Tier",
      targetId: id,
      summary: `Updated tier "${tier.name}" (fields: ${Object.keys(data).join(", ")})`,
      metadata: { changedFields: Object.keys(data) },
      req,
    });

    return NextResponse.json(tier);
  } catch (error) {
    console.error("Error updating tier:", error);
    return internalError("Failed to update tier");
  }
}

// Delete tier — irreversible, requires super-admin (same rule as /api/admin/tier).
export async function DELETE(req: NextRequest) {
  const { error, actor } = await requireSuperAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("Id");
    if (!id) {
      return badRequest("Tier ID is required");
    }

    await dbConnect();
    const tier = await Tier.findByIdAndDelete(id);
    if (!tier) {
      return notFound("Tier");
    }

    await recordAuditLog({
      actor: actor!,
      action: "tier.delete",
      targetType: "Tier",
      targetId: id,
      summary: `Deleted tier "${tier.name}"`,
      metadata: { name: tier.name, price: tier.price },
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tier:", error);
    return internalError("Failed to delete tier");
  }
}
