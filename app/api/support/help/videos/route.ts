import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import HelpVideo from "@/models/helpVideo";
import { withAuth, withErrorHandler } from "@/lib/api/async-handler";
import { successResponse, badRequest, notFound } from "@/lib/api/error-handler";
import { z } from "zod";

// Validation schemas
const videoSearchSchema = z.object({
  search: z.string().optional().default(""),
});

const createVideoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  url: z.string().url("Invalid video URL"),
  duration: z.string().optional(),
  category: z.string().optional(),
});

export const GET = withAuth(async (req, session) => {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const { search } = await videoSearchSchema.parseAsync(
    Object.fromEntries(searchParams),
  );

  const videos = await HelpVideo.find({
    $or: [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ],
  }).sort({ createdAt: -1 });

  return successResponse({ videos });
});

export const POST = withAuth(
  async (req, session) => {
    await dbConnect();

    const body = await req.json();
    const validatedData = await createVideoSchema.parseAsync(body);

    const video = await HelpVideo.create({
      ...validatedData,
      createdBy: session.user.id,
    });

    return successResponse({ video }, 201);
  },
  { requireRole: ["admin"] },
);

export const PUT = withAuth(
  async (req, session) => {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("Video ID is required");
    }

    const body = await req.json();
    const validatedData = await createVideoSchema.partial().parseAsync(body);

    const updatedVideo = await HelpVideo.findByIdAndUpdate(id, validatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedVideo) {
      return notFound("Video");
    }

    return successResponse({ video: updatedVideo });
  },
  { requireRole: ["admin"] },
);

export const DELETE = withAuth(
  async (req, session) => {
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

    return successResponse({ message: "Video deleted successfully" });
  },
  { requireRole: ["admin"] },
);
