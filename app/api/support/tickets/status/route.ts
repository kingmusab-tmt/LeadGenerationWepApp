import { NextRequest, NextResponse } from "next/server";

const STATUS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwbUUxVdSveFM3ybRwQKYKdx3RdnbbI_yqPMeghrNroX-Q6LbUBgiD3H5JdK74icR1V/exec";

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 9);
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await req.json();

    if (!body.email || !body.ticketId) {
      return NextResponse.json(
        {
          error: "Email and ticket ID are required",
          requestId,
        },
        { status: 400 }
      );
    }

    // Prepare GAS request URL
    const gasUrl = new URL(STATUS_ENDPOINT);
    gasUrl.searchParams.append("email", body.email);
    gasUrl.searchParams.append("ticketId", body.ticketId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const gasResponse = await fetch(gasUrl.toString(), {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const responseText = await gasResponse.text();

      if (!gasResponse.ok) {
        let errorDetails;
        try {
          errorDetails = JSON.parse(responseText).error || responseText;
        } catch {
          errorDetails = responseText;
        }

        throw new Error(`GAS returned ${gasResponse.status}: ${errorDetails}`);
      }

      const result = JSON.parse(responseText);

      return NextResponse.json(
        {
          ...result,
          requestId,
          processingTime: `${Date.now() - startTime}ms`,
        },
        { status: 200 }
      );
    } catch (fetchError) {
      clearTimeout(timeout);
      throw new Error(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch from GAS"
      );
    }
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      {
        error: "Failed to check ticket status",
        details: error instanceof Error ? error.message : "Unknown error",
        requestId,
        processingTime: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
