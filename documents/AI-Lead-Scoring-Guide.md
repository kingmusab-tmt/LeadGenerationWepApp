# AI Lead Scoring & Quality Level System

## Overview

BRIXCOT uses **Google Gemini AI (gemini-2.5-flash)** to automatically evaluate every incoming lead — whether submitted through a **Form Builder** form or via the **Zapier/API** integration. The AI assigns a **spam score** and **quality level** to each lead for internal use. The AI scoring **never blocks** a form submission; it is purely informational to help sellers prioritize and manage their leads.

---

## How It Works

### 1. Lead Submission

When a lead is submitted (via form or API), all captured field data is sent to the internal `/api/filter-lead` endpoint.

### 2. AI Evaluation

The Gemini AI model analyzes the lead data against these criteria:

| Rule                     | What It Checks                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **Gibberish detection**  | Field values like "asdf", "test", random characters, or entries shorter than 3 words |
| **Fake names**           | Obviously fake names like "Mickey Mouse", "John Doe", or test names                  |
| **Unrealistic values**   | Budgets/prices that are unrealistic (e.g., "$1", "0", negative values)               |
| **Invalid contact info** | Fake or clearly invalid email addresses and phone numbers                            |
| **Spammy language**      | Aggressive, offensive, or spammy language in any field                               |

### 3. AI Response

The AI returns three values:

```json
{
  "is_valid": true,
  "spam_score": 5,
  "reason": "All fields are complete, relevant, and appear legitimate."
}
```

| Field        | Type           | Description                                                               |
| ------------ | -------------- | ------------------------------------------------------------------------- |
| `is_valid`   | boolean        | Whether the AI considers this a legitimate lead                           |
| `spam_score` | number (0–100) | Spam likelihood score. **0 = definitely real**, **100 = definitely spam** |
| `reason`     | string         | Short explanation of the AI's assessment                                  |

---

## Spam Score → Quality Level Mapping

The spam score (0–100) is mapped to one of three quality levels:

| Spam Score Range | Quality Level | What It Means                                                          |
| ---------------- | ------------- | ---------------------------------------------------------------------- |
| **0 – 30**       | 🟢 **High**   | Legitimate lead with valid, complete information. Low spam indicators. |
| **31 – 69**      | 🟡 **Medium** | Some uncertainty — may have minor issues but not clearly spam.         |
| **70 – 100**     | 🔴 **Low**    | Likely spam, bot submission, or very low-quality data.                 |

### Examples

| Lead Data                                     | Spam Score | Quality Level | Reason                               |
| --------------------------------------------- | ---------- | ------------- | ------------------------------------ |
| Real name, valid email/phone, complete fields | 0–10       | 🟢 High       | All information appears legitimate   |
| Partial info, some fields incomplete          | 35–50      | 🟡 Medium     | Missing or vague information         |
| "John Doe", test@test.com, gibberish fields   | 85–100     | 🔴 Low        | Uses common placeholder/test entries |

---

## What Gets Stored on the Lead

After AI evaluation, the lead record in the database is updated with:

| Field                 | Type    | Description                               |
| --------------------- | ------- | ----------------------------------------- |
| `aiQualityScore`      | number  | The raw spam score (0–100)                |
| `qualityLevel`        | string  | `"High"`, `"Medium"`, or `"Low"`          |
| `aiQualityReason`     | string  | The AI's explanation                      |
| `aiQualityAssessment` | object  | Full assessment details (see below)       |
| `exclusive`           | boolean | `true` if High quality, `false` otherwise |
| `shared`              | boolean | `true` if Medium or Low quality           |

### `aiQualityAssessment` Object

```json
{
  "isValid": true,
  "spamScore": 5,
  "reason": "All fields are complete and appear legitimate.",
  "evaluatedAt": "2026-02-08T12:00:00.000Z"
}
```

---

## How Quality Level Affects Lead Behavior

### Lead Distribution

- **High quality** leads are marked as `exclusive: true` — ideal for premium buyer matching
- **Medium/Low quality** leads are marked as `shared: true` — available to multiple buyers

### Buyer Assignment & Auto-Accept

- When a lead matches a buyer's preferences, it is **assigned** to them
- If the buyer has **Auto-Accept enabled** (`true`), the assigned lead is automatically accepted
- If Auto-Accept is **disabled** (`false`), the buyer must manually accept the assigned lead

### Marketplace

- **Low quality** leads that aren't matched to any buyer are automatically listed in the marketplace
- Marketplace leads must be **purchased manually** by buyers — Auto-Accept does not apply to marketplace leads
- Unmatched shared leads with unfilled slots are also listed in the marketplace for manual purchase

### Buyer Matching

- The `qualityLevel` and `aiQualityScore` are included in the buyer match evaluation
- Buyers can see the quality level when viewing available leads

---

## Important Notes

1. **AI scoring never blocks submissions** — Every form submission and API lead is saved regardless of the AI score. The scoring is for **internal seller use only**.

2. **Scoring happens after save** — The lead is first saved to the database, then the AI scoring runs and updates the record. This ensures no lead data is ever lost, even if the AI service is temporarily unavailable.

3. **Fallback behavior** — If the AI service fails (network error, API outage, etc.), the lead defaults to:
   - `aiQualityScore: 50`
   - `qualityLevel: "Medium"`
   - `aiQualityReason: "AI evaluation unavailable - using default"`

4. **Both sources use the same scoring** — Form Builder leads and Zapier/API leads go through the identical AI evaluation pipeline via `/api/filter-lead`.

5. **All field data is evaluated** — The AI sees every field the lead submitted (name, email, phone, custom fields, etc.), not just standard fields.

---

## Where to See AI Scores

### Seller Dashboard → Lead Management

- The **AI Quality Score** column shows the numeric score
- The **Quality Level** badge (High/Medium/Low) provides a quick visual indicator
- Click **View Details** on any lead to see the full AI assessment reason

### Zapier/API Leads Tab

- Same quality indicators are shown for leads received through integrations
- The detail view includes the full AI quality assessment

---

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Form Submit   │────▶│  /api/filter-lead │────▶│   Gemini AI     │
│   or Zapier API │     │  (Always 200)     │◀────│  (2.5-flash)    │
└────────┬────────┘     └────────┬─────────┘     └─────────────────┘
         │                       │
         │                       │ { spam_score, is_valid, reason }
         │                       ▼
         │              ┌──────────────────┐
         │              │  Map to Quality  │
         │              │  Level & Update  │
         │              │  Lead Record     │
         │              └────────┬─────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Lead Saved to  │────▶│  Lead Distribution│
│  Database       │     │  & Buyer Matching │
└─────────────────┘     └──────────────────┘
```

---

## API Reference

### `POST /api/filter-lead`

**Purpose:** Internal endpoint for AI lead quality scoring.

**Request Body:** Any JSON object with lead field key-value pairs.

```json
{
  "Name": "Jane Smith",
  "Email": "jane@company.com",
  "Phone": "+1(555)123-4567",
  "Company": "Tech Corp",
  "Industry": "Technology"
}
```

**Response (always 200):**

```json
{
  "success": true,
  "message": "Lead received!",
  "spam_score": 5,
  "reason": "All information appears legitimate.",
  "is_valid": true
}
```

**Fallback Response (AI service error):**

```json
{
  "success": true,
  "message": "Lead saved (Fallback)"
}
```
