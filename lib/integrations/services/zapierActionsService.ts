/**
 * Zapier Actions Service
 * Handles incoming actions from Zapier to perform operations in BRIXCOT
 *
 * Zapier Actions allow Zapier to:
 * - Create leads in BRIXCOT
 * - Update existing leads
 * - Assign leads to buyers
 * - Update lead status
 * - Search for leads
 *
 * Date: January 21, 2026
 */

import { ILead, Lead } from "@/models/leads";
import { User } from "@/models/userModel";
import { IUser } from "@/models/types/user";
import mongoose from "mongoose";

/**
 * Zapier action result structure
 */
export interface ZapierActionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * Lead creation input from Zapier
 */
export interface ZapierCreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  source?: string;
  status?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  customFields?: Record<string, any>;
}

/**
 * Lead update input from Zapier
 */
export interface ZapierUpdateLeadInput {
  leadId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  status?: ILead["status"];
  qualificationScore?: number;
  customFields?: Record<string, any>;
}

/**
 * Lead search input from Zapier
 */
export interface ZapierSearchLeadInput {
  email?: string;
  phone?: string;
  name?: string;
  status?: string;
  limit?: number;
}

/**
 * Zapier Actions Service
 * Provides actions that Zapier can call to interact with BRIXCOT
 */
export class ZapierActionsService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Action: Create Lead
   * Creates a new lead in BRIXCOT from Zapier data
   *
   * @param input Lead data from Zapier
   * @returns Created lead
   */
  async createLead(input: ZapierCreateLeadInput): Promise<ZapierActionResult> {
    try {
      // Validate required fields
      if (!input.name) {
        return {
          success: false,
          error: "Lead name is required",
        };
      }

      // Build lead object
      const leadData: Partial<ILead> = {
        name: input.name,
        email: input.email || undefined,
        phone: input.phone || undefined,
        company: input.company || undefined,
        industry: input.industry || undefined,
        leadSource: input.source || "zapier",
        status: (input.status as ILead["status"]) || "new",
        userId: new mongoose.Types.ObjectId(this.userId),
        exclusive: false,
        shared: false,
        shareNumber: 1,
        soldCount: 0,
        unit: 5,
        soldTo: [],
        assignedTo: [],
        isManual: false,
        aiQualityScore: 0,
        followUps: [],
        fields: [],
      };

      // Add location if provided
      if (input.city || input.state || input.country || input.zipCode) {
        leadData.location = {
          city: input.city,
          state: input.state,
          country: input.country || "USA",
          zipCode: input.zipCode,
        };
      }

      // Add custom fields
      if (input.customFields && typeof input.customFields === "object") {
        leadData.fields = Object.entries(input.customFields).map(
          ([key, value]) => ({
            id: key.toLowerCase().replace(/\s+/g, "_"),
            label: key,
            value: value,
          }),
        );
      }

      // Create lead
      const lead = await Lead.create(leadData);

      return {
        success: true,
        data: {
          id: lead._id.toString(),
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          status: lead.status,
          createdAt: lead.createdAt,
        },
        message: "Lead created successfully",
      };
    } catch (error) {
      console.error("Zapier createLead error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Action: Update Lead
   * Updates an existing lead in BRIXCOT
   *
   * @param input Update data from Zapier
   * @returns Updated lead
   */
  async updateLead(input: ZapierUpdateLeadInput): Promise<ZapierActionResult> {
    try {
      // Validate lead ID
      if (!input.leadId) {
        return {
          success: false,
          error: "Lead ID is required",
        };
      }

      // Find lead
      const lead = await Lead.findOne({
        _id: input.leadId,
        userId: this.userId,
      });

      if (!lead) {
        return {
          success: false,
          error: "Lead not found or access denied",
        };
      }

      // Build updates
      const updates: Partial<ILead> = {};

      if (input.name !== undefined) updates.name = input.name;
      if (input.email !== undefined) updates.email = input.email;
      if (input.phone !== undefined) updates.phone = input.phone;
      if (input.company !== undefined) updates.company = input.company;
      if (input.industry !== undefined) updates.industry = input.industry;
      if (input.status !== undefined) updates.status = input.status;
      if (input.qualificationScore !== undefined) {
        updates.aiQualityScore = input.qualificationScore;
      }

      // Update custom fields
      if (input.customFields && typeof input.customFields === "object") {
        const existingFields = lead.fields || [];
        const customFieldUpdates = Object.entries(input.customFields).map(
          ([key, value]) => ({
            id: key.toLowerCase().replace(/\s+/g, "_"),
            label: key,
            value: value,
          }),
        );

        // Merge with existing fields
        updates.fields = [
          ...existingFields.filter(
            (f) =>
              !customFieldUpdates.some(
                (cf) => cf.id === f.id || cf.label === f.label,
              ),
          ),
          ...customFieldUpdates,
        ];
      }

      // Apply updates
      Object.assign(lead, updates);
      await lead.save();

      return {
        success: true,
        data: {
          id: lead._id.toString(),
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          status: lead.status,
          qualificationScore: lead.aiQualityScore,
          updatedAt: lead.updatedAt,
        },
        message: "Lead updated successfully",
      };
    } catch (error) {
      console.error("Zapier updateLead error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Action: Search Leads
   * Finds leads matching search criteria
   *
   * @param input Search criteria from Zapier
   * @returns Matching leads
   */
  async searchLeads(input: ZapierSearchLeadInput): Promise<ZapierActionResult> {
    try {
      // Build query
      const query: any = { userId: this.userId };

      if (input.email) {
        query.email = { $regex: new RegExp(input.email, "i") };
      }

      if (input.phone) {
        query.phone = { $regex: new RegExp(input.phone.replace(/\D/g, "")) };
      }

      if (input.name) {
        query.name = { $regex: new RegExp(input.name, "i") };
      }

      if (input.status) {
        query.status = input.status;
      }

      // Execute search
      const limit = Math.min(input.limit || 10, 100); // Max 100 results
      const leads = await Lead.find(query).limit(limit).sort({ createdAt: -1 });

      return {
        success: true,
        data: leads.map((lead) => ({
          id: lead._id.toString(),
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          status: lead.status,
          qualificationScore: lead.aiQualityScore,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        })),
        message: `Found ${leads.length} lead(s)`,
      };
    } catch (error) {
      console.error("Zapier searchLeads error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Action: Find Lead by Email
   * Finds a specific lead by email address
   *
   * @param email Lead email
   * @returns Lead if found
   */
  async findLeadByEmail(email: string): Promise<ZapierActionResult> {
    try {
      if (!email) {
        return {
          success: false,
          error: "Email is required",
        };
      }

      const lead = await Lead.findOne({
        email: email.toLowerCase(),
        userId: this.userId,
      });

      if (!lead) {
        return {
          success: false,
          error: "Lead not found",
        };
      }

      return {
        success: true,
        data: {
          id: lead._id.toString(),
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          industry: lead.industry,
          status: lead.status,
          qualificationScore: lead.aiQualityScore,
          location: lead.location,
          customFields: lead.fields
            ? lead.fields.reduce(
                (acc, field) => {
                  acc[field.label] = field.value;
                  return acc;
                },
                {} as Record<string, any>,
              )
            : {},
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        },
        message: "Lead found",
      };
    } catch (error) {
      console.error("Zapier findLeadByEmail error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Action: Assign Lead to Buyer
   * Assigns a lead to a specific buyer
   *
   * @param leadId Lead ID
   * @param buyerEmail Buyer email address
   * @returns Assignment result
   */
  async assignLeadToBuyer(
    leadId: string,
    buyerEmail: string,
  ): Promise<ZapierActionResult> {
    try {
      if (!leadId || !buyerEmail) {
        return {
          success: false,
          error: "Lead ID and buyer email are required",
        };
      }

      // Find lead
      const lead = await Lead.findOne({
        _id: leadId,
        userId: this.userId,
      });

      if (!lead) {
        return {
          success: false,
          error: "Lead not found or access denied",
        };
      }

      // Find buyer
      const buyer = await User.findOne({
        email: buyerEmail.toLowerCase(),
        role: "buyer",
      });

      if (!buyer) {
        return {
          success: false,
          error: "Buyer not found",
        };
      }

      // Check if already assigned
      const alreadyAssigned = lead.assignedTo?.some(
        (assignment) => assignment.buyerId === (buyer._id as any).toString(),
      );

      if (alreadyAssigned) {
        return {
          success: false,
          error: "Lead is already assigned to this buyer",
        };
      }

      // Assign lead
      lead.assignedTo = lead.assignedTo || [];
      lead.assignedTo.push({
        buyerId: (buyer._id as any).toString(),
        accepted: false,
        rejected: false,
        assignedAt: new Date(),
      });

      lead.status = "assigned";
      await lead.save();

      return {
        success: true,
        data: {
          leadId: lead._id.toString(),
          buyerId: (buyer._id as any).toString(),
          buyerName: buyer.name,
          buyerEmail: buyer.email,
          assignedAt: new Date(),
        },
        message: "Lead assigned successfully",
      };
    } catch (error) {
      console.error("Zapier assignLeadToBuyer error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Action: Update Lead Status
   * Updates the status of a lead
   *
   * @param leadId Lead ID
   * @param status New status
   * @returns Updated lead
   */
  async updateLeadStatus(
    leadId: string,
    status: ILead["status"],
  ): Promise<ZapierActionResult> {
    try {
      if (!leadId || !status) {
        return {
          success: false,
          error: "Lead ID and status are required",
        };
      }

      // Validate status
      const validStatuses: ILead["status"][] = [
        "new",
        "available",
        "sold",
        "assigned",
        "qualified",
        "unqualified",
        "transferred",
      ];

      if (!validStatuses.includes(status)) {
        return {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        };
      }

      // Find and update lead
      const lead = await Lead.findOneAndUpdate(
        { _id: leadId, userId: this.userId },
        { status: status },
        { new: true },
      );

      if (!lead) {
        return {
          success: false,
          error: "Lead not found or access denied",
        };
      }

      return {
        success: true,
        data: {
          id: lead._id.toString(),
          name: lead.name,
          status: lead.status,
          updatedAt: lead.updatedAt,
        },
        message: "Lead status updated successfully",
      };
    } catch (error) {
      console.error("Zapier updateLeadStatus error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Action: Get Lead Details
   * Retrieves complete details for a lead
   *
   * @param leadId Lead ID
   * @returns Lead details
   */
  async getLeadDetails(leadId: string): Promise<ZapierActionResult> {
    try {
      if (!leadId) {
        return {
          success: false,
          error: "Lead ID is required",
        };
      }

      const lead = await Lead.findOne({
        _id: leadId,
        userId: this.userId,
      });

      if (!lead) {
        return {
          success: false,
          error: "Lead not found or access denied",
        };
      }

      return {
        success: true,
        data: {
          id: lead._id.toString(),
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          industry: lead.industry,
          status: lead.status,
          qualificationScore: lead.aiQualityScore,
          leadScore: lead.aiQualityScore,
          source: lead.leadSource,
          location: lead.location,
          assignedTo: lead.assignedTo,
          soldTo: lead.soldTo,
          customFields: lead.fields
            ? lead.fields.reduce(
                (acc, field) => {
                  acc[field.label] = field.value;
                  return acc;
                },
                {} as Record<string, any>,
              )
            : {},
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        },
        message: "Lead details retrieved",
      };
    } catch (error) {
      console.error("Zapier getLeadDetails error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Create Zapier actions service
 *
 * @param userId BRIXCOT user ID
 * @returns ZapierActionsService instance
 */
export function createZapierActionsService(
  userId: string,
): ZapierActionsService {
  return new ZapierActionsService(userId);
}
