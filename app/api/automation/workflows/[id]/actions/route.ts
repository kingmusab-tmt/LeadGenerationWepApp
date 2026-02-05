import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import AutomationEngine from "@/lib/automationEngine";

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

// POST /api/automation/workflows/[id]/actions
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { userId, error } = await getUserFromSession();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const action = body.action as string;

  try {
    switch (action) {
      case "trigger":
        // Manually trigger workflow
        const result = await AutomationEngine.manualTrigger(
          id,
          userId,
          body.context
        );
        return NextResponse.json(result, {
          status: result.success ? 200 : 400,
        });

      case "reset-counter":
        // Reset execution counter
        const reset = await AutomationEngine.resetExecutionCounter(id, userId);
        return NextResponse.json(
          {
            success: reset,
            message: reset ? "Counter reset" : "Failed to reset",
          },
          { status: reset ? 200 : 400 }
        );

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("Error performing workflow action:", err);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
