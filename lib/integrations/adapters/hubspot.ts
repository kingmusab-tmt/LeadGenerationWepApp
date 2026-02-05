/**
 * HubSpot CRM Adapter
 * Syncs leads from BRIXCOT to HubSpot
 *
 * Date: January 21, 2026
 */

import { ILead } from "@/models/leads";

/**
 * Response types
 */
export interface HubSpotContactResponse {
  id: string;
  portalId: number;
  createdAt?: number;
  updatedAt?: number;
  archived?: boolean;
  properties?: Record<string, { value: string }>;
}

export interface HubSpotDealResponse {
  id: string;
  portalId: number;
  properties?: Record<string, { value: string }>;
}

export interface HubSpotSyncResult {
  success: boolean;
  contactId?: string;
  dealId?: string;
  error?: string;
  statusCode?: number;
}

/**
 * HubSpot CRM Integration Class
 * Handles all communication with HubSpot API
 */
export class HubSpotAdapter {
  private apiKey: string;
  private baseUrl = "https://api.hubapi.com";

  /**
   * Initialize HubSpot adapter with API key
   * @param apiKey HubSpot private app access token
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("HubSpot API key is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Convert BRIXCOT lead to HubSpot contact properties
   */
  private mapLeadToContactProperties(lead: Partial<ILead>): Array<{
    name: string;
    value: string;
  }> {
    const fullName = lead.name || "";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return [
      { name: "firstname", value: firstName },
      { name: "lastname", value: lastName },
      { name: "email", value: lead.email || "" },
      { name: "phone", value: lead.phone || "" },
      { name: "company", value: lead.company || "" },
      { name: "industry", value: lead.industry || "" },
      { name: "lifecyclestage", value: "subscriber" },
      // Custom properties
      {
        name: "lead_score",
        value: (lead.aiQualityScore || 0).toString(),
      },
      { name: "lead_source", value: "brixcot" },
      { name: "lead_quality", value: lead.status || "unknown" },
      { name: "lead_location", value: lead.location?.city || "" },
      { name: "lead_state", value: lead.location?.state || "" },
      { name: "lead_zip", value: lead.location?.zipCode || "" },
    ].filter((prop) => prop.value !== ""); // Remove empty values
  }

  /**
   * Create a new contact in HubSpot
   * Maps BRIXCOT lead to HubSpot contact
   *
   * @param lead BRIXCOT lead data
   * @returns Contact creation result with HubSpot contact ID
   */
  async createContact(lead: Partial<ILead>): Promise<HubSpotSyncResult> {
    try {
      const payload = {
        properties: this.mapLeadToContactProperties(lead),
      };

      const response = await this.post("/crm/v3/objects/contacts", payload);

      return {
        success: true,
        contactId: response.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("HubSpot createContact error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        statusCode: (error as any)?.statusCode || 500,
      };
    }
  }

  /**
   * Update existing HubSpot contact
   * Used when lead info changes
   *
   * @param contactId HubSpot contact ID
   * @param updates Fields to update
   * @returns Update result
   */
  async updateContact(
    contactId: string,
    updates: Record<string, unknown>,
  ): Promise<HubSpotSyncResult> {
    try {
      if (!contactId) {
        throw new Error("Contact ID is required");
      }

      const payload = {
        properties: Object.entries(updates)
          .map(([key, value]) => ({
            name: key,
            value: String(value || ""),
          }))
          .filter((prop) => prop.value !== ""),
      };

      const response = await this.patch(
        `/crm/v3/objects/contacts/${contactId}`,
        payload,
      );

      return {
        success: true,
        contactId: response.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("HubSpot updateContact error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        statusCode: (error as any)?.statusCode || 500,
      };
    }
  }

  /**
   * Create HubSpot deal from BRIXCOT lead
   * Called when lead is accepted by buyer
   *
   * @param lead BRIXCOT lead data
   * @param contactId HubSpot contact ID
   * @param buyerId BRIXCOT buyer ID
   * @returns Deal creation result with HubSpot deal ID
   */
  async createDeal(
    lead: Partial<ILead>,
    contactId: string,
    buyerId: string,
  ): Promise<HubSpotSyncResult> {
    try {
      if (!contactId || !buyerId) {
        throw new Error("Contact ID and Buyer ID are required");
      }

      const fullName = lead.name || "";
      const dealPayload = {
        properties: [
          {
            name: "dealname",
            value: `${fullName} - ${lead.company || "Unknown"}`,
          },
          { name: "dealstage", value: "negotiation" },
          {
            name: "amount",
            value: (lead.aiQualityScore || 0).toString(),
          },
          { name: "closedate", value: new Date().toISOString() },
          { name: "brixcot_buyer_id", value: buyerId },
          { name: "brixcot_lead_id", value: lead._id?.toString() || "" },
        ].filter((prop) => prop.value !== ""),
      };

      const dealResponse = await this.post(
        "/crm/v3/objects/deals",
        dealPayload,
      );

      // Associate contact with deal
      await this.associateContactWithDeal(contactId, dealResponse.id);

      return {
        success: true,
        dealId: dealResponse.id,
        contactId: contactId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("HubSpot createDeal error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        statusCode: (error as any)?.statusCode || 500,
      };
    }
  }

  /**
   * Associate a contact with a deal
   * Creates the link between contact and deal in HubSpot
   *
   * @param contactId HubSpot contact ID
   * @param dealId HubSpot deal ID
   */
  private async associateContactWithDeal(
    contactId: string,
    dealId: string,
  ): Promise<void> {
    try {
      const payload = {
        id: dealId,
      };

      await this.put(
        `/crm/v3/objects/contacts/${contactId}/associations/deals`,
        payload,
      );
    } catch (error) {
      console.error("HubSpot associateContactWithDeal error:", error);
      // Don't throw - association failure shouldn't fail the deal creation
    }
  }

  /**
   * Sync lead update to HubSpot contact
   * Called when lead status changes
   *
   * @param contactId HubSpot contact ID
   * @param lead Updated lead data
   * @returns Sync result
   */
  async syncLeadUpdate(
    contactId: string,
    lead: Partial<ILead>,
  ): Promise<HubSpotSyncResult> {
    try {
      const updates: Record<string, string> = {
        lifecyclestage:
          lead.status === "qualified" ? "marketingqualifiedlead" : "subscriber",
        lead_quality: lead.status || "unknown",
        lead_score: (lead.aiQualityScore || 0).toString(),
      };

      if (lead.phone) updates.phone = lead.phone;
      if (lead.email) updates.email = lead.email;
      if (lead.company) updates.company = lead.company;

      return await this.updateContact(contactId, updates);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("HubSpot syncLeadUpdate error:", errorMessage);

      return {
        success: false,
        error: errorMessage,
        statusCode: (error as any)?.statusCode || 500,
      };
    }
  }

  /**
   * Search for existing contact by email
   * Prevents duplicate contacts
   *
   * @param email Contact email address
   * @returns Contact if found, null otherwise
   */
  async findContactByEmail(
    email: string,
  ): Promise<HubSpotContactResponse | null> {
    try {
      if (!email) {
        return null;
      }

      const payload = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: email,
              },
            ],
          },
        ],
        limit: 1,
      };

      const response = await this.post(
        "/crm/v3/objects/contacts/search",
        payload,
      );

      if (response.results && response.results.length > 0) {
        return response.results[0];
      }

      return null;
    } catch (error) {
      console.error("HubSpot findContactByEmail error:", error);
      return null; // Return null if search fails
    }
  }

  /**
   * Get contact details from HubSpot
   *
   * @param contactId HubSpot contact ID
   * @returns Contact details
   */
  async getContact(contactId: string): Promise<HubSpotContactResponse | null> {
    try {
      if (!contactId) {
        return null;
      }

      const response = await this.get(
        `/crm/v3/objects/contacts/${contactId}?limit=100`,
      );
      return response;
    } catch (error) {
      console.error("HubSpot getContact error:", error);
      return null;
    }
  }

  /**
   * Create custom property in HubSpot
   * Used for custom fields mapping
   *
   * @param groupName Property group name
   * @param internalName Internal property name
   * @param displayName Display name in UI
   * @param type Property type
   */
  async createCustomProperty(
    groupName: string,
    internalName: string,
    displayName: string,
    type: string = "string",
  ): Promise<HubSpotSyncResult> {
    try {
      const payload = {
        name: internalName,
        label: displayName,
        type: type,
        groupName: groupName,
        fieldType: "text",
      };

      const response = await this.post("/crm/v3/properties/contacts", payload);

      return {
        success: true,
      };
    } catch (error) {
      // Property might already exist - don't fail
      console.warn("HubSpot createCustomProperty:", error);
      return {
        success: true,
      };
    }
  }

  /**
   * Make GET request to HubSpot API
   */
  private async get(endpoint: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse(response);
  }

  /**
   * Make POST request to HubSpot API
   */
  private async post(endpoint: string, data: unknown): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  /**
   * Make PATCH request to HubSpot API
   */
  private async patch(endpoint: string, data: unknown): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  /**
   * Make PUT request to HubSpot API
   */
  private async put(endpoint: string, data: unknown): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  /**
   * Handle HubSpot API response
   */
  private async handleResponse(response: Response): Promise<any> {
    const data = await response.json();

    if (!response.ok) {
      const error: any = new Error(
        data.message ||
          data.error_description ||
          `HubSpot API error: ${response.status}`,
      );
      error.statusCode = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Verify API key validity
   * Call this to test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/crm/v3/objects/contacts?limit=1`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.ok;
    } catch (error) {
      console.error("HubSpot connection test failed:", error);
      return false;
    }
  }
}

/**
 * Factory function to create HubSpot adapter
 * Useful for dependency injection
 */
export function createHubSpotAdapter(apiKey: string): HubSpotAdapter {
  return new HubSpotAdapter(apiKey);
}

/**
 * Export types for use in other modules
 */
export type { HubSpotAdapter as IHubSpotAdapter };
