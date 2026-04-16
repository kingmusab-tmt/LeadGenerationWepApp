import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import {
  AutomationWorkflow,
  WorkflowExecution,
} from "@/models/automationWorkflow";
import { Types } from "mongoose";
import {
  badRequest,
  internalError,
  notFound,
  unauthorized,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

async function getUserFromSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "seller" || !session.user.id) {
    return { error: unauthorized("Authentication required") };
  }
  return { userId: session.user.id };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const { userId, error } = await getUserFromSession();
  if (error) return error;

  const { id } = await params;

  try {
    const workflow = await AutomationWorkflow.findOne({ _id: id, userId });
    if (!workflow) {
      return notFound("Workflow");
    }

    return NextResponse.json(workflow, { status: 200 });
  } catch (err) {
    console.error("Error fetching workflow:", err);
    return internalError("Failed to fetch workflow");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const { userId, error } = await getUserFromSession();
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();

    if (body.name !== undefined && !body.name?.trim()) {
      return badRequest("Workflow name cannot be empty");
    }

    const updateFields: Record<string, unknown> = {};

    if (body.name !== undefined) updateFields.name = body.name.trim();
    if (body.description !== undefined)
      updateFields.description = body.description.trim();
    if (body.isActive !== undefined)
      updateFields.isActive = Boolean(body.isActive);
    if (body.triggers !== undefined) updateFields.triggers = body.triggers;
    if (body.actions !== undefined) updateFields.actions = body.actions;
    if (body.maxExecutions !== undefined)
      updateFields.maxExecutions = body.maxExecutions;
    if (body.cooldownMinutes !== undefined)
      updateFields.cooldownMinutes = body.cooldownMinutes;
    if (body.priority !== undefined) updateFields.priority = body.priority;
    if (body.tags !== undefined) updateFields.tags = body.tags;
    if (body.notes !== undefined) updateFields.notes = body.notes.trim();

    const workflow = await AutomationWorkflow.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    if (!workflow) {
      return notFound("Workflow");
    }

    return NextResponse.json(workflow, { status: 200 });
  } catch (err) {
    console.error("Error updating workflow:", err);
    return internalError("Failed to update workflow");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const { userId, error } = await getUserFromSession();
  if (error) return error;

  const { id } = await params;

  try {
    const result = await AutomationWorkflow.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return notFound("Workflow");
    }

    // Clean up execution history
    await WorkflowExecution.deleteMany({ workflowId: new Types.ObjectId(id) });

    return NextResponse.json(
      { message: "Workflow deleted successfully" },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error deleting workflow:", err);
    return internalError("Failed to delete workflow");
  }
}
