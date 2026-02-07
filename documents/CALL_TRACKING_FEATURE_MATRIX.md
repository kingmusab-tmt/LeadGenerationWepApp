# BRIXCOT Call Tracking — Feature Matrix

> Generated: February 7, 2026  
> Last Updated: February 7, 2026
> Purpose: Complete feature inventory for the call lead management system

---

## 1. Current System — What We Have

| #   | Feature                             | Status  | Details                                                                                         |
| --- | ----------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| 1   | Round-Robin Buyer Assignment        | ✅ Done | `getNextRoundRobinBuyer()` — sorts by highest wallet balance                                    |
| 2   | Atomic Round-Robin (Race-Safe)      | ✅ Done | `getNextRoundRobinBuyerAtomic()` — MongoDB `$inc` prevents concurrent assignment conflicts      |
| 3   | Business Hours Routing              | ✅ Done | `isBuyerInBusinessHours()` — timezone-aware, handles overnight shifts, fails open on errors     |
| 4   | Vacation Mode Filtering             | ✅ Done | `isBuyerOnVacation()` — checks `enabled`, `pauseUntil`, `autoReject`                            |
| 5   | Voicemail Recording                 | ✅ Done | TwiML `<Record>`, POST/GET/PATCH API, listened/unlistened tracking, all no-buyer paths fallback |
| 6   | Hold Music / Call Queue             | ✅ Done | Queue endpoint with position announcements, custom or default hold music, timeout → voicemail   |
| 7   | Call Recording                      | ✅ Done | Per-number toggle, `record-from-answer`, recording URL stored on call record                    |
| 8   | Welcome Message (IVR Greeting)      | ✅ Done | `welcomeMessage` on tracking number, played via `twiml.say()` before forwarding                 |
| 9   | Rate Limiting                       | ✅ Done | Upstash Redis sliding window — 60 req/min/IP on all call endpoints                              |
| 10  | Twilio Webhook Signature Validation | ✅ Done | `validateTwilioWebhook()` — verifies `X-Twilio-Signature`, skipped in dev mode                  |
| 11  | Call Analytics Dashboard            | ✅ Done | 8 stat cards, 30-day volume chart, industry breakdown, peak hour, recent activity feed          |
| 12  | Seller Refund Review                | ✅ Done | Approve/reject buyer refund requests, comment, auto-refund units, notification to buyer         |
| 13  | Buyer Call Feedback                 | ✅ Done | ThumbUp/ThumbDown rating, auto-flags short bad-rated calls as `pending_refund`                  |
| 14  | CSV Export                          | ✅ Done | Export filtered call logs with all fields                                                       |
| 15  | Pagination & Filtering              | ✅ Done | Search, status filter, date range, pagination on both seller and buyer call history             |
| 16  | Multiple Forwarding Types           | ✅ Done | `direct` (round-robin), `single_multiple` (sequential numbers), `specific_lead` (named buyers)  |
| 17  | Unit-Based Call Charging            | ✅ Done | Configurable rate (units per seconds), auto-deduct from buyer wallet, transaction records       |
| 18  | Minimum Billable Duration           | ✅ Done | Calls < 15s are not charged (spam/wrong number protection)                                      |
| 19  | Configurable Dial Timeout           | ✅ Done | Default 30s, overridable per seller via `getCallConfig()`                                       |

---

## 2. Recently Completed — Previously Partial, Now Fully Implemented

| #   | Feature                     | Status  | Implementation Details                                                                                                                                                                            |
| --- | --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Call Whisper                | ✅ Done | Whisper endpoint at `/api/calls/twilio/whisper` plays TwiML `<Say>` to buyer before connecting. Wired via `dialWithWhisper()` helper using `<Number url>` attribute.                              |
| 2   | Call Screening (Press 1)    | ✅ Done | `<Gather>` TwiML in whisper endpoint collects buyer digit input. Response handler at `/api/calls/twilio/whisper/response` validates digits against `buyerResponses` config.                       |
| 3   | Webhook / CRM Push          | ✅ Done | `callWebhookDispatcher.ts` fires webhooks for 4 events: `callForwarded`, `callCompleted`, `callVoicemail`, `callRefunded`. Non-blocking, with retry and HMAC signing.                             |
| 4   | Overflow to External        | ✅ Done | `overflowNumber` field on TrackingNumber type/schema/UI. When no buyers available, dials overflow number before falling back to voicemail. Works in both `handleNewCall` and `handleNoAnswer`.    |
| 5   | Missed Call Text-Back       | ✅ Done | `sendMissedCallTextBack()` in `callFeatureServices.ts`. Auto-sends SMS via Twilio when call goes unanswered. Seller toggle + custom message in callMethodForm UI.                                 |
| 6   | Scheduled Callbacks         | ✅ Done | `ScheduledCallback` model, IVR `<Gather>` in no-buyer fallback, `/api/calls/twilio/callback-request` handler, CRUD API at `/api/calls/scheduled-callbacks`. Seller dashboard panel.               |
| 7   | Call Recording Consent      | ✅ Done | `recordingConsent` toggle + custom message. Plays `twiml.say(consentMessage)` before recording starts. Configurable per tracking number.                                                          |
| 8   | Do-Not-Call (DNC) List      | ✅ Done | `dncList[]` on TrackingNumber. Checked in `handleNewCall` via `isOnDncList()`. Management API at `/api/calls/dnc` (GET/POST/DELETE). UI in callMethodForm with add/remove.                        |
| 9   | Spam / Robot Detection      | ✅ Done | `checkSpamStatus()` uses STIR/SHAKEN `StirVerstat` param. Two modes: block (reject with TwiML) or warn (whisper to buyer). Spam score + flagged stored on call record.                            |
| 10  | Call Transcription & AI     | ✅ Done | `callAIAnalysis.ts` uses Google Gemini (`gemini-2.0-flash`). Summary, sentiment, lead score from transcriptions. Transcription callback at `/api/calls/transcription`.                            |
| 11  | Lead Scoring from Call      | ✅ Done | `scoreLeadFromCallData()` grades A/B/C/D from duration+disposition+sentiment+feedback. AI scoring via `analyzeCallTranscription()`. Stored as `aiLeadScore` on call record.                       |
| 12  | Multi-Ring (Simultaneous)   | ✅ Done | `multiRingEnabled` toggle. Creates single `<Dial>` with multiple `<Number>` children for simultaneous ring. First to answer gets the call.                                                        |
| 13  | Geo-Routing                 | ✅ Done | `extractGeoData()` maps caller area code to city/state via `cityAreaCodes`. `doesBuyerServiceArea()` checks buyer `serviceLocations`. Used in both `handleNewCall` and `handleNoAnswer`.          |
| 14  | Concurrent Call Handling    | ✅ Done | Redis Sets (`SADD/SREM/SCARD`) track active calls per buyer. `isBuyerAtConcurrentLimit()` check in eligibility. `markCallActive/Inactive` lifecycle tracking.                                     |
| 15  | Buyer Performance Dashboard | ✅ Done | Aggregation pipeline at `/api/calls/buyer-performance`. Per-buyer metrics: answer rate, duration, disposition breakdown, AI grades, sentiment. Summary cards + table in seller dashboard.         |
| 16  | Call Disposition Codes      | ✅ Done | `disposition` enum on Call model (qualified_lead/not_interested/wrong_number/callback_requested/sold/voicemail/spam). Buyer `DispositionSelect` in call history. API at `/api/calls/disposition`. |

---

## 3. Must-Have — Not Yet Implemented

### Tier 1: High Impact (Directly Improves Answer Rate & Conversions)

> **All Tier 1 features are now implemented.** See Section 2 above.

### Tier 2: Competitive Differentiators

| #   | Feature                             | Priority  | Status  | Description                                                                                | Complexity |
| --- | ----------------------------------- | --------- | ------- | ------------------------------------------------------------------------------------------ | ---------- |
| 8   | **Call Transcription & AI Summary** | 🟠 High   | ✅ Done | Google Gemini (gemini-2.0-flash) for summary, sentiment, lead scoring from transcriptions. | Medium     |
| 9   | **Lead Scoring from Call**          | 🟡 Medium | ✅ Done | A/B/C/D grading from duration+disposition+sentiment+feedback. AI-enhanced scoring.         | Medium     |
| 10  | **Multi-Ring (Simultaneous)**       | 🟡 Medium | ✅ Done | Single `<Dial>` with multiple `<Number>` children for simultaneous ring.                   | Medium     |
| 11  | **Geo-Routing**                     | 🟡 Medium | ✅ Done | Area code → city/state mapping + buyer `serviceLocations` matching.                        | Medium     |
| 12  | **Concurrent Call Handling**        | 🟡 Medium | ✅ Done | Redis Sets for per-buyer active call tracking with concurrent limit check.                 | Medium     |
| 13  | **Buyer Performance Dashboard**     | 🟡 Medium | ✅ Done | Aggregation pipeline with per-buyer metrics, summary cards, table in seller dashboard.     | Medium     |
| 14  | **Dynamic Caller ID (CNAM)**        | 🟡 Medium | ❌      | Look up caller name via Twilio CNAM Add-on. Display in call log and buyer notification.    | Low        |
| 15  | **Call Disposition Codes**          | 🟡 Medium | ✅ Done | Buyer selects outcome from dropdown in call history. Disposition stored on call record.    | Low        |
| 16  | **Webhook / CRM Push for Calls**    | 🟡 Medium | ✅ Done | Webhook dispatch for 4 call events. HMAC signing. Non-blocking with retry.                 | Medium     |

### Tier 3: Advanced / Enterprise

| #   | Feature                        | Priority  | Description                                                                                                                                     | Complexity |
| --- | ------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 17  | **Warm Transfer**              | 🟡 Medium | Allow buyer to transfer a live call to another buyer or back to queue. Requires `<Conference>` rooms and transfer API.                          | High       |
| 18  | **Real-Time Call Monitoring**  | 🟡 Medium | Seller can listen to live calls (silent), whisper to buyer (coaching), or barge in. Uses Twilio `<Conference>` with `coach` and `listen` roles. | High       |
| 19  | **Skill-Based Routing**        | 🔵 Low    | Add skill tags to buyers (e.g., Spanish-speaking, commercial, residential). Route based on IVR selection or caller profile.                     | Medium     |
| 20  | **Call Frequency Capping**     | 🔵 Low    | Limit calls per buyer per hour/day to prevent overload. Redis counter `callCount:buyerId:hourKey`.                                              | Low        |
| 21  | **SLA Alerts**                 | 🔵 Low    | Notify seller if: answer rate < threshold, avg wait time > X seconds, voicemail count spikes. Cron-based monitoring.                            | Medium     |
| 22  | **A/B Testing for Call Flows** | 🔵 Low    | Test different welcome messages, hold music, routing strategies. Track which variant converts better.                                           | High       |
| 23  | **Call Cost Estimator**        | 🔵 Low    | Before configuring a number, show estimated monthly cost based on historical call volume and Twilio rates.                                      | Low        |
| 24  | **Call Tags & Notes**          | 🔵 Low    | Buyers add freeform tags and notes to calls post-completion. Searchable in call log. Add `tags[]` and `notes` to Call model.                    | Low        |

---

## 4. Implementation Roadmap

### Sprint 1 — Quick Wins (1-2 days)

| Task                                                                      | Feature                | Effort | Impact                                      |
| ------------------------------------------------------------------------- | ---------------------- | ------ | ------------------------------------------- |
| Wire existing `callWhisper` config into TwiML                             | Call Whisper           | 2 hrs  | High — buyers know context before answering |
| Wire existing `requireResponse`/`buyerResponses` into `<Gather>` TwiML    | Call Screening         | 4 hrs  | High — eliminates dead-air connections      |
| Add `twiml.say("This call may be recorded")` when `recordCall` is true    | Recording Consent      | 1 hr   | High — legal compliance                     |
| Send SMS to caller on voicemail fallback                                  | Missed Call Text-Back  | 2 hrs  | High — improves callback rate               |
| Add `blockedNumbers: string[]` to seller model + check in `handleNewCall` | DNC List               | 2 hrs  | Medium — spam prevention                    |
| Add `disposition` field to Call model + dropdown in buyer call history UI | Call Disposition Codes | 3 hrs  | Medium — better reporting                   |

### Sprint 2 — Core Enhancements (3-5 days)

| Task                                                                 | Feature                     | Effort | Impact |
| -------------------------------------------------------------------- | --------------------------- | ------ | ------ |
| Check `StirVerstat` param from Twilio, reject low-attestation calls  | Spam Detection              | 4 hrs  | High   |
| Enable `transcribe: true` on recordings + store transcription        | Call Transcription          | 4 hrs  | High   |
| Add `<Number>` children inside single `<Dial>` for simultaneous ring | Multi-Ring                  | 6 hrs  | High   |
| Area code → `serviceLocations` matching before round-robin           | Geo-Routing                 | 6 hrs  | Medium |
| Redis `activeCall:buyerId` check before assignment                   | Concurrent Call Handling    | 4 hrs  | Medium |
| Per-buyer aggregation endpoint + UI in seller dashboard              | Buyer Performance Dashboard | 8 hrs  | Medium |
| Extend Zapier webhooks to fire on call events                        | CRM Push for Calls          | 4 hrs  | Medium |

### Sprint 3 — Advanced (1-2 weeks)

| Task                                                            | Feature                | Effort | Impact |
| --------------------------------------------------------------- | ---------------------- | ------ | ------ |
| `scheduledCallbacks` model + cron job + IVR option              | Scheduled Callbacks    | 16 hrs | High   |
| OpenAI integration for call summary from transcription          | AI Call Summary        | 8 hrs  | High   |
| `<Conference>` rooms + coach/listen/barge API                   | Real-Time Monitoring   | 16 hrs | Medium |
| `<Conference>` + transfer API for buyer-to-buyer handoff        | Warm Transfer          | 12 hrs | Medium |
| Call-based lead scoring integration with `leadScoringEngine.ts` | Lead Scoring from Call | 8 hrs  | Medium |

---

## 5. Summary

| Category               | Count  |
| ---------------------- | ------ |
| ✅ Fully Implemented   | 35     |
| 🟡 Remaining (T2-14)   | 1      |
| 🔵 Enterprise/Advanced | 8      |
| **Total Features**     | **44** |

> **Completed:** All Tier 1 features (1-7) and requested Tier 2 features (8-13, 15-16) are fully implemented. Only T2-14 (Dynamic Caller ID / CNAM) was not requested and remains unimplemented. All features have seller-controllable toggles in the callMethodForm UI.
