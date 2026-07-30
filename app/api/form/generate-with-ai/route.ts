import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  forbidden,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";
import { checkFeatureAccess } from "@/lib/subscriptionLimitsService";
import { checkSimpleRateLimit } from "@/lib/security/simpleRateLimit";
import { formFieldSchema } from "@/lib/validation/schemas";

import { isSellerRole } from "@/lib/roles";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MAX_PROMPT_LENGTH = 2000;

interface GenerateFormResponse {
  fields: unknown[];
  formName: string;
  description: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSellerRole(session.user?.role)) {
    return unauthorized("Authentication required");
  }

  if (!GEMINI_API_KEY) {
    return internalError("Gemini API key not configured");
  }

  // The frontend already hides this behind the aiGenerativeEnabled feature
  // flag, but that's a UI convenience, not enforcement — without this check
  // any seller could call the route directly regardless of their plan.
  const featureAccess = await checkFeatureAccess(
    session.user.id,
    "aiGenerativeEnabled",
  );
  if (!featureAccess.allowed) {
    return forbidden(
      featureAccess.message || "AI form generation is not available on your plan.",
    );
  }

  const rateLimited = await checkSimpleRateLimit(req, {
    scope: "form-ai-generate",
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000,
    actorId: session.user.id,
  });
  if (rateLimited) return rateLimited;

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return badRequest("Prompt is required");
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return badRequest(
        `Prompt cannot exceed ${MAX_PROMPT_LENGTH} characters.`,
      );
    }

    const systemPrompt = `You are an expert form builder assistant. Based on the user's description of leads they want to capture, generate a structured form in JSON format.

Your response MUST be valid JSON following this exact structure:
{
  "formName": "string - descriptive form name",
  "description": "string - brief description of the form's purpose",
  "fields": [
    {
      "id": "string - unique id",
      "type": "text|email|phone|select|checkbox|textarea|date|number|radio|header|paragraph",
      "label": "string - field label",
      "required": false,
      "options": ["array of strings for select/radio/checkbox types"],
      "headingLevel": "h1|h2|h3|h4|h5|h6 - only for header type"
    }
  ]
}

Guidelines:
- Start with a header describing the form purpose
- Include contact fields (Name, Email, Phone) for lead capture
- Add relevant fields based on the industry/use case mentioned
- Use appropriate field types (email for emails, phone for phone numbers, etc.)
- For multi-choice questions use select/radio/checkbox
- Include 5-10 fields total
- Always include at least Name, Email, and Phone fields
- Set required=false for all fields (user can adjust)

Respond ONLY with valid JSON, no additional text or markdown.`;

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nUser Request: ${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Gemini API error:", error);
      return internalError("Failed to generate form with AI");
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error(
        "Unexpected API response structure:",
        JSON.stringify(data, null, 2),
      );
      return internalError("No response from AI");
    }

    // Parse JSON response
    let formData: GenerateFormResponse;
    try {
      // Remove markdown code blocks if present
      let cleanJson = generatedText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.replace(/^```json\n/, "").replace(/\n```$/, "");
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      formData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Text:", generatedText);
      return internalError("Failed to parse AI response");
    }

    // Validate and sanitize the response
    if (!formData.fields || !Array.isArray(formData.fields)) {
      return internalError("Invalid form structure from AI");
    }

    // Assign a real ID to each field, then validate against the same schema
    // that create/update enforce (field type enum, options required for
    // select/radio/checkbox, etc.) — the AI's output was previously trusted
    // as-is and could contain a type outside what the rest of the app
    // accepts, or a choice field with no options.
    const fieldsWithIds = (formData.fields as Record<string, unknown>[]).map(
      (field) => ({
        ...field,
        id:
          typeof field.id === "string" && field.id ? field.id : crypto.randomUUID(),
      }),
    );

    const validFields = fieldsWithIds.filter(
      (field) => formFieldSchema.safeParse(field).success,
    );

    if (validFields.length === 0) {
      return internalError(
        "The AI didn't return a usable form structure. Please try rephrasing your request.",
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          formName: formData.formName || "AI Generated Form",
          description: formData.description || "",
          fields: validFields,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating form:", error);
    return internalError("Internal server error");
  }
}
