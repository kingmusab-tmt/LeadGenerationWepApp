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

export const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^\d{10,15}$/, "Invalid phone number"),
  source: z.enum(["form", "api", "import", "call"]).optional(),
  status: z
    .enum(["new", "contacted", "qualified", "converted", "lost"])
    .optional(),
  notes: z.string().max(500).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

export const updateLeadSchema = z
  .object({
    name: z.string().max(100).optional(),
    email: z.string().email("Invalid email").optional(),
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
  limit: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((v) => (v ? parseInt(v) : 20)),
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
  template: z.string().optional(),
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

export const createFormSchema = z.object({
  name: z.string().min(1, "Form name is required").max(500),
  description: z.string().max(1000).optional(),
  recaptchaEnabled: z.boolean().optional(),
  fields: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum([
          "text",
          "email",
          "phone",
          "select",
          "checkbox",
          "textarea",
          "date",
          "number",
          "radio",
          "header",
          "paragraph",
        ]),
        label: z.string().min(1),
        required: z.boolean().optional(),
        placeholder: z.string().optional(),
        options: z.array(z.string()).optional(),
        headingLevel: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).optional(),
      }),
    )
    .min(1, "At least one field is required"),
  redirectUrl: z.string().url().optional(),
  notificationEmail: z.string().email().optional(),
  styleConfig: z
    .object({
      primaryColor: z.string().optional(),
      buttonText: z.string().optional(),
      successMessage: z.string().optional(),
      formBackgroundColor: z.string().optional(),
    })
    .optional(),
});

export const updateFormSchema = createFormSchema.partial();

// ============================================
// PAYMENT SCHEMAS
// ============================================

export const createPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3, "Invalid currency code"),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.enum(["stripe", "paypal", "square"]),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const createSubscriptionSchema = z.object({
  tierId: z.string().min(1, "Tier ID is required"),
  paymentMethod: z.enum(["stripe", "paypal"]),
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
  trigger: z.object({
    type: z.enum([
      "lead_created",
      "email_opened",
      "link_clicked",
      "form_submitted",
    ]),
    conditions: z.record(z.string(), z.any()).optional(),
  }),
  actions: z
    .array(
      z.object({
        type: z.enum([
          "send_email",
          "send_sms",
          "add_tag",
          "assign_owner",
          "webhook",
        ]),
        params: z.record(z.string(), z.any()),
      }),
    )
    .min(1, "At least one action is required"),
  enabled: z.boolean().optional(),
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

export const createBuyerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  company: z.string().min(1, "Company is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^\d{10,15}$/, "Invalid phone number"),
  status: z.enum(["active", "inactive", "pending"]).optional(),
  leadPreferences: z.object({
    industry: z.string().min(1, "Industry is required"),
    location: z.string().optional(),
    minBudget: z.number().min(0).optional(),
    maxBudget: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
  }),
  preferredDistribution: z
    .enum(["sequential", "simultaneous", "hunt"])
    .optional(),
  notificationPreferences: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .optional(),
});

export const updateBuyerSchema = createBuyerSchema.partial();

export const getBuyersQuerySchema = z.object({
  buyerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid buyer ID")
    .optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
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
      smtpUser: z.string().email().optional(),
      smtpPassword: z.string().optional(),
      port: z.number().min(1).max(65535).optional(),
      fromEmail: z.string().email().optional(),
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

export const getCallsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
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
