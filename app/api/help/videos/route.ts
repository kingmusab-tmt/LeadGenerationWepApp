import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import HelpVideo from "@/models/helpVideo";

export const dynamic = "force-dynamic";

/**
 * GET /api/help/videos
 * Returns list of help videos, optionally filtered by targetAudience
 */
export async function GET(req: NextRequest) {
  try {
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
    return NextResponse.json(
      { error: "Failed to fetch help videos" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/help/videos
 * Create a new help video
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { title, description, url, duration, category, targetAudience } =
      body;

    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 },
      );
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
    return NextResponse.json(
      { error: "Failed to create help video" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/help/videos
 * Update an existing help video
 */
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 },
      );
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
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json(updatedVideo, { status: 200 });
  } catch (error) {
    console.error("Error updating help video:", error);
    return NextResponse.json(
      { error: "Failed to update help video" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/help/videos
 * Delete a help video
 */
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 },
      );
    }

    const deletedVideo = await HelpVideo.findByIdAndDelete(id);

    if (!deletedVideo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Video deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting help video:", error);
    return NextResponse.json(
      { error: "Failed to delete help video" },
      { status: 500 },
    );
  }
}
