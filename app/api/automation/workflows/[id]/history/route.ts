import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { WorkflowExecution } from "@/models/automationWorkflow";

export const dynamic = "force-dynamic";

async function getUserFromSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "seller" || !session.user.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId: session.user.id };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching execution history:", err);
    return NextResponse.json(
      { error: "Failed to fetch execution history" },
      { status: 500 }
    );
  }
}
