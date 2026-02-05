/**
 * Webhook Configuration Model
 * Stores webhook endpoints and their configurations for all sources
 * (Zapier, HubSpot, Salesforce, custom webhooks)
 *
 * Date: January 21, 2026
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Webhook event configuration interface
 */
export interface IWebhookEvents {
  leadCreated?: boolean;
  leadUpdated?: boolean;
  leadQualified?: boolean;
  leadAccepted?: boolean;
  leadRejected?: boolean;
  buyerAssigned?: boolean;
  callCompleted?: boolean;
  dealCreated?: boolean;
  dealUpdated?: boolean;
}

/**
 * Webhook dispatch log interface
 */
export interface IWebhookDispatchLog {
  timestamp: Date;
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  retryCount: number;
  responseTime: number; // milliseconds
}

/**
 * Main webhook configuration interface
 */
export interface IWebhookConfig extends Document {
  // Basic info
  userId: Types.ObjectId; // Seller/User ID who owns this webhook
  name: string; // Human-readable name
  description?: string;
  url: string; // Endpoint URL to send webhooks to
  source: "zapier" | "hubspot" | "salesforce" | "custom";

  // Events configuration
  events: IWebhookEvents;

  // Security
  secret: string; // HMAC secret for signing webhooks (encrypted in DB)
  isActive: boolean;

  // Custom headers (optional)
  headers?: Record<string, string>;

  // Retry configuration
  maxRetriesPerEvent?: number; // Default: 3
  retryDelaySeconds?: number; // Default: 60

  // Rate limiting
  rateLimit?: {
    maxPerMinute?: number;
    maxPerHour?: number;
  };

  // Statistics
  totalDispatched: number;
  successCount: number;
  failureCount: number;
  lastDispatchedAt?: Date;
  lastErrorAt?: Date;
  lastErrorMessage?: string;

  // Dispatch logs (last 100)
  dispatchLogs?: IWebhookDispatchLog[];

  // Metadata
  tags?: string[];
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  recordDispatch(
    success: boolean,
    statusCode?: number,
    errorMessage?: string,
    responseTime?: number,
  ): Promise<void>;
  recordError(errorMessage: string): Promise<void>;
  resetStatistics(): Promise<void>;
  getDailyStats(): Promise<
    { date: string; sent: number; succeeded: number; failed: number }[]
  >;
}

/**
 * Webhook configuration schema
 */
const WebhookConfigSchema: Schema = new Schema<IWebhookConfig>(
  {
    // Basic info
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Webhook name is required"],
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
      trim: true,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "Webhook URL is required"],
      match: [/^https?:\/\/.+/, "URL must be a valid HTTP or HTTPS endpoint"],
    },
    source: {
      type: String,
      enum: {
        values: ["zapier", "hubspot", "salesforce", "custom"],
        message: "Source must be zapier, hubspot, salesforce, or custom",
      },
      default: "custom",
      index: true,
    },

    // Events configuration
    events: {
      leadCreated: { type: Boolean, default: true },
      leadUpdated: { type: Boolean, default: false },
      leadQualified: { type: Boolean, default: false },
      leadAccepted: { type: Boolean, default: true },
      leadRejected: { type: Boolean, default: false },
      buyerAssigned: { type: Boolean, default: true },
      callCompleted: { type: Boolean, default: false },
      dealCreated: { type: Boolean, default: false },
      dealUpdated: { type: Boolean, default: false },
    },

    // Security
    secret: {
      type: String,
      required: [true, "Webhook secret is required"],
      minlength: [32, "Secret must be at least 32 characters"],
      // Note: Should be encrypted before saving (handled by middleware or service)
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Custom headers
    headers: {
      type: Map,
      of: String,
      default: new Map(),
    },

    // Retry configuration
    maxRetriesPerEvent: {
      type: Number,
      default: 3,
      min: [0, "Max retries cannot be negative"],
      max: [10, "Max retries cannot exceed 10"],
    },
    retryDelaySeconds: {
      type: Number,
      default: 60,
      min: [10, "Retry delay must be at least 10 seconds"],
      max: [3600, "Retry delay cannot exceed 1 hour"],
    },

    // Rate limiting
    rateLimit: {
      maxPerMinute: {
        type: Number,
        default: 100,
        min: [1, "Rate limit must be at least 1 per minute"],
      },
      maxPerHour: {
        type: Number,
        default: 5000,
        min: [1, "Rate limit must be at least 1 per hour"],
      },
    },

    // Statistics
    totalDispatched: {
      type: Number,
      default: 0,
      min: 0,
    },
    successCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastDispatchedAt: Date,
    lastErrorAt: Date,
    lastErrorMessage: String,

    // Dispatch logs (keep last 100 entries)
    dispatchLogs: [
      {
        timestamp: { type: Date, default: Date.now },
        success: Boolean,
        statusCode: Number,
        errorMessage: String,
        retryCount: { type: Number, default: 0 },
        responseTime: { type: Number, default: 0 }, // milliseconds
      },
    ],

    // Metadata
    tags: [String],
    notes: String,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

/**
 * Indexes for performance
 */
// Find webhooks by user
WebhookConfigSchema.index({ userId: 1, isActive: 1 });

// Find webhooks by source
WebhookConfigSchema.index({ userId: 1, source: 1 });

// Find inactive webhooks
WebhookConfigSchema.index({ userId: 1, isActive: -1 });

// Find webhooks by last dispatch (for maintenance/monitoring)
WebhookConfigSchema.index({ lastDispatchedAt: -1 });

// Compound index for common query
WebhookConfigSchema.index({ userId: 1, isActive: 1, source: 1 });

/**
 * Instance methods
 */

/**
 * Record a webhook dispatch (success or failure)
 * Updates statistics and maintains dispatch log
 */
WebhookConfigSchema.methods.recordDispatch = async function (
  success: boolean,
  statusCode?: number,
  errorMessage?: string,
  responseTime?: number,
): Promise<void> {
  // Update totals
  this.totalDispatched += 1;
  if (success) {
    this.successCount += 1;
  } else {
    this.failureCount += 1;
    this.lastErrorAt = new Date();
    this.lastErrorMessage = errorMessage;
  }
  this.lastDispatchedAt = new Date();

  // Add to dispatch log (keep last 100)
  if (!this.dispatchLogs) {
    this.dispatchLogs = [];
  }

  this.dispatchLogs.push({
    timestamp: new Date(),
    success,
    statusCode,
    errorMessage,
    retryCount: 0,
    responseTime: responseTime || 0,
  });

  // Keep only last 100 logs
  if (this.dispatchLogs.length > 100) {
    this.dispatchLogs = this.dispatchLogs.slice(-100);
  }

  await this.save();
};

/**
 * Record an error
 */
WebhookConfigSchema.methods.recordError = async function (
  errorMessage: string,
): Promise<void> {
  this.lastErrorAt = new Date();
  this.lastErrorMessage = errorMessage;
  this.failureCount += 1;
  await this.save();
};

/**
 * Reset statistics (useful for testing or fresh start)
 */
WebhookConfigSchema.methods.resetStatistics = async function (): Promise<void> {
  this.totalDispatched = 0;
  this.successCount = 0;
  this.failureCount = 0;
  this.lastDispatchedAt = undefined;
  this.lastErrorAt = undefined;
  this.lastErrorMessage = undefined;
  this.dispatchLogs = [];
  await this.save();
};

/**
 * Get daily statistics
 * Returns aggregated stats per day from dispatch logs
 */
WebhookConfigSchema.methods.getDailyStats = async function (): Promise<
  { date: string; sent: number; succeeded: number; failed: number }[]
> {
  if (!this.dispatchLogs || this.dispatchLogs.length === 0) {
    return [];
  }

  const stats: Record<
    string,
    { sent: number; succeeded: number; failed: number }
  > = {};

  for (const log of this.dispatchLogs) {
    const date = log.timestamp.toISOString().split("T")[0]; // YYYY-MM-DD

    if (!stats[date]) {
      stats[date] = { sent: 0, succeeded: 0, failed: 0 };
    }

    stats[date].sent += 1;
    if (log.success) {
      stats[date].succeeded += 1;
    } else {
      stats[date].failed += 1;
    }
  }

  return Object.entries(stats).map(([date, data]) => ({
    date,
    ...data,
  }));
};

/**
 * Static methods
 */

/**
 * Find active webhooks for a user that should trigger for a specific event
 */
WebhookConfigSchema.statics.findActiveForEvent = async function (
  userId: Types.ObjectId,
  eventType: keyof IWebhookEvents,
): Promise<InstanceType<Model<IWebhookConfig>>[]> {
  return this.find({
    userId,
    isActive: true,
    [`events.${eventType}`]: true,
  });
};

/**
 * Find webhooks by source
 */
WebhookConfigSchema.statics.findBySource = async function (
  userId: Types.ObjectId,
  source: string,
): Promise<InstanceType<Model<IWebhookConfig>>[]> {
  return this.find({ userId, source, isActive: true });
};

/**
 * Get success rate for a webhook
 */
WebhookConfigSchema.methods.getSuccessRate = function (): number {
  if (this.totalDispatched === 0) return 100;
  return Math.round((this.successCount / this.totalDispatched) * 100);
};

/**
 * Check if webhook is healthy (>90% success rate)
 */
WebhookConfigSchema.methods.isHealthy = function (): boolean {
  return this.getSuccessRate() >= 90;
};

/**
 * Validation - ensure at least one event is enabled
 */
WebhookConfigSchema.pre("save", function (next) {
  const events = this.events;
  const hasAtLeastOneEvent = Object.values(
    events as Record<string, unknown>,
  ).some((v) => v === true);

  if (!hasAtLeastOneEvent) {
    next(new Error("At least one event must be enabled"));
  } else {
    next();
  }
});

/**
 * Export model
 */
export const WebhookConfig: Model<IWebhookConfig> =
  mongoose.models.WebhookConfig ||
  mongoose.model<IWebhookConfig>("WebhookConfig", WebhookConfigSchema);

export default WebhookConfig;
