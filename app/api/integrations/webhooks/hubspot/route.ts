/**
 * HubSpot Webhook Integration
 * Handles incoming webhooks from HubSpot and routes to appropriate actions
 *
 * Date: January 21, 2026
 */

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/connectdb";
import { WebhookConfig } from "@/models/webhookConfig";
import { HubSpotAdapter } from "@/lib/integrations/adapters/hubspot";
import { Lead, ILead } from "@/models/leads";
import { User } from "@/models";

export const dynamic = "force-dynamic";

/**
 * HubSpot webhook payload types
 */
export interface HubSpotWebhookPayload {
  eventId: string;
  subscriptionType:
    | "contact.creation"
    | "contact.propertyChange"
    | "contact.deletion"
    | "deal.creation"
    | "deal.propertyChange"
    | "deal.deletion";
  timestamp: number;
  portalId: number;
  objectId: string;
  changeSource: string;
  attemptNumber: number;
}

/**
 * POST /api/integrations/webhooks/hubspot
 * Receive and process HubSpot webhook events
 *
 * HubSpot sends notifications about contact and deal changes
 * This endpoint processes those events and updates BRIXCOT accordingly
 */
export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const body = await req.json();
    const payload = body as HubSpotWebhookPayload;

    // Log incoming webhook
    console.log("HubSpot webhook received:", {
      eventId: payload.eventId,
      type: payload.subscriptionType,
      objectId: payload.objectId,
      timestamp: new Date(payload.timestamp),
    });

    // Route based on event type
    switch (payload.subscriptionType) {
      case "contact.creation":
        await handleContactCreation(payload);
        break;

      case "contact.propertyChange":
        await handleContactPropertyChange(payload);
        break;

      case "contact.deletion":
        await handleContactDeletion(payload);
        break;

      case "deal.creation":
        await handleDealCreation(payload);
        break;

      case "deal.propertyChange":
        await handleDealPropertyChange(payload);
        break;

      case "deal.deletion":
        await handleDealDeletion(payload);
        break;

      default:
        console.warn("Unknown HubSpot event type:", payload.subscriptionType);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed",
      eventId: payload.eventId,
    });
  } catch (error) {
    console.error("Error processing HubSpot webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/integrations/webhooks/hubspot
 * Health check for HubSpot webhook endpoint
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "active",
    message: "HubSpot webhook endpoint is ready",
    timestamp: new Date(),
  });
}

/**
 * Handle contact.creation event
 * When a new contact is created in HubSpot
 */
async function handleContactCreation(payload: HubSpotWebhookPayload) {
  try {
    console.log("Processing contact creation:", payload.objectId);

    // Find webhook configuration that triggered this
    // (In production, HubSpot webhook data includes webhook ID)

    // Update any leads that match this contact
    // This would typically sync back to BRIXCOT if lead was created externally
  } catch (error) {
    console.error("Error handling contact creation:", error);
  }
}

/**
 * Handle contact.propertyChange event
 * When a contact property changes in HubSpot
 */
async function handleContactPropertyChange(payload: HubSpotWebhookPayload) {
  try {
    console.log("Processing contact property change:", payload.objectId);

    // This is where we'd sync the HubSpot contact update back to BRIXCOT
    // (e.g., if a deal stage changes, update lead status)
    // In production, we'd correlate this to the user's webhook config
  } catch (error) {
    console.error("Error handling contact property change:", error);
  }
}

/**
 * Handle contact.deletion event
 * When a contact is deleted in HubSpot
 */
async function handleContactDeletion(payload: HubSpotWebhookPayload) {
  try {
    console.log("Processing contact deletion:", payload.objectId);

    // In production, handle archived/deleted contacts
    // Could mark leads as archived in BRIXCOT
  } catch (error) {
    console.error("Error handling contact deletion:", error);
  }
}

/**
 * Handle deal.creation event
 * When a new deal is created in HubSpot
 */
async function handleDealCreation(payload: HubSpotWebhookPayload) {
  try {
    console.log("Processing deal creation:", payload.objectId);

    // New deal in HubSpot - could represent a new BRIXCOT transaction
    // Sync deal details back to BRIXCOT
  } catch (error) {
    console.error("Error handling deal creation:", error);
  }
}

/**
 * Handle deal.propertyChange event
 * When a deal property changes in HubSpot
 */
async function handleDealPropertyChange(payload: HubSpotWebhookPayload) {
  try {
    console.log("Processing deal property change:", payload.objectId);

    // Deal stage or other property changed in HubSpot
    // Could trigger BRIXCOT workflow (e.g., deal closed → send notification)
  } catch (error) {
    console.error("Error handling deal property change:", error);
  }
}

/**
 * Handle deal.deletion event
 * When a deal is deleted in HubSpot
 */
async function handleDealDeletion(payload: HubSpotWebhookPayload) {
  try {
    console.log("Processing deal deletion:", payload.objectId);

    // Deal deleted in HubSpot - mark as archived in BRIXCOT
  } catch (error) {
    console.error("Error handling deal deletion:", error);
  }
}
