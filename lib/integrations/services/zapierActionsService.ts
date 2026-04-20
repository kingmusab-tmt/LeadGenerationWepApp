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
import mongoose from "mongoose";
import { processLeadDistribution } from "@/lib/leadAssignmentService";
import { makeLeadAvailableInMarketplace } from "@/lib/marketplaceNotificationService";
import { checkFeatureAccess } from "@/lib/subscriptionLimitsService";
import {
  normalizeAiQualityResult,
  recordAiScoringMetric,
} from "@/lib/aiQualityScoring";

/**
 * Zapier action result structure
 */
export interface ZapierActionResult {
  success: boolean;
  data?: unknown;
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
  customFields?: Record<string, unknown>;
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
  customFields?: Record<string, unknown>;
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
        leadSource: "zapier",
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
        distributionMethod: "marketplace",
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

      // Add custom fields — store ALL lead data in fields[] for dynamic display
      const customFields: { id: string; label: string; value: unknown }[] = [];

      // Store all standard fields in the fields array (like Form Builder does)
      if (input.name) {
        customFields.push({ id: "name", label: "Name", value: input.name });
      }
      if (input.email) {
        customFields.push({ id: "email", label: "Email", value: input.email });
      }
      if (input.phone) {
        customFields.push({ id: "phone", label: "Phone", value: input.phone });
      }
      if (input.company) {
        customFields.push({
          id: "company",
          label: "Company",
          value: input.company,
        });
      }
      if (input.industry) {
        customFields.push({
          id: "industry",
          label: "Industry",
          value: input.industry,
        });
      }

      // Store location fields
      if (input.city) {
        customFields.push({ id: "city", label: "City", value: input.city });
      }
      if (input.state) {
        customFields.push({ id: "state", label: "State", value: input.state });
      }
      if (input.country) {
        customFields.push({
          id: "country",
          label: "Country",
          value: input.country,
        });
      }
      if (input.zipCode) {
        customFields.push({
          id: "zip_code",
          label: "Zip Code",
          value: input.zipCode,
        });
      }

      // Store the original source if provided
      if (input.source) {
        customFields.push({
          id: "original_source",
          label: "Original Source",
          value: input.source,
        });
      }

      if (input.customFields && typeof input.customFields === "object") {
        customFields.push(
          ...Object.entries(input.customFields).map(([key, value]) => ({
            id: key.toLowerCase().replace(/\s+/g, "_"),
            label: key,
            value: value,
          })),
        );
      }

      leadData.fields = customFields;

      // Create lead
      const lead = await Lead.create(leadData);

      // Check if user has leadScoringEnabled feature
      const hasLeadScoringFeature = await checkFeatureAccess(
        this.userId,
        "leadScoringEnabled",
      );

      // Run AI quality scoring (same as form submit) - only if feature is enabled
      if (hasLeadScoringFeature.allowed) {
        try {
          const leadFieldsData: Record<string, unknown> = {};
          if (input.name) leadFieldsData["Name"] = input.name;
          if (input.email) leadFieldsData["Email"] = input.email;
          if (input.phone) leadFieldsData["Phone"] = input.phone;
          if (input.company) leadFieldsData["Company"] = input.company;
          if (input.industry) leadFieldsData["Industry"] = input.industry;
          if (input.city) leadFieldsData["City"] = input.city;
          if (input.state) leadFieldsData["State"] = input.state;
          if (input.country) leadFieldsData["Country"] = input.country;
          if (input.customFields) {
            Object.entries(input.customFields).forEach(([key, value]) => {
              leadFieldsData[key] = value;
            });
          }

          console.log(
            "[AI Scoring] Sending lead data to /api/filter-lead:",
            JSON.stringify(leadFieldsData),
          );
          const scoringUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/filter-lead`;
          console.log("[AI Scoring] URL:", scoringUrl);

          const filterResponse = await fetch(scoringUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(leadFieldsData),
          });

          console.log(
            "[AI Scoring] Response status:",
            filterResponse.status,
            filterResponse.statusText,
          );

          // filter-lead always returns 200 with scoring data
          if (filterResponse.ok) {
            const filterResult = await filterResponse.json();
            console.log(
              "[AI Scoring] Raw response:",
              JSON.stringify(filterResult),
            );

            const normalized = normalizeAiQualityResult(filterResult);

            console.log(
              "[AI Scoring] Computed: spamScore=%d, qualityLevel=%s, reason=%s",
              normalized.spamScore,
              normalized.qualityLevel,
              normalized.reason,
            );

            await Lead.findByIdAndUpdate(lead._id, {
              aiQualityScore: normalized.spamScore,
              qualityLevel: normalized.qualityLevel,
              aiQualityReason: normalized.reason,
              aiQualityAssessment: {
                isValid: normalized.isValid,
                spamScore: normalized.spamScore,
                reason: normalized.reason,
                evaluatedAt: new Date(),
              },
              exclusive: normalized.qualityLevel === "High",
              shared: normalized.qualityLevel !== "High",
            });

            console.log(
              "[AI Scoring] ✅ Lead %s updated with AI score: %d/%s",
              lead._id,
              normalized.spamScore,
              normalized.qualityLevel,
            );
            console.log("[AI Scoring][Metric]", {
              event: "success",
              context: "zapier_create_lead",
              ...recordAiScoringMetric("success"),
            });

            // Apply seller's quality-based lead pricing
            try {
              const seller = await User.findById(this.userId)
                .select("leadPricing")
                .lean();
              const pricing = (
                seller as {
                  leadPricing?: {
                    high?: number;
                    medium?: number;
                    low?: number;
                  };
                } | null
              )?.leadPricing || {
                high: 10,
                medium: 5,
                low: 2,
              };
              const unitPrice =
                normalized.qualityLevel === "High"
                  ? pricing.high
                  : normalized.qualityLevel === "Low"
                    ? pricing.low
                    : pricing.medium;
              await Lead.findByIdAndUpdate(lead._id, { unit: unitPrice });
              console.log("[AI Scoring] ✅ Lead unit price set:", {
                qualityLevel: normalized.qualityLevel,
                unitPrice,
              });
            } catch (pricingError) {
              console.error(
                "[AI Scoring] ⚠️ Error setting lead pricing:",
                pricingError,
              );
            }
          } else {
            const errorBody = await filterResponse.text();
            console.error(
              "[AI Scoring] ❌ Unexpected status:",
              filterResponse.status,
              errorBody,
            );
            await Lead.findByIdAndUpdate(lead._id, {
              aiQualityScore: 50,
              qualityLevel: "Medium",
              aiQualityReason: `AI scoring failed: HTTP ${filterResponse.status}`,
            });
            console.log(
              "[AI Scoring] ⚠️ Fell back to default (50/Medium) due to unexpected API error",
            );
            console.log("[AI Scoring][Metric]", {
              event: "fallback",
              context: "zapier_create_lead",
              reason: "http_error",
              status: filterResponse.status,
              ...recordAiScoringMetric("fallback"),
            });
          }
        } catch (aiError) {
          console.error("[AI Scoring] ❌ Exception (non-fatal):", aiError);
          await Lead.findByIdAndUpdate(lead._id, {
            aiQualityScore: 50,
            qualityLevel: "Medium",
            aiQualityReason: "AI evaluation unavailable - using default",
          });
          console.log(
            "[AI Scoring] ⚠️ Fell back to default (50/Medium) due to exception",
          );
          console.log("[AI Scoring][Metric]", {
            event: "fallback",
            context: "zapier_create_lead",
            reason: "exception",
            ...recordAiScoringMetric("fallback"),
          });
        }
      } else {
        // User doesn't have lead scoring feature - set default values without AI
        console.log(
          "[AI Scoring] ⏭️ Skipped - feature not enabled for user:",
          this.userId,
        );
        await Lead.findByIdAndUpdate(lead._id, {
          aiQualityScore: 50,
          qualityLevel: "Medium",
          aiQualityReason: "AI scoring not enabled in subscription",
          exclusive: false,
          shared: true,
        });
      }

      // ========================================
      // 2. AUTOMATIC LEAD DISTRIBUTION & ASSIGNMENT (same as form)
      // ========================================
      try {
        const scoredLead = await Lead.findById(lead._id);
        if (!scoredLead) {
          throw new Error(`Lead ${lead._id} not found after AI scoring`);
        }

        const distributionResult = await processLeadDistribution(scoredLead);

        console.log("✅ Zapier lead distribution processed:", {
          leadId: lead._id,
          assignedBuyers: distributionResult.assignedBuyers.length,
          notified: distributionResult.notified.length,
          errors: distributionResult.errors.length,
        });

        if (distributionResult.errors.length > 0) {
          console.warn(
            "⚠️ Zapier distribution errors:",
            distributionResult.errors,
          );
        }

        // Marketplace fallback for low-quality unmatched leads
        const updatedLead = await Lead.findById(lead._id);
        if (
          updatedLead &&
          distributionResult.assignedBuyers.length === 0 &&
          updatedLead.qualityLevel === "Low"
        ) {
          try {
            console.log(
              `📢 Low quality Zapier lead ${lead._id} - making available in marketplace`,
            );
            await makeLeadAvailableInMarketplace(updatedLead, "low_quality");
          } catch (marketplaceError) {
            console.error(
              "⚠️ Error making Zapier lead available in marketplace:",
              marketplaceError,
            );
          }
        }
      } catch (distributionError) {
        console.error(
          "❌ Error processing Zapier lead distribution:",
          distributionError,
        );
      }

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

      // If Zapier sets status to available, run the same distribution flow
      if (input.status === "available") {
        try {
          const refreshedLead = await Lead.findById(lead._id);
          if (refreshedLead) {
            await processLeadDistribution(refreshedLead);
          }
        } catch (distributionError) {
          console.error(
            "❌ Error processing Zapier lead distribution after update:",
            distributionError,
          );
        }
      }

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
      const query: Record<string, unknown> = { userId: this.userId };

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
                {} as Record<string, unknown>,
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
      const buyerId = String(buyer._id);
      const alreadyAssigned = lead.assignedTo?.some(
        (assignment) => assignment.buyerId === buyerId,
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
        buyerId,
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
          buyerId,
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
                {} as Record<string, unknown>,
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
