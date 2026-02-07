# Integration Guide: Zapier, Salesforce & HubSpot

> **Project:** BRIXCOT Lead Generation Web App  
> **Date:** February 7, 2026  
> **Purpose:** Explains how each integration is intended to work, what is currently implemented, and recommendations for production readiness.

---

## Table of Contents

1. [Overview](#overview)
2. [Zapier Integration](#zapier-integration)
3. [HubSpot Integration](#hubspot-integration)
4. [Salesforce Integration](#salesforce-integration)
5. [Shared Infrastructure](#shared-infrastructure)
6. [Current Status Summary](#current-status-summary)
7. [Recommendations](#recommendations)

---

## Overview

BRIXCOT supports three CRM/automation integrations that allow lead sellers to push data out of the platform and receive data in. All three share a common webhook infrastructure built on MongoDB-backed configuration, HMAC-SHA256 signature verification, and AES-256-CBC encrypted credential storage.

**Key architectural decisions:**

- No third-party SDKs are installed — all three integrations use raw `fetch()` calls to their respective REST APIs.
- Credentials are stored **per-user** in the MongoDB `User` document (encrypted), not in environment variables. This allows each seller to connect their own CRM instance.
- All outbound webhook dispatches include retry logic, rate limiting, and replay-attack protection via timestamps.

---

## Zapier Integration

### Purpose

Zapier acts as the **automation bridge** between BRIXCOT and 6,000+ other apps. Sellers can configure Zapier Zaps that fire automatically when events happen in BRIXCOT, and Zapier can push data back into BRIXCOT via authenticated API actions.

### Current Status: ✅ Fully Implemented

### How It Works

#### Outbound: BRIXCOT → Zapier (Triggers)

When a seller enables a Zapier trigger, BRIXCOT sends a signed HTTP POST to the seller's Zapier webhook URL whenever the corresponding event occurs. The seller configures these via the Integrations settings page.

**12 supported trigger events:**

| Event              | Fires When                            | Data Sent                                           |
| ------------------ | ------------------------------------- | --------------------------------------------------- |
| `lead_created`     | A new lead is added to the system     | Lead details (name, email, phone, source, industry) |
| `lead_updated`     | Any lead field is modified            | Updated lead fields + lead ID                       |
| `lead_qualified`   | Lead meets qualification criteria     | Lead details + qualification score                  |
| `lead_assigned`    | Lead is assigned to a buyer           | Lead details + buyer info                           |
| `lead_accepted`    | A buyer accepts a lead                | Lead + buyer + acceptance timestamp                 |
| `lead_rejected`    | A buyer rejects a lead                | Lead + buyer + rejection reason                     |
| `lead_sold`        | Lead is sold/transaction completed    | Lead + transaction details                          |
| `deal_created`     | A new deal is created                 | Deal details + associated lead                      |
| `deal_won`         | A deal is marked as won               | Deal + final value                                  |
| `deal_lost`        | A deal is marked as lost              | Deal + loss reason                                  |
| `buyer_registered` | A new buyer registers on the platform | Buyer profile details                               |
| `payment_received` | A payment is processed                | Payment amount, buyer, lead                         |

**How a seller sets this up:**

1. Navigate to **Dashboard → Integrations → Zapier** tab
2. Paste their Zapier webhook URL (must start with `https://hooks.zapier.com/`)
3. Toggle on the events they want to trigger Zaps for
4. Click "Test" to send a sample payload to verify the connection
5. Save the configuration

**Security:** Each webhook POST includes an `X-Zapier-Signature` header containing an HMAC-SHA256 signature of the payload body, allowing Zapier to verify the request originated from BRIXCOT.

#### Inbound: Zapier → BRIXCOT (Actions)

Sellers can create Zaps that push data _into_ BRIXCOT. This is authenticated via a per-user API key.

**7 supported actions:**

| Action          | Purpose                          | Example Use Case                                        |
| --------------- | -------------------------------- | ------------------------------------------------------- |
| `create_lead`   | Create a new lead in BRIXCOT     | Form submission on a landing page → new lead in BRIXCOT |
| `update_lead`   | Update existing lead fields      | Google Sheets row update → lead field sync              |
| `search_leads`  | Search leads by criteria         | Find matching leads before creating duplicates          |
| `find_lead`     | Find a specific lead by ID/email | Look up lead details for a downstream Zap step          |
| `assign_lead`   | Assign a lead to a buyer         | Auto-assign based on external scoring logic             |
| `update_status` | Change a lead's status           | Mark leads as contacted after a Mailchimp email         |
| `get_lead`      | Retrieve full lead details       | Pull lead data for a report or notification             |

**How a seller sets this up:**

1. Navigate to **Dashboard → Integrations → API Keys** tab
2. Generate an API key (shown once, stored as SHA-256 hash)
3. In Zapier, create a Zap that calls BRIXCOT's actions API at `/api/integrations/zapier/actions`
4. Include the API key in the `X-API-Key` header

### Files

| File                                                | Purpose                                               |
| --------------------------------------------------- | ----------------------------------------------------- |
| `app/api/integrations/zapier/route.ts`              | GET/POST/DELETE webhook configuration                 |
| `app/api/integrations/zapier/actions/route.ts`      | 7 inbound action endpoints                            |
| `app/api/integrations/zapier/api-key/route.ts`      | API key generation, revocation, status                |
| `lib/integrations/services/zapierService.ts`        | `ZapierIntegrationService` — 12 trigger dispatchers   |
| `lib/integrations/services/zapierActionsService.ts` | `ZapierActionsService` — CRUD, search, assignment     |
| `lib/integrations/zapierTriggerHelper.ts`           | `ZapierTriggerHelper` — finds active configs per user |
| `app/integrations/components/ZapierIntegration.tsx` | UI — Triggers & Actions tabs, webhook management      |
| `app/integrations/components/ApiKeyManagement.tsx`  | UI — API key generate/revoke/copy                     |

### What's Not Implemented

- **No official Zapier platform app** — uses generic webhook URLs instead of a published Zapier integration. A published app would provide a better UX (OAuth, dropdown action selection, field mapping) but requires `zapier-platform-core` SDK and Zapier partner approval.

---

## HubSpot Integration

### Purpose

HubSpot integration allows sellers to **sync leads bidirectionally** with HubSpot CRM. Leads created or updated in BRIXCOT automatically create/update HubSpot Contacts and Deals. Changes in HubSpot can flow back via webhooks.

### Current Status: ⚠️ Mostly Implemented (inbound webhook handlers are stubbed)

### How It Works

#### Outbound: BRIXCOT → HubSpot

When lead events occur in BRIXCOT, the `HubSpotIntegrationService` pushes data to HubSpot's CRM API v3.

**Supported outbound syncs:**

| Sync Action          | Trigger                | HubSpot Object                                 |
| -------------------- | ---------------------- | ---------------------------------------------- |
| Create Contact       | New lead created       | Contact with mapped properties                 |
| Update Contact       | Lead fields updated    | Contact property updates                       |
| Create Deal          | Lead accepted by buyer | Deal associated with Contact                   |
| Sync Qualification   | Lead qualified         | Contact lifecycle stage → "salesqualifiedlead" |
| Sync Deal Acceptance | Buyer accepts          | Deal stage → "closedwon"                       |

**Field mapping (BRIXCOT → HubSpot):**

| BRIXCOT Field | HubSpot Property         | Notes                                                      |
| ------------- | ------------------------ | ---------------------------------------------------------- |
| `name`        | `firstname` / `lastname` | Split on first space                                       |
| `email`       | `email`                  | Used for duplicate detection                               |
| `phone`       | `phone`                  | —                                                          |
| `score`       | `lead_score` (custom)    | Custom property, auto-created                              |
| `source`      | `lead_source` (custom)   | Custom property, auto-created                              |
| `quality`     | `lead_quality` (custom)  | Custom property, auto-created                              |
| `status`      | `lifecyclestage`         | Mapped: new→subscriber, qualified→salesqualifiedlead, etc. |
| `industry`    | `industry`               | Standard HubSpot property                                  |

**Custom properties auto-created:** `lead_score`, `lead_source`, `lead_quality`, `brixcot_lead_id`, `brixcot_buyer_id`, `lead_assignment_date` — these are initialized via `initializeCustomProperties()` on first connection.

**Duplicate handling:** Before creating a contact, searches HubSpot by email. If found, updates instead of creating.

#### Inbound: HubSpot → BRIXCOT

HubSpot sends webhook POSTs to `/api/integrations/webhooks/hubspot` when CRM objects change.

**6 supported subscription types:**

| HubSpot Event            | Handler                       | Current Status                        |
| ------------------------ | ----------------------------- | ------------------------------------- |
| `contact.creation`       | `handleContactCreation`       | ⚠️ **Stubbed** — logs event only      |
| `contact.propertyChange` | `handleContactPropertyChange` | ⚠️ **Stubbed** — logs event, has TODO |
| `contact.deletion`       | `handleContactDeletion`       | ⚠️ **Stubbed** — logs event only      |
| `deal.creation`          | `handleDealCreation`          | ⚠️ **Stubbed** — logs event only      |
| `deal.propertyChange`    | `handleDealPropertyChange`    | ⚠️ **Stubbed** — logs event only      |
| `deal.deletion`          | `handleDealDeletion`          | ⚠️ **Stubbed** — logs event only      |

> **Note:** Inbound HubSpot webhook handlers currently log events but do **not** sync data back into BRIXCOT. For example, if a contact's phone number changes in HubSpot, that change is NOT reflected on the BRIXCOT lead.

**How a seller sets this up:**

1. Navigate to **Dashboard → Integrations → HubSpot** tab
2. Enter their HubSpot Private App Access Token (encrypted and stored)
3. Enter the webhook URL (auto-generated: `https://{domain}/api/integrations/webhooks/hubspot`)
4. Toggle on desired event subscriptions
5. Click "Test Connection" to verify the API key works
6. Save — BRIXCOT auto-creates custom properties in HubSpot

### Files

| File                                                 | Purpose                                            |
| ---------------------------------------------------- | -------------------------------------------------- |
| `app/api/integrations/webhooks/hubspot/route.ts`     | Inbound webhook handler (6 event types)            |
| `lib/integrations/adapters/hubspot.ts`               | `HubSpotAdapter` — raw API calls to HubSpot v3     |
| `lib/integrations/services/hubspotService.ts`        | `HubSpotIntegrationService` — business logic layer |
| `app/integrations/components/HubSpotIntegration.tsx` | UI — API key, webhook URL, event toggles           |

### What's Not Implemented

- **Inbound webhook handlers are stubs** — they log events but don't sync changes back to BRIXCOT leads
- **No `@hubspot/api-client` SDK** — uses raw `fetch` calls (works but misses pagination helpers, rate-limit handling, type safety)
- **No HubSpot OAuth flow** — requires manual Private App Access Token entry (a proper OAuth2 flow would be more user-friendly)
- **No key rotation for HubSpot tokens** — `rotateHubSpotApiKey` function exists in the security layer but is not wired to the UI

---

## Salesforce Integration

### Purpose

Salesforce integration allows sellers to **sync leads as Salesforce Lead objects** and manage the full lead-to-opportunity lifecycle. Qualified leads can be auto-converted to Contacts + Opportunities in Salesforce.

### Current Status: ⚠️ Mostly Implemented (no OAuth refresh, inbound handlers partially stubbed)

### How It Works

#### Outbound: BRIXCOT → Salesforce

When lead events occur, the `SalesforceIntegrationService` pushes data to Salesforce REST API v59.0.

**Supported outbound syncs:**

| Sync Action              | Trigger                             | Salesforce Object                      |
| ------------------------ | ----------------------------------- | -------------------------------------- |
| Create Lead              | New lead created                    | Lead with mapped fields                |
| Update Lead              | Lead fields updated                 | Lead field updates                     |
| Convert Lead             | Lead qualified (if auto-convert on) | Lead → Contact + Account + Opportunity |
| Create Opportunity       | Buyer accepts lead                  | Opportunity with stage tracking        |
| Update Opportunity Stage | Deal stage changes                  | Opportunity stage update               |

**Field mapping (BRIXCOT → Salesforce):**

| BRIXCOT Field | Salesforce Field         | Notes                                                          |
| ------------- | ------------------------ | -------------------------------------------------------------- |
| `name`        | `FirstName` / `LastName` | Split on first space                                           |
| `email`       | `Email`                  | Used for SOQL duplicate search                                 |
| `phone`       | `Phone`                  | —                                                              |
| `company`     | `Company`                | Falls back to "Unknown"                                        |
| `status`      | `Status`                 | Mapped: new→Open, qualified→Working, contacted→Contacted, etc. |
| `score`       | `Rating`                 | Hot (≥70), Warm (≥40), Cold (<40)                              |
| `source`      | `LeadSource`             | Direct mapping                                                 |
| `industry`    | `Industry`               | —                                                              |
| Lead ID       | `BRIXCOT_Lead_ID__c`     | Custom field (requires manual creation)                        |
| Score         | `BRIXCOT_Lead_Score__c`  | Custom field (requires manual creation)                        |
| Buyer ID      | `BRIXCOT_Buyer_ID__c`    | Custom field (requires manual creation)                        |

**Duplicate handling:** Before creating a Lead, searches Salesforce via SOQL (`SELECT Id FROM Lead WHERE Email = '...'`). If found, updates instead of creating.

**Lead conversion flow:**

1. Lead is qualified in BRIXCOT
2. If "Auto-Convert Qualified Leads" is enabled in settings, calls `convertQualifiedLead()`
3. Salesforce converts the Lead → Contact (+ optional Account and Opportunity)
4. The new Contact and Opportunity IDs are stored on the BRIXCOT lead

#### Inbound: Salesforce → BRIXCOT

Salesforce sends Outbound Messages (SOAP XML) to `/api/integrations/webhooks/salesforce` when objects change.

**3 supported sObject types:**

| Salesforce Object | Handler                  | What It Does                                                                  |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------- |
| Lead              | `handleLeadEvent`        | Syncs status and field changes back to BRIXCOT lead (by `BRIXCOT_Lead_ID__c`) |
| Contact           | `handleContactEvent`     | Detects lead conversion events, updates BRIXCOT lead with Contact ID          |
| Opportunity       | `handleOpportunityEvent` | ⚠️ **Partially stubbed** — stage mapping exists but handler may be incomplete |

**How a seller sets this up:**

1. Navigate to **Dashboard → Integrations → Salesforce** tab
2. Enter Salesforce credentials:
   - Instance URL (e.g., `https://mycompany.my.salesforce.com`)
   - Client ID (from Connected App)
   - Client Secret
   - Username
   - Password
   - Security Token
3. Configure Lead Conversion settings (auto-convert, create account/contact/opportunity)
4. Toggle on desired event subscriptions
5. Click "Test Connection" to verify OAuth authentication
6. **Manually create custom fields** in Salesforce admin (`BRIXCOT_Lead_ID__c`, `BRIXCOT_Lead_Score__c`, `BRIXCOT_Buyer_ID__c`) — the UI provides instructions

### Files

| File                                                    | Purpose                                               |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `app/api/integrations/webhooks/salesforce/route.ts`     | Inbound webhook handler (Lead/Contact/Opportunity)    |
| `lib/integrations/adapters/salesforce.ts`               | `SalesforceAdapter` — raw API calls to SF REST v59.0  |
| `lib/integrations/services/salesforceService.ts`        | `SalesforceIntegrationService` — business logic layer |
| `app/integrations/components/SalesforceIntegration.tsx` | UI — OAuth form, lead conversion settings, events     |

### What's Not Implemented

- **No OAuth token refresh flow** — credentials are stored but if the access token expires, there is no automatic refresh. Seller must re-enter credentials.
- **No `jsforce` SDK** — uses raw `fetch` calls (works but misses bulk API, streaming, metadata, and token refresh built-ins)
- **Custom field creation is manual** — `getCustomFieldInstructions()` returns setup steps but does not use the Salesforce Metadata API to auto-create fields
- **Opportunity inbound handler** may be incomplete

---

## Shared Infrastructure

All three integrations share common infrastructure:

### Webhook Configuration Model (`models/webhookConfig.ts`)

Stores per-user per-integration config in MongoDB:

- `source` — `"zapier" | "hubspot" | "salesforce" | "custom"`
- `url` — Webhook endpoint URL
- `events` — Map of enabled event types
- `secret` — HMAC signing secret
- `retryConfig` — Max retries, delay, backoff multiplier
- `rateLimiting` — Max requests per window
- `dispatchLog` — Last N webhook deliveries with status/response
- `statistics` — Total sent, successful, failed, last dispatch time

### Security Layer (`lib/security/`)

| Feature               | Implementation                                                |
| --------------------- | ------------------------------------------------------------- |
| API key hashing       | SHA-256 (Zapier action keys)                                  |
| Credential encryption | AES-256-CBC (HubSpot tokens, Salesforce creds)                |
| Webhook signing       | HMAC-SHA256 on payload body                                   |
| Replay protection     | Timestamp validation on incoming webhooks                     |
| Audit logging         | Key generation, rotation, revocation events stored in MongoDB |

### Integrations Dashboard (`app/integrations/page.tsx`)

5-tab UI:

1. **HubSpot** — API key, webhook, event toggles
2. **Salesforce** — OAuth form, lead conversion, event toggles
3. **Zapier** — Triggers, Actions, webhook management
4. **Webhooks** — Generic custom webhooks + activity monitoring
5. **API Keys** — Zapier API key management

### Stats APIs (`app/api/integrations/stats/`)

- `/count` — Number of active integrations
- `/webhooks` — Webhook dispatch count (24h)
- `/success-rate` — Dispatch success percentage
- `/api-calls` — Total API calls (24h)

---

## Current Status Summary

| Feature                 | Zapier                  | HubSpot                         | Salesforce                  |
| ----------------------- | ----------------------- | ------------------------------- | --------------------------- |
| **Overall**             | ✅ Fully Implemented    | ⚠️ Mostly Implemented           | ⚠️ Mostly Implemented       |
| **Outbound sync**       | ✅ 12 trigger events    | ✅ Contacts + Deals             | ✅ Leads + Opportunities    |
| **Inbound sync**        | ✅ 7 action endpoints   | ❌ Handlers are stubs           | ⚠️ Partially stubbed        |
| **UI settings**         | ✅ Complete (803 lines) | ✅ Complete (476 lines)         | ✅ Complete (627 lines)     |
| **Authentication**      | ✅ API Key (SHA-256)    | ✅ Bearer Token (AES encrypted) | ⚠️ OAuth creds (no refresh) |
| **Credential storage**  | ✅ Per-user, encrypted  | ✅ Per-user, encrypted          | ✅ Per-user, encrypted      |
| **Duplicate detection** | N/A                     | ✅ Email search                 | ✅ SOQL email search        |
| **Custom field sync**   | N/A                     | ✅ Auto-created                 | ❌ Manual creation required |
| **Webhook signing**     | ✅ HMAC-SHA256          | ✅ Signature verification       | ✅ Signature verification   |
| **SDK used**            | None (webhook-based)    | None (raw fetch)                | None (raw fetch)            |
| **Key rotation**        | ❌                      | ⚠️ Exists but not in UI         | ❌                          |
| **Connection test**     | ✅                      | ✅                              | ✅                          |

---

## Recommendations

### High Priority (Production Blockers)

1. **Implement HubSpot inbound webhook handlers** — The 6 handlers currently only log events. At minimum, `contact.propertyChange` should sync field changes back to the BRIXCOT lead, and `contact.deletion` should flag or deactivate the corresponding lead.

2. **Add Salesforce OAuth token refresh** — Access tokens expire. Without automatic refresh, the integration silently breaks and the seller must manually re-enter credentials. Implement the standard `/services/oauth2/token` refresh flow using the stored refresh token.

3. **Complete the Salesforce Opportunity inbound handler** — Ensure deal stage changes in Salesforce are reflected in BRIXCOT.

### Medium Priority (Reliability & UX)

4. **Add rate-limit handling for HubSpot and Salesforce API calls** — Both APIs have rate limits (HubSpot: 100 calls/10s for private apps, Salesforce: org-dependent). Implement exponential backoff on 429 responses.

5. **Wire HubSpot API key rotation to the UI** — The `rotateHubSpotApiKey` function exists in the security layer but has no UI trigger. Add a "Rotate Key" button.

6. **Auto-create Salesforce custom fields via Metadata API** — Sellers currently must manually create `BRIXCOT_Lead_ID__c`, `BRIXCOT_Lead_Score__c`, and `BRIXCOT_Buyer_ID__c` in Salesforce admin. Use the Metadata API or Tooling API to automate this.

7. **Add error notifications for failed webhook dispatches** — If a webhook fails after all retries, notify the seller via in-app notification or email.

### Low Priority (Enhancements)

8. **Consider installing official SDKs** — `@hubspot/api-client` and `jsforce` provide pagination, type safety, bulk operations, and token management out of the box. They would reduce custom code and edge cases.

9. **Publish as a Zapier platform app** — A published Zapier app provides a better UX (OAuth, prebuilt triggers/actions, field mapping UI) but requires Zapier partner approval and `zapier-platform-core` SDK.

10. **Add integration health monitoring** — Dashboard widget showing last sync time, error count, and connection status for each active integration. The stats APIs exist but aren't surfaced prominently.

11. **Add field mapping customization** — Let sellers configure custom field mappings (e.g., map a BRIXCOT custom field to a specific HubSpot/Salesforce property) instead of using hardcoded mappings.

---

_End of document._
