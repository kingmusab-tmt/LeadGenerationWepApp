/**
 * Lead Scoring Engine
 * Calculates lead quality scores based on completeness, responsiveness, and value potential
 *
 * Reference: BUSINESS_WORKFLOWS_AND_INTEGRATIONS.md - Lead Scoring Algorithm section
 */

import { ILead } from "@/models/leads";

export interface LeadScoreResult {
  leadScore: number; // 0-10 scale
  qualificationScore: number; // 0-100 scale
  scoreFactors: {
    completeness: number; // 0-3 points
    responsiveness: number; // 0-3 points
    valuePotential: number; // 0-4 points
  };
}

/**
 * Determines if submission occurred during business hours (9am-5pm on weekdays)
 */
function isBusinessHours(date: Date): boolean {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();

  // 0 = Sunday, 6 = Saturday
  const isWeekday = dayOfWeek > 0 && dayOfWeek < 6;
  const isBusinessHour = hour >= 9 && hour < 17;

  return isWeekday && isBusinessHour;
}

/**
 * Extracts the value of a specific field from the lead's fields array
 */
function getFieldValue(lead: ILead, fieldLabel: string): string | undefined {
  const field = lead.fields?.find(
    (f) => f.label.toLowerCase() === fieldLabel.toLowerCase(),
  );
  return field?.value ? field.value.toString() : undefined;
}

/**
 * Calculate Lead Score based on three factors:
 * 1. Completeness (0-3 points): How many required and optional fields are filled
 * 2. Responsiveness (0-3 points): Whether submitted during business hours + contact preference provided
 * 3. Value Potential (0-4 points): Company size, industry, budget indicators
 *
 * Final Score = (completeness + responsiveness + valuePotential) / 10 * 10
 * Qualification Score = Lead Score * 10
 *
 * @param lead The lead document to score
 * @returns Lead score and qualification score with breakdown
 */
export function calculateLeadScore(lead: ILead): LeadScoreResult {
  let completeness = 0;
  let responsiveness = 0;
  let valuePotential = 0;

  // ========================================
  // 1. COMPLETENESS SCORING (0-3 points)
  // ========================================

  // Required fields: name, email, phone
  const requiredFields = ["name", "email", "phone"];

  // Count filled required fields from lead properties
  const filledRequired = requiredFields.filter((field) => {
    if (field === "name") return lead.name && lead.name.trim().length > 0;
    if (field === "email") return lead.email && lead.email.trim().length > 0;
    if (field === "phone") return lead.phone && lead.phone.trim().length > 0;
    return false;
  }).length;

  // Base completeness: (filledRequired / requiredFields.length) * 2
  completeness = (filledRequired / requiredFields.length) * 2;

  // Optional fields: company, address, industry
  const optionalFieldsToCheck = [
    { name: "company", extract: () => lead.company },
    { name: "address", extract: () => lead.location?.address },
    { name: "industry", extract: () => lead.industry },
  ];

  const filledOptional = optionalFieldsToCheck.filter(
    (f) => f.extract() && f.extract()!.toString().trim().length > 0,
  ).length;

  // Additional completeness: (filledOptional / optionalFieldsToCheck.length) * 1
  completeness += (filledOptional / optionalFieldsToCheck.length) * 1;

  // Cap at 3 points
  completeness = Math.min(completeness, 3);

  // ========================================
  // 2. RESPONSIVENESS SCORING (0-3 points)
  // ========================================

  // Business hours submission: 2 points
  if (lead.createdAt && isBusinessHours(new Date(lead.createdAt))) {
    responsiveness += 2;
  } else {
    // Off-hours submission: 0.5 points (still shows interest, just outside business hours)
    responsiveness += 0.5;
  }

  // Preferred contact time provided: 1 point
  const bestTimeField = lead.fields?.find((f) =>
    f.label.toLowerCase().includes("best time to contact"),
  );
  if (bestTimeField && bestTimeField.value) {
    responsiveness += 1;
  }

  // Cap at 3 points
  responsiveness = Math.min(responsiveness, 3);

  // ========================================
  // 3. VALUE POTENTIAL SCORING (0-4 points)
  // ========================================

  // Has company information: 1 point
  if (lead.company && lead.company.trim().length > 0) {
    valuePotential += 1;
  }

  // Enterprise industry: 2 points
  if (lead.industry) {
    const enterpriseIndustries = [
      "enterprise",
      "technology",
      "finance",
      "healthcare",
      "manufacturing",
      "real estate",
    ];
    if (
      enterpriseIndustries.some((industry) =>
        lead.industry!.toLowerCase().includes(industry),
      )
    ) {
      valuePotential += 2;
    } else {
      // Other industries: 0.5 points
      valuePotential += 0.5;
    }
  }

  // Has budget information with significant amount: 1 point
  const budgetField = lead.fields?.find(
    (f) =>
      f.label.toLowerCase().includes("budget") ||
      f.label.toLowerCase().includes("budget range"),
  );

  if (budgetField && budgetField.value) {
    const budgetValue = Number(budgetField.value);
    if (!isNaN(budgetValue) && budgetValue > 10000) {
      valuePotential += 1;
    } else if (!isNaN(budgetValue) && budgetValue > 0) {
      valuePotential += 0.5;
    }
  }

  // Cap at 4 points
  valuePotential = Math.min(valuePotential, 4);

  // ========================================
  // FINAL SCORE CALCULATION
  // ========================================

  // Total of all factors (max 10 points)
  const totalScore = completeness + responsiveness + valuePotential;

  // Lead Score: 0-10 scale, rounded to nearest integer
  const leadScore = Math.round((totalScore / 10) * 10);

  // Qualification Score: 0-100 scale
  const qualificationScore = Math.round((totalScore / 10) * 100);

  return {
    leadScore: Math.min(Math.max(leadScore, 0), 10), // Ensure 0-10 range
    qualificationScore: Math.min(Math.max(qualificationScore, 0), 100), // Ensure 0-100 range
    scoreFactors: {
      completeness: Math.round(completeness * 100) / 100, // Round to 2 decimals
      responsiveness: Math.round(responsiveness * 100) / 100,
      valuePotential: Math.round(valuePotential * 100) / 100,
    },
  };
}

/**
 * Get human-readable lead quality description based on score
 */
export function getLeadQualityDescription(qualificationScore: number): string {
  if (qualificationScore >= 80) return "Excellent";
  if (qualificationScore >= 60) return "Good";
  if (qualificationScore >= 40) return "Fair";
  if (qualificationScore >= 20) return "Poor";
  return "Very Poor";
}
