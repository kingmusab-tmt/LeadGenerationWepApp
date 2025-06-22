// types/chatbot.ts
export interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Lead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  budget?: string;
  timeline?: string;
  source: string;
  qualificationScore: number;
  status:
    | "new"
    | "available"
    | "sold"
    | "assigned"
    | "qualified"
    | "unqualified"
    | "transferred";
  conversationId: string;
  responses: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualificationFlow {
  id: string;
  name: string;
  industry: string;
  questions: Question[];
  scoring: ScoringRule[];
  routingRules: RoutingRule[];
}

export interface Question {
  id: string;
  text: string;
  type: "text" | "multiple_choice" | "number" | "email" | "phone";
  options?: string[];
  required: boolean;
  condition?: string; // JSON condition for when to ask this question
  followUp?: string[]; // IDs of follow-up questions
  scoring?: {
    responses: Record<string, number>; // response -> score mapping
  };
}

export interface ScoringRule {
  field: string;
  conditions: {
    operator: "equals" | "contains" | "greater_than" | "less_than";
    value: any;
    score: number;
  }[];
}

export interface RoutingRule {
  condition: string;
  action:
    | "route_to_buyer"
    | "schedule_callback"
    | "add_to_nurture"
    | "disqualify";
  params?: Record<string, any>;
}
