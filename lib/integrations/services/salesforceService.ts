/**
 * Salesforce Integration Service
 * Business logic layer for Salesforce CRM integration
 *
 * Date: January 21, 2026
 */

import {
  SalesforceAdapter,
  SalesforceSyncResult,
  SalesforceLeadResponse,
  SalesforceOpportunityResponse,
} from "@/lib/integrations/adapters/salesforce";
import { ILead } from "@/models/leads";
import { IWebhookConfig } from "@/models/webhookConfig";
import { WebhookManager } from "@/lib/integrations/webhookHandler";

/**
 * Salesforce Integration Service
 * Handles high-level Salesforce synchronization logic
 */
export class SalesforceIntegrationService {
  private adapter: SalesforceAdapter;
  private userId: string;
  private webhookConfig?: IWebhookConfig;

  constructor(
    instanceUrl: string,
    accessToken: string,
    userId: string,
    webhookConfig?: IWebhookConfig,
  ) {
    this.adapter = new SalesforceAdapter(instanceUrl, accessToken);
    this.userId = userId;
    this.webhookConfig = webhookConfig;
  }

  /**
   * Sync BRIXCOT lead to Salesforce
   * Creates or updates Salesforce Lead and optionally creates Opportunity
   *
   * @param lead BRIXCOT lead data
   * @param createOpportunity Whether to create opportunity
   * @param buyerId BRIXCOT buyer ID (for opportunity)
   * @returns Sync result with Salesforce IDs
   */
  async syncLead(
    lead: Partial<ILead>,
    createOpportunity: boolean = false,
    buyerId?: string,
  ): Promise<SalesforceSyncResult> {
    try {
      let leadId: string | undefined;
      let opportunityId: string | undefined;

      // Check for existing lead by email
      if (lead.email) {
        const existingLead = await this.adapter.findLeadByEmail(lead.email);

        if (existingLead) {
          console.log("Found existing Salesforce lead:", existingLead.Id);
          leadId = existingLead.Id;

          // Update existing lead with latest info
          await this.adapter.updateLead(leadId, {
            Phone: lead.phone || undefined,
            Company: lead.company || "Unknown",
            Industry: lead.industry || undefined,
            Status: lead.status || "new",
            Rating: lead.aiQualityScore || 0,
            BRIXCOT_Lead_Score__c: lead.aiQualityScore || 0,
          });
        }
      }

      // Create new lead if not found
      if (!leadId) {
        console.log("Creating new Salesforce lead");
        const createResult = await this.adapter.createLead(lead);

        if (!createResult.success) {
          throw new Error(
            createResult.error || "Failed to create Salesforce lead",
          );
        }

        leadId = createResult.leadId;
        console.log("Created Salesforce lead:", leadId);

        // Dispatch webhook for lead creation
        await this.dispatchWebhook("leadCreated", {
          leadId: lead._id,
          salesforceLeadId: leadId,
        });
      }

      // Create opportunity if requested
      if (createOpportunity && buyerId && leadId) {
        try {
          // For qualified leads, convert to Contact first
          if (lead.status === "qualified") {
            const conversionResult = await this.adapter.convertLead(leadId);

            if (conversionResult.success) {
              opportunityId = conversionResult.opportunityId;
              console.log(
                "Lead converted, opportunity created:",
                opportunityId,
              );
            }
          } else {
            // Create standalone opportunity
            const opportunityResult = await this.adapter.createOpportunity(
              lead,
              undefined,
              buyerId,
            );

            if (opportunityResult.success) {
              opportunityId = opportunityResult.opportunityId;
              console.log("Created Salesforce opportunity:", opportunityId);
            }
          }

          // Dispatch webhook for opportunity creation
          if (opportunityId) {
            await this.dispatchWebhook("opportunityCreated", {
              leadId: lead._id,
              opportunityId,
              salesforceLeadId: leadId,
              amount: lead.aiQualityScore || 0,
            });
          }
        } catch (error) {
          // Don't fail the entire sync if opportunity creation fails
          console.error("Failed to create opportunity:", error);
        }
      }

      return {
        success: true,
        leadId,
        opportunityId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Salesforce syncLead error:", errorMessage);

      // Dispatch error webhook
      await this.dispatchWebhook("error", {
        leadId: lead._id,
        error: errorMessage,
        operation: "syncLead",
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync lead qualification to Salesforce
   * Updates lead status and rating
   *
   * @param salesforceLeadId Salesforce Lead ID
   * @param lead Updated BRIXCOT lead data
   * @returns Sync result
   */
  async syncLeadQualification(
    salesforceLeadId: string,
    lead: Partial<ILead>,
  ): Promise<SalesforceSyncResult> {
    try {
      const result = await this.adapter.syncLeadUpdate(salesforceLeadId, lead);

      if (result.success) {
        // Dispatch qualification webhook
        await this.dispatchWebhook("leadQualified", {
          salesforceLeadId,
          status: lead.status || "unknown",
          score: lead.aiQualityScore,
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Salesforce syncLeadQualification error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync opportunity acceptance when buyer accepts lead
   * Updates opportunity stage to "Negotiation/Review"
   *
   * @param opportunityId Salesforce Opportunity ID
   * @param buyerId BRIXCOT buyer ID
   * @returns Sync result
   */
  async syncOpportunityAcceptance(
    opportunityId: string,
    buyerId: string,
  ): Promise<SalesforceSyncResult> {
    try {
      const result = await this.adapter.updateOpportunityStage(
        opportunityId,
        "Negotiation/Review",
        50, // 50% probability when buyer accepts
      );

      if (result.success) {
        // Dispatch acceptance webhook
        await this.dispatchWebhook("opportunityAccepted", {
          opportunityId,
          buyerId,
          stage: "Negotiation/Review",
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        "Salesforce syncOpportunityAcceptance error:",
        errorMessage,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Convert qualified lead to Contact and Opportunity
   *
   * @param salesforceLeadId Salesforce Lead ID
   * @returns Sync result with Contact and Opportunity IDs
   */
  async convertQualifiedLead(
    salesforceLeadId: string,
  ): Promise<SalesforceSyncResult> {
    try {
      const result = await this.adapter.convertLead(salesforceLeadId);

      if (result.success) {
        await this.dispatchWebhook("leadConverted", {
          salesforceLeadId,
          contactId: result.contactId,
          opportunityId: result.opportunityId,
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Salesforce convertQualifiedLead error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get Salesforce lead details
   *
   * @param salesforceLeadId Salesforce Lead ID
   * @returns Lead data or null
   */
  async getLead(
    salesforceLeadId: string,
  ): Promise<SalesforceLeadResponse | null> {
    return this.adapter.getLead(salesforceLeadId);
  }

  /**
   * Get Salesforce opportunity details
   *
   * @param opportunityId Salesforce Opportunity ID
   * @returns Opportunity data or null
   */
  async getOpportunity(
    opportunityId: string,
  ): Promise<SalesforceOpportunityResponse | null> {
    return this.adapter.getOpportunity(opportunityId);
  }

  /**
   * Test Salesforce connection
   *
   * @returns True if connection successful
   */
  async testConnection(): Promise<boolean> {
    return this.adapter.testConnection();
  }

  /**
   * Get custom field setup instructions
   *
   * @returns Array of instructions
   */
  getCustomFieldInstructions(): string[] {
    return this.adapter.getCustomFieldInstructions();
  }

  /**
   * Dispatch webhook event if webhook config exists
   *
   * @param eventType Event type (leadCreated, opportunityCreated, etc.)
   * @param payload Event data
   */
  private async dispatchWebhook(
    eventType: string,
    payload: any,
  ): Promise<void> {
    if (!this.webhookConfig) {
      return;
    }

    try {
      const webhookPayload = JSON.stringify({
        event: eventType,
        source: "salesforce",
        timestamp: new Date().toISOString(),
        userId: this.userId,
        data: payload,
      });

      const signature = WebhookManager.generateSignature(
        webhookPayload,
        this.webhookConfig.secret,
      );

      await fetch(this.webhookConfig.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": Date.now().toString(),
        },
        body: webhookPayload,
      });
    } catch (error) {
      console.error("Failed to dispatch Salesforce webhook:", error);
      // Don't throw - webhook dispatch failure shouldn't break sync
    }
  }
}

/**
 * Create Salesforce integration service
 *
 * @param instanceUrl Salesforce instance URL
 * @param accessToken OAuth access token
 * @param userId BRIXCOT user ID
 * @param webhookConfig Optional webhook configuration
 * @returns SalesforceIntegrationService instance
 */
export function createSalesforceService(
  instanceUrl: string,
  accessToken: string,
  userId: string,
  webhookConfig?: IWebhookConfig,
): SalesforceIntegrationService {
  return new SalesforceIntegrationService(
    instanceUrl,
    accessToken,
    userId,
    webhookConfig,
  );
}
