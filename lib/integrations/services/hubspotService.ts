/**
 * HubSpot Integration Service
 * Manages HubSpot sync operations with webhook support
 *
 * Date: January 21, 2026
 */

import { ILead } from "@/models/leads";
import {
  HubSpotAdapter,
  HubSpotSyncResult,
} from "@/lib/integrations/adapters/hubspot";
import { WebhookConfig } from "@/models/webhookConfig";
import { WebhookManager } from "@/lib/integrations/webhookHandler";
import { decryptData } from "@/lib/encryption";
import { Types } from "mongoose";

/**
 * HubSpot sync event types
 */
export type HubSpotSyncEvent =
  | "lead_created"
  | "lead_updated"
  | "lead_qualified"
  | "lead_accepted"
  | "deal_created";

/**
 * HubSpot sync record interface
 */
export interface HubSpotSyncRecord {
  leadId: Types.ObjectId;
  contactId: string;
  dealId?: string;
  portalId: number;
  email: string;
  syncedAt: Date;
  lastSyncEvent: HubSpotSyncEvent;
}

/**
 * HubSpot Integration Service
 * Handles all HubSpot syncing operations
 */
export class HubSpotIntegrationService {
  private adapter: HubSpotAdapter;
  private userId: Types.ObjectId;
  private webhookConfig?: any;

  /**
   * Initialize HubSpot service
   * @param apiKey HubSpot private app access token
   * @param userId BRIXCOT user/seller ID
   * @param webhookConfig Optional webhook config for outbound events
   */
  constructor(apiKey: string, userId: Types.ObjectId, webhookConfig?: any) {
    this.adapter = new HubSpotAdapter(apiKey);
    this.userId = userId;
    this.webhookConfig = webhookConfig;
  }

  /**
   * Sync lead to HubSpot
   * Creates contact and optionally deal
   *
   * @param lead BRIXCOT lead data
   * @param createDeal Whether to create a deal
   * @param buyerId Optional buyer ID for deal creation
   * @returns Sync result with contact and deal IDs
   */
  async syncLead(
    lead: Partial<ILead>,
    createDeal: boolean = false,
    buyerId?: string,
  ): Promise<HubSpotSyncResult> {
    try {
      console.log("Starting HubSpot sync for lead:", lead._id);

      // Check for existing contact by email
      let contactId: string | undefined;
      if (lead.email) {
        const existingContact = await this.adapter.findContactByEmail(
          lead.email,
        );
        if (existingContact) {
          console.log("Found existing contact:", existingContact.id);
          contactId = existingContact.id;

          // Update existing contact with latest info
          await this.adapter.updateContact(contactId, {
            phone: lead.phone || "",
            company: lead.company || "",
            industry: lead.industry || "",
            lead_quality: lead.status || "unknown",
            lead_score: (lead.aiQualityScore || 0).toString(),
          });
        }
      }

      // Create new contact if not found
      if (!contactId) {
        const result = await this.adapter.createContact(lead);
        if (!result.success) {
          throw new Error(result.error || "Failed to create contact");
        }
        contactId = result.contactId!;
        console.log("Created new HubSpot contact:", contactId);
      }

      // Dispatch webhook for contact creation/update
      await this.dispatchWebhook("leadUpdated", {
        leadId: lead._id,
        contactId,
        email: lead.email,
        action: contactId ? "updated" : "created",
      });

      // Create deal if requested
      let dealId: string | undefined;
      if (createDeal && buyerId) {
        const dealResult = await this.adapter.createDeal(
          lead,
          contactId,
          buyerId,
        );
        if (!dealResult.success) {
          console.error("Deal creation failed:", dealResult.error);
          // Don't fail overall sync if deal fails
        } else {
          dealId = dealResult.dealId;
          console.log("Created HubSpot deal:", dealId);

          // Dispatch webhook for deal creation
          await this.dispatchWebhook("dealCreated", {
            leadId: lead._id,
            dealId,
            contactId,
            amount: lead.aiQualityScore || 0,
          });
        }
      }

      return {
        success: true,
        contactId,
        dealId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("HubSpot syncLead error:", errorMessage);

      // Dispatch error webhook
      await this.dispatchWebhook("error", {
        leadId: lead._id,
        error: errorMessage,
        event: "syncLead",
      }).catch(console.error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update HubSpot contact when lead is qualified
   * Updates lifecycle stage and adds note
   *
   * @param contactId HubSpot contact ID
   * @param lead Updated lead data
   */
  async syncLeadQualification(
    contactId: string,
    lead: Partial<ILead>,
  ): Promise<HubSpotSyncResult> {
    try {
      console.log("Syncing lead qualification to HubSpot:", contactId);

      const result = await this.adapter.syncLeadUpdate(contactId, lead);

      if (result.success) {
        // Dispatch qualification webhook
        await this.dispatchWebhook("leadQualified", {
          contactId,
          quality: lead.status || "unknown",
          score: lead.aiQualityScore,
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("HubSpot syncLeadQualification error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync deal acceptance when buyer accepts lead
   * Updates deal stage to "negotiation"
   *
   * @param dealId HubSpot deal ID
   * @param contactId HubSpot contact ID
   * @param buyerId BRIXCOT buyer ID
   */
  async syncDealAcceptance(
    dealId: string,
    contactId: string,
    buyerId: string,
  ): Promise<HubSpotSyncResult> {
    try {
      console.log("Syncing deal acceptance to HubSpot:", dealId);

      const result = await this.adapter.updateContact(contactId, {
        lifecyclestage: "customer",
        lead_status: "accepted",
        buyer_id: buyerId,
      });

      if (result.success) {
        // Dispatch acceptance webhook
        await this.dispatchWebhook("leadAccepted", {
          dealId,
          contactId,
          buyerId,
          acceptedAt: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("HubSpot syncDealAcceptance error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get contact from HubSpot
   * Useful for fetching latest contact info
   *
   * @param contactId HubSpot contact ID
   */
  async getContact(contactId: string) {
    try {
      return await this.adapter.getContact(contactId);
    } catch (error) {
      console.error("Error fetching HubSpot contact:", error);
      return null;
    }
  }

  /**
   * Test HubSpot connection
   * Verifies API key is valid
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.adapter.testConnection();
    } catch (error) {
      console.error("HubSpot connection test failed:", error);
      return false;
    }
  }

  /**
   * Dispatch webhook event to configured webhook
   * Sends sync events to webhooks configured in BRIXCOT
   *
   * @param event Event type (leadUpdated, dealCreated, etc.)
   * @param data Event data to send
   */
  private async dispatchWebhook(
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      if (!this.webhookConfig) {
        return; // No webhook configured
      }

      const payload = {
        type: "hubspot",
        action: event,
        data,
        source: "hubspot",
        timestamp: new Date(),
      };

      // Get secret for signing
      const secret = decryptData(this.webhookConfig.secret);

      // Generate signature
      const payloadString = JSON.stringify(payload);
      const signature = WebhookManager.generateSignature(payloadString, secret);

      // Send webhook
      const result = await WebhookManager.dispatch(
        this.webhookConfig,
        payload as any,
      );

      // Record dispatch
      if (result.success) {
        await this.webhookConfig.recordDispatch(true, 200, undefined, 0);
      } else {
        await this.webhookConfig.recordDispatch(
          false,
          result.statusCode || 500,
          result.error,
        );
      }
    } catch (error) {
      console.error("Error dispatching HubSpot webhook:", error);
      // Don't throw - webhook failure shouldn't break sync
    }
  }

  /**
   * Create HubSpot custom properties if not exist
   * Sets up BRIXCOT-specific fields in HubSpot
   */
  async initializeCustomProperties(): Promise<void> {
    try {
      console.log("Initializing HubSpot custom properties");

      // BRIXCOT-specific custom properties
      const customProperties = [
        {
          group: "brixcot",
          name: "brixcot_lead_id",
          display: "BRIXCOT Lead ID",
          type: "string",
        },
        {
          group: "brixcot",
          name: "brixcot_buyer_id",
          display: "BRIXCOT Buyer ID",
          type: "string",
        },
        {
          group: "brixcot",
          name: "lead_quality",
          display: "Lead Quality",
          type: "string",
        },
        {
          group: "brixcot",
          name: "lead_score",
          display: "Lead Score",
          type: "number",
        },
        {
          group: "brixcot",
          name: "lead_source",
          display: "Lead Source",
          type: "string",
        },
        {
          group: "brixcot",
          name: "lead_status",
          display: "Lead Status",
          type: "string",
        },
      ];

      for (const prop of customProperties) {
        try {
          await this.adapter.createCustomProperty(
            prop.group,
            prop.name,
            prop.display,
            prop.type,
          );
        } catch (error) {
          console.warn(`Failed to create custom property ${prop.name}:`, error);
          // Continue with other properties
        }
      }

      console.log("HubSpot custom properties initialized");
    } catch (error) {
      console.error("Error initializing HubSpot custom properties:", error);
      // Don't throw - custom property setup is optional
    }
  }
}

/**
 * Factory function to create HubSpot integration service
 */
export function createHubSpotService(
  apiKey: string,
  userId: Types.ObjectId,
  webhookConfig?: any,
): HubSpotIntegrationService {
  return new HubSpotIntegrationService(apiKey, userId, webhookConfig);
}
