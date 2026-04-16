import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Automation Workflow Types
export type TriggerType =
  | "lead_received"
  | "lead_accepted"
  | "lead_qualified"
  | "scheduled"
  | "manual";
export type ActionType =
  | "send_email"
  | "send_sms"
  | "create_notification"
  | "assign_buyer"
  | "update_lead";
export type ConditionOperator =
  | "equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "in_array"
  | "exists";

// Condition for filtering leads/events
export interface ICondition {
  field: string; // e.g., "leadQualityScore", "industry", "location"
  operator: ConditionOperator;
  value: string | number | string[] | boolean;
}

// Action to perform when workflow triggers
export interface IAction {
  type: ActionType;
  config: {
    // For send_email
    subject?: string;
    body?: string;

    // For send_sms
    message?: string;

    // For create_notification
    notificationTitle?: string;
    notificationBody?: string;
    notificationType?: "info" | "success" | "warning" | "error";

    // For assign_buyer
    buyerId?: string;

    // For update_lead
    updateFields?: Record<string, unknown>;

    // General
    delayMinutes?: number; // Delay action by N minutes
    priority?: "low" | "normal" | "high";
  };
}

// Automation Workflow
export interface IAutomationWorkflow extends Document {
  userId: Types.ObjectId; // Seller/User ID
  name: string;
  description?: string;
  isActive: boolean;

  // Trigger Configuration
  triggers: {
    type: TriggerType;
    conditions?: ICondition[];
  }[];

  // Actions to Execute
  actions: IAction[];

  // Execution Limits
  maxExecutions?: number; // Max times workflow can execute per day
  executionsCount?: number; // Count for today
  executionResetTime?: Date; // When counter resets

  // Rate Limiting
  cooldownMinutes?: number; // Wait X minutes before triggering again for same lead

  // Metadata
  priority: "low" | "normal" | "high";
  tags?: string[];
  notes?: string;

  // Stats
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  lastExecutedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

// Execution History
export interface IWorkflowExecution extends Document {
  workflowId: Types.ObjectId;
  userId: Types.ObjectId;
  triggerData: {
    type: TriggerType;
    leadId?: string;
    buyerId?: string;
    eventData?: Record<string, unknown>;
  };
  conditionsResult: boolean;
  executedActions: {
    actionType: ActionType;
    status: "pending" | "success" | "failed";
    result?: string;
    error?: string;
    executedAt?: Date;
  }[];
  status: "pending" | "executing" | "completed" | "failed" | "partially_failed";
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Automation Workflow Schema
const WorkflowSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },

    triggers: [
      {
        type: {
          type: String,
          enum: [
            "lead_received",
            "lead_accepted",
            "lead_qualified",
            "scheduled",
            "manual",
          ],
          required: true,
        },
        conditions: [
          {
            field: String,
            operator: {
              type: String,
              enum: [
                "equals",
                "contains",
                "greater_than",
                "less_than",
                "in_array",
                "exists",
              ],
            },
            value: Schema.Types.Mixed,
          },
        ],
      },
    ],

    actions: [
      {
        type: {
          type: String,
          enum: [
            "send_email",
            "send_sms",
            "create_notification",
            "assign_buyer",
            "update_lead",
          ],
          required: true,
        },
        config: {
          subject: String,
          body: String,
          message: String,
          notificationTitle: String,
          notificationBody: String,
          notificationType: {
            type: String,
            enum: ["info", "success", "warning", "error"],
            default: "info",
          },
          buyerId: String,
          updateFields: Schema.Types.Mixed,
          delayMinutes: { type: Number, default: 0 },
          priority: {
            type: String,
            enum: ["low", "normal", "high"],
            default: "normal",
          },
        },
      },
    ],

    maxExecutions: { type: Number, default: 100 },
    executionsCount: { type: Number, default: 0 },
    executionResetTime: { type: Date, default: () => new Date() },

    cooldownMinutes: { type: Number, default: 5 },

    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    tags: [String],
    notes: String,

    totalExecutions: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    lastExecutedAt: Date,
  },
  {
    timestamps: true,
  },
);

// Execution History Schema
const WorkflowExecutionSchema: Schema = new Schema(
  {
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: "AutomationWorkflow",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    triggerData: {
      type: {
        type: String,
        required: true,
      },
      leadId: String,
      buyerId: String,
      eventData: Schema.Types.Mixed,
    },
    conditionsResult: { type: Boolean, default: false },
    executedActions: [
      {
        actionType: String,
        status: {
          type: String,
          enum: ["pending", "success", "failed"],
          default: "pending",
        },
        result: String,
        error: String,
        executedAt: Date,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "executing", "completed", "failed", "partially_failed"],
      default: "pending",
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    error: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  },
);

// Indexes
WorkflowSchema.index({ userId: 1, isActive: 1 });
WorkflowSchema.index({ userId: 1, isActive: 1, "triggers.type": 1 });
WorkflowSchema.index({ createdAt: -1 });
WorkflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });
WorkflowExecutionSchema.index({ workflowId: 1, userId: 1, createdAt: -1 });
WorkflowExecutionSchema.index({
  workflowId: 1,
  "triggerData.leadId": 1,
  startedAt: -1,
});
WorkflowExecutionSchema.index({ userId: 1, status: 1 });

export const AutomationWorkflow: Model<IAutomationWorkflow> =
  mongoose.models.AutomationWorkflow ||
  mongoose.model<IAutomationWorkflow>("AutomationWorkflow", WorkflowSchema);

export const WorkflowExecution: Model<IWorkflowExecution> =
  mongoose.models.WorkflowExecution ||
  mongoose.model<IWorkflowExecution>(
    "WorkflowExecution",
    WorkflowExecutionSchema,
  );
