import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { WorkflowExecution } from "@/models/automationWorkflow";
import {
  badRequest,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";

import { isSellerRole } from "@/lib/roles";
export const dynamic = "force-dynamic";

async function getUserFromSession() {
  const session = await getServerSession(authOptions);
  if (!session || !isSellerRole(session.user?.role) || !session.user.id) {
    return { error: unauthorized("Authentication required") };
  }
  return { userId: session.user.id };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const { userId, error } = await getUserFromSession();
  if (error) return error;

  const { id } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    if (
      !Number.isFinite(page) ||
      page < 1 ||
      !Number.isFinite(limit) ||
      limit < 1
    ) {
      return badRequest("Invalid pagination parameters");
    }

    const filter: Record<string, unknown> = { workflowId: id, userId };
    if (status) {
      filter.status = status;
    }

    const executions = await WorkflowExecution.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await WorkflowExecution.countDocuments(filter);

    return NextResponse.json(
      {
        executions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error fetching execution history:", err);
    return internalError("Failed to fetch execution history");
  }
}
