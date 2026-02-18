import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISmsRecipient {
  phone: string;
  name?: string;
  variables?: Record<string, string | number>;
}

export interface ISmsTemplate extends Document {
  userId: string;
  name: string;
  category: string;
  textContent: string; // SMS body template
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISmsSegment extends Document {
  userId: string;
  name: string;
  description?: string;
  filter?: Record<string, unknown>;
  recipients: ISmsRecipient[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type SmsCampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "paused"
  | "completed"
  | "failed";

export interface ISmsCampaign extends Document {
  userId: string;
  name: string;
  templateId?: mongoose.Types.ObjectId;
  segmentId?: mongoose.Types.ObjectId;
  fromPhoneNumber?: string; // Twilio number allocated for this campaign
  recipients: ISmsRecipient[];
  textContent: string;
  scheduleAt?: Date;
  status: SmsCampaignStatus;
  stats: {
    queued: number;
    sent: number;
    delivered: number;
    failed: number;
    clicks: number;
    replies: number;
    optOuts: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISmsQueue extends Document {
  campaignId: mongoose.Types.ObjectId;
  userId: string;
  recipient: ISmsRecipient;
  status: "pending" | "sent" | "delivered" | "failed";
  attempts: number;
  error?: string;
  messageSid?: string; // Twilio SID
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISmsEvent extends Document {
  campaignId: mongoose.Types.ObjectId;
  userId: string;
  type:
    | "queued"
    | "sent"
    | "delivered"
    | "failed"
    | "clicked"
    | "replied"
    | "optout"
    | "optin";
  phone: string;
  meta?: Record<string, unknown>;
  createdAt?: Date;
}

const SmsTemplateSchema = new Schema<ISmsTemplate>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: "custom" },
    textContent: { type: String, required: true },
  },
  { timestamps: true },
);

const SmsSegmentSchema = new Schema<ISmsSegment>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    filter: { type: Object },
    recipients: [
      {
        phone: { type: String, required: true },
        name: { type: String },
        variables: { type: Object },
      },
    ],
  },
  { timestamps: true },
);

const SmsCampaignSchema = new Schema<ISmsCampaign>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "SmsTemplate" },
    segmentId: { type: Schema.Types.ObjectId, ref: "SmsSegment" },
    fromPhoneNumber: { type: String }, // Twilio number for this campaign
    recipients: [
      {
        phone: { type: String, required: true },
        name: { type: String },
        variables: { type: Object },
      },
    ],
    textContent: { type: String, required: true },
    scheduleAt: { type: Date },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "paused", "completed", "failed"],
      default: "draft",
    },
    stats: {
      queued: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      replies: { type: Number, default: 0 },
      optOuts: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

const SmsQueueSchema = new Schema<ISmsQueue>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "SmsCampaign",
      index: true,
    },
    userId: { type: String, required: true },
    recipient: {
      phone: { type: String, required: true },
      name: { type: String },
      variables: { type: Object },
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    error: { type: String },
    messageSid: { type: String, index: true },
  },
  { timestamps: true },
);

const SmsEventSchema = new Schema<ISmsEvent>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "SmsCampaign",
      index: true,
    },
    userId: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "queued",
        "sent",
        "delivered",
        "failed",
        "clicked",
        "replied",
        "optout",
        "optin",
      ],
      index: true,
    },
    phone: { type: String, required: true, index: true },
    meta: { type: Object },
  },
  { timestamps: true },
);

SmsTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });
SmsSegmentSchema.index({ userId: 1, name: 1 }, { unique: true });
SmsCampaignSchema.index({ userId: 1, status: 1 });
SmsQueueSchema.index({ userId: 1, status: 1 });
SmsEventSchema.index({ userId: 1, type: 1 });

export const SmsTemplate: Model<ISmsTemplate> =
  mongoose.models.SmsTemplate ||
  mongoose.model<ISmsTemplate>("SmsTemplate", SmsTemplateSchema);

export const SmsSegment: Model<ISmsSegment> =
  mongoose.models.SmsSegment ||
  mongoose.model<ISmsSegment>("SmsSegment", SmsSegmentSchema);

export const SmsCampaign: Model<ISmsCampaign> =
  mongoose.models.SmsCampaign ||
  mongoose.model<ISmsCampaign>("SmsCampaign", SmsCampaignSchema);

export const SmsQueue: Model<ISmsQueue> =
  mongoose.models.SmsQueue ||
  mongoose.model<ISmsQueue>("SmsQueue", SmsQueueSchema);

export const SmsEvent: Model<ISmsEvent> =
  mongoose.models.SmsEvent ||
  mongoose.model<ISmsEvent>("SmsEvent", SmsEventSchema);
