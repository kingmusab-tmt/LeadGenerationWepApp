/**
 * Zapier Integration Service
 * Handles sending trigger webhooks to Zapier for automation workflows
 *
 * Date: January 21, 2026
 */

import { ILead } from "@/models/leads";
import { IUser } from "@/models/types/user";
import { WebhookManager } from "@/lib/integrations/webhookHandler";
import { IWebhookConfig } from "@/models/webhookConfig";

/**
 * Zapier webhook payload structure
 * Follows Zapier's expected format for trigger data
 */
export interface ZapierTriggerPayload {
  id: string; // Unique event ID
  event: string; // Event type (lead_created, lead_qualified, etc.)
  timestamp: string; // ISO 8601 timestamp
  data: {
    lead?: ZapierLeadData;
    buyer?: ZapierBuyerData;
    assignment?: ZapierAssignmentData;
    deal?: ZapierDealData;
    metadata?: Record<string, any>;
  };
}

/**
 * Lead data formatted for Zapier
 */
export interface ZapierLeadData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  status: string;
  quality: string;
  score: number;
  source: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  estimatedValue?: number;
  createdAt: string;
  updatedAt: string;
  customFields?: Record<string, any>;
}

/**
 * Buyer data formatted for Zapier
 */
export interface ZapierBuyerData {
  id: string;
  name: string;
  email: string;
  company?: string;
  industry?: string[];
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Assignment data formatted for Zapier
 */
export interface ZapierAssignmentData {
  id: string;
  leadId: string;
  buyerId: string;
  assignedAt: string;
  accepted: boolean;
  rejected: boolean;
  notes?: string;
}

/**
 * Deal data formatted for Zapier
 */
export interface ZapierDealData {
  id: string;
  leadId: string;
  buyerId: string;
  amount: number;
  status: string;
  closedAt?: string;
  createdAt: string;
}

/**
 * Zapier trigger event types
 */
export enum ZapierTriggerEvent {
  LEAD_CREATED = "lead_created",
  LEAD_UPDATED = "lead_updated",
  LEAD_QUALIFIED = "lead_qualified",
  LEAD_ASSIGNED = "lead_assigned",
  LEAD_ACCEPTED = "lead_accepted",
  LEAD_REJECTED = "lead_rejected",
  LEAD_SOLD = "lead_sold",
  DEAL_CREATED = "deal_created",
  DEAL_WON = "deal_won",
  DEAL_LOST = "deal_lost",
  BUYER_REGISTERED = "buyer_registered",
  PAYMENT_RECEIVED = "payment_received",
}

/**
 * Zapier Integration Service
 * Sends trigger webhooks to Zapier when events occur in BRIXCOT
 */
export class ZapierIntegrationService {
  private webhookUrl: string;
  private secret: string;
  private userId: string;
  private enabled: boolean;

  constructor(webhookUrl: string, secret: string, userId: string) {
    this.webhookUrl = webhookUrl;
    this.secret = secret;
    this.userId = userId;
    this.enabled = true;
  }

  /**
   * Format lead data for Zapier
   */
  private formatLeadData(lead: Partial<ILead>): ZapierLeadData {
    return {
      id: lead._id?.toString() || "",
      name: lead.name || "Unknown",
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      industry: lead.industry,
      status: lead.status || "new",
      quality: lead.status || "unknown",
      score: lead.aiQualityScore || 0,
      source: lead.leadSource || "unknown",
      location: lead.location
        ? {
            city: lead.location.city,
            state: lead.location.state,
            country: lead.location.country,
            zipCode: lead.location.zipCode,
          }
        : undefined,
      estimatedValue: lead.aiQualityScore || 0,
      createdAt: lead.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: lead.updatedAt?.toISOString() || new Date().toISOString(),
      customFields: lead.fields
        ? lead.fields.reduce(
            (acc, field) => {
              acc[field.label] = field.value;
              return acc;
            },
            {} as Record<string, any>,
          )
        : undefined,
    };
  }

  /**
   * Format buyer data for Zapier
   */
  private formatBuyerData(buyer: Partial<IUser>): ZapierBuyerData {
    return {
      id: buyer._id?.toString() || "",
      name: buyer.name || "Unknown",
      email: buyer.email || "",
      company: (buyer as any).company,
      industry: (buyer as any).industry,
      location: (buyer as any).location
        ? {
            city: (buyer as any).location.city,
            state: (buyer as any).location.state,
            country: (buyer as any).location.country,
          }
        : undefined,
    };
  }

  /**
   * Send trigger to Zapier
   *
   * @param event Event type
   * @param payload Event data
   * @returns Success/failure
   */
  private async sendTrigger(
    event: ZapierTriggerEvent,
    payload: ZapierTriggerPayload,
  ): Promise<boolean> {
    if (!this.enabled) {
      console.log("Zapier integration disabled, skipping trigger");
      return false;
    }

    try {
      const webhookPayload = JSON.stringify(payload);
      const signature = WebhookManager.generateSignature(
        webhookPayload,
        this.secret,
      );

      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Zapier-Signature": signature,
          "X-Zapier-Timestamp": Date.now().toString(),
          "X-Zapier-Event": event,
        },
        body: webhookPayload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Zapier webhook failed (${response.status}): ${errorText}`,
        );
      }

      console.log(`Zapier trigger sent successfully: ${event}`);
      return true;
    } catch (error) {
      console.error(`Failed to send Zapier trigger (${event}):`, error);
      return false;
    }
  }

  /**
   * Trigger: Lead Created
   * Fires when a new lead is created in BRIXCOT
   */
  async triggerLeadCreated(lead: Partial<ILead>): Promise<boolean> {
    const payload: ZapierTriggerPayload = {
      id: `lead_created_${lead._id}_${Date.now()}`,
      event: ZapierTriggerEvent.LEAD_CREATED,
      timestamp: new Date().toISOString(),
      data: {
        lead: this.formatLeadData(lead),
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.LEAD_CREATED, payload);
  }

  /**
   * Trigger: Lead Updated
   * Fires when a lead is updated
   */
  async triggerLeadUpdated(
    lead: Partial<ILead>,
    changes?: string[],
  ): Promise<boolean> {
    const payload: ZapierTriggerPayload = {
      id: `lead_updated_${lead._id}_${Date.now()}`,
      event: ZapierTriggerEvent.LEAD_UPDATED,
      timestamp: new Date().toISOString(),
      data: {
        lead: this.formatLeadData(lead),
        metadata: changes ? { changedFields: changes } : undefined,
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.LEAD_UPDATED, payload);
  }

  /**
   * Trigger: Lead Qualified
   * Fires when a lead is marked as qualified
   */
  async triggerLeadQualified(lead: Partial<ILead>): Promise<boolean> {
    const payload: ZapierTriggerPayload = {
      id: `lead_qualified_${lead._id}_${Date.now()}`,
      event: ZapierTriggerEvent.LEAD_QUALIFIED,
      timestamp: new Date().toISOString(),
      data: {
        lead: this.formatLeadData(lead),
        metadata: {
          qualificationScore: lead.aiQualityScore || 0,
          previousStatus: "available",
          newStatus: "qualified",
        },
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.LEAD_QUALIFIED, payload);
  }

  /**
   * Trigger: Lead Assigned
   * Fires when a lead is assigned to a buyer
   */
  async triggerLeadAssigned(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    assignmentId: string,
  ): Promise<boolean> {
    const payload: ZapierTriggerPayload = {
      id: `lead_assigned_${lead._id}_${Date.now()}`,
      event: ZapierTriggerEvent.LEAD_ASSIGNED,
      timestamp: new Date().toISOString(),
      data: {
        lead: this.formatLeadData(lead),
        buyer: this.formatBuyerData(buyer),
        assignment: {
          id: assignmentId,
          leadId: lead._id?.toString() || "",
          buyerId: buyer._id?.toString() || "",
          assignedAt: new Date().toISOString(),
          accepted: false,
          rejected: false,
        },
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.LEAD_ASSIGNED, payload);
  }

  /**
   * Trigger: Lead Accepted
   * Fires when a buyer accepts an assigned lead
   */
  async triggerLeadAccepted(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
  ): Promise<boolean> {
    const payload: ZapierTriggerPayload = {
      id: `lead_accepted_${lead._id}_${Date.now()}`,
      event: ZapierTriggerEvent.LEAD_ACCEPTED,
      timestamp: new Date().toISOString(),
      data: {
        lead: this.formatLeadData(lead),
        buyer: this.formatBuyerData(buyer),
        metadata: {
          acceptedAt: new Date().toISOString(),
        },
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.LEAD_ACCEPTED, payload);
  }

  /**
   * Trigger: Lead Rejected
   * Fires when a buyer rejects an assigned lead
   */
  async triggerLeadRejected(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    reason?: string,
  ): Promise<boolean> {
    const payload: ZapierTriggerPayload = {
      id: `lead_rejected_${lead._id}_${Date.now()}`,
      event: ZapierTriggerEvent.LEAD_REJECTED,
      timestamp: new Date().toISOString(),
      data: {
        lead: this.formatLeadData(lead),
        buyer: this.formatBuyerData(buyer),
        metadata: {
          rejectedAt: new Date().toISOString(),
          reason: reason || "Not specified",
        },
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.LEAD_REJECTED, payload);
  }

  /**
   * Trigger: Lead Sold
   * Fires when a lead is marked as sold/converted
   */
  async triggerLeadSold(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    amount?: number,
  ): Promise<boolean> {
    const payload: ZapierTriggerPayload = {
      id: `lead_sold_${lead._id}_${Date.now()}`,
      event: ZapierTriggerEvent.LEAD_SOLD,
      timestamp: new Date().toISOString(),
      data: {
        lead: this.formatLeadData(lead),
        buyer: this.formatBuyerData(buyer),
        deal: {
          id: `deal_${lead._id}_${Date.now()}`,
          leadId: lead._id?.toString() || "",
          buyerId: buyer._id?.toString() || "",
          amount: amount || 0,
          status: "won",
          closedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.LEAD_SOLD, payload);
  }

  /**
   * Trigger: Deal Created
   * Fires when a new deal/opportunity is created
   */
  async triggerDealCreated(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    dealId: string,
    amount: number,
  ): Promise<boolean> {
    const payload: ZapierTriggerPayload = {
      id: `deal_created_${dealId}_${Date.now()}`,
      event: ZapierTriggerEvent.DEAL_CREATED,
      timestamp: new Date().toISOString(),
      data: {
        lead: this.formatLeadData(lead),
        buyer: this.formatBuyerData(buyer),
        deal: {
          id: dealId,
          leadId: lead._id?.toString() || "",
          buyerId: buyer._id?.toString() || "",
          amount: amount,
          status: "open",
          createdAt: new Date().toISOString(),
        },
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.DEAL_CREATED, payload);
  }

  /**
   * Trigger: Deal Won
   * Fires when a deal is closed/won
   */
  async triggerDealWon(
    lead: Partial<ILead>,
    buyer: Partial<IUser>,
    dealId: string,
    amount: number,
  ): Promise<boolean> {
    const payload: ZapierTriggerPayload = {
      id: `deal_won_${dealId}_${Date.now()}`,
      event: ZapierTriggerEvent.DEAL_WON,
      timestamp: new Date().toISOString(),
      data: {
        lead: this.formatLeadData(lead),
        buyer: this.formatBuyerData(buyer),
        deal: {
          id: dealId,
          leadId: lead._id?.toString() || "",
          buyerId: buyer._id?.toString() || "",
          amount: amount,
          status: "won",
          closedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.DEAL_WON, payload);
  }

  /**
   * Trigger: Buyer Registered
   * Fires when a new buyer registers
   */
  async triggerBuyerRegistered(buyer: Partial<IUser>): Promise<boolean> {
    const payload: ZapierTriggerPayload = {
      id: `buyer_registered_${buyer._id}_${Date.now()}`,
      event: ZapierTriggerEvent.BUYER_REGISTERED,
      timestamp: new Date().toISOString(),
      data: {
        buyer: this.formatBuyerData(buyer),
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.BUYER_REGISTERED, payload);
  }

  /**
   * Enable/disable Zapier integration
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Test Zapier webhook connection
   */
  async testConnection(): Promise<boolean> {
    const testPayload: ZapierTriggerPayload = {
      id: `test_${Date.now()}`,
      event: ZapierTriggerEvent.LEAD_CREATED,
      timestamp: new Date().toISOString(),
      data: {
        lead: {
          id: "test_lead_123",
          name: "Test Lead",
          email: "test@example.com",
          phone: "+1234567890",
          company: "Test Company",
          industry: "Technology",
          status: "new",
          quality: "unknown",
          score: 0,
          source: "test",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        metadata: {
          test: true,
          message: "This is a test trigger from BRIXCOT",
        },
      },
    };

    return this.sendTrigger(ZapierTriggerEvent.LEAD_CREATED, testPayload);
  }
}

/**
 * Create Zapier integration service
 *
 * @param webhookUrl Zapier webhook URL (from Zap setup)
 * @param secret Secret key for webhook signature
 * @param userId BRIXCOT user ID
 * @returns ZapierIntegrationService instance
 */
export function createZapierService(
  webhookUrl: string,
  secret: string,
  userId: string,
): ZapierIntegrationService {
  return new ZapierIntegrationService(webhookUrl, secret, userId);
}
