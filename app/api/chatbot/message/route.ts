import { ChatbotEngine } from "@/lib/chatbot-engine";
import { QualificationFlow } from "@/types/chatbot";
import dbConnect from "@/lib/connectdb";
// Use Web standard Request/Response types for Next.js route handlers
import { Lead as LeadModel } from "@/models/leads";

const qualificationFlow: QualificationFlow = {
  id: "1",
  name: "SaaS Lead Qualification",
  industry: "SaaS",
  questions: [
    {
      id: "name",
      text: "Hi! I'm here to help you find the right solution. What's your name?",
      type: "text",
      required: true,
    },
    {
      id: "company",
      text: "Nice to meet you! What company do you work for?",
      type: "text",
      required: true,
    },
    {
      id: "role",
      text: "What's your role at the company?",
      type: "text",
      required: true,
    },
    {
      id: "team_size",
      text: "How many people are on your team?",
      type: "multiple_choice",
      options: ["1-10", "11-50", "51-200", "200+"],
      required: true,
      scoring: {
        responses: {
          "1-10": 10,
          "11-50": 20,
          "51-200": 30,
          "200+": 40,
        },
      },
    },
    {
      id: "budget",
      text: "What's your monthly budget range for this type of solution?",
      type: "multiple_choice",
      options: ["Under $500", "$500-$2000", "$2000-$5000", "$5000+"],
      required: true,
      scoring: {
        responses: {
          "Under $500": 5,
          "$500-$2000": 15,
          "$2000-$5000": 25,
          "$5000+": 35,
        },
      },
    },
    {
      id: "timeline",
      text: "When are you looking to implement a solution?",
      type: "multiple_choice",
      options: [
        "Immediately",
        "Within 1 month",
        "Within 3 months",
        "Just exploring",
      ],
      required: true,
      scoring: {
        responses: {
          Immediately: 30,
          "Within 1 month": 25,
          "Within 3 months": 15,
          "Just exploring": 5,
        },
      },
    },
  ],
  scoring: [
    {
      field: "team_size",
      conditions: [
        { operator: "equals", value: "200+", score: 20 },
        { operator: "equals", value: "51-200", score: 15 },
      ],
    },
  ],
  routingRules: [
    {
      condition: "lead.qualificationScore >= 70",
      action: "route_to_buyer",
      params: { priority: "high" },
    },
    {
      condition: "lead.qualificationScore >= 40",
      action: "schedule_callback",
      params: { priority: "medium" },
    },
  ],
};

let chatbotEngine: ChatbotEngine;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, message, leadData } = body;

    if (!conversationId || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    await dbConnect();

    // Initialize chatbot engine with Google AI Studio key
    if (!chatbotEngine) {
      if (!process.env.GOOGLE_AI_STUDIO_KEY) {
        throw new Error("Google AI Studio API key not configured");
      }

      chatbotEngine = new ChatbotEngine(
        process.env.GOOGLE_AI_STUDIO_KEY,
        qualificationFlow
      );
    }

    const result = await chatbotEngine.processMessage(
      conversationId,
      message,
      leadData || {}
    );

    // Update lead data with proper schema validation
    await LeadModel.findOneAndUpdate(
      { conversationId },
      {
        $set: {
          ...result.leadUpdate,
          conversationId, // Ensure this is included
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        strict: false, // Allow flexible schema if needed
      }
    );

    return new Response(
      JSON.stringify({
        response: result.response,
        nextQuestion: result.nextQuestion,
        qualificationScore: result.leadUpdate?.qualificationScore,
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (error) {
    console.error("Chatbot error:", error);

    // More specific error handling
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const statusCode = errorMessage.includes("API key") ? 401 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "content-type": "application/json" },
    });
  }
}
