import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();

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

    // 3. Get the Verdict
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const validation = JSON.parse(responseText);

    // 4. Act on the Verdict
    // If spam score is high, reject the request
    if (!validation.is_valid || validation.spam_score > 80) {
      return NextResponse.json(
        {
          success: false,
          message: "Our system flagged this submission as spam.",
          debug_reason: validation.reason, // Remove this line in production
        },
        { status: 400 },
      );
    }

    // --- IF WE GET HERE, THE LEAD IS GOOD ---
    // TODO: Add your code here to save to Database (MongoDB, Postgres, etc.)

    return NextResponse.json({ success: true, message: "Lead received!" });
  } catch (error) {
    console.error("AI Filter Error:", error);
    // Fallback: If AI fails, allow the lead through so you don't lose data
    return NextResponse.json({
      success: true,
      message: "Lead saved (Fallback)",
    });
  }
}
