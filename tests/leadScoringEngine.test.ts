import {
  calculateLeadScore,
  getLeadQualityDescription,
} from "../lib/leadScoringEngine";

function mondayAt(hour: number): Date {
  const date = new Date();
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  date.setHours(hour, 0, 0, 0);
  return date;
}

describe("lead scoring engine", () => {
  it("returns maximum scores for complete high-value business-hour lead", () => {
    const lead = {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "1234567890",
      company: "Acme Corp",
      industry: "Technology",
      location: { address: "123 Main St" },
      createdAt: mondayAt(10),
      fields: [
        { id: "1", label: "Best Time To Contact", value: "Morning" },
        { id: "2", label: "Budget", value: "$25,000" },
      ],
    } as any;

    const score = calculateLeadScore(lead);

    expect(score.leadScore).toBe(10);
    expect(score.qualificationScore).toBe(100);
    expect(score.scoreFactors.completeness).toBe(3);
    expect(score.scoreFactors.responsiveness).toBe(3);
    expect(score.scoreFactors.valuePotential).toBe(4);
    expect(getLeadQualityDescription(score.qualificationScore)).toBe(
      "Excellent",
    );
  });

  it("returns a low score for sparse off-hours lead", () => {
    const lead = {
      name: "Only Name",
      email: "",
      phone: "",
      fields: [],
      createdAt: mondayAt(3),
    } as any;

    const score = calculateLeadScore(lead);

    expect(score.leadScore).toBeLessThanOrEqual(2);
    expect(score.qualificationScore).toBeLessThan(20);
    expect(getLeadQualityDescription(score.qualificationScore)).toBe(
      "Very Poor",
    );
  });

  it("maps score thresholds to expected quality labels", () => {
    expect(getLeadQualityDescription(80)).toBe("Excellent");
    expect(getLeadQualityDescription(60)).toBe("Good");
    expect(getLeadQualityDescription(40)).toBe("Fair");
    expect(getLeadQualityDescription(20)).toBe("Poor");
    expect(getLeadQualityDescription(19)).toBe("Very Poor");
  });
});
