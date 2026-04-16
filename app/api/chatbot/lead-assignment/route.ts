// pages/api/lead-assignment/round-robin.ts
import { NextResponse } from "next/server";
import type { IBuyer } from "@/models/leadbuyers";
import { ILead } from "@/models/leads";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";

class RoundRobinAssigner {
  private buyers: IBuyer[];
  private lead: Partial<ILead> | null = null;

  constructor(buyers: IBuyer[]) {
    this.buyers = buyers;
  }

  assignLead(lead: Partial<ILead>): {
    buyer: IBuyer | null;
    assignment: ILead["assignedTo"] | null;
    reason?: string;
  } {
    this.lead = lead; // Store lead for use in sorting

    // Filter eligible buyers
    const eligibleBuyers = this.getEligibleBuyers(lead);

    if (eligibleBuyers.length === 0) {
      return {
        buyer: null,
        assignment: null,
        reason: "No eligible buyers found for this lead",
      };
    }

    // Sort by priority and last assigned time for round-robin
    const sortedBuyers = this.sortBuyersForRoundRobin(eligibleBuyers);

    // Assign to the first buyer in the sorted list
    const selectedBuyer = sortedBuyers[0];

    // Create assignment record
    const assignment = [
      {
        buyerId: selectedBuyer.id.toString(),
        accepted: false,
        rejected: false,
        assignedAt: new Date(),
      },
    ];

    // Update buyer's last assigned time and current leads count
    selectedBuyer.lastAssignedAt = new Date();
    selectedBuyer.currentLeadsToday++;

    return { buyer: selectedBuyer, assignment };
  }

  private getEligibleBuyers(lead: Partial<ILead>): IBuyer[] {
    return this.buyers.filter((buyer) => {
      // Check if buyer is active
      if (!buyer.isActive) return false;

      // Check daily lead limit
      if (buyer.currentLeadsToday >= buyer.maxLeadsPerDay) return false;

      // Check qualification score minimum
      if ((lead.aiQualityScore || 0) < buyer.qualificationScoreMinimum)
        return false;

      // Check industry match
      const preferredIndustries = buyer.leadPreferences?.industries ?? [];

      if (
        lead.industry &&
        preferredIndustries.length > 0 &&
        !preferredIndustries.includes(lead.industry)
      ) {
        return false;
      }

      // *** LOCATION-BASED ROUTING ***
      // Check location match if buyer has service locations configured
      if (
        buyer.serviceLocations &&
        buyer.serviceLocations.length > 0 &&
        lead.location
      ) {
        const matchesLocation = this.matchesServiceLocation(buyer, lead);

        // If strict matching is enabled, reject leads outside service area
        if (buyer.locationMatchingStrict && !matchesLocation) {
          return false;
        }

        // Even if not strict, we'll prioritize buyers with matching locations
        // This is handled in the sorting function
      }

      // Check working hours (basic check - can be enhanced)
      if (!this.isInWorkingHours(buyer)) return false;

      return true;
    });
  }

  private matchesServiceLocation(buyer: IBuyer, lead: Partial<ILead>): boolean {
    if (!lead.location || !buyer.serviceLocations) return false;

    return buyer.serviceLocations.some((serviceLocation) => {
      // Check city match (case-insensitive)
      if (lead.location?.city && serviceLocation.city) {
        if (
          lead.location.city.toLowerCase() ===
          serviceLocation.city.toLowerCase()
        ) {
          return true;
        }
      }

      // Check state match
      if (lead.location?.state && serviceLocation.state) {
        if (
          lead.location.state.toLowerCase() ===
          serviceLocation.state.toLowerCase()
        ) {
          return true;
        }
      }

      // Check zip code match
      if (
        lead.location?.zipCode &&
        serviceLocation.zipCodes &&
        serviceLocation.zipCodes.length > 0
      ) {
        if (serviceLocation.zipCodes.includes(lead.location.zipCode)) {
          return true;
        }
      }

      return false;
    });
  }

  private sortBuyersForRoundRobin(buyers: IBuyer[]): IBuyer[] {
    return buyers.sort((a, b) => {
      // *** LOCATION-BASED PRIORITY ***
      // First, prioritize buyers with matching service locations
      if (this.lead?.location) {
        const aMatchesLocation = this.matchesServiceLocation(a, this.lead);
        const bMatchesLocation = this.matchesServiceLocation(b, this.lead);

        if (aMatchesLocation && !bMatchesLocation) return -1;
        if (!aMatchesLocation && bMatchesLocation) return 1;
      }

      // Then sort by priority (higher priority first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Finally sort by last assigned time (oldest first for round-robin)
      return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
    });
  }

  private isInWorkingHours(buyer: IBuyer): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = buyer.workingHours.start
      .split(":")
      .map(Number);
    const [endHour, endMinute] = buyer.workingHours.end.split(":").map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime <= endTime;
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { lead } = body;

    if (!lead) {
      return NextResponse.json(
        { error: "Lead data is required" },
        { status: 400 },
      );
    }

    const Buyers = await Buyer.find({ isActive: true })
      .sort({ priority: -1, lastAssignedAt: 1 })
      .limit(100);

    // Initialize round-robin assigner
    const assigner = new RoundRobinAssigner(Buyers);

    // Assign the lead
    const result = assigner.assignLead(lead);

    if (!result.buyer) {
      return NextResponse.json(
        {
          success: false,
          message: result.reason || "No available buyers",
          assignment: null,
        },
        { status: 200 },
      );
    }

    // In production, save assignment to database
    console.log("Lead assigned:", result.assignment);
    console.log("Assigned to buyer:", result.buyer);

    // Send notification to buyer (implement email/SMS service)
    // await this.notifyBuyer(result.buyer, lead, result.assignment);

    return NextResponse.json(
      {
        success: true,
        message: "Lead successfully assigned",
        buyer: {
          id: result.buyer.id,
          name: result.buyer.name,
          email: result.buyer.email,
          company: result.buyer.company,
        },
        assignment: result.assignment,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Assignment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
