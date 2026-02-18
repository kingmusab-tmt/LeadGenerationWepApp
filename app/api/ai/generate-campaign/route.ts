import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface GenerateCampaignRequest {
  campaignType: "email" | "sms";
  description: string;
  includeRecipientName: boolean;
  recipientSource: "leads" | "buyers" | "leadsAndBuyers" | "all";
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateCampaignRequest = await req.json();
    const { campaignType, description, includeRecipientName, recipientSource } =
      body;

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    if (!["email", "sms"].includes(campaignType)) {
      return NextResponse.json(
        { error: "Invalid campaign type" },
        { status: 400 },
      );
    }

    // Build the prompt based on campaign type
    const prompt = buildPrompt(
      campaignType,
      description,
      includeRecipientName,
      recipientSource,
    );

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response from Gemini
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const generatedContent = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      data: generatedContent,
    });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate campaign content" },
      { status: 500 },
    );
  }
}

function buildPrompt(
  campaignType: "email" | "sms",
  description: string,
  includeRecipientName: boolean,
  recipientSource: "leads" | "buyers" | "leadsAndBuyers" | "all",
): string {
  let recipientNameVar = "{{recipientName}}";
  let audienceDescription = "";

  if (recipientSource === "leads") {
    recipientNameVar = "{{leadName}}";
    audienceDescription = "potential leads (property sellers)";
  } else if (recipientSource === "buyers") {
    recipientNameVar = "{{buyerName}}";
    audienceDescription = "property buyers";
  } else if (recipientSource === "leadsAndBuyers") {
    recipientNameVar = "{{recipientName}}";
    audienceDescription = "both leads (property sellers) and buyers";
  } else if (recipientSource === "all") {
    recipientNameVar = "{{recipientName}}";
    audienceDescription = "leads, buyers, and other custom recipients";
  }

  if (campaignType === "email") {
    return `
You are a marketing expert. Generate email campaign content based on the following description:

${description}

Requirements:
- Campaign will be sent to: ${audienceDescription}
- ${includeRecipientName ? `Include the placeholder ${recipientNameVar} for personalization where appropriate (e.g., in greetings)` : "Do not include recipient name placeholders"}
- Create engaging, professional content
- Subject line should be attention-grabbing (max 60 characters)
- Email content should be in HTML format with proper formatting
- Include a clear call-to-action
- Keep the tone appropriate for the target audience

Output the result as JSON with this exact structure:
{
  "name": "Campaign name (concise, 3-5 words)",
  "subject": "Email subject line",
  "htmlContent": "Full HTML email content with inline styles"
}

Return ONLY the JSON, no additional text.
`;
  } else {
    // SMS
    return `
You are a marketing expert. Generate SMS campaign content based on the following description:

${description}

Requirements:
- Campaign will be sent to: ${audienceDescription}
- ${includeRecipientName ? `Include the placeholder ${recipientNameVar} for personalization where appropriate` : "Do not include recipient name placeholders"}
- Keep it concise (SMS should be under 160 characters if possible)
- Create engaging, professional content
- Include a clear call-to-action
- Keep the tone appropriate for the target audience

Output the result as JSON with this exact structure:
{
  "name": "Campaign name (concise, 3-5 words)",
  "textContent": "SMS message content"
}

Return ONLY the JSON, no additional text.
`;
  }
}
