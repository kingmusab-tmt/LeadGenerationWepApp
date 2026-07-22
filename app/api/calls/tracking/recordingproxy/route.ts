import { NextRequest, NextResponse } from "next/server";
import { Twilio } from "twilio";
import dbConnect from "@/lib/connectdb";
import Call from "@/models/call";
import { Buyer } from "@/models/leadbuyers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/api/error-handler";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";

const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

export const dynamic = "force-dynamic";

// Twilio recording SIDs are always "RE" followed by 32 hex characters —
// validating this strictly before using the value in a query also rules
// out any regex-injection surface from the $regex match below.
const RECORDING_SID_PATTERN = /^RE[0-9a-f]{32}$/i;

export async function GET(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return unauthorized("Please log in to access this recording.");
  }

  const rateLimited = checkSimpleRateLimit(req, {
    scope: "call-recording-proxy",
    limit: 60,
    windowMs: 60 * 1000,
    actorId: session.user.id,
  });
  if (rateLimited) return rateLimited;

  const recordingSid = req.nextUrl.searchParams.get("recordingSid");
  const format = req.nextUrl.searchParams.get("format") || "mp3";
  const download = req.nextUrl.searchParams.get("download") === "true";

  if (!recordingSid || !RECORDING_SID_PATTERN.test(recordingSid)) {
    return badRequest("A valid recording SID is required");
  }

  // This recording must belong to a Call the requester actually owns — a
  // recordingSid is guessable/enumerable, so without this check any
  // authenticated account (not just the seller/buyer on this specific call)
  // could stream anyone's recording.
  const call = (await Call.findOne({
    recordingUrl: { $regex: recordingSid },
  }).lean()) as { userId: string; buyerId?: string } | null;

  if (!call) {
    return notFound("Recording", "No call found for this recording.");
  }

  const isAdmin = session.user.role === "admin";
  const isSellerOwner =
    session.user.role === "seller" &&
    String(call.userId) === String(session.user.id);

  let isBuyerOwner = false;
  if (session.user.role === "buyer" && call.buyerId) {
    const buyerProfile = await Buyer.findOne({ email: session.user.email })
      .select("_id")
      .lean();
    isBuyerOwner = !!buyerProfile && String(call.buyerId) === String(buyerProfile._id);
  }

  if (!isAdmin && !isSellerOwner && !isBuyerOwner) {
    return forbidden("You do not have permission to access this recording.");
  }

  try {
    // Get the recording details from Twilio
    const recording = await twilioClient.recordings(recordingSid).fetch();

    // Construct the media URL based on format
    let mediaUrl: string;
    if (format === "wav") {
      // For WAV format, we need to fetch the WAV-specific URL
      const uri = recording.uri.replace(".json", "");
      const response = await fetch(`https://api.twilio.com${uri}`, {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
            ).toString("base64"),
        },
      });

      if (!response.ok) throw new Error("Failed to fetch recording details");

      const data = await response.json();
      mediaUrl = data.subresource_uris.recordings_wav
        ? `https://api.twilio.com${data.subresource_uris.recordings_wav.replace(
            ".json",
            "",
          )}`
        : data.media_url;
    } else {
      // For MP3, use the direct media URL
      mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.mp3`;
    }

    // Fetch the audio stream directly
    const audioResponse = await fetch(mediaUrl, {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
          ).toString("base64"),
      },
    });

    if (!audioResponse.ok || !audioResponse.body) {
      throw new Error("Failed to fetch audio stream");
    }

    // Stream the audio directly to the client
    const { readable, writable } = new TransformStream();
    audioResponse.body.pipeTo(writable);

    const headers = new Headers({
      "Content-Type": format === "wav" ? "audio/wav" : "audio/mpeg",
      "Cache-Control": "no-cache",
    });

    if (download) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="recording_${recordingSid}.${format}"`,
      );
    }

    return new NextResponse(readable, { status: 200, headers });
  } catch (error) {
    console.error("Error proxying recording:", error);
    return NextResponse.json(
      {
        error: "Failed to process recording",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
