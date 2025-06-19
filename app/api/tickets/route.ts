import { NextRequest, NextResponse } from "next/server";

const GAS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwbUUxVdSveFM3ybRwQKYKdx3RdnbbI_yqPMeghrNroX-Q6LbUBgiD3H5JdK74icR1V/exec";

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 9);
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await req.json();

    // Validate required fields
    const requiredFields = ["name", "email", "issueType", "description"];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          missingFields,
          requestId,
        },
        { status: 400 }
      );
    }

    // Prepare GAS request
    const gasUrl = new URL(GAS_ENDPOINT);
    gasUrl.searchParams.append("path", "create");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const gasResponse = await fetch(gasUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const responseText = await gasResponse.text();
      //(`[${requestId}] GAS response:`, responseText);

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
        { status: gasResponse.status }
      );
    } catch (fetchError) {
      clearTimeout(timeout);
      throw new Error(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to submit ticket to GAS"
      );
    }
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      {
        error: "Failed to create ticket",
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
