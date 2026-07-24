import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import HelpVideo from "@/models/helpVideo";
import { requireAdmin } from "@/lib/api/adminAuth";
import { badRequest, internalError, notFound, unauthorized } from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/help/videos
 * Returns help videos, optionally filtered by targetAudience.
 * Canonical implementation — this used to be duplicated by
 * /api/support/help/videos with divergent auth (that one required a
 * session on GET, this one required nothing at all) and validation. Both
 * the admin help-management page and the buyer/seller help pages read
 * from this one now.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const targetAudience = searchParams.get("targetAudience");

    let filter = {};
    if (targetAudience && targetAudience !== "all") {
      // Return videos for the specific audience or "both"
      filter = {
        $or: [{ targetAudience: targetAudience }, { targetAudience: "both" }],
      };
    }

    const videos = await HelpVideo.find(filter).sort({ uploadDate: -1 });

    return NextResponse.json(videos, { status: 200 });
  } catch (error) {
    console.error("Error fetching help videos:", error);
    return internalError("Failed to fetch help videos");
  }
}

/**
 * POST /api/help/videos
 * Create a new help video
 */
export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await dbConnect();

    const body = await req.json();
    const { title, description, url, duration, category, targetAudience } =
      body;

    if (!title || !url) {
      return badRequest("Title and URL are required");
    }

    const newVideo = await HelpVideo.create({
      title,
      description,
      url,
      duration,
      category,
      targetAudience: targetAudience || "both",
    });

    return NextResponse.json(newVideo, { status: 201 });
  } catch (error) {
    console.error("Error creating help video:", error);
    return internalError("Failed to create help video");
  }
}

/**
 * PUT /api/help/videos
 * Update an existing help video
 */
export async function PUT(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("Video ID is required");
    }

    const body = await req.json();
    const { title, description, url, duration, category, targetAudience } =
      body;

    const updatedVideo = await HelpVideo.findByIdAndUpdate(
      id,
      {
        title,
        description,
        url,
        duration,
        category,
        targetAudience,
      },
      { new: true, runValidators: true },
    );

    if (!updatedVideo) {
      return notFound("Video");
    }

    return NextResponse.json(updatedVideo, { status: 200 });
  } catch (error) {
    console.error("Error updating help video:", error);
    return internalError("Failed to update help video");
  }
}

/**
 * DELETE /api/help/videos
 * Delete a help video
 */
export async function DELETE(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("Video ID is required");
    }

    const deletedVideo = await HelpVideo.findByIdAndDelete(id);

    if (!deletedVideo) {
      return notFound("Video");
    }

    return NextResponse.json(
      { message: "Video deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting help video:", error);
    return internalError("Failed to delete help video");
  }
}
