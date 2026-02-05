/**
 * Salesforce CRM Integration Adapter
 * Handles API communication with Salesforce for lead and opportunity management
 *
 * Date: January 21, 2026
 */

import { ILead } from "@/models/leads";

/**
 * Salesforce API Response Interfaces
 */
export interface SalesforceLeadResponse {
  Id: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Company: string;
  Status: string;
  Industry?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  LeadSource?: string;
  Rating?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  IsDeleted: boolean;
}

export interface SalesforceOpportunityResponse {
  Id: string;
  Name: string;
  StageName: string;
  Amount?: number;
  CloseDate: string;
  Probability: number;
  LeadSource?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  IsDeleted: boolean;
}

export interface SalesforceContactResponse {
  Id: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  AccountId?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  IsDeleted: boolean;
}

export interface SalesforceSyncResult {
  success: boolean;
  leadId?: string;
  contactId?: string;
  opportunityId?: string;
  error?: string;
}

/**
 * Salesforce API Adapter
 * Provides methods to interact with Salesforce API
 */
export class SalesforceAdapter {
  private instanceUrl: string;
  private accessToken: string;
  private apiVersion: string = "v59.0"; // Latest API version

  constructor(instanceUrl: string, accessToken: string) {
    this.instanceUrl = instanceUrl.replace(/\/$/, ""); // Remove trailing slash
    this.accessToken = accessToken;
  }

  /**
   * Make authenticated request to Salesforce API
   */
  private async request(
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<any> {
    const url = `${this.instanceUrl}/services/data/${this.apiVersion}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Salesforce API error (${response.status}): ${errorText}`,
      );
    }

    // Some endpoints return 204 No Content on success
    if (response.status === 204) {
      return { success: true };
    }

    return response.json();
  }

  /**
   * Convert BRIXCOT lead to Salesforce Lead object
   */
  private mapLeadToSalesforceProperties(lead: Partial<ILead>): any {
    const fullName = lead.name || "";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "Unknown";

    return {
      FirstName: firstName || undefined,
      LastName: lastName,
      Email: lead.email || undefined,
      Phone: lead.phone || undefined,
      Company: lead.company || "Unknown",
      Industry: lead.industry || undefined,
      City: lead.location?.city || undefined,
      State: lead.location?.state || undefined,
      PostalCode: lead.location?.zipCode || undefined,
      LeadSource: lead.leadSource || "BRIXCOT",
      Status: this.mapBrixcotStatusToSalesforce(lead.status),
      Rating: this.mapQualificationScoreToRating(lead.aiQualityScore || 0),
      // Custom fields (requires setup in Salesforce)
      BRIXCOT_Lead_ID__c: lead._id?.toString(),
      BRIXCOT_Lead_Score__c: lead.aiQualityScore || 0,
    };
  }

  /**
   * Map BRIXCOT lead status to Salesforce Lead Status
   */
  private mapBrixcotStatusToSalesforce(status?: string): string {
    const statusMap: Record<string, string> = {
      new: "Open - Not Contacted",
      available: "Working - Contacted",
      qualified: "Qualified",
      unqualified: "Unqualified",
      assigned: "Working - Contacted",
      sold: "Closed - Converted",
      transferred: "Working - Contacted",
    };

    return statusMap[status || "new"] || "Open - Not Contacted";
  }

  /**
   * Map qualification score to Salesforce Rating (Hot/Warm/Cold)
   */
  private mapQualificationScoreToRating(score: number): string {
    if (score >= 70) return "Hot";
    if (score >= 40) return "Warm";
    return "Cold";
  }

  /**
   * Create a new lead in Salesforce
   *
   * @param lead BRIXCOT lead data
   * @returns Sync result with Salesforce Lead ID
   */
  async createLead(lead: Partial<ILead>): Promise<SalesforceSyncResult> {
    try {
      const salesforceData = this.mapLeadToSalesforceProperties(lead);

      const result = await this.request(
        "POST",
        "/sobjects/Lead/",
        salesforceData,
      );

      return {
        success: result.success,
        leadId: result.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Salesforce createLead error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update existing Salesforce lead
   *
   * @param leadId Salesforce Lead ID
   * @param updates Fields to update
   * @returns Sync result
   */
  async updateLead(
    leadId: string,
    updates: Record<string, any>,
  ): Promise<SalesforceSyncResult> {
    try {
      await this.request("PATCH", `/sobjects/Lead/${leadId}`, updates);

      return {
        success: true,
        leadId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Salesforce updateLead error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Convert Salesforce Lead to Contact (when lead is qualified)
   *
   * @param leadId Salesforce Lead ID
   * @returns Sync result with Contact ID
   */
  async convertLead(leadId: string): Promise<SalesforceSyncResult> {
    try {
      // Salesforce Lead Conversion
      const conversionData = {
        leadId,
        convertedStatus: "Qualified",
        doNotCreateOpportunity: false, // Create opportunity
      };

      const result = await this.request(
        "POST",
        "/sobjects/Lead/convert",
        conversionData,
      );

      return {
        success: result.success,
        contactId: result.contactId,
        opportunityId: result.opportunityId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Salesforce convertLead error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create opportunity from BRIXCOT lead
   *
   * @param lead BRIXCOT lead
   * @param contactId Salesforce Contact ID (optional)
   * @param buyerId BRIXCOT buyer ID
   * @returns Sync result with Opportunity ID
   */
  async createOpportunity(
    lead: Partial<ILead>,
    contactId?: string,
    buyerId?: string,
  ): Promise<SalesforceSyncResult> {
    try {
      const fullName = lead.name || "Unknown";
      const opportunityData = {
        Name: `${fullName} - ${lead.company || "Unknown"}`,
        StageName: "Prospecting",
        CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 30 days from now
        Amount: lead.aiQualityScore || 0,
        LeadSource: lead.leadSource || "BRIXCOT",
        Probability: 10, // Initial probability
        // Custom fields
        BRIXCOT_Lead_ID__c: lead._id?.toString(),
        BRIXCOT_Buyer_ID__c: buyerId,
      };

      // If contact provided, link to contact's account
      if (contactId) {
        const contact = await this.getContact(contactId);
        if (contact && contact.AccountId) {
          (opportunityData as any).AccountId = contact.AccountId;
        }
      }

      const result = await this.request(
        "POST",
        "/sobjects/Opportunity/",
        opportunityData,
      );

      return {
        success: result.success,
        opportunityId: result.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Salesforce createOpportunity error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update opportunity stage
   *
   * @param opportunityId Salesforce Opportunity ID
   * @param stage New stage name
   * @param probability Win probability (0-100)
   * @returns Sync result
   */
  async updateOpportunityStage(
    opportunityId: string,
    stage: string,
    probability: number,
  ): Promise<SalesforceSyncResult> {
    try {
      await this.request("PATCH", `/sobjects/Opportunity/${opportunityId}`, {
        StageName: stage,
        Probability: probability,
      });

      return {
        success: true,
        opportunityId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Salesforce updateOpportunityStage error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Find lead by email
   *
   * @param email Email address
   * @returns Salesforce Lead or null
   */
  async findLeadByEmail(email: string): Promise<SalesforceLeadResponse | null> {
    try {
      const query = `SELECT Id, FirstName, LastName, Email, Phone, Company, Status, Industry, City, State, PostalCode, LeadSource, Rating, CreatedDate, LastModifiedDate, IsDeleted FROM Lead WHERE Email = '${email}' AND IsDeleted = false LIMIT 1`;

      const result = await this.request(
        "GET",
        `/query?q=${encodeURIComponent(query)}`,
      );

      if (result.totalSize > 0) {
        return result.records[0];
      }

      return null;
    } catch (error) {
      console.error("Salesforce findLeadByEmail error:", error);
      return null;
    }
  }

  /**
   * Get lead details
   *
   * @param leadId Salesforce Lead ID
   * @returns Lead data or null
   */
  async getLead(leadId: string): Promise<SalesforceLeadResponse | null> {
    try {
      const result = await this.request("GET", `/sobjects/Lead/${leadId}`);
      return result;
    } catch (error) {
      console.error("Salesforce getLead error:", error);
      return null;
    }
  }

  /**
   * Get contact details
   *
   * @param contactId Salesforce Contact ID
   * @returns Contact data or null
   */
  async getContact(
    contactId: string,
  ): Promise<SalesforceContactResponse | null> {
    try {
      const result = await this.request(
        "GET",
        `/sobjects/Contact/${contactId}`,
      );
      return result;
    } catch (error) {
      console.error("Salesforce getContact error:", error);
      return null;
    }
  }

  /**
   * Get opportunity details
   *
   * @param opportunityId Salesforce Opportunity ID
   * @returns Opportunity data or null
   */
  async getOpportunity(
    opportunityId: string,
  ): Promise<SalesforceOpportunityResponse | null> {
    try {
      const result = await this.request(
        "GET",
        `/sobjects/Opportunity/${opportunityId}`,
      );
      return result;
    } catch (error) {
      console.error("Salesforce getOpportunity error:", error);
      return null;
    }
  }

  /**
   * Sync lead status update to Salesforce
   *
   * @param leadId Salesforce Lead ID
   * @param lead Updated BRIXCOT lead data
   * @returns Sync result
   */
  async syncLeadUpdate(
    leadId: string,
    lead: Partial<ILead>,
  ): Promise<SalesforceSyncResult> {
    try {
      const updates: Record<string, any> = {
        Status: this.mapBrixcotStatusToSalesforce(lead.status),
        Rating: this.mapQualificationScoreToRating(lead.aiQualityScore || 0),
        BRIXCOT_Lead_Score__c: lead.aiQualityScore || 0,
      };

      if (lead.phone) updates.Phone = lead.phone;
      if (lead.email) updates.Email = lead.email;
      if (lead.company) updates.Company = lead.company;

      const result = await this.updateLead(leadId, updates);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Salesforce syncLeadUpdate error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Test Salesforce API connection
   *
   * @returns True if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Query for organization info to verify connection
      const result = await this.request(
        "GET",
        "/sobjects/Organization/describe",
      );
      return result && result.name === "Organization";
    } catch (error) {
      console.error("Salesforce connection test failed:", error);
      return false;
    }
  }

  /**
   * Create custom fields in Salesforce
   * Note: Custom field creation requires Salesforce Metadata API
   * This is a placeholder - actual implementation requires OAuth and Metadata API
   *
   * @returns Instructions for manual setup
   */
  getCustomFieldInstructions(): string[] {
    return [
      "Create the following custom fields in Salesforce Setup:",
      "1. Lead Object:",
      "   - BRIXCOT_Lead_ID__c (Text, 50 chars) - External ID",
      "   - BRIXCOT_Lead_Score__c (Number, 3 digits, 0 decimals)",
      "2. Opportunity Object:",
      "   - BRIXCOT_Lead_ID__c (Text, 50 chars) - External ID",
      "   - BRIXCOT_Buyer_ID__c (Text, 50 chars)",
      "3. Contact Object:",
      "   - BRIXCOT_Lead_ID__c (Text, 50 chars) - External ID",
    ];
  }
}

/**
 * Create Salesforce adapter instance
 *
 * @param instanceUrl Salesforce instance URL (e.g., https://yourorg.my.salesforce.com)
 * @param accessToken OAuth access token
 * @returns SalesforceAdapter instance
 */
export function createSalesforceAdapter(
  instanceUrl: string,
  accessToken: string,
): SalesforceAdapter {
  return new SalesforceAdapter(instanceUrl, accessToken);
}
