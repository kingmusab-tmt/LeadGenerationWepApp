# Email Marketing & SMS Marketing Guide

> **Project:** BRIXCOT Lead Generation Web App  
> **Date:** February 7, 2026  
> **Purpose:** Documents how Email Marketing and SMS Marketing work in the platform, how sellers access and use them, current implementation status, and known issues.

---

## Table of Contents

1. [Overview](#overview)
2. [Email Marketing](#email-marketing)
   - [How Sellers Access It](#how-sellers-access-email-marketing)
   - [Creating & Sending Campaigns](#creating--sending-email-campaigns)
   - [Email Templates](#email-templates)
   - [Tracking & Analytics](#email-tracking--analytics)
   - [Technical Architecture](#email-technical-architecture)
3. [SMS Marketing](#sms-marketing)
   - [How Sellers Access It](#how-sellers-access-sms-marketing)
   - [Creating & Sending Campaigns](#creating--sending-sms-campaigns)
   - [SMS Templates](#sms-templates)
   - [Inbound Message & Opt-Out Handling](#inbound-message--opt-out-handling)
   - [Technical Architecture](#sms-technical-architecture)
4. [Shared Infrastructure](#shared-infrastructure)
5. [Current Implementation Status](#current-implementation-status)
6. [Known Issues & Bugs](#known-issues--bugs)
7. [Recommendations](#recommendations)

---

## Overview

BRIXCOT provides two built-in marketing channels that allow lead sellers to engage with their leads and buyers through automated campaigns:

- **Email Marketing** — Create, schedule, and send email campaigns with template support, A/B testing, and full open/click/unsubscribe tracking.
- **SMS Marketing** — Create and send SMS campaigns via Twilio with template support, delivery tracking, and opt-out compliance (STOP/START/HELP).

Both channels share a common architecture: MongoDB models, backend engine classes, REST API routes, validation schemas, and seller dashboard UI pages. Each seller uses their own SMTP credentials (email) or Twilio credentials (SMS), stored encrypted in their user profile.

---

## Email Marketing

### How Sellers Access Email Marketing

Sellers access email marketing from their dashboard:

**Navigation Path:** `Dashboard → Email Campaigns`  
**URL:** `/dashboard/seller/email-campaigns`

The main page displays:

- **Stats cards** — Total campaigns, Active campaigns, Completed campaigns, Average open rate
- **Filter tabs** — All / Drafts / Sending / Completed
- **Campaign table** — List of all campaigns with name, status, sent count, open rate, and action buttons (Send, Edit, Delete)
- **Create Campaign** button — Opens a dialog to create a new campaign

**Additional pages:**

- **Campaign Editor:** `/dashboard/seller/email-campaigns/[id]` — Edit campaign content, preview HTML, and view analytics
- **Template Builder:** `/dashboard/seller/email-campaigns/templates` — Manage reusable email templates

### Creating & Sending Email Campaigns

#### Step 1: Create a Campaign

1. Click **"Create Campaign"** on the email campaigns page
2. Fill in:
   - **Campaign Name** — Internal identifier
   - **Subject Line** — Email subject
   - **HTML Content** — Rich HTML email body (supports `{{variable}}` placeholders)
   - **Text Content** — Plain-text fallback
   - **Recipient List** — Array of email addresses
   - **Schedule** — Immediate, Scheduled (specific date/time), or Recurring
   - **Tags** — Optional labels for organization
3. Click Save to create as a draft

#### Step 2: Preview & Test

From the campaign editor page (`/dashboard/seller/email-campaigns/[id]`):

- Switch to the **Preview** tab to see the rendered HTML
- Click **"Send Test"** to send a test email to yourself
- Review how variables render and tracking elements appear

#### Step 3: Send the Campaign

- Click **"Send Campaign"** to start immediate delivery
- The engine queues all recipients and processes them in batches of 100
- Each email includes:
  - An invisible **tracking pixel** (1x1 transparent GIF) for open detection
  - **Click-tracked links** — all URLs are rewritten to redirect through a tracking endpoint
  - An **unsubscribe footer** with a token-based one-click unsubscribe link

#### Step 4: Monitor Analytics

From the campaign editor's **Analytics** tab:

- **Total Sent / Delivered / Opened / Clicked / Bounced / Unsubscribed / Complained**
- **Open Rate** and **Click Rate** percentages
- **Conversion count** and **Revenue** (if goals are set)
- **Timeline view** — Events grouped by date

### Email Templates

Sellers can create reusable templates from the **Template Builder** page (`/dashboard/seller/email-campaigns/templates`).

#### Built-in Preset Templates

| Template              | Category            | Variables Used                                                                |
| --------------------- | ------------------- | ----------------------------------------------------------------------------- |
| **Lead Notification** | `lead_notification` | `{{leadName}}`, `{{leadPhone}}`, `{{leadEmail}}`, `{{serviceType}}`           |
| **Weekly Newsletter** | `newsletter`        | `{{recipientName}}`, `{{highlight1}}`, `{{highlight2}}`, `{{highlight3}}`     |
| **Promotional**       | `promotional`       | `{{offerTitle}}`, `{{discount}}`, `{{offerDescription}}`                      |
| **Welcome**           | `welcome`           | `{{recipientName}}`, `{{step1}}`, `{{step2}}`, `{{step3}}`, `{{companyName}}` |

#### Variable Syntax

Templates use `{{variableName}}` placeholders that get replaced at send time with per-recipient personalization data. For example:

```
Hello {{recipientName}},

We have a new lead for you!
Name: {{leadName}}
Phone: {{leadPhone}}
Service: {{serviceType}}
```

#### Custom Templates

1. Click **"Create Template"** on the templates page
2. Choose a category: `welcome`, `promotional`, `newsletter`, `lead_notification`, or `custom`
3. Enter template name, subject, HTML content, and text content
4. Define variables that will be replaced at send time
5. Preview the rendered template in the live preview panel

### Email Tracking & Analytics

| Tracking Type       | How It Works                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Open tracking**   | A 1x1 transparent GIF pixel is injected into the email HTML. When the recipient's email client loads the image, the tracking endpoint records the open event with IP, user agent, and timestamp.                |
| **Click tracking**  | All links in the email HTML are rewritten to pass through a tracking redirect endpoint. The original URL is base64-encoded. When clicked, the event is recorded and the user is redirected to the original URL. |
| **Unsubscribe**     | A footer is appended to every email with a token-based unsubscribe link. Clicking it loads a confirmation page and records the unsubscribe event on the campaign.                                               |
| **Tracking events** | Stored in the `EmailTrackingEvent` collection with metadata: IP address, user agent, geographic location (city/country), device type, browser.                                                                  |

### Email Technical Architecture

#### SMTP Configuration

Each seller configures their own SMTP credentials in their account settings. The system falls back to environment variable defaults if no per-user settings exist. SMTP transporters are cached per-user for performance.

#### Processing Pipeline

```
Create Campaign (Draft)
    ↓
Schedule or Send Immediately
    ↓
EmailQueueManager creates queue entries for each recipient
    ↓
Batch processing (100 emails per batch)
    ↓
Per-email: Render template → Inject tracking pixel → Rewrite links → Send via SMTP
    ↓
100ms rate limit between sends
    ↓
Failed sends: Retry up to 3 times with 5s delay
    ↓
Update campaign analytics (sent/delivered/failed counts)
```

#### Files

| File                                                                  | Purpose                                                                                                                                                     |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/emailMarketingEngine.ts` (667 lines)                             | Core engine — 5 classes: `EmailTemplateEngine`, `TransporterManager`, `EmailQueueManager`, `EmailAnalyticsEngine`, `EmailScheduler`, `EmailMarketingEngine` |
| `models/emailCampaign.ts` (564 lines)                                 | 5 Mongoose models: `EmailCampaign`, `EmailTemplate`, `EmailSegment`, `EmailQueue`, `EmailTrackingEvent`                                                     |
| `app/api/marketing/email/campaigns/route.ts`                          | GET (list) / POST (create) campaigns                                                                                                                        |
| `app/api/marketing/email/campaigns/[id]/route.ts`                     | GET / PUT / DELETE individual campaigns                                                                                                                     |
| `app/api/marketing/email/campaigns/[id]/actions/route.ts`             | POST actions: `?action=send`, `?action=test`, `?action=pause`                                                                                               |
| `app/api/marketing/email/campaigns/[id]/analytics/route.ts`           | GET detailed analytics with timeline                                                                                                                        |
| `app/api/marketing/email/templates/route.ts`                          | GET / POST templates                                                                                                                                        |
| `app/api/marketing/email/track/open/[token]/route.ts`                 | Open pixel tracking endpoint                                                                                                                                |
| `app/api/marketing/email/track/click/[token]/route.ts`                | Click redirect tracking endpoint                                                                                                                            |
| `app/api/marketing/email/unsubscribe/[token]/route.ts`                | Unsubscribe confirmation page                                                                                                                               |
| `app/dashboard/seller/email-campaigns/page.tsx` (443 lines)           | Campaign list UI                                                                                                                                            |
| `app/dashboard/seller/email-campaigns/[id]/page.tsx` (374 lines)      | Campaign editor UI (3 tabs)                                                                                                                                 |
| `app/dashboard/seller/email-campaigns/templates/page.tsx` (457 lines) | Template builder UI                                                                                                                                         |

#### Dependency

- `nodemailer` v7.0.12 — SMTP email sending

---

## SMS Marketing

### How Sellers Access SMS Marketing

Sellers access SMS marketing from their dashboard:

**Navigation Path:** `Dashboard → SMS Campaigns`  
**URL:** `/dashboard/seller/sms-campaigns`

The main page displays:

- **Campaign cards** — Grid layout showing each campaign's name, status, and delivery stats (sent, delivered, failed)
- Links to the **Campaign Editor** and **Templates** page
- **Create Campaign** button

**Additional pages:**

- **Campaign Editor:** `/dashboard/seller/sms-campaigns/[id]` — Edit message content, send, and view stats
- **SMS Templates:** `/dashboard/seller/sms-campaigns/templates` — Manage reusable SMS templates

### Creating & Sending SMS Campaigns

#### Step 1: Create a Campaign

1. Click **"Create Campaign"** on the SMS campaigns page
2. Fill in:
   - **Campaign Name** — Internal identifier (1–100 characters)
   - **Message** — SMS text content (1–160 characters, supports `{{variable}}` placeholders)
   - **Recipient List** — Array of phone numbers (10–15 digits each)
   - **Schedule** — Optional scheduled send date/time
3. Save as draft

#### Step 2: Edit & Test

From the campaign editor (`/dashboard/seller/sms-campaigns/[id]`):

- Edit the campaign name and message content
- Click **"Send Test SMS"** to send to a single number for verification
- View a stats sidebar showing: Queued / Sent / Delivered / Failed / Replies / Opt-Outs

#### Step 3: Send the Campaign

- Click **"Send Now"** to start immediate delivery
- The engine queues all recipients and processes them in batches of 100
- Each SMS is sent via the Twilio API with a delivery status callback
- Failed sends are retried up to 3 times

#### Step 4: Monitor Results

From the campaign editor's stats sidebar:

- **Queued** — Messages waiting to be sent
- **Sent** — Messages submitted to Twilio
- **Delivered** — Confirmed delivered by carrier
- **Failed** — Delivery failures
- **Replies** — Inbound responses from recipients
- **Opt-Outs** — Recipients who replied STOP

### SMS Templates

Sellers can create reusable SMS templates from the **Templates** page (`/dashboard/seller/sms-campaigns/templates`).

#### Built-in Preset Templates

| Template                 | Category            | Content                                                                                                    |
| ------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **New Lead Alert**       | `lead_notification` | `Hi {{leadName}}, thank you for your interest in {{serviceType}}. Call us at {{leadPhone}} for more info!` |
| **Promo Offer**          | `promotional`       | `{{company}}: {{offerTitle}}! Get {{discount}} off. Reply STOP to opt out.`                                |
| **Appointment Reminder** | `reminder`          | `Reminder: Your appointment is on {{appointmentDate}} at {{appointmentTime}}. Reply to confirm.`           |

#### Custom Templates

1. Click **"Create Template"** on the templates page
2. Enter template name, category, and message content
3. Use `{{variableName}}` placeholders for personalization
4. Save for reuse across campaigns

### Inbound Message & Opt-Out Handling

The SMS engine includes **full TCPA-compliant opt-out handling** via Twilio's inbound webhook:

| Inbound Keyword                         | Action                                              | Auto-Reply                                                      |
| --------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| **STOP** / **UNSUBSCRIBE** / **CANCEL** | Records opt-out event, adds to suppression list     | _"You have been unsubscribed. Reply START to re-subscribe."_    |
| **START** / **UNSTOP** / **SUBSCRIBE**  | Records opt-in event, removes from suppression list | _"You have been re-subscribed. Reply STOP to opt out."_         |
| **HELP** / **INFO**                     | No status change                                    | _"For assistance, contact support. Reply STOP to unsubscribe."_ |
| **Any other text**                      | Records as a reply event                            | — (no auto-reply)                                               |

**Twilio webhook configuration:**

- **Inbound messages:** Configure Twilio to POST to `/api/marketing/sms/inbound`
- **Delivery status updates:** Configure Twilio to POST to `/api/marketing/sms/track/status`

### SMS Technical Architecture

#### Twilio Configuration

Each seller configures their own Twilio credentials in their account API settings:

- **Twilio Account SID**
- **Twilio Auth Token**
- **Twilio Phone Number** (the "from" number for SMS)

If no per-user credentials are set, the system falls back to environment variable defaults (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`).

#### Processing Pipeline

```
Create Campaign (Draft)
    ↓
Send Immediately (scheduling not yet implemented)
    ↓
SmsQueueManager creates queue entries for each recipient
    ↓
Batch processing (100 SMS per batch)
    ↓
Per-SMS: Render template variables → Send via Twilio API
    ↓
Failed sends: Retry up to 3 times
    ↓
Twilio status callback updates delivery status (queued → sent → delivered/failed)
    ↓
Update campaign stats
```

#### Files

| File                                                                | Purpose                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `lib/smsMarketingEngine.ts` (282 lines)                             | Core engine — `SmsTemplateEngine`, `TwilioManager`, `SmsQueueManager`, `SmsMarketingEngine` |
| `models/smsCampaign.ts` (226 lines)                                 | 5 Mongoose models: `SmsCampaign`, `SmsTemplate`, `SmsSegment`, `SmsQueue`, `SmsEvent`       |
| `app/api/marketing/sms/campaigns/route.ts`                          | GET (list) / POST (create) campaigns                                                        |
| `app/api/marketing/sms/campaigns/[id]/route.ts`                     | GET / PUT / DELETE individual campaigns                                                     |
| `app/api/marketing/sms/campaigns/[id]/actions/route.ts`             | POST actions: `?action=send`, `?action=test`, `?action=pause`                               |
| `app/api/marketing/sms/templates/route.ts`                          | GET / POST templates                                                                        |
| `app/api/marketing/sms/track/status/route.ts`                       | Twilio delivery status webhook                                                              |
| `app/api/marketing/sms/inbound/route.ts`                            | Twilio inbound message webhook (opt-out handling)                                           |
| `app/dashboard/seller/sms-campaigns/page.tsx` (84 lines)            | Campaign list UI                                                                            |
| `app/dashboard/seller/sms-campaigns/[id]/page.tsx` (164 lines)      | Campaign editor UI                                                                          |
| `app/dashboard/seller/sms-campaigns/templates/page.tsx` (160 lines) | Template management UI                                                                      |

#### Dependency

- `twilio` v5.11.2 — SMS sending and webhook handling

---

## Shared Infrastructure

### Validation Schemas (`lib/validation/schemas.ts`)

**Email campaign validation:**

- `name` — required string
- `subject` — required string
- `body` — required string
- `recipientList` — array of valid email addresses
- `schedule` — optional date
- `template` — optional template ID
- `tags` — optional string array

**SMS campaign validation:**

- `name` — 1–100 characters
- `message` — 1–160 characters
- `recipientList` — array of phone numbers (10–15 digits)
- `schedule` — optional date

### Redux State (`lib/campaignsSlice.ts`)

A unified Redux slice manages state for both email and SMS campaigns:

```typescript
{
  emailCampaigns: EmailCampaign[],
  smsCampaigns: SmsCampaign[],
  activeCampaign: Campaign | null,
  filters: { status: string, type: string },
  loading: boolean,
  error: string | null
}
```

**Note:** The Redux slice is registered in the store but the UI pages currently use direct `fetch()` calls instead of dispatching Redux actions. The slice is available but not actively consumed.

### Legacy Campaign Model (`models/campaign.ts`)

A simpler generic campaign model exists at `/dashboard/seller/campaigns` with basic fields (name, description, dates, budget, status). This is a **legacy system** separate from the email/SMS campaign models and may represent an earlier iteration or a general-purpose campaign tracker (e.g., advertising campaigns, not email/SMS).

---

## Current Implementation Status

### Email Marketing

| Component                      | Status             | Notes                                                          |
| ------------------------------ | ------------------ | -------------------------------------------------------------- |
| Engine — Template rendering    | ✅ Implemented     | `{{variable}}` replacement, pixel injection, link rewriting    |
| Engine — SMTP transport        | ✅ Implemented     | Per-user caching, connection verification                      |
| Engine — Queue & batch sending | ✅ Implemented     | 100/batch, 3 retries, 100ms rate limit                         |
| Engine — Analytics recording   | ✅ Implemented     | Open/click/unsubscribe event storage and aggregation           |
| Engine — One-time scheduling   | ✅ Implemented     | `setTimeout`-based                                             |
| Engine — Recurring scheduling  | ❌ Not Implemented | Logs cron expression but does nothing (TODO placeholder)       |
| Models                         | ✅ Implemented     | 5 models with indexes                                          |
| API Routes                     | ✅ Implemented     | CRUD, actions, analytics, tracking, unsubscribe                |
| UI — Campaign List             | ✅ Implemented     | Stats cards, filters, table, create dialog                     |
| UI — Campaign Editor           | ✅ Implemented     | Editor, Preview, Analytics tabs                                |
| UI — Template Builder          | ✅ Implemented     | 4 presets, create/edit/delete, live preview                    |
| A/B Testing                    | ⚠️ Schema only     | Fields exist on model but no engine or UI support              |
| Segmentation                   | ⚠️ Schema only     | `EmailSegment` model exists but not wired to campaign creation |

### SMS Marketing

| Component                   | Status             | Notes                                                        |
| --------------------------- | ------------------ | ------------------------------------------------------------ |
| Engine — Template rendering | ✅ Implemented     | `{{variable}}` replacement                                   |
| Engine — Twilio sending     | ✅ Implemented     | Per-user credentials, batch sending                          |
| Engine — Queue management   | ✅ Implemented     | 100/batch, 3 retries                                         |
| Engine — Inbound handling   | ✅ Implemented     | STOP/START/HELP keyword processing                           |
| Engine — Campaign creation  | ✅ Implemented     | `createCampaign()`, `sendCampaignImmediate()`                |
| Engine — Analytics          | ❌ Not Implemented | Class reserved, comment placeholder only                     |
| Engine — Scheduling         | ❌ Not Implemented | Class reserved, comment placeholder only                     |
| Models                      | ✅ Implemented     | 5 models with indexes                                        |
| API Routes                  | ✅ Implemented     | CRUD, actions, status webhook, inbound webhook               |
| UI — Campaign List          | ✅ Implemented     | Card grid with stats                                         |
| UI — Campaign Editor        | ✅ Implemented     | Edit content, send, stats sidebar                            |
| UI — Templates              | ✅ Implemented     | 3 presets, create dialog                                     |
| Segmentation                | ⚠️ Schema only     | `SmsSegment` model exists but not wired to campaign creation |

---

## Known Issues & Bugs

| #   | Severity     | Issue                                                                                                                                                                                                                                                   | Impact                                                                                                  |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | **CRITICAL** | **Frontend/API URL mismatch** — UI pages call `/api/email-campaigns/...` and `/api/sms-campaigns/...`, but actual routes are at `/api/marketing/email/campaigns/...` and `/api/marketing/sms/campaigns/...`. No URL rewrites exist in `next.config.ts`. | All campaign API calls return 404. Neither email nor SMS campaigns function.                            |
| 2   | **CRITICAL** | **Email tracking URLs hardcoded** — `EmailTemplateEngine` uses `https://yourapp.com/api/email/track/...` instead of `process.env.NEXT_PUBLIC_DOMAIN`.                                                                                                   | Open tracking, click tracking, and unsubscribe links are broken in all sent emails.                     |
| 3   | **HIGH**     | **Twilio status callback URL mismatch** — Engine posts callback URL as `/api/sms/track/status` but actual route is `/api/marketing/sms/track/status`.                                                                                                   | SMS delivery status updates (delivered/failed) are never received. Campaign stats stay stuck on "sent". |
| 4   | **HIGH**     | **Email template API URL mismatch** — UI calls `/api/email/templates` but route is at `/api/marketing/email/templates`.                                                                                                                                 | Template CRUD operations fail with 404.                                                                 |
| 5   | **HIGH**     | **SMS template API URL mismatch** — UI calls `/api/sms/templates` but route is at `/api/marketing/sms/templates`.                                                                                                                                       | Template CRUD operations fail with 404.                                                                 |
| 6   | **MEDIUM**   | **Redux slice unused** — `campaignsSlice` is registered in the store but UI pages use direct `fetch()` instead of Redux actions.                                                                                                                        | No global state caching; duplicate fetches on navigation.                                               |
| 7   | **MEDIUM**   | **Recurring email scheduling not implemented** — `scheduleRecurring()` just logs and returns.                                                                                                                                                           | Sellers can select "recurring" schedule type but nothing happens.                                       |
| 8   | **MEDIUM**   | **SMS analytics engine not implemented** — placeholder comment only.                                                                                                                                                                                    | No analytical insights for SMS campaigns beyond basic sent/delivered counters.                          |
| 9   | **MEDIUM**   | **SMS scheduling not implemented** — despite `scheduleAt` field on the model.                                                                                                                                                                           | Sellers cannot schedule SMS sends for a future date/time.                                               |

---

## Recommendations

### Immediate Fixes (Required for Feature to Work)

1. **Fix the URL mismatches** — Either:
   - **(Option A)** Add rewrites in `next.config.ts` to map the old paths to the actual routes, OR
   - **(Option B)** Update all `fetch()` calls in the UI pages to use the correct `/api/marketing/email/...` and `/api/marketing/sms/...` paths.
   - Option B is recommended as it's a clean fix.

2. **Fix email tracking URLs** — Replace hardcoded `https://yourapp.com/` with `process.env.NEXT_PUBLIC_DOMAIN` or `process.env.NEXT_PUBLIC_APP_URL` in `EmailTemplateEngine`.

3. **Fix Twilio status callback URL** — Update the callback URL in `SmsQueueManager` to `/api/marketing/sms/track/status`.

### Near-Term Enhancements

4. **Implement SMS scheduling** — Wire the existing `scheduleAt` model field to a `setTimeout`-based scheduler (matching email's implementation).

5. **Implement SMS analytics engine** — Add open/click/reply aggregation similar to `EmailAnalyticsEngine`.

6. **Implement recurring email scheduling** — Replace the stub with a cron-based implementation (consider `node-cron` or a job queue like BullMQ).

7. **Wire segmentation to campaign creation** — The `EmailSegment` and `SmsSegment` models exist but aren't selectable when creating campaigns. Add a "Select Segment" dropdown to campaign creation dialogs.

### Long-Term Improvements

8. **Add A/B testing to the UI** — The `EmailCampaign` model has A/B testing fields (`abTest`, `variants`). Build a UI for creating variants and viewing comparative analytics.

9. **Use Redux slice for state management** — Replace direct `fetch()` calls with Redux thunks to enable caching and avoid redundant API calls.

10. **Add a visual email editor** — Replace the raw HTML textarea with a drag-and-drop email builder (e.g., `react-email-editor` or `unlayer`).

11. **Add SMS character counting** — Show remaining characters (160 limit) and segment count in the SMS editor.

12. **Add campaign contact import** — Allow sellers to upload CSV files of recipients instead of entering them manually.

---

_End of document._
