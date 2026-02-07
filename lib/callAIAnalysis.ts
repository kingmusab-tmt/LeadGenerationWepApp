/**
 * AI Call Analysis Service
 * Uses Google Gemini to analyze call transcriptions:
 * - Generate call summaries
 * - Detect sentiment
 * - Score lead quality (A/B/C/D)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import Call from "@/models/call";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface CallAnalysisResult {
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  leadScore: "A" | "B" | "C" | "D";
  keyDetails: string[];
}

/**
 * Analyze a call transcription using Google Gemini AI.
 * Returns summary, sentiment, and lead score.
 */
export async function analyzeCallTranscription(
  transcription: string,
  context: {
    industry?: string;
    callDuration?: number;
    disposition?: string;
  } = {},
): Promise<CallAnalysisResult> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Analyze this phone call transcription and return a JSON response with these fields:
- "summary": A 2-3 sentence summary of the call
- "sentiment": One of "positive", "neutral", or "negative" 
- "leadScore": Grade the lead quality as "A" (hot/ready to buy), "B" (interested), "C" (lukewarm), or "D" (not interested/spam)
- "keyDetails": Array of 3-5 key facts extracted from the call

Context:
- Industry: ${context.industry || "Unknown"}
- Call Duration: ${context.callDuration ? `${context.callDuration} seconds` : "Unknown"}
- Buyer Disposition: ${context.disposition || "Not set"}

Transcription:
${transcription}

Return ONLY valid JSON, no markdown formatting.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse the JSON response - handle potential markdown wrapping
    const jsonStr = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonStr);

    return {
      summary: parsed.summary || "No summary available.",
      sentiment: ["positive", "neutral", "negative"].includes(parsed.sentiment)
        ? parsed.sentiment
        : "neutral",
      leadScore: ["A", "B", "C", "D"].includes(parsed.leadScore)
        ? parsed.leadScore
        : "C",
      keyDetails: Array.isArray(parsed.keyDetails) ? parsed.keyDetails : [],
    };
  } catch (error) {
    console.error("[AI Call Analysis] Error:", error);
    return {
      summary: "AI analysis unavailable.",
      sentiment: "neutral",
      leadScore: "C",
      keyDetails: [],
    };
  }
}

/**
 * Score a lead based on call data (duration, disposition, AI sentiment).
 * Used as a fallback when transcription is not available.
 */
export function scoreLeadFromCallData(callData: {
  callDuration?: number;
  disposition?: string;
  aiSentiment?: string;
  feedback?: { buyerRating?: boolean | null };
}): "A" | "B" | "C" | "D" {
  let score = 50; // Start neutral

  // Duration scoring
  if (callData.callDuration) {
    if (callData.callDuration > 300)
      score += 30; // 5+ min = very engaged
    else if (callData.callDuration > 120)
      score += 20; // 2-5 min = good
    else if (callData.callDuration > 60)
      score += 10; // 1-2 min = okay
    else if (callData.callDuration < 15) score -= 20; // Very short = bad
  }

  // Disposition scoring
  switch (callData.disposition) {
    case "qualified_lead":
    case "sold":
      score += 30;
      break;
    case "callback_requested":
      score += 15;
      break;
    case "not_interested":
      score -= 20;
      break;
    case "wrong_number":
    case "spam":
      score -= 40;
      break;
  }

  // Sentiment scoring
  if (callData.aiSentiment === "positive") score += 15;
  else if (callData.aiSentiment === "negative") score -= 15;

  // Buyer feedback
  if (callData.feedback?.buyerRating === true) score += 10;
  else if (callData.feedback?.buyerRating === false) score -= 10;

  // Convert score to grade
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

/**
 * Process a completed call: fetch transcription, run AI analysis, update call record.
 * Runs asynchronously (fire-and-forget).
 */
export async function processCallAIAnalysis(
  callSid: string,
  options: {
    transcriptionEnabled: boolean;
    aiSummaryEnabled: boolean;
    industry?: string;
  },
): Promise<void> {
  try {
    const call = await Call.findOne({ callSid });
    if (!call) return;

    const updates: Record<string, unknown> = {};

    // If transcription exists (from Twilio), run AI analysis
    if (call.transcription && options.aiSummaryEnabled) {
      const analysis = await analyzeCallTranscription(call.transcription, {
        industry: options.industry || call.industry,
        callDuration: call.callDuration,
        disposition: call.disposition,
      });

      updates.aiSummary = analysis.summary;
      updates.aiSentiment = analysis.sentiment;
      updates.aiLeadScore = analysis.leadScore;
    } else if (!call.transcription) {
      // Score based on call data alone
      const leadScore = scoreLeadFromCallData({
        callDuration: call.callDuration,
        disposition: call.disposition,
        aiSentiment: call.aiSentiment,
        feedback: call.feedback,
      });
      updates.aiLeadScore = leadScore;
    }

    if (Object.keys(updates).length > 0) {
      await Call.updateOne({ callSid }, { $set: updates });
    }
  } catch (error) {
    console.error("[AI Call Analysis] Process error:", error);
  }
}
