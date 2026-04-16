/**
 * Zapier Actions API Endpoints
 * RESTful API for Zapier to perform actions in BRIXCOT
 *
 * Authentication: API Key (X-API-Key header)
 *
 * Available Actions:
 * - POST /api/integrations/zapier/actions/create-lead
 * - POST /api/integrations/zapier/actions/update-lead
 * - POST /api/integrations/zapier/actions/search-leads
 * - POST /api/integrations/zapier/actions/find-lead
 * - POST /api/integrations/zapier/actions/assign-lead
 * - POST /api/integrations/zapier/actions/update-status
 * - POST /api/integrations/zapier/actions/get-lead
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/userModel";
import { ZapierActionsService } from "@/lib/integrations/services/zapierActionsService";
import crypto from "crypto";
import { checkFeatureAccess } from "@/lib/subscriptionLimitsService";
import {
  badRequest,
  internalError,
  unauthorized,
} from "@/lib/api/error-handler";

export const dynamic = "force-dynamic";

/**
 * Authenticate API request using API key
 * API key is generated per user and stored encrypted in database
 */
async function authenticateApiKey(
  req: NextRequest,
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");

  if (!apiKey) {
    return {
      success: false,
      error: "API key required. Include X-API-Key header.",
    };
  }

  try {
    // Hash the API key to compare with stored hash
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    // Find user with this API key hash
    // Note: This assumes we've added apiKeyHash field to User model
    const user = await User.findOne({
      "apiSettings.zapierApiKeyHash": apiKeyHash,
    });

    if (!user) {
      return {
        success: false,
        error: "Invalid API key",
      };
    }

    // Check Zapier integration feature access
    const featureCheck = await checkFeatureAccess(
      String(user._id),
      "zapierIntegration",
    );
    if (!featureCheck.allowed) {
      return {
        success: false,
        error: "Zapier integration is not available on your current plan",
      };
    }

    return {
      success: true,
      userId: String(user._id),
    };
  } catch (error) {
    console.error("API key authentication error:", error);
    return {
      success: false,
      error: "Authentication failed",
    };
  }
}

/**
 * POST /api/integrations/zapier/actions/create-lead
 * Create a new lead from Zapier
 */
export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    // Authenticate
    const auth = await authenticateApiKey(req);
    if (!auth.success) {
      return unauthorized(auth.error || "Authentication failed");
    }

    // Parse request body
    const body = await req.json();
    const { action, data } = body;

    if (!action || typeof action !== "string") {
      return badRequest("Action is required");
    }

    // Create service
    if (!auth.userId) {
      return unauthorized("Authentication failed");
    }
    const service = new ZapierActionsService(auth.userId);

    // Route to appropriate action
    let result;

    switch (action) {
      case "create_lead":
        result = await service.createLead(data);
        break;

      case "update_lead":
        result = await service.updateLead(data);
        break;

      case "search_leads":
        result = await service.searchLeads(data);
        break;

      case "find_lead":
        result = await service.findLeadByEmail(data.email);
        break;

      case "assign_lead":
        result = await service.assignLeadToBuyer(data.leadId, data.buyerEmail);
        break;

      case "update_status":
        result = await service.updateLeadStatus(data.leadId, data.status);
        break;

      case "get_lead":
        result = await service.getLeadDetails(data.leadId);
        break;

      default:
        return badRequest(
          `Unknown action: ${action}. Valid actions: create_lead, update_lead, search_leads, find_lead, assign_lead, update_status, get_lead`,
        );
    }

    // Return result
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return badRequest(result.error || "Action failed", {
        success: false,
        details: result,
      });
    }
  } catch (error) {
    console.error("Zapier action error:", error);
    return internalError(
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

/**
 * GET /api/integrations/zapier/actions
 * List available actions (for Zapier app configuration)
 */
export async function GET() {
  return NextResponse.json({
    actions: [
      {
        key: "create_lead",
        name: "Create Lead",
        description: "Create a new lead in BRIXCOT",
        inputFields: [
          { key: "name", label: "Name", required: true, type: "string" },
          { key: "email", label: "Email", required: false, type: "string" },
          { key: "phone", label: "Phone", required: false, type: "string" },
          { key: "company", label: "Company", required: false, type: "string" },
          {
            key: "industry",
            label: "Industry",
            required: false,
            type: "string",
          },
          { key: "source", label: "Source", required: false, type: "string" },
          {
            key: "status",
            label: "Status",
            required: false,
            type: "string",
            choices: [
              "new",
              "available",
              "qualified",
              "unqualified",
              "assigned",
              "sold",
            ],
          },
          { key: "city", label: "City", required: false, type: "string" },
          { key: "state", label: "State", required: false, type: "string" },
          { key: "country", label: "Country", required: false, type: "string" },
          {
            key: "zipCode",
            label: "Zip Code",
            required: false,
            type: "string",
          },
        ],
      },
      {
        key: "update_lead",
        name: "Update Lead",
        description: "Update an existing lead in BRIXCOT",
        inputFields: [
          { key: "leadId", label: "Lead ID", required: true, type: "string" },
          { key: "name", label: "Name", required: false, type: "string" },
          { key: "email", label: "Email", required: false, type: "string" },
          { key: "phone", label: "Phone", required: false, type: "string" },
          { key: "company", label: "Company", required: false, type: "string" },
          {
            key: "status",
            label: "Status",
            required: false,
            type: "string",
            choices: [
              "new",
              "available",
              "qualified",
              "unqualified",
              "assigned",
              "sold",
            ],
          },
          {
            key: "qualificationScore",
            label: "Qualification Score",
            required: false,
            type: "number",
          },
        ],
      },
      {
        key: "search_leads",
        name: "Search Leads",
        description: "Find leads matching criteria",
        inputFields: [
          { key: "email", label: "Email", required: false, type: "string" },
          { key: "phone", label: "Phone", required: false, type: "string" },
          { key: "name", label: "Name", required: false, type: "string" },
          { key: "status", label: "Status", required: false, type: "string" },
          {
            key: "limit",
            label: "Max Results",
            required: false,
            type: "number",
          },
        ],
      },
      {
        key: "find_lead",
        name: "Find Lead by Email",
        description: "Find a specific lead by email address",
        inputFields: [
          { key: "email", label: "Email", required: true, type: "string" },
        ],
      },
      {
        key: "assign_lead",
        name: "Assign Lead to Buyer",
        description: "Assign a lead to a specific buyer",
        inputFields: [
          { key: "leadId", label: "Lead ID", required: true, type: "string" },
          {
            key: "buyerEmail",
            label: "Buyer Email",
            required: true,
            type: "string",
          },
        ],
      },
      {
        key: "update_status",
        name: "Update Lead Status",
        description: "Change the status of a lead",
        inputFields: [
          { key: "leadId", label: "Lead ID", required: true, type: "string" },
          {
            key: "status",
            label: "Status",
            required: true,
            type: "string",
            choices: [
              "new",
              "available",
              "qualified",
              "unqualified",
              "assigned",
              "sold",
              "transferred",
            ],
          },
        ],
      },
      {
        key: "get_lead",
        name: "Get Lead Details",
        description: "Retrieve complete details for a lead",
        inputFields: [
          { key: "leadId", label: "Lead ID", required: true, type: "string" },
        ],
      },
    ],
    authentication: {
      type: "api_key",
      placement: "header",
      key: "X-API-Key",
      description:
        "Get your API key from BRIXCOT Dashboard → Integrations → Zapier → API Key",
    },
  });
}
