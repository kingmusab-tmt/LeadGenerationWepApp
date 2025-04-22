// app/api/recordings/proxy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Twilio } from "twilio";

const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const recordingSid = req.nextUrl.searchParams.get("recordingSid");
  const format = req.nextUrl.searchParams.get("format") || "mp3";
  const download = req.nextUrl.searchParams.get("download") === "true";

  if (!recordingSid) {
    return NextResponse.json(
      { error: "Recording SID is required" },
      { status: 400 }
    );
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
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString("base64"),
        },
      });

      if (!response.ok) throw new Error("Failed to fetch recording details");

      const data = await response.json();
      mediaUrl = data.subresource_uris.recordings_wav
        ? `https://api.twilio.com${data.subresource_uris.recordings_wav.replace(
            ".json",
            ""
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
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
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
        `attachment; filename="recording_${recordingSid}.${format}"`
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
      { status: 500 }
    );
  }
}
