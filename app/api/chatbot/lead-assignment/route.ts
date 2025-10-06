// pages/api/lead-assignment/round-robin.ts
import { NextApiRequest, NextApiResponse } from "next";
import type { IBuyer } from "@/models/leadbuyers";
import { ILead } from "@/models/leads";
import { Buyer } from "@/models/leadbuyers";
import dbConnect from "@/lib/connectdb";

class RoundRobinAssigner {
  private buyers: IBuyer[];

  constructor(buyers: IBuyer[]) {
    this.buyers = buyers;
  }

  assignLead(lead: Partial<ILead>): {
    buyer: IBuyer | null;
    assignment: ILead["assignedTo"] | null;
    reason?: string;
  } {
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
      if ((lead.qualificationScore || 0) < buyer.qualificationScoreMinimum)
        return false;

      // Check industry match
      if (
        lead.industry &&
        buyer.industries.length > 0 &&
        !buyer.industries.includes(lead.industry)
      ) {
        return false;
      }

      // Check working hours (basic check - can be enhanced)
      if (!this.isInWorkingHours(buyer)) return false;

      return true;
    });
  }

  private sortBuyersForRoundRobin(buyers: IBuyer[]): IBuyer[] {
    return buyers.sort((a, b) => {
      // First sort by priority (higher priority first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Then sort by last assigned time (oldest first for round-robin)
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();
    const { lead } = req.body;

    if (!lead) {
      return res.status(400).json({ error: "Lead data is required" });
    }

    const Buyers = await Buyer.find({ isActive: true })
      .sort({ priority: -1, lastAssignedAt: 1 })
      .limit(100);

    // Initialize round-robin assigner
    const assigner = new RoundRobinAssigner(Buyers);

    // Assign the lead
    const result = assigner.assignLead(lead);

    if (!result.buyer) {
      return res.status(200).json({
        success: false,
        message: result.reason || "No available buyers",
        assignment: null,
      });
    }

    // In production, save assignment to database
    console.log("Lead assigned:", result.assignment);
    console.log("Assigned to buyer:", result.buyer);

    // Send notification to buyer (implement email/SMS service)
    // await this.notifyBuyer(result.buyer, lead, result.assignment);

    res.status(200).json({
      success: true,
      message: "Lead successfully assigned",
      buyer: {
        id: result.buyer.id,
        name: result.buyer.name,
        email: result.buyer.email,
        company: result.buyer.company,
      },
      assignment: result.assignment,
    });
  } catch (error) {
    console.error("Assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
