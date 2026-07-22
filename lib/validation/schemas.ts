import { z } from "zod";

// ============================================
// AUTHENTICATION SCHEMAS
// ============================================

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  userType: z.enum(["seller", "buyer", "business"]),
});

// ============================================
// LEADS SCHEMAS
// ============================================

// Matches models/leads.ts: name/email/phone are all optional there (the
// manual-add UI collects real data through the dynamic `fields[]` array,
// keyed by form-field id, not fixed top-level properties) — `fields` is the
// one genuinely required data carrier.
export const createLeadSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.union([z.literal(""), z.string().email("Invalid email")]).optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  status: z
    .enum([
      "new",
      "available",
      "sold",
      "assigned",
      "qualified",
      "unqualified",
      "transferred",
    ])
    .optional(),
  distributionMethod: z
    .enum(["manual", "round_robin", "marketplace"])
    .optional(),
  unit: z.number().min(0).optional(),
  shared: z.boolean().optional(),
  shareNumber: z.number().min(0).optional(),
  isManual: z.boolean().optional(),
  fields: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.any(),
      }),
    )
    .min(1, "At least one field is required"),
});

export const updateLeadSchema = z
  .object({
    name: z.string().max(100).optional(),
    email: z
      .union([z.literal(""), z.string().email("Invalid email")])
      .optional(),
    phone: z.string().max(20).optional(),
    source: z.string().max(50).optional(),
    status: z
      .enum([
        "new",
        "contacted",
        "qualified",
        "converted",
        "lost",
        "available",
        "sold",
        "assigned",
        "unqualified",
        "transferred",
      ])
      .optional(),
    notes: z.string().max(500).optional(),
    customFields: z.record(z.string(), z.any()).optional(),
    company: z.string().max(200).optional(),
    industry: z.string().max(100).optional(),
    distributionMethod: z
      .enum(["manual", "auto", "marketplace", "round_robin"])
      .optional(),
    unit: z.number().min(0).optional(),
    shared: z.boolean().optional(),
    shareNumber: z.number().min(0).optional(),
    fields: z
      .array(
        z
          .object({
            label: z.string(),
            value: z.any(),
            type: z.string().optional(),
            id: z.string().optional(),
          })
          .strip(),
      )
      .optional(),
  })
  .strip();

export const bulkImportLeadsSchema = z.object({
  leads: z.array(createLeadSchema).min(1, "At least one lead is required"),
  duplicateHandling: z.enum(["skip", "update", "replace"]).optional(),
});

export const getLeadsQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((v) => (v ? parseInt(v) : 1)),
  // No upper bound previously existed — any caller could request an
  // arbitrarily large single query (e.g. limit=999999999).
  limit: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((v) => Math.min(v ? parseInt(v) : 20, 500)),
  status: z.string().optional(),
  source: z.string().optional(),
  sort: z.string().optional(),
});

// ============================================
// EMAIL CAMPAIGN SCHEMAS
// ============================================

export const createEmailCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100),
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().optional(),
  htmlContent: z.string().optional(),
  fromEmail: z.string().email().optional(),
  recipientList: z.array(z.string().email()).optional(),
  schedule: z
    .object({
      scheduledTime: z.string().datetime().optional(),
      recurring: z.boolean().optional(),
      frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

export const updateEmailCampaignSchema = createEmailCampaignSchema.partial();

export const getEmailCampaignsQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((v) => (v ? parseInt(v) : 1)),
  limit: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((v) => (v ? parseInt(v) : 10)),
  status: z
    .enum(["draft", "scheduled", "sending", "paused", "completed", "failed"])
    .optional(),
  sort: z.string().optional(),
});

// ============================================
// SMS CAMPAIGN SCHEMAS
// ============================================

export const createSMSCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100),
  textContent: z.string().min(1, "Message is required").max(1600),
  recipients: z
    .array(
      z.object({
        phone: z.string().min(1, "Phone number is required"),
        name: z.string().optional(),
        variables: z
          .record(z.string(), z.union([z.string(), z.number()]))
          .optional(),
      }),
    )
    .optional(),
  schedule: z
    .object({
      scheduledTime: z.string().datetime().optional(),
      recurring: z.boolean().optional(),
    })
    .optional(),
});

export const updateSMSCampaignSchema = createSMSCampaignSchema.partial();

// ============================================
// FORM SCHEMAS
// ============================================

// Shared by create and update — kept as one list so the two form-builder
// screens (create vs. edit) and the AI generator can never again drift into
// accepting different sets of field types (previously "dropdown"/"select"
// and "tel"/"phone" were normalized inconsistently between screens, and
// city/state auto-fill fields used by the one-click "Contact Fields" button
// weren't in this enum at all, so publishing/updating a form that used it
// always failed validation). "file" is deliberately excluded — no upload
// storage is implemented yet, so accepting the type would silently drop
// submitted files (see FormPreview.tsx's file-field handling).
export const formFieldTypeSchema = z.enum([
  "text",
  "email",
  "phone",
  "tel",
  "url",
  "select",
  "dropdown",
  "checkbox",
  "textarea",
  "date",
  "number",
  "radio",
  "header",
  "paragraph",
  "city_autocomplete",
  "state_auto",
]);

const FIELD_TYPES_REQUIRING_OPTIONS = ["select", "dropdown", "checkbox", "radio"];

export const formFieldSchema = z
  .object({
    id: z.string(),
    type: formFieldTypeSchema,
    label: z.string().min(1),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
    headingLevel: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).optional(),
    linkedTo: z.string().optional(),
    disabled: z.boolean().optional(),
  })
  // A select/dropdown/checkbox/radio field saved with zero options renders
  // as an empty, permanently-unusable control on the public form — this is
  // rejected here so it can never reach the database in the first place,
  // rather than only being caught (or not) client-side.
  .refine(
    (field) =>
      !FIELD_TYPES_REQUIRING_OPTIONS.includes(field.type) ||
      (field.options ?? []).some((option) => option.trim().length > 0),
    {
      message: "Select, dropdown, checkbox, and radio fields must have at least one non-empty option",
      path: ["options"],
    },
  );

// Neither builder screen currently exposes a color picker for these, so
// they're only reachable via a direct API call — constrained to a real hex
// color so malformed input can't reach the public form's inline styles.
const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/, "Must be a hex color, e.g. #1976d2")
  .optional();

const formStyleConfigSchema = z
  .object({
    primaryColor: hexColorSchema,
    buttonText: z.string().max(100).optional(),
    successMessage: z.string().max(500).optional(),
    formBackgroundColor: hexColorSchema,
  })
  .optional();

const formStatusSchema = z.enum(["draft", "published"]).optional();
const allowedOriginsSchema = z
  .array(z.string().max(253))
  .max(20)
  .optional();

export const createFormSchema = z.object({
  name: z.string().min(1, "Form name is required").max(500),
  description: z.string().max(1000).optional(),
  // Previously only carried inside `description` as "Lead Source: X |
  // Industry: Y" text — fragile to round-trip and, worse, meant the
  // model's own real leadSource/industry columns were never populated at
  // creation, only ever set later via an edit/update.
  leadSource: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
  recaptchaEnabled: z.boolean().optional(),
  fields: z.array(formFieldSchema).min(1, "At least one field is required"),
  redirectUrl: z.string().url().optional(),
  notificationEmail: z.string().email().optional(),
  styleConfig: formStyleConfigSchema,
  status: formStatusSchema,
  allowedOrigins: allowedOriginsSchema,
});

// The update route's own request shape (formName/leadSource/industry as
// their own fields, not createFormSchema's name/description) — previously
// this route did zero validation at all.
export const updateFormRequestSchema = z.object({
  formId: z.string().min(1, "Form ID is required"),
  formName: z.string().min(1, "Form name is required").max(500),
  leadSource: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
  fields: z.array(formFieldSchema).min(1, "At least one field is required"),
  description: z.string().max(1000).optional(),
  redirectUrl: z.string().url().optional(),
  notificationEmail: z.string().email().optional(),
  recaptchaEnabled: z.boolean().optional(),
  styleConfig: formStyleConfigSchema,
  status: formStatusSchema,
  allowedOrigins: allowedOriginsSchema,
});

// ============================================
// PAYMENT SCHEMAS
// ============================================

export const createPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3, "Invalid currency code"),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.enum(["stripe", "square"]),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const createSubscriptionSchema = z.object({
  tierId: z.string().min(1, "Tier ID is required"),
  paymentMethod: z.enum(["stripe"]),
  billingCycle: z.enum(["monthly", "annual"]),
});

// ============================================
// USER SETTINGS SCHEMAS
// ============================================

export const updateUserProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\d{10,15}$/)
    .optional(),
  avatar: z.string().url().optional(),
  timezone: z.string().optional(),
});

export const updateAPISettingsSchema = z.object({
  twilioSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioPhoneNumber: z
    .string()
    .regex(/^\+\d{1,15}$/)
    .optional(),
});

export const updateEmailSettingsSchema = z.object({
  smtpServer: z.string().min(1).optional(),
  smtpUser: z.string().email().optional(),
  smtpPassword: z.string().min(1).optional(),
  port: z.number().min(1).max(65535).optional(),
});

// ============================================
// NOTIFICATION SCHEMAS
// ============================================

export const createNotificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(1000),
  type: z.enum(["info", "success", "warning", "error"]),
  recipientIds: z.array(z.string()).optional(),
  broadcast: z.boolean().optional(),
});

// ============================================
// AUTOMATION SCHEMAS
// ============================================

export const createAutomationWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required").max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  triggers: z
    .array(
      z.object({
        type: z.enum([
          "lead_received",
          "lead_accepted",
          "lead_qualified",
          "scheduled",
          "manual",
        ]),
        conditions: z
          .array(
            z.object({
              field: z.string().min(1),
              operator: z.enum([
                "equals",
                "contains",
                "greater_than",
                "less_than",
                "in_array",
                "exists",
              ]),
              value: z.union([
                z.string(),
                z.number(),
                z.boolean(),
                z.array(z.string()),
              ]),
            }),
          )
          .optional(),
      }),
    )
    .min(1, "At least one trigger is required"),
  actions: z
    .array(
      z.object({
        type: z.enum([
          "send_email",
          "send_sms",
          "create_notification",
          "assign_buyer",
          "update_lead",
        ]),
        config: z
          .object({
            subject: z.string().optional(),
            body: z.string().optional(),
            message: z.string().optional(),
            notificationTitle: z.string().optional(),
            notificationBody: z.string().optional(),
            notificationType: z
              .enum(["info", "success", "warning", "error"])
              .optional(),
            buyerId: z.string().optional(),
            updateFields: z.record(z.string(), z.any()).optional(),
            delayMinutes: z.coerce.number().int().min(0).optional(),
            priority: z.enum(["low", "normal", "high"]).optional(),
          })
          .default({}),
      }),
    )
    .min(1, "At least one action is required"),
  maxExecutions: z.coerce.number().int().positive().optional(),
  cooldownMinutes: z.coerce.number().int().min(0).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateAutomationWorkflowSchema =
  createAutomationWorkflowSchema.partial();

// ============================================
// CALL TRACKING SCHEMAS
// ============================================

export const createCallTrackingSchema = z.object({
  industry: z.string().min(1, "Industry is required"),
  forwardingType: z.enum(["sequential", "simultaneous", "hunt"]),
  phoneNumbers: z
    .array(z.string().regex(/^\d{10,15}$/))
    .min(1, "At least one phone number required"),
  recordCall: z.boolean().optional(),
  welcomeMessage: z.string().max(500).optional(),
  callWhisper: z.string().max(500).optional(),
});

// ============================================
// PAGINATION & FILTERING
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  search: z.string().optional(),
});

// ============================================
// ID VALIDATION
// ============================================

export const mongoIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID"),
});

export const mongoIdParamSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID");

// ============================================
// BULK OPERATIONS SCHEMAS
// ============================================

export const bulkUpdateSchema = z.object({
  ids: z.array(mongoIdParamSchema).min(1, "At least one ID is required"),
  updates: z
    .record(z.string(), z.any())
    .refine(
      (obj) => Object.keys(obj).length > 0,
      "At least one update is required",
    ),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(mongoIdParamSchema).min(1, "At least one ID is required"),
});

// ============================================
// EXPORT SCHEMAS
// ============================================

export const exportDataSchema = z.object({
  format: z.enum(["csv", "json", "xlsx"]),
  fields: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

// ============================================
// BUYER SCHEMAS
// ============================================

// NOTE: previously this schema's enums (status, preferredDistribution,
// notificationPreferences shape) didn't match models/leadbuyers.ts at all —
// it would have rejected every legitimate payload the app actually sends.
// Rewritten to match the real IBuyer schema/enums.
const contactAddressSchema = z
  .object({
    addressLine1: z.string().max(150).optional(),
    addressLine2: z.string().max(150).optional(),
    city: z.string().max(80).optional(),
    state: z.string().max(80).optional(),
    country: z.string().max(80).optional(),
    postCode: z.string().max(20).optional(),
  })
  .optional();

// The lead-matching engine (lib/leadAssignmentService.ts) reads
// preferredZones, not leadPreferences.location, to decide whether a buyer
// matches a lead — this schema previously had no way to accept it at all,
// so edits made via the per-city zone editor in BuyerFormEnhanced were
// silently dropped by Zod before ever reaching the database.
const preferredZoneSchema = z.object({
  city: z.string().max(100).optional(),
  state: z.string().max(80).optional(),
  zipCodes: z.array(z.string().max(20)).optional(),
});

export const createBuyerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  company: z.string().min(1, "Company is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{10,20}$/, "Invalid phone number"),
  status: z.enum(["new", "active", "inactive", "suspended"]).optional(),
  leadPreferences: z
    .object({
      location: z.union([z.string(), z.array(z.string())]).optional(),
      industries: z.array(z.string()).optional(),
      industryServicePairs: z.array(z.any()).optional(),
    })
    .optional(),
  preferredZones: z.array(preferredZoneSchema).optional(),
  preferredDistribution: z.enum(["Automatic", "Manual", "Both"]).optional(),
  notificationPreferences: z
    .array(z.enum(["Email", "SMS", "In-App Notification"]))
    .optional(),
  workingHours: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  timezone: z.string().max(60).optional(),
  maxLeadsPerDay: z.number().int().min(0).max(10000).optional(),
  businessDescription: z.string().max(2000).optional(),
  companyRegNo: z.string().max(50).optional(),
  vatTaxRegNo: z.string().max(50).optional(),
  businessWebsite: z
    .string()
    .url("Invalid business website URL")
    .max(300)
    .optional()
    .or(z.literal("")),
  contactAddress: contactAddressSchema,
});

export const updateBuyerSchema = createBuyerSchema.partial();

export const getBuyersQuerySchema = z.object({
  buyerId: mongoIdParamSchema.optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
  status: z.enum(["new", "active", "inactive", "suspended"]).optional(),
  search: z.string().max(200).optional(),
});

// ============================================
// TRANSACTION SCHEMAS
// ============================================

export const getTransactionsQuerySchema = z.object({
  buyerId: mongoIdParamSchema.optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(25).optional(),
  type: z
    .enum([
      "lead_purchase",
      "call_purchase",
      "units_purchase",
      "seller_income",
      "seller_payout",
      "refund",
      "admin_adjustment",
      "subscription_payment",
      "subscription_renewal",
      "subscription_cancellation",
    ])
    .optional(),
  status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
});

// Sanity ceilings, not a business rule — bounds a single manual-credit entry
// against fat-finger/malicious input rather than any real pricing policy.
export const MANUAL_CREDIT_MAX_CASH = 100_000;
export const MANUAL_CREDIT_MAX_CREDITS = 1_000_000;

export const manualCreditSchema = z.object({
  buyerId: mongoIdParamSchema,
  cashPaid: z
    .number({ message: "Cash paid must be a number" })
    .positive("Cash paid must be greater than 0")
    .max(
      MANUAL_CREDIT_MAX_CASH,
      `Cash paid cannot exceed ${MANUAL_CREDIT_MAX_CASH.toLocaleString()} per transaction`,
    ),
  numberOfCredits: z
    .number({ message: "Number of credits must be a number" })
    .int("Number of credits must be a whole number")
    .positive("Number of credits must be greater than 0")
    .max(
      MANUAL_CREDIT_MAX_CREDITS,
      `Number of credits cannot exceed ${MANUAL_CREDIT_MAX_CREDITS.toLocaleString()} per transaction`,
    ),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description cannot exceed 500 characters"),
});

// ============================================
// SETTINGS SCHEMAS
// ============================================

export const updateSettingsSchema = z.object({
  autoAssignLeads: z.boolean().optional(),
  maxAutoAssignPerDay: z.number().int().min(0).optional(),
  distributionMode: z.enum(["automatic", "marketplace", "both"]).optional(),
  aiQualityThreshold: z.number().int().min(0).max(100).optional(),
  marketplaceFallback: z.boolean().optional(),
  leadPricing: z
    .object({
      high: z.number().min(0).optional(),
      medium: z.number().min(0).optional(),
      low: z.number().min(0).optional(),
    })
    .optional(),
  emailSettings: z
    .object({
      smtpServer: z.string().optional(),
      smtpUser: z
        .string()
        .refine((val) => !val || z.string().email().safeParse(val).success, {
          message: "Invalid email format",
        })
        .optional(),
      smtpPassword: z.string().optional(),
      port: z.number().min(1).max(65535).optional(),
      fromEmail: z
        .string()
        .refine((val) => !val || z.string().email().safeParse(val).success, {
          message: "Invalid email format",
        })
        .optional(),
      fromName: z.string().optional(),
    })
    .optional(),
  apiSettings: z
    .object({
      twilioSid: z.string().optional(),
      twilioAuthToken: z.string().optional(),
      twilioPhoneNumber: z
        .string()
        .regex(/^\+\d{1,15}$/)
        .optional(),
      stripeApiKey: z.string().optional(),
      googleApiKey: z.string().optional(),
    })
    .optional(),
  creditSetup: z
    .object({
      autoPurchase: z.boolean().optional(),
      threshold: z.number().min(0).optional(),
      purchaseAmount: z.number().min(1).optional(),
      paymentMethod: z.string().optional(),
    })
    .optional(),
});

// ============================================
// ADMIN SCHEMAS
// ============================================

export const adminGetUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(["seller", "buyer", "business", "admin"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  search: z.string().optional(),
});

export const adminUpdateUserSchema = z.object({
  role: z.enum(["seller", "buyer", "business", "admin"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  credits: z.number().min(0).optional(),
  tier: z.string().optional(),
});

// ============================================
// CHATBOT SCHEMAS
// ============================================

export const chatbotMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(1000),
  sessionId: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
});

// ============================================
// INVOICE SCHEMAS
// ============================================

export const createInvoiceSchema = z.object({
  recipientEmail: z.string().email("Invalid email"),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
      }),
    )
    .min(1, "At least one item is required"),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const getInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================
// CALL TRACKING QUERY SCHEMAS
// ============================================

export const callFeedbackSchema = z.object({
  isSellerReview: z.boolean().optional(),
  approved: z.boolean().optional(),
  feedback: z.boolean().optional(),
  callDuration: z.number().nonnegative().optional(),
  comment: z.string().max(1000, "Comment must be 1000 characters or fewer").optional(),
});

export const getCallsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(200).default(20).optional(),
  buyerId: mongoIdParamSchema.optional(),
  status: z.enum(["completed", "missed", "busy", "failed"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type BulkImportLeadsInput = z.infer<typeof bulkImportLeadsSchema>;
export type CreateEmailCampaignInput = z.infer<
  typeof createEmailCampaignSchema
>;
export type CreateSMSCampaignInput = z.infer<typeof createSMSCampaignSchema>;
export type CreateFormInput = z.infer<typeof createFormSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type UpdateAPISettingsInput = z.infer<typeof updateAPISettingsSchema>;
export type UpdateEmailSettingsInput = z.infer<
  typeof updateEmailSettingsSchema
>;
export type CreateAutomationWorkflowInput = z.infer<
  typeof createAutomationWorkflowSchema
>;
export type CreateCallTrackingInput = z.infer<typeof createCallTrackingSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
export type ExportDataInput = z.infer<typeof exportDataSchema>;
export type CreateBuyerInput = z.infer<typeof createBuyerSchema>;
export type UpdateBuyerInput = z.infer<typeof updateBuyerSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type ChatbotMessageInput = z.infer<typeof chatbotMessageSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
