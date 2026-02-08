# Integration Guide: Zapier

> **Project:** BRIXCOT Lead Generation Web App  
> **Date:** February 8, 2026  
> **Purpose:** Explains how the Zapier integration works, what is currently implemented, and recommendations for production readiness.

---

## Table of Contents

1. [Overview](#overview)
2. [Zapier Integration](#zapier-integration)
3. [Shared Infrastructure](#shared-infrastructure)
4. [Current Status Summary](#current-status-summary)
5. [Recommendations](#recommendations)

---

## Overview

BRIXCOT supports Zapier as its automation integration, allowing lead sellers to push data out of the platform and receive data in. The integration uses a webhook infrastructure built on MongoDB-backed configuration, HMAC-SHA256 signature verification, and AES-256-CBC encrypted credential storage.

**Key architectural decisions:**

- No third-party SDKs are installed — the integration uses raw `fetch()` calls.
- Credentials are stored **per-user** in the MongoDB `User` document (encrypted), not in environment variables. This allows each seller to connect their own Zapier account.
- All outbound webhook dispatches include retry logic, rate limiting, and replay-attack protection via timestamps.

> **Note:** HubSpot and Salesforce CRM integrations were evaluated and removed from the project. See [Integration-Scenarios-Seller-Use-Cases.md](Integration-Scenarios-Seller-Use-Cases.md) for the rationale. Native ad platform integrations (Facebook Ads, Google Ads) are planned as replacements — see [Native-Integrations-Guide-Ad-Platforms.md](Native-Integrations-Guide-Ad-Platforms.md).

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

## Shared Infrastructure

### Webhook Configuration Model (`models/webhookConfig.ts`)

Stores per-user per-integration config in MongoDB:

- `source` — `"zapier" | "custom"`
- `url` — Webhook endpoint URL
- `events` — Map of enabled event types
- `secret` — HMAC signing secret
- `retryConfig` — Max retries, delay, backoff multiplier
- `rateLimiting` — Max requests per window
- `dispatchLog` — Last N webhook deliveries with status/response
- `statistics` — Total sent, successful, failed, last dispatch time

### Security Layer (`lib/security/`)

| Feature           | Implementation                                                |
| ----------------- | ------------------------------------------------------------- |
| API key hashing   | SHA-256 (Zapier action keys)                                  |
| Webhook signing   | HMAC-SHA256 on payload body                                   |
| Replay protection | Timestamp validation on incoming webhooks                     |
| Audit logging     | Key generation, rotation, revocation events stored in MongoDB |

### Integrations Dashboard (`app/integrations/page.tsx`)

3-tab UI:

1. **Zapier** — Triggers, Actions, webhook management
2. **Webhooks** — Generic custom webhooks + activity monitoring
3. **API Keys** — Zapier API key management

### Stats APIs (`app/api/integrations/stats/`)

- `/count` — Number of active integrations
- `/webhooks` — Webhook dispatch count (24h)
- `/success-rate` — Dispatch success percentage
- `/api-calls` — Total API calls (24h)

---

## Current Status Summary

| Feature                | Zapier                 |
| ---------------------- | ---------------------- |
| **Overall**            | ✅ Fully Implemented   |
| **Outbound sync**      | ✅ 12 trigger events   |
| **Inbound sync**       | ✅ 7 action endpoints  |
| **UI settings**        | ✅ Complete            |
| **Authentication**     | ✅ API Key (SHA-256)   |
| **Credential storage** | ✅ Per-user, encrypted |
| **Webhook signing**    | ✅ HMAC-SHA256         |
| **SDK used**           | None (webhook-based)   |
| **Connection test**    | ✅                     |

---

## Recommendations

### Medium Priority (Reliability & UX)

1. **Add error notifications for failed webhook dispatches** — If a webhook fails after all retries, notify the seller via in-app notification or email.

### Low Priority (Enhancements)

2. **Publish as a Zapier platform app** — A published Zapier app provides a better UX (OAuth, prebuilt triggers/actions, field mapping UI) but requires Zapier partner approval and `zapier-platform-core` SDK.

3. **Add integration health monitoring** — Dashboard widget showing last sync time, error count, and connection status for each active integration. The stats APIs exist but aren't surfaced prominently.

---

_End of document._
