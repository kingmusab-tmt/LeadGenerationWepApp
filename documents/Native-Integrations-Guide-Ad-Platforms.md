# Native Integrations Guide: Google Ads, Facebook Ads & Alternatives to Zapier

> **Project:** BRIXCOT Lead Generation Web App  
> **Date:** February 8, 2026  
> **Purpose:** Detail how native ad platform integrations and other direct connectors can replace Zapier as the lead ingestion bridge, eliminating the middleman cost and complexity for sellers.

---

## Table of Contents

1. [Why Native Integrations Over Zapier](#why-native-integrations-over-zapier)
2. [Facebook Lead Ads Integration](#facebook-lead-ads-integration)
3. [Google Ads Lead Form Extensions Integration](#google-ads-lead-form-extensions-integration)
4. [Other Native Integrations Worth Considering](#other-native-integrations-worth-considering)
   - [LinkedIn Lead Gen Forms](#linkedin-lead-gen-forms)
   - [TikTok Lead Generation](#tiktok-lead-generation)
   - [Typeform / JotForm Webhooks](#typeform--jotform-webhooks)
   - [Google Sheets Import](#google-sheets-import)
   - [CSV / Bulk Upload](#csv--bulk-upload)
   - [Email-to-Lead (IMAP Polling)](#email-to-lead-imap-polling)
5. [Implementation Priority Matrix](#implementation-priority-matrix)
6. [Architecture: How They Fit Into BRIXCOT](#architecture-how-they-fit-into-brixcot)
7. [Impact on Zapier](#impact-on-zapier)

---

## Why Native Integrations Over Zapier

The [Integration Scenarios document](Integration-Scenarios-Seller-Use-Cases.md) identified that **Zapier's primary value is getting leads INTO BRIXCOT from external sources** — particularly ad platforms like Facebook and Google Ads. However, Zapier as a middleman has significant drawbacks:

| Factor                   | Via Zapier                                                                                | Native Integration                                       |
| ------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Cost to seller**       | $20–$70/month for Zapier plan (most sellers need Starter+)                                | Free — included in BRIXCOT subscription                  |
| **Setup complexity**     | Seller must create a Zapier account, build a Zap, configure field mapping, manage API key | Toggle on in BRIXCOT settings, OAuth connect, done       |
| **Latency**              | 1–15 min polling delay (Zapier free/starter polls every 15/2 min)                         | Real-time via webhooks or near-real-time via API polling |
| **Reliability**          | Depends on Zapier uptime + BRIXCOT API uptime (two failure points)                        | Single failure point (BRIXCOT only)                      |
| **Data mapping**         | Manual JSON field mapping in Zapier UI                                                    | Pre-built field mapping with auto-detection              |
| **Error handling**       | Zap error logs in Zapier (seller must check separately)                                   | Errors visible in BRIXCOT dashboard                      |
| **Lead source tracking** | Seller must manually set `leadSource` in Zap                                              | Automatic: `leadSource` = "facebook_ads" / "google_ads"  |

**Bottom line:** For the 3–4 most common lead ingestion sources, native integrations are cheaper, faster, simpler, and more reliable than Zapier. Zapier remains useful as a fallback for niche/uncommon integrations.

---

## Facebook Lead Ads Integration

### What Are Facebook Lead Ads?

Facebook (Meta) Lead Ads are ad formats on Facebook and Instagram that include an **instant form** — when a user clicks the ad, a pre-filled form opens (populated from their Facebook profile) and they can submit it without leaving the app. This generates high volumes of leads with low friction.

Facebook Lead Ads are the **#1 paid lead source** for industries like real estate, insurance, solar, home services, and automotive — exactly the industries BRIXCOT targets.

### How It Would Work in BRIXCOT

#### Setup Flow (Seller's Perspective)

1. Navigate to **Dashboard → Integrations → Facebook Ads** tab
2. Click **"Connect Facebook Account"** → redirected to Facebook OAuth
3. Facebook asks seller to grant permissions: `leads_retrieval`, `pages_show_list`, `pages_read_engagement`
4. Seller selects which **Facebook Page(s)** to monitor for leads
5. Optionally map Facebook form fields → BRIXCOT lead fields
6. Toggle on → leads start flowing in real-time

#### Technical Architecture

**Option A: Webhooks (Real-Time) — Recommended**

Facebook provides a [Webhooks API for Leadgen](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/) that sends a real-time ping whenever a new lead is submitted.

```
Facebook Lead Ad submitted
    → Facebook sends POST to BRIXCOT webhook endpoint
    → BRIXCOT receives leadgen_id + page_id
    → BRIXCOT calls Facebook Graph API to fetch full lead data
    → Lead is created in BRIXCOT with leadSource = "facebook_ads"
    → Normal BRIXCOT flow: AI scoring → distribution → buyer assignment
```

**API endpoints needed:**

| Endpoint                                   | Purpose                                                    |
| ------------------------------------------ | ---------------------------------------------------------- |
| `POST /api/integrations/facebook/webhook`  | Receive real-time leadgen webhook pings from Facebook      |
| `GET /api/integrations/facebook/webhook`   | Facebook webhook verification (hub.verify_token challenge) |
| `GET /api/integrations/facebook/auth`      | Initiate OAuth flow → redirect to Facebook                 |
| `GET /api/integrations/facebook/callback`  | OAuth callback → exchange code for access token            |
| `GET /api/integrations/facebook/pages`     | List seller's Facebook Pages for selection                 |
| `POST /api/integrations/facebook/config`   | Save page selection + field mapping                        |
| `DELETE /api/integrations/facebook/config` | Disconnect Facebook integration                            |

**Facebook Graph API calls BRIXCOT would make:**

| Call                              | Purpose                                                   |
| --------------------------------- | --------------------------------------------------------- |
| `GET /me/accounts`                | List seller's Pages (to pick which ones to monitor)       |
| `GET /{page_id}/leadgen_forms`    | List available lead forms on the Page                     |
| `GET /{leadgen_id}`               | Fetch full lead data (name, email, phone, custom answers) |
| `POST /{page_id}/subscribed_apps` | Subscribe BRIXCOT app to the Page's leadgen webhooks      |

**Option B: Polling (Fallback)**

If webhook setup is too complex for initial implementation, BRIXCOT could poll the Facebook API periodically:

```
Every 2 minutes:
    → GET /{page_id}/leadgen_forms/{form_id}/leads?since={last_check}
    → For each new lead: create in BRIXCOT
```

Polling is simpler to implement but introduces delay and costs more API calls.

#### Field Mapping

| Facebook Lead Ad Field  | BRIXCOT Lead Field | Notes                                              |
| ----------------------- | ------------------ | -------------------------------------------------- |
| `full_name`             | `name`             | May come as one field or split first/last          |
| `email`                 | `email`            | Pre-filled from Facebook profile                   |
| `phone_number`          | `phone`            | Pre-filled or manually entered                     |
| `company_name`          | `company`          | Only if the form includes it                       |
| `city`                  | `location.city`    | Only if the form includes it                       |
| `state`                 | `location.state`   | Only if the form includes it                       |
| `zip_code`              | `location.zipCode` | Only if the form includes it                       |
| Custom questions        | `fields[]`         | Mapped to BRIXCOT custom fields array              |
| (auto-set)              | `leadSource`       | Always `"facebook_ads"`                            |
| (auto-set)              | `industry`         | Based on seller's Page category or ad campaign     |
| `ad_id` / `campaign_id` | (metadata)         | Stored for analytics — which ad generated the lead |

#### Duplicate Handling

Before creating a lead, check if a lead with the same `email` already exists for this seller. If yes, update instead of creating a duplicate. This mirrors the existing Zapier duplicate detection pattern.

#### What the Seller Gets

- **Zero-delay leads**: Lead appears in BRIXCOT within seconds of Facebook form submission
- **Automatic source tagging**: `leadSource = "facebook_ads"` with campaign/ad metadata
- **Full BRIXCOT pipeline**: AI quality scoring, auto-distribution to buyers, marketplace fallback — all automatic
- **Analytics**: Dashboard shows Facebook Ads as a lead source with volume, quality, and conversion metrics
- **No extra cost**: No Zapier subscription required

#### Requirements from Facebook

- A **Facebook App** must be created in Meta Developer Console (BRIXCOT creates one app, all sellers use it via OAuth)
- The app needs **App Review** from Meta to access `leads_retrieval` permission in production
- The app must have a **Privacy Policy URL** and **Terms of Service URL**
- For webhook mode: the BRIXCOT server must be publicly accessible with a valid SSL certificate

#### Dependencies

| Package                                   | Purpose                                                       | Required?                  |
| ----------------------------------------- | ------------------------------------------------------------- | -------------------------- |
| None (raw `fetch`)                        | Facebook Graph API v19.0 is REST-based                        | Matches existing pattern   |
| `facebook-nodejs-business-sdk` (optional) | Official Meta SDK with type safety, pagination, rate limiting | Nice-to-have, not required |

#### Estimated Effort

| Component                       | Effort       |
| ------------------------------- | ------------ |
| OAuth flow (connect/disconnect) | 1–2 days     |
| Webhook receiver + lead fetch   | 1–2 days     |
| Field mapping + lead creation   | 1 day        |
| Settings UI component           | 1–2 days     |
| Duplicate detection             | 0.5 day      |
| Testing + edge cases            | 1–2 days     |
| **Total**                       | **5–9 days** |

---

## Google Ads Lead Form Extensions Integration

### What Are Google Ads Lead Form Extensions?

Google Ads [Lead Form Extensions](https://support.google.com/google-ads/answer/9363878) (also called Lead Form Assets) allow advertisers to attach a lead form directly to Search, YouTube, and Display ads. When a user clicks, a Google-hosted form opens (pre-filled with their Google account data). The lead is stored in Google Ads and can be retrieved via API.

### How It Would Work in BRIXCOT

#### Setup Flow (Seller's Perspective)

1. Navigate to **Dashboard → Integrations → Google Ads** tab
2. Click **"Connect Google Ads Account"** → redirected to Google OAuth
3. Google asks seller to grant access to their Google Ads account (scope: `https://www.googleapis.com/auth/adwords`)
4. Seller selects which **Google Ads account(s)** and optionally which campaigns to monitor
5. BRIXCOT begins polling for new leads (or sets up webhook via Google Pub/Sub)
6. Toggle on → leads start flowing

#### Technical Architecture

**Option A: Webhook via Google Pub/Sub — Recommended for Real-Time**

Google Ads doesn't have a direct webhook system, but supports [lead form data notifications via Google Cloud Pub/Sub](https://developers.google.com/google-ads/api/docs/extensions/lead-forms/overview):

```
User submits Google Ad lead form
    → Google Ads pushes notification to a Google Cloud Pub/Sub topic
    → BRIXCOT has a Pub/Sub push subscription → receives HTTP POST
    → BRIXCOT calls Google Ads API to fetch full lead data
    → Lead is created in BRIXCOT with leadSource = "google_ads"
    → Normal BRIXCOT flow: AI scoring → distribution → buyer assignment
```

This requires a Google Cloud project with Pub/Sub enabled, which adds complexity.

**Option B: API Polling — Simpler, Recommended for Initial Implementation**

```
Every 5 minutes (configurable):
    → Call Google Ads API: LeadFormSubmissionData for each active form
    → Filter by submissions since last poll
    → For each new lead: create in BRIXCOT
```

Google Ads API rate limits are generous (15,000 requests/day for standard access), so polling every 5 minutes is sustainable.

**API endpoints needed:**

| Endpoint                                     | Purpose                                                    |
| -------------------------------------------- | ---------------------------------------------------------- |
| `GET /api/integrations/google-ads/auth`      | Initiate Google OAuth flow                                 |
| `GET /api/integrations/google-ads/callback`  | OAuth callback → exchange code for access + refresh tokens |
| `GET /api/integrations/google-ads/accounts`  | List seller's Google Ads accounts (via `CustomerService`)  |
| `GET /api/integrations/google-ads/campaigns` | List campaigns with lead form extensions                   |
| `POST /api/integrations/google-ads/config`   | Save account selection + polling settings                  |
| `DELETE /api/integrations/google-ads/config` | Disconnect Google Ads integration                          |
| `POST /api/integrations/google-ads/sync`     | Manual trigger to pull latest leads now                    |

**Google Ads API calls BRIXCOT would make:**

| Call                                      | Purpose                                               |
| ----------------------------------------- | ----------------------------------------------------- |
| `CustomerService.ListAccessibleCustomers` | List Ads accounts seller has access to                |
| `GoogleAdsService.Search` (GAQL)          | Query campaigns with lead form extensions             |
| `GoogleAdsService.Search` (GAQL)          | Fetch `lead_form_submission_data` for new submissions |

**Sample GAQL query to fetch lead form submissions:**

```sql
SELECT
  lead_form_submission_data.id,
  lead_form_submission_data.asset,
  lead_form_submission_data.submission_date_time,
  lead_form_submission_data.lead_form_submission_fields
FROM lead_form_submission_data
WHERE lead_form_submission_data.submission_date_time > '{last_sync_time}'
ORDER BY lead_form_submission_data.submission_date_time DESC
```

#### Field Mapping

| Google Ads Lead Form Field      | BRIXCOT Lead Field | Notes                                 |
| ------------------------------- | ------------------ | ------------------------------------- |
| `FULL_NAME`                     | `name`             | Or `FIRST_NAME` + `LAST_NAME`         |
| `EMAIL`                         | `email`            | Pre-filled from Google account        |
| `PHONE_NUMBER`                  | `phone`            | Pre-filled or manually entered        |
| `COMPANY_NAME`                  | `company`          | Only if form includes it              |
| `CITY`                          | `location.city`    | Only if form includes it              |
| `STATE`                         | `location.state`   | Only if form includes it              |
| `POSTAL_CODE`                   | `location.zipCode` | Only if form includes it              |
| Custom questions                | `fields[]`         | Mapped to BRIXCOT custom fields array |
| (auto-set)                      | `leadSource`       | Always `"google_ads"`                 |
| `campaign.id` / `campaign.name` | (metadata)         | Stored for analytics                  |
| `ad_group.id` / `ad_group.name` | (metadata)         | Stored for analytics                  |

#### Requirements from Google

- A **Google Cloud project** with Google Ads API enabled
- Apply for **Google Ads API Developer Token** (standard access; basic access has lower limits)
- OAuth 2.0 credentials (Client ID + Secret) from Google Cloud Console
- The seller's Google Ads account must have active Lead Form Extensions

#### Important Differences from Facebook

| Aspect                   | Facebook Lead Ads            | Google Ads Lead Forms                   |
| ------------------------ | ---------------------------- | --------------------------------------- |
| **Webhook support**      | Native webhooks (simple)     | Requires Pub/Sub (complex)              |
| **Recommended approach** | Webhooks (real-time)         | API polling (simpler)                   |
| **API complexity**       | Simple REST/Graph API        | Complex GAQL query language             |
| **SDK availability**     | Optional                     | Strongly recommended (`google-ads-api`) |
| **Auth method**          | Facebook OAuth + Page tokens | Google OAuth + Ads API developer token  |
| **Lead access duration** | 90 days via API              | 30 days via API                         |
| **Rate limits**          | 200 calls/user/hour          | 15,000 requests/day                     |

#### Dependencies

| Package          | Purpose                                                                     | Required?                                                                 |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `google-ads-api` | Official Google Ads API client for Node.js (handles auth, GAQL, pagination) | **Strongly recommended** — the raw API requires gRPC and protobuf         |
| `googleapis`     | Google OAuth2 client                                                        | Can reuse if already in project, otherwise `google-ads-api` includes auth |

#### Estimated Effort

| Component                         | Effort        |
| --------------------------------- | ------------- |
| Google OAuth flow + token refresh | 1–2 days      |
| Google Ads API client setup       | 1–2 days      |
| Lead form submission polling      | 1–2 days      |
| Field mapping + lead creation     | 1 day         |
| Settings UI component             | 1–2 days      |
| Duplicate detection               | 0.5 day       |
| Testing + edge cases              | 1–2 days      |
| **Total**                         | **6–11 days** |

---

## Other Native Integrations Worth Considering

These alternatives also cover common lead ingestion use cases, reducing or eliminating the need for Zapier.

---

### LinkedIn Lead Gen Forms

#### What It Is

LinkedIn Lead Gen Forms are pre-filled forms attached to Sponsored Content and Message Ads. A user clicks the ad, LinkedIn pre-fills the form with their profile data (name, email, job title, company), and the lead is captured. Very popular for B2B lead generation.

#### How It Would Work

- Seller connects their LinkedIn Campaign Manager account via OAuth 2.0
- BRIXCOT polls the LinkedIn Marketing API for new lead form responses
- Leads are created in BRIXCOT with `leadSource = "linkedin_ads"`

#### API Details

| Aspect             | Details                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API**            | [LinkedIn Marketing API — Lead Syncing](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/advertising-targeting/lead-syncing) |
| **Auth**           | OAuth 2.0 with `r_ads_leadgen_automation` scope                                                                                                   |
| **Method**         | Polling (no webhooks) — `GET /leadFormResponses?q=owner`                                                                                          |
| **Lead retention** | 90 days via API                                                                                                                                   |
| **Rate limits**    | 100 requests/day per app (restrictive — batch carefully)                                                                                          |
| **SDK**            | None official for Node.js — use raw `fetch`                                                                                                       |
| **Requirements**   | LinkedIn Marketing Developer Platform approval (can take weeks)                                                                                   |

#### Field Mapping

| LinkedIn Field           | BRIXCOT Field       |
| ------------------------ | ------------------- |
| `firstName` + `lastName` | `name`              |
| `emailAddress`           | `email`             |
| `phoneNumber`            | `phone`             |
| `companyName`            | `company`           |
| `jobTitle`               | `fields[]` (custom) |
| `headline`               | `fields[]` (custom) |
| Campaign metadata        | Analytics tracking  |

#### Value for BRIXCOT Sellers

**Medium-High for B2B sellers.** LinkedIn is the dominant platform for B2B lead generation. Sellers in industries like SaaS, consulting, professional services, financial services, and staffing run LinkedIn Lead Gen Forms heavily.

**Low for B2C sellers.** Home services, solar, roofing, insurance sellers rarely use LinkedIn ads.

#### Estimated Effort: 5–8 days

---

### TikTok Lead Generation

#### What It Is

TikTok Instant Forms are in-app lead forms attached to TikTok ads. Users submit their info without leaving the TikTok app. Growing rapidly, especially for B2C industries targeting younger demographics.

#### How It Would Work

- Seller connects their TikTok For Business account via OAuth 2.0
- BRIXCOT uses the TikTok Marketing API to poll for new lead data
- Leads are created with `leadSource = "tiktok_ads"`

#### API Details

| Aspect             | Details                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **API**            | [TikTok Marketing API — Lead Generation](https://business-api.tiktok.com/portal/docs?id=1740200930007042) |
| **Auth**           | OAuth 2.0 or long-lived access token                                                                      |
| **Method**         | Polling — `GET /lead/get/`                                                                                |
| **Lead retention** | 90 days via API                                                                                           |
| **Rate limits**    | 10 QPS per app                                                                                            |
| **SDK**            | None official — use raw `fetch`                                                                           |
| **Requirements**   | TikTok Developer account + app approval                                                                   |

#### Value for BRIXCOT Sellers

**Medium for specific industries.** TikTok ads are growing fast in real estate, automotive, beauty, fitness, and education. Less relevant for B2B or traditional industries.

#### Estimated Effort: 4–7 days

---

### Typeform / JotForm Webhooks

#### What It Is

Typeform and JotForm are popular third-party form builders. Some sellers prefer them over BRIXCOT's built-in form builder for their design flexibility. Both support **native webhooks** — a POST is sent to a URL every time someone submits a form.

#### How It Would Work

- Seller navigates to **Dashboard → Integrations → Form Webhooks**
- Enters their Typeform/JotForm webhook configuration (or uses a unique BRIXCOT-generated webhook URL)
- In Typeform/JotForm, adds that URL as a webhook destination
- When a form is submitted, Typeform/JotForm POSTs the data to BRIXCOT
- BRIXCOT parses the payload, maps fields, and creates a lead

```
User submits Typeform/JotForm
    → Webhook POST to /api/integrations/webhooks/typeform (or /jotform)
    → BRIXCOT maps fields → creates lead with leadSource = "typeform" / "jotform"
    → Normal flow: AI scoring → distribution
```

#### Why This Is Simpler Than Other Integrations

- **No OAuth needed** — Typeform/JotForm webhooks are configured on their side, BRIXCOT just receives the POST
- **No polling** — Webhooks are real-time by nature
- **No API calls to external services** — BRIXCOT only receives, never calls out
- This is essentially an extension of the existing **custom webhooks** infrastructure in BRIXCOT (the "Webhooks" tab already exists in the integrations dashboard)

#### What's Needed

1. **Payload parser** for Typeform's webhook format (`form_response.answers[]`)
2. **Payload parser** for JotForm's webhook format (key-value pairs)
3. **Configurable field mapping UI** — Let seller map "Which Typeform question = which BRIXCOT field?"
4. **Signature verification** — Typeform signs webhooks with HMAC-SHA256 (same pattern BRIXCOT already uses)

#### Value for BRIXCOT Sellers

**Medium.** Applies to sellers who already use Typeform/JotForm and don't want to rebuild forms in BRIXCOT. The built-in Form Builder covers most use cases, but some sellers have complex multi-step forms in Typeform they don't want to recreate.

#### Estimated Effort: 3–5 days

---

### Google Sheets Import

#### What It Is

Many sellers track leads in Google Sheets — either manually or as an export from other tools. A Google Sheets integration would let sellers connect a spreadsheet and auto-import rows as leads.

#### How It Would Work

- Seller connects their Google account via OAuth 2.0
- Selects a spreadsheet and sheet tab
- Maps columns to BRIXCOT lead fields (e.g., Column A = Name, Column B = Email)
- Chooses import mode:
  - **One-time import** — Bulk import all rows now
  - **Continuous sync** — Poll every N minutes for new rows (check for new rows appended at the bottom)
- New rows become leads with `leadSource = "google_sheets"`

#### API Details

| Aspect          | Details                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| **API**         | [Google Sheets API v4](https://developers.google.com/sheets/api)                  |
| **Auth**        | Google OAuth 2.0 (share auth with Google Ads integration if both are implemented) |
| **Method**      | Polling — `GET /spreadsheets/{id}/values/{range}`                                 |
| **Rate limits** | 300 requests/minute per project (very generous)                                   |
| **SDK**         | `googleapis` (official, well-maintained)                                          |

#### Value for BRIXCOT Sellers

**Medium-High.** Extremely common workflow. Many sellers:

- Export leads from other platforms into Sheets and want them in BRIXCOT
- Have a VA (virtual assistant) who manually enters leads into Sheets
- Use Sheets as a scratch pad before committing leads to the system
- Transition from another lead management tool and have historical data in Sheets

#### Estimated Effort: 4–6 days

---

### CSV / Bulk Upload

#### What It Is

The simplest possible import: seller uploads a CSV file containing leads, maps columns to fields, and BRIXCOT creates all leads at once.

#### How It Would Work

- Seller navigates to **Dashboard → Lead Management → Import**
- Uploads a CSV file (or drag-and-drop)
- BRIXCOT previews the first 5 rows and asks seller to map columns:
  - Column 1 → Name
  - Column 2 → Email
  - Column 3 → Phone
  - etc.
- Seller confirms → leads are bulk-created with `leadSource = "csv_import"`
- Summary shown: "150 leads imported, 12 duplicates skipped, 3 invalid rows"

#### Why This Matters

- **Zero integration setup** — No OAuth, no API keys, no webhooks
- **Works for any source** — Seller can export from any tool (Excel, CRM, email marketing) to CSV
- **Historical data migration** — When a seller first joins BRIXCOT, they can bring their existing leads
- **Most requested feature in lead gen platforms** — Every competitor (LeadsPedia, Boberdoo, LeadByte) has CSV import

#### What's Needed

1. CSV parser (server-side, e.g., `csv-parser` or `papaparse`)
2. Column mapping UI
3. Validation (required fields, email format, duplicate detection)
4. Batch processing (for large files: chunk into batches of 100)
5. Progress indicator + summary report
6. Error file download (a CSV containing rows that failed with reasons)

#### Value for BRIXCOT Sellers

**High.** This is the most universally needed import feature. Every seller has leads to bring in from other systems, and CSV is the universal data exchange format.

#### Estimated Effort: 3–5 days

---

### Email-to-Lead (IMAP Polling)

#### What It Is

Some sellers receive lead inquiries via email (e.g., "info@company.com"). An email-to-lead feature would monitor an email inbox and auto-create leads from incoming emails.

#### How It Would Work

- Seller navigates to **Dashboard → Integrations → Email-to-Lead**
- Enters IMAP credentials (server, port, email, password) — or connects via Gmail/Outlook OAuth
- Configures rules:
  - Which folder to monitor (Inbox, specific label)
  - Optional subject line filter (e.g., only emails containing "inquiry" or "quote")
  - Field extraction: sender name → `name`, sender email → `email`, email body → `fields[].notes`
- BRIXCOT polls the inbox every N minutes for new unread emails
- Each matching email creates a lead with `leadSource = "email"`
- The email is marked as read (or moved to a "Processed" folder)

#### Value for BRIXCOT Sellers

**Medium.** Applies to sellers who receive email inquiries alongside their web forms. But BRIXCOT already has email marketing and the built-in Form Builder handles most capture needs. This is more relevant for sellers who also serve as service providers (hybrid model) and receive direct email inquiries.

#### Complexity Concern

- IMAP is fragile (connection drops, encoding issues, multi-part MIME parsing)
- Gmail has deprecated basic IMAP auth — requires OAuth 2.0
- Parsing unstructured email bodies to extract structured lead data is unreliable without AI
- Consider using Gemini AI (already in the project) to extract name/email/phone/company from email body

#### Estimated Effort: 5–8 days (due to IMAP complexity and email parsing)

---

## Implementation Priority Matrix

Ranked by **value to BRIXCOT sellers** balanced against **implementation effort**:

| Priority | Integration                     | Value       | Effort    | Why This Priority                                                                                                       |
| -------- | ------------------------------- | ----------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| **1**    | **CSV / Bulk Upload**           | High        | 3–5 days  | Universal need. Every seller has existing leads to import. Zero external dependencies.                                  |
| **2**    | **Facebook Lead Ads**           | High        | 5–9 days  | #1 paid lead source for BRIXCOT's target industries (real estate, insurance, solar, home services). Real-time webhooks. |
| **3**    | **Google Ads Lead Forms**       | High        | 6–11 days | #2 paid lead source. Paired with Facebook, covers 80%+ of paid ad leads.                                                |
| **4**    | **Google Sheets Import**        | Medium-High | 4–6 days  | Common workflow. Shares OAuth with Google Ads (if both built). Good for migration.                                      |
| **5**    | **Typeform / JotForm Webhooks** | Medium      | 3–5 days  | Reuses existing webhook infrastructure. Low effort.                                                                     |
| **6**    | **LinkedIn Lead Gen Forms**     | Medium      | 5–8 days  | Valuable for B2B sellers only. Restrictive API rate limits. Slow approval process.                                      |
| **7**    | **TikTok Lead Generation**      | Low-Medium  | 4–7 days  | Growing platform but niche. Most BRIXCOT sellers aren't on TikTok yet.                                                  |
| **8**    | **Email-to-Lead**               | Low-Medium  | 5–8 days  | IMAP complexity is high. Unreliable email body parsing. Niche use case.                                                 |

### Recommended Implementation Phases

**Phase 1 — Core (Weeks 1–3):**

- CSV / Bulk Upload
- Facebook Lead Ads

**Phase 2 — Expansion (Weeks 4–6):**

- Google Ads Lead Forms
- Google Sheets Import

**Phase 3 — Optional (Based on User Demand):**

- Typeform / JotForm Webhooks
- LinkedIn Lead Gen Forms

**Phase 4 — Future:**

- TikTok Lead Generation
- Email-to-Lead

---

## Architecture: How They Fit Into BRIXCOT

### Shared Design Principles

All native integrations should follow the same patterns already established by the existing Zapier integration:

1. **Per-user credentials** — OAuth tokens stored in the User document, encrypted with AES-256-CBC
2. **Token refresh** — All new integrations MUST implement automatic OAuth token refresh
3. **Lead creation via existing pipeline** — All integrations create leads through the same code path: `Lead.create()` → AI scoring → buyer assignment. No special handling.
4. **`leadSource` tracking** — Each integration sets a distinct `leadSource` value. The existing `LEAD_SOURCES` in [utils/leadSources.ts](../utils/leadSources.ts) already includes `google_ads`, `facebook_ads`, and `linkedin_ads`.
5. **Duplicate detection** — Check by email before creating. Update existing leads instead of creating duplicates.
6. **Integration dashboard** — Each integration gets a tab in the existing Integrations page (`app/integrations/page.tsx`)

### Where Files Would Live

Following the existing integration file structure:

```
app/
  api/
    integrations/
      facebook/            ← NEW
        auth/route.ts        OAuth initiation
        callback/route.ts    OAuth callback
        webhook/route.ts     Receive Facebook leadgen webhook pings
        pages/route.ts       List seller's Pages
        config/route.ts      Save/load/delete config
      google-ads/          ← NEW
        auth/route.ts        OAuth initiation
        callback/route.ts    OAuth callback
        accounts/route.ts    List Ads accounts
        campaigns/route.ts   List campaigns with lead forms
        sync/route.ts        Manual sync trigger
        config/route.ts      Save/load/delete config
      import/              ← NEW
        csv/route.ts         CSV upload + processing
        sheets/route.ts      Google Sheets config + sync
  integrations/
    components/
      FacebookAdsIntegration.tsx    ← NEW: Settings UI
      GoogleAdsIntegration.tsx      ← NEW: Settings UI
      GoogleSheetsIntegration.tsx   ← NEW: Settings UI
      CsvImport.tsx                 ← NEW: Upload + mapping UI
lib/
  integrations/
    adapters/
      facebook.ts           ← NEW: Facebook Graph API adapter
      googleAds.ts           ← NEW: Google Ads API adapter
      googleSheets.ts        ← NEW: Google Sheets API adapter
    services/
      facebookLeadService.ts    ← NEW: Lead ingestion logic
      googleAdsLeadService.ts   ← NEW: Lead ingestion logic
      csvImportService.ts       ← NEW: CSV parsing + validation
      sheetsImportService.ts    ← NEW: Sheets sync logic
```

### Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                   LEAD SOURCES                           │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ BRIXCOT  │  │ Facebook │  │  Google   │  │  CSV /  │ │
│  │  Forms   │  │ Lead Ads │  │ Ads Forms │  │ Sheets  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
│       │          (webhook)      (polling)      (upload)   │
│       │              │              │              │      │
└───────┼──────────────┼──────────────┼──────────────┼──────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
   ┌─────────────────────────────────────────────────────┐
   │               BRIXCOT Lead Creation                 │
   │                                                     │
   │  1. Create Lead (with leadSource tag)               │
   │  2. AI Quality Scoring (Gemini 0-100)               │
   │  3. Lead Scoring Engine (0-10)                      │
   │  4. Distribution Decision (auto/marketplace/both)   │
   │  5. Buyer Matching & Assignment                     │
   │  6. Notification to Buyers                          │
   └─────────────────────────────────────────────────────┘
```

All ingestion methods converge into the same pipeline. The integration layer only handles _getting the data in_ — everything downstream is identical regardless of source.

---

## Impact on Zapier

### What Zapier Still Covers

Even after implementing all the above native integrations, Zapier remains useful for:

| Use Case                                                             | Example                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Niche ad platforms**                                               | Bing Ads, Twitter Ads, Quora Ads (low volume, not worth native integration) |
| **Outbound notifications**                                           | Send to Slack, Teams, Discord when events occur in BRIXCOT                  |
| **Custom workflows**                                                 | "When a lead is sold, add a row to Airtable and send a WhatsApp message"    |
| **Two-way syncs with tools BRIXCOT doesn't natively integrate with** | Mailchimp, ActiveCampaign, Monday.com                                       |
| **Seller-specific automations**                                      | Unique one-off workflows that only one seller needs                         |

### What Zapier No Longer Needs to Cover

| Use Case                        | Replaced By                   |
| ------------------------------- | ----------------------------- |
| Facebook Lead Ads → BRIXCOT     | Native Facebook integration   |
| Google Ads lead forms → BRIXCOT | Native Google Ads integration |
| Google Sheets → BRIXCOT         | Native Google Sheets import   |
| Typeform/JotForm → BRIXCOT      | Native webhook receivers      |
| Bulk lead import                | CSV upload                    |

### Recommendation

**Keep Zapier but demote it.** Move it from the primary integrations tab to a "Custom Integrations" or "Advanced" section. The native integrations should be front-and-center because they're free, faster, and simpler for sellers. Zapier becomes the "connect anything else" fallback.

---

_End of document._
