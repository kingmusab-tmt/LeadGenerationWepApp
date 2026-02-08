import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log(
      "[filter-lead] Received lead data for AI scoring:",
      JSON.stringify(body, null, 2),
    );

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
      You are a Lead Quality Gatekeeper. Your job is to filter out spam, bots, and low-quality inquiries.
      
      Analyze this lead submission:
      ${fieldsText}

      Rules for "Bad Leads":
      1. Field values are gibberish (e.g., "asdf", "test", random characters), too short (<3 words), or irrelevant.
      2. Names are clearly fake (e.g., "Mickey Mouse", "John Doe", obvious test names).
      3. Budgets/prices are completely unrealistic (e.g., "$1", "0", negative values).
      4. Contact information (email, phone) appears fake or invalid.
      5. Aggressive, offensive, or spammy language in any field.

      Return a JSON object with this exact schema:
      {
        "is_valid": boolean,
        "spam_score": number (0-100, where 100 is definite spam),
        "reason": "short explanation"
      }
    `;

    console.log("[filter-lead] Prompt fields sent to Gemini:\n", fieldsText);

    // 3. Get the Verdict
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const validation = JSON.parse(responseText);

    console.log("[filter-lead] Gemini AI verdict:", JSON.stringify(validation));

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
