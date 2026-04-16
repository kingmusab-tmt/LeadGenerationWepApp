import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  badRequest,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface FormField {
  id: string;
  type:
    | "text"
    | "email"
    | "phone"
    | "select"
    | "checkbox"
    | "textarea"
    | "date"
    | "number"
    | "radio"
    | "header"
    | "paragraph";
  label: string;
  required?: boolean;
  options?: string[];
  headingLevel?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

interface GenerateFormResponse {
  fields: FormField[];
  formName: string;
  description: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "seller") {
    return unauthorized("Authentication required");
  }

  if (!GEMINI_API_KEY) {
    return internalError("Gemini API key not configured");
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return badRequest("Prompt is required");
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

    // Add unique IDs to fields
    const fieldsWithIds = formData.fields.map((field) => ({
      ...field,
      id: field.id || Math.random().toString(),
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          formName: formData.formName || "AI Generated Form",
          description: formData.description || "",
          fields: fieldsWithIds,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating form:", error);
    return internalError("Internal server error");
  }
}
