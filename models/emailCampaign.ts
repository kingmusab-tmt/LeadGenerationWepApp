import mongoose, { Schema, Document, Model } from "mongoose";

// A segment is a seller's own saved, reusable filter over their own leads
// and/or buyers (e.g. "High-quality TX leads") — not a platform-wide
// targeting tool. Always scoped to the seller that created it.
export interface IEmailSegment extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  name: string;
  description?: string;
  filters: {
    source: "leads" | "buyers" | "both";
    industries?: string[];
    leadQuality?: ("High" | "Medium" | "Low")[];
    buyerActiveOnly?: boolean;
  };
  recipientCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEmailSchedule {
  type: "immediate" | "scheduled" | "recurring";
  scheduledTime?: Date;
  recurring?: {
    frequency: "daily" | "weekly" | "monthly" | "custom";
    daysOfWeek?: number[]; // 0-6, Sunday=0
    dayOfMonth?: number;
    customCron?: string;
    endDate?: Date;
  };
  timezone?: string;
}

export interface IEmailAnalytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  bounced: number;
  complained: number;
  conversions: number;
  revenue?: number;
  updatedAt?: Date;
}

export interface IEmailCampaign extends Document {
  userId: mongoose.Schema.Types.ObjectId; // Seller/User ID
  name: string;
  description?: string;
  segmentId: mongoose.Schema.Types.ObjectId;
  subject: string;
  previewText?: string;

  // Campaign Content
  htmlContent: string;
  textContent: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;

  // Campaign Settings
  schedule: IEmailSchedule;
  status: "draft" | "scheduled" | "sending" | "paused" | "completed" | "failed";
  priority: "low" | "normal" | "high";

  // Content Personalization
  personalizationVariables?: {
    [key: string]: string | number;
  };

  // Tracking & Analytics
  trackingPixel: boolean;
  trackLinks: boolean;
  analytics: IEmailAnalytics;

  // Recipient Management
  recipientEmails?: string[]; // Manual recipient list
  totalRecipients: number;
  sentCount?: number;

  // A/B Testing — a single campaign document holds both variants; each
  // recipient's EmailQueue row records which one (A or B) it received.
  abTesting?: {
    enabled: boolean;
    variantSubject?: string;
    variantContent?: string;
    splitPercentage?: number;
    winningVariant?: "A" | "B";
  };

  // Unsubscribe Management
  unsubscribeLink: boolean;
  includePreferenceCenter: boolean;

  // Performance Goals
  goals?: {
    targetOpenRate?: number;
    targetClickRate?: number;
    targetConversionRate?: number;
  };

  // Error Handling
  lastError?: string;
  failureReason?: string;
  retryCount?: number;

  // Metadata
  tags?: string[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  sentAt?: Date;
  completedAt?: Date;
}

export interface IEmailQueue extends Document {
  campaignId: mongoose.Schema.Types.ObjectId;
  recipientEmail: string;
  recipientId?: mongoose.Schema.Types.ObjectId;
  status:
    | "pending"
    | "sending"
    | "sent"
    | "failed"
    | "bounced"
    | "unsubscribed";
  messageId?: string;
  attemptCount: number;
  lastAttempt?: Date;
  error?: string;
  personalizationData?: {
    [key: string]: string | number;
  };
  trackingToken?: string;
  openedAt?: Date;
  clickedAt?: Date;
  // Which A/B content variant this recipient received, when the campaign
  // has abTesting.enabled — unset for non-A/B campaigns.
  variant?: "A" | "B";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEmailTrackingEvent extends Document {
  queueId: mongoose.Schema.Types.ObjectId;
  campaignId: mongoose.Schema.Types.ObjectId;
  eventType:
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "unsubscribed"
    | "complained"
    | "bounced";
  timestamp: Date;
  metadata?: {
    ip?: string;
    userAgent?: string;
    linkUrl?: string;
    linkText?: string;
    city?: string;
    country?: string;
    device?: string;
    browser?: string;
  };
}

// ===================== SCHEMAS =====================

// Email Campaign Schema
const EmailCampaignSchema = new Schema<IEmailCampaign>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    segmentId: {
      type: Schema.Types.ObjectId,
      ref: "EmailSegment",
    },
    subject: {
      type: String,
      required: true,
    },
    previewText: {
      type: String,
      maxlength: 150,
    },
    htmlContent: {
      type: String,
      default: "",
    },
    textContent: {
      type: String,
    },
    fromName: {
      type: String,
      default: "",
    },
    fromEmail: {
      type: String,
      default: "",
    },
    replyTo: String,
    schedule: {
      type: {
        type: String,
        enum: ["immediate", "scheduled", "recurring"],
        default: "immediate",
      },
      scheduledTime: Date,
      recurring: {
        frequency: {
          type: String,
          enum: ["daily", "weekly", "monthly", "custom"],
        },
        daysOfWeek: [Number], // 0-6
        dayOfMonth: Number,
        customCron: String,
        endDate: Date,
      },
      timezone: {
        type: String,
        default: "UTC",
      },
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "paused", "completed", "failed"],
      default: "draft",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    personalizationVariables: mongoose.Schema.Types.Mixed,
    trackingPixel: {
      type: Boolean,
      default: true,
    },
    trackLinks: {
      type: Boolean,
      default: true,
    },
    analytics: {
      sent: {
        type: Number,
        default: 0,
      },
      delivered: {
        type: Number,
        default: 0,
      },
      opened: {
        type: Number,
        default: 0,
      },
      clicked: {
        type: Number,
        default: 0,
      },
      unsubscribed: {
        type: Number,
        default: 0,
      },
      bounced: {
        type: Number,
        default: 0,
      },
      complained: {
        type: Number,
        default: 0,
      },
      conversions: {
        type: Number,
        default: 0,
      },
      revenue: Number,
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    recipientEmails: [String],
    totalRecipients: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    abTesting: {
      enabled: {
        type: Boolean,
        default: false,
      },
      variantSubject: String,
      variantContent: String,
      splitPercentage: Number,
      winningVariant: {
        type: String,
        enum: ["A", "B"],
      },
    },
    unsubscribeLink: {
      type: Boolean,
      default: true,
    },
    includePreferenceCenter: {
      type: Boolean,
      default: false,
    },
    goals: {
      targetOpenRate: Number,
      targetClickRate: Number,
      targetConversionRate: Number,
    },
    lastError: String,
    failureReason: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    tags: [String],
    notes: String,
    sentAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  },
);

// Email Segment Schema
const EmailSegmentSchema = new Schema<IEmailSegment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    filters: {
      source: {
        type: String,
        enum: ["leads", "buyers", "both"],
        required: true,
      },
      industries: [String],
      leadQuality: [{ type: String, enum: ["High", "Medium", "Low"] }],
      buyerActiveOnly: Boolean,
    },
    recipientCount: Number,
  },
  {
    timestamps: true,
  },
);
EmailSegmentSchema.index({ userId: 1, name: 1 }, { unique: true });

// Email Queue Schema
const EmailQueueSchema = new Schema<IEmailQueue>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "EmailCampaign",
      required: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed", "bounced", "unsubscribed"],
      default: "pending",
      index: true,
    },
    messageId: String,
    attemptCount: {
      type: Number,
      default: 0,
    },
    lastAttempt: Date,
    error: String,
    personalizationData: mongoose.Schema.Types.Mixed,
    trackingToken: {
      type: String,
      index: true,
    },
    openedAt: Date,
    clickedAt: Date,
    variant: {
      type: String,
      enum: ["A", "B"],
    },
  },
  {
    timestamps: true,
  },
);

// Email Tracking Event Schema
const EmailTrackingEventSchema = new Schema<IEmailTrackingEvent>(
  {
    queueId: {
      type: Schema.Types.ObjectId,
      ref: "EmailQueue",
      required: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "EmailCampaign",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "sent",
        "delivered",
        "opened",
        "clicked",
        "unsubscribed",
        "complained",
        "bounced",
      ],
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      ip: String,
      userAgent: String,
      linkUrl: String,
      linkText: String,
      city: String,
      country: String,
      device: String,
      browser: String,
    },
  },
  {
    timestamps: true,
  },
);

// Create Indexes for Performance
EmailCampaignSchema.index({ userId: 1, createdAt: -1 });
EmailCampaignSchema.index({ status: 1, schedule: 1 });
// Scoped per-seller (not global) so two different sellers can each name a
// campaign "Spring Sale" — only duplicates within the same account collide.
EmailCampaignSchema.index({ userId: 1, name: 1 }, { unique: true });
EmailQueueSchema.index({
  campaignId: 1,
  status: 1,
});
EmailQueueSchema.index({ createdAt: 1 });
EmailTrackingEventSchema.index({
  campaignId: 1,
  eventType: 1,
  timestamp: -1,
});

// ===================== MODELS =====================

export const EmailCampaign: Model<IEmailCampaign> =
  mongoose.models.EmailCampaign ||
  mongoose.model<IEmailCampaign>("EmailCampaign", EmailCampaignSchema);

export const EmailSegment: Model<IEmailSegment> =
  mongoose.models.EmailSegment ||
  mongoose.model<IEmailSegment>("EmailSegment", EmailSegmentSchema);

export const EmailQueue: Model<IEmailQueue> =
  mongoose.models.EmailQueue ||
  mongoose.model<IEmailQueue>("EmailQueue", EmailQueueSchema);

export const EmailTrackingEvent: Model<IEmailTrackingEvent> =
  mongoose.models.EmailTrackingEvent ||
  mongoose.model<IEmailTrackingEvent>(
    "EmailTrackingEvent",
    EmailTrackingEventSchema,
  );
