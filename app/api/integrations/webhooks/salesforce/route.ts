/**
 * Salesforce Webhook Integration
 * Handles incoming webhooks from Salesforce and routes to appropriate actions
 *
 * Note: Salesforce uses Outbound Messages or Platform Events for webhooks
 * This endpoint receives those notifications
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { WebhookConfig } from "@/models/webhookConfig";
import { SalesforceAdapter } from "@/lib/integrations/adapters/salesforce";
import { Lead, ILead } from "@/models/leads";
import { User } from "@/models/userModel";

export const dynamic = "force-dynamic";

/**
 * Salesforce Outbound Message payload structure
 * (Simplified - actual structure depends on Salesforce setup)
 */
export interface SalesforceWebhookPayload {
  OrganizationId: string;
  ActionId?: string;
  SessionId: string;
  EnterpriseUrl?: string;
  PartnerUrl?: string;
  Notification: {
    Id: string;
    sObject: {
      type: "Lead" | "Contact" | "Opportunity";
      Id: string;
      [key: string]: any; // Dynamic fields
    };
  }[];
}

/**
 * POST /api/integrations/webhooks/salesforce
 * Receive and process Salesforce webhook events
 *
 * Salesforce sends Outbound Messages as SOAP XML or can use REST webhooks
 * This implementation assumes REST/JSON format
 */
export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const body = await req.json();
    const payload = body as SalesforceWebhookPayload;

    // Log incoming webhook
    console.log("Received Salesforce webhook:", {
      organizationId: payload.OrganizationId,
      notifications: payload.Notification?.length || 0,
    });

    // Process each notification
    if (payload.Notification && Array.isArray(payload.Notification)) {
      for (const notification of payload.Notification) {
        const sObject = notification.sObject;

        // Route to appropriate handler based on object type
        switch (sObject.type) {
          case "Lead":
            await handleLeadEvent(sObject);
            break;
          case "Contact":
            await handleContactEvent(sObject);
            break;
          case "Opportunity":
            await handleOpportunityEvent(sObject);
            break;
          default:
            console.log(`Unhandled Salesforce object type: ${sObject.type}`);
        }
      }
    }

    // Salesforce expects ACK response
    return NextResponse.json(
      {
        success: true,
        message: "Webhook processed successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Salesforce webhook processing error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/integrations/webhooks/salesforce
 * Health check for Salesforce webhook endpoint
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "active",
    message: "Salesforce webhook endpoint is ready",
    timestamp: new Date(),
  });
}

/**
 * Handle Lead object events
 * When a Lead is created or updated in Salesforce
 */
async function handleLeadEvent(sObject: any) {
  try {
    console.log("Processing Salesforce Lead event:", sObject.Id);

    // Check if this lead came from BRIXCOT (has BRIXCOT_Lead_ID__c)
    const brixcotLeadId = sObject.BRIXCOT_Lead_ID__c;

    if (brixcotLeadId) {
      // This is a BRIXCOT lead - sync updates back
      const lead = await Lead.findById(brixcotLeadId);

      if (lead) {
        // Update BRIXCOT lead with Salesforce changes
        const updates: Partial<ILead> = {};

        if (sObject.Status) {
          // Map Salesforce status back to BRIXCOT
          updates.status = mapSalesforceStatusToBrixcot(sObject.Status);
        }

        if (sObject.Rating) {
          // Map rating to quality
          updates.status = sObject.Rating === "Hot" ? "qualified" : lead.status;
        }

        if (Object.keys(updates).length > 0) {
          await Lead.findByIdAndUpdate(brixcotLeadId, updates);
          console.log("Updated BRIXCOT lead from Salesforce:", brixcotLeadId);
        }
      }
    } else {
      // This is a new Salesforce lead not from BRIXCOT
      // Optionally import into BRIXCOT
      console.log("External Salesforce lead detected:", sObject.Id);
    }
  } catch (error) {
    console.error("Error handling Lead event:", error);
  }
}

/**
 * Handle Contact object events
 * When a Contact is created or updated in Salesforce
 */
async function handleContactEvent(sObject: any) {
  try {
    console.log("Processing Salesforce Contact event:", sObject.Id);

    // Check for BRIXCOT lead ID in custom field
    const brixcotLeadId = sObject.BRIXCOT_Lead_ID__c;

    if (brixcotLeadId) {
      // Update BRIXCOT lead with contact info
      await Lead.findByIdAndUpdate(brixcotLeadId, {
        status: "qualified", // Contact means lead was converted
      });

      console.log(
        "Updated BRIXCOT lead from Contact conversion:",
        brixcotLeadId,
      );
    }
  } catch (error) {
    console.error("Error handling Contact event:", error);
  }
}

/**
 * Handle Opportunity object events
 * When an Opportunity is created or updated in Salesforce
 */
async function handleOpportunityEvent(sObject: any) {
  try {
    console.log("Processing Salesforce Opportunity event:", sObject.Id);

    // Check for BRIXCOT lead ID
    const brixcotLeadId = sObject.BRIXCOT_Lead_ID__c;

    if (brixcotLeadId) {
      const lead = await Lead.findById(brixcotLeadId);

      if (lead) {
        // Update lead based on opportunity stage
        const updates: Partial<ILead> = {};

        if (sObject.StageName) {
          const mappedStatus = mapOpportunityStageToLeadStatus(
            sObject.StageName,
          );
          updates.status = mappedStatus as ILead["status"];
        }

        if (Object.keys(updates).length > 0) {
          await Lead.findByIdAndUpdate(brixcotLeadId, updates);
          console.log("Updated BRIXCOT lead from Opportunity:", brixcotLeadId);
        }
      }
    }
  } catch (error) {
    console.error("Error handling Opportunity event:", error);
  }
}

/**
 * Map Salesforce Lead Status to BRIXCOT lead status
 */
function mapSalesforceStatusToBrixcot(
  salesforceStatus: string,
): ILead["status"] {
  const statusMap: Record<string, ILead["status"]> = {
    "Open - Not Contacted": "new",
    "Working - Contacted": "available",
    Qualified: "qualified",
    Unqualified: "unqualified",
    "Closed - Converted": "sold",
    "Closed - Not Converted": "unqualified",
  };

  return statusMap[salesforceStatus] || "available";
}

/**
 * Map Salesforce Opportunity Stage to BRIXCOT lead status
 */
function mapOpportunityStageToLeadStatus(stage: string): string {
  const stageMap: Record<string, string> = {
    Prospecting: "available",
    Qualification: "qualified",
    "Needs Analysis": "qualified",
    "Value Proposition": "qualified",
    "Id. Decision Makers": "qualified",
    "Perception Analysis": "qualified",
    "Proposal/Price Quote": "assigned",
    "Negotiation/Review": "assigned",
    "Closed Won": "sold",
    "Closed Lost": "unqualified",
  };

  return stageMap[stage] || "available";
}
