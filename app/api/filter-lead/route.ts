import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // const fieldNames = Object.keys(body || {});
    // // console.log("[filter-lead] Received lead data for AI scoring", {
    // //   fieldCount: fieldNames.length,
    // //   fieldNames,
    // // });

    // 1. Select the Flash model (Fastest for real-time)
    // We enforce JSON output for easy parsing
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    // Format all fields for the prompt
    const fieldsText = Object.entries(body)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n");

    // 2. The Strict Prompt
    const prompt = `
      You are a Lead Quality Gatekeeper. Your job is to assess lead quality on a spam scale.
      
      Analyze this lead submission:
      ${fieldsText}

      SPAM SCORING SCALE (0-100):
      Score 0-20 (Clean/Legitimate):
      - All fields are genuine and specific
      - Names look real and complete (First + Last)
      - Valid email and phone format
      - Company name is specific and real
      - Reasonable budget amounts
      - Professional tone

      Score 21-40 (Minor Red Flags):
      - Mostly valid information but some generic responses
      - Email/phone format looks correct
      - Some fields are vague or generic
      - Reasonable but not detailed

      Score 41-60 (Moderate Red Flags):
      - Mix of valid and suspicious information
      - Some unusual field values
      - Incomplete or generic company information
      - Vague contact details

      Score 61-80 (High Red Flags):
      - Multiple suspicious indicators
      - Obvious test names (John Doe, Test User, Admin, etc)
      - Fake email patterns (test@test.com, abc@abc.com)
      - Gibberish in multiple fields
      - Unrealistic budget values ($0, $1, -$100)
      - Obviously fake contact info

      Score 81-100 (Definite Spam/Fake):
      - Clearly gibberish submission (asdf, xyzabc, random chars)
      - Aggressive/offensive language
      - Obvious spam keywords
      - Multiple nonsensical fields
      - Clearly automated bot submission
      - Deliberately misleading information

      Return a JSON object with this exact schema:
      {
        "is_valid": boolean,
        "spam_score": number (0-100, where 0=clean legitimate lead, 100=definite spam/bot),
        "reason": "short explanation of why this score"
      }
    `;

    // console.log("[filter-lead] Prompt prepared", {
    //   fieldCount: fieldNames.length,
    // });

    // 3. Get the Verdict
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const validation = JSON.parse(responseText);

    // console.log("[filter-lead] Gemini AI verdict", {
    //   is_valid: validation?.is_valid,
    //   spam_score: validation?.spam_score,
    // });

    // 4. Return the AI scoring result — always 200
    // This endpoint is for internal scoring only, NEVER blocks form submissions
    return NextResponse.json({
      success: true,
      message: validation.is_valid
        ? "Lead received!"
        : "Lead flagged as low quality.",
      spam_score: validation.spam_score,
      reason: validation.reason,
      is_valid: validation.is_valid,
    });
  } catch (error) {
    console.error("AI Filter Error:", error);
    // Fallback: If AI fails, allow the lead through so you don't lose data
    return NextResponse.json({
      success: true,
      message: "Lead saved (Fallback)",
    });
  }
}
