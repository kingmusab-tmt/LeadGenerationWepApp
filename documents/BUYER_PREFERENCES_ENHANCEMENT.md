# Lead Buyer Management - Enhanced Form Implementation

## Overview

Updated the Lead Buyer Management page to include all buyer preference fields and operational availability settings. The system now fully supports editing all buyer preferences through the UI, ensuring consistency across the application.

---

## What Was Fixed

### 1. **API Endpoint Enhancement**

**File:** `app/api/buyers/route.ts`

**Before:** API was returning only limited fields via `.select()`

```typescript
const buyers = await Buyer.find({ registeredWith: session.user.id }).select(
  "name company email phone status leadPreferences preferredDistribution notificationPreferences workingHours timezone maxLeadsPerDay",
);
```

**After:** API now returns all buyer fields

```typescript
const buyers = await Buyer.find({ registeredWith: session.user.id });
```

**Impact:** Edit form now receives complete buyer data including:

- Operational availability (vacation mode, weekly schedule, business hours)
- Budget & volume limits
- Location preferences (restricted zones, preferred zones)
- Auto-accept settings and criteria sets
- All preference fields

---

### 2. **New Enhanced Buyer Form**

**File:** `app/components/leadbuyers/BuyerFormEnhanced.tsx` (NEW)

Complete rewrite with organized sections:

#### Sections Included:

1. **Basic Information**
   - Full Name, Company, Email, Phone
   - Status, Priority (1-10)

2. **Location & Timezone**
   - Timezone selection
   - Location matching mode (strict/soft/flexible)
   - Service locations restriction toggle

3. **Lead Preferences**
   - Lead types (exclusive/shared)
   - Preferred industries (multi-select)
   - Excluded industries (multi-select)
   - Qualification score minimum
   - Max price per lead
   - Max leads per day

4. **Operational Availability**
   - Default working hours (start/end time)
   - Business hours enforcement toggle
   - Weekend notification toggle
   - Weekly schedule (Monday-Sunday with enable/start/end per day)
   - Vacation mode (enable/pause until date/auto-reject toggle)

5. **Budget & Volume Limits**
   - Budget cap type (daily/weekly/monthly)
   - Budget limit amount
   - Volume limit count
   - Max concurrent leads

6. **Distribution & Notifications**
   - Preferred distribution mode (automatic/manual/direct)
   - Notification preferences (email/sms/dashboard - multi-select)
   - Auto-accept matching leads toggle

#### Key Features:

- **Accordion Layout:** Collapsible sections for better organization
- **Type Safety:** Full TypeScript support with IBuyer interface
- **Responsive:** Grid-based responsive design (xs/md breakpoints)
- **Validation:** Form validation before submission
- **State Management:** Handles all field types (text, number, select, checkbox, switch, time)
- **Error Handling:** Snackbar notifications for success/failure

---

### 3. **Page Component Update**

**File:** `app/dashboard/seller/lead_buyers_management/leadbuyercomponent.tsx`

**Changes:**

```typescript
// Updated import
import BuyerFormEnhanced from "@/app/components/leadbuyers/BuyerFormEnhanced";

// Updated Dialog maxWidth
<Dialog maxWidth="lg" fullWidth>
  <BuyerFormEnhanced {...props} />
</Dialog>
```

---

## All Buyer Preference Fields Now Supported

| Category             | Fields                                                                                       | Previously   | Now |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------ | --- |
| **Basic Info**       | name, company, email, phone, status, priority                                                | ✅           | ✅  |
| **Lead Preferences** | leadTypes, industries, qualificationScoreMinimum, maxPricePerLead                            | ❌           | ✅  |
| **Working Hours**    | workingHours.start, workingHours.end                                                         | ✅           | ✅  |
| **Operational**      | acceptOnlyDuringBusinessHours, notifyOnWeekends, timezone                                    | ❌           | ✅  |
| **Weekly Schedule**  | weeklySchedule[day].enabled/start/end                                                        | ❌           | ✅  |
| **Vacation Mode**    | vacationMode.enabled/pauseUntil/autoReject                                                   | ❌           | ✅  |
| **Budget/Volume**    | budgetCapType, budgetLimitAmount, volumeLimitCount, maxConcurrentLeads                       | ❌           | ✅  |
| **Location**         | locationMatchingStrict, radiusFlexibility, restrictedZones, preferredZones, serviceLocations | ❌           | ✅  |
| **Distribution**     | preferredDistribution, autoAcceptMatchingLeads                                               | ✅ (partial) | ✅  |
| **Notifications**    | notificationPreferences                                                                      | ✅           | ✅  |

---

## Data Flow

### Edit Buyer Flow:

```
User clicks "Edit"
    ↓
API returns complete buyer document (all fields)
    ↓
Form populates all fields from response
    ↓
User edits fields in organized accordion sections
    ↓
Form validates required fields
    ↓
Form submits with complete buyer data
    ↓
API updates buyer document
    ↓
Success notification and form close
```

### Create Buyer Flow:

```
User clicks "Add New Buyer"
    ↓
Form initializes with defaults
    ↓
User fills in basic information and preferences
    ↓
Form validates
    ↓
Form submits with new buyer data
    ↓
API creates buyer document
    ↓
Success notification and form close
```

---

## Form Validation

**Required Fields:**

- Full Name
- Company
- Email
- Phone
- Timezone

**Optional Fields:**

- All other fields have sensible defaults

---

## Default Values

When creating new buyers:

```javascript
{
  status: "new",
  preferredDistribution: "automatic",
  notificationPreferences: ["email"],
  timezone: "America/New_York",
  maxLeadsPerDay: 5,
  priority: 5,
  leadTypes: ["shared"],
  acceptOnlyDuringBusinessHours: false,
  notifyOnWeekends: true,
  autoAcceptMatchingLeads: false,
  locationMatchingStrict: false,
  radiusFlexibility: "strict",
  budgetCapType: "daily",
  vacationMode: {
    enabled: false,
    autoReject: true
  },
  weeklySchedule: {
    Monday-Friday: { enabled: true, start: "09:00", end: "17:00" },
    Saturday-Sunday: { enabled: false, start: "09:00", end: "17:00" }
  }
}
```

---

## Features by Category

### Lead Quality Control

- `qualificationScoreMinimum` - Filter leads by quality
- `maxPricePerLead` - Budget per lead
- `maxLeadsPerDay` - Daily volume limit
- `leadTypes` - Exclusive vs shared leads
- Excluded industries list

### Operational Hours

- Default working hours (start/end)
- Business hours enforcement
- Per-day weekly schedule
- Weekend notification toggle
- Vacation mode with auto-rejection

### Location Preferences

- Timezone selection
- Location matching flexibility (strict/soft/flexible)
- Service location restriction
- Restricted zones (exclusions)
- Preferred zones (prioritizations)

### Distribution Control

- Preferred distribution mode
- Auto-accept capability
- Budget and volume caps
- Concurrent lead limits

### Notifications

- Multi-channel (email, SMS, dashboard)
- Business hours aware
- Weekend control

---

## API Changes

### GET /api/buyers

**Response:** Now returns complete IBuyer documents with all fields

**Example Response:**

```json
[
  {
    "_id": "69762497cfc99e7cb6b8cabe",
    "name": "Musab Mubaraq Mburaimoh",
    "company": "TRIPLE MULTIPURPOSE TECHNOLOGY",
    "email": "triplemultipurposetechnology@gmail.com",
    "phone": "08162552901",
    "status": "new",
    "priority": 5,
    "timezone": "Africa/Lagos",
    "workingHours": { "start": "09:00", "end": "17:00" },
    "acceptOnlyDuringBusinessHours": false,
    "notifyOnWeekends": true,
    "weeklySchedule": {...},
    "vacationMode": {...},
    "leadPreferences": {
      "location": "",
      "industries": ["technology"]
    },
    "preferredDistribution": "automatic",
    "notificationPreferences": ["email", "sms", "dashboard"],
    "maxLeadsPerDay": 0,
    "qualificationScoreMinimum": 0,
    "maxPricePerLead": 0,
    "leadTypes": ["shared"],
    "autoAcceptMatchingLeads": false,
    "locationMatchingStrict": false,
    "radiusFlexibility": "strict",
    "budgetCapType": "daily",
    "budgetLimitAmount": 0,
    "volumeLimitCount": 0,
    "maxConcurrentLeads": 10,
    "restrictedZones": [],
    "preferredZones": [],
    "serviceLocations": [],
    "excludedSources": []
  }
]
```

---

## Usage Throughout Application

These preferences are now editable and should be respected in:

1. **Lead Assignment Service** (`lib/leadAssignmentService.ts`)
   - Check `acceptOnlyDuringBusinessHours`, `weeklySchedule`
   - Respect `qualificationScoreMinimum`, `leadTypes`
   - Consider `vacationMode.enabled` and `autoReject`
   - Apply `maxLeadsPerDay`, `maxConcurrentLeads`

2. **Lead Filtering** (`lib/leadScoringEngine.ts`)
   - Filter by `leadPreferences.industries`
   - Check `locationMatchingStrict`, `radiusFlexibility`

3. **Marketplace Notifications** (`lib/marketplaceNotificationService.ts`)
   - Only notify during `weeklySchedule` enabled hours
   - Skip if `vacationMode.enabled`
   - Respect `notificationPreferences`

4. **Auto-Accept Logic** (`lib/autoAcceptPurchaseService.ts`)
   - Only auto-purchase if `autoAcceptMatchingLeads` enabled
   - Respect `budgetCapType`, `budgetLimitAmount`
   - Check `maxConcurrentLeads`

5. **Dashboard** (`app/dashboard/seller/lead-management/*`)
   - Display operational status based on schedule
   - Show vacation mode indicator
   - Display lead count vs limits

---

## Testing Checklist

- [ ] Create new buyer with basic info only
- [ ] Create new buyer with all preferences
- [ ] Edit existing buyer - all fields load correctly
- [ ] Edit and save changes to vacation mode
- [ ] Edit and save changes to weekly schedule
- [ ] Edit and save budget/volume limits
- [ ] Verify API returns all fields in GET response
- [ ] Verify form populates correctly from edit response
- [ ] Test form validation (required fields)
- [ ] Test accordion expand/collapse
- [ ] Test responsive design on mobile/tablet

---

## Files Modified

1. ✅ `app/api/buyers/route.ts` - Return all fields
2. ✅ `app/components/leadbuyers/BuyerFormEnhanced.tsx` - NEW comprehensive form
3. ✅ `app/dashboard/seller/lead_buyers_management/leadbuyercomponent.tsx` - Use new form

---

## Backward Compatibility

The old `BuyerForm.tsx` is still available but deprecated. It can be removed once testing is complete.

The enhanced form is a drop-in replacement with the same interface:

```typescript
interface BuyerFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (buyerData: Partial<IBuyer> & { sellerId: string }) => Promise<void>;
  initialValues?: Partial<IBuyer>;
  sellerId: string;
}
```

---

## Future Enhancements

1. **Criteria Sets Management UI** - Allow buyers to create multiple criteria sets for different lead types
2. **Lead Insights** - Show buyer performance metrics vs their limits
3. **Schedule Conflict Detection** - Alert if schedule overlaps with seller's vacation
4. **Budget Alerts** - Notify when approaching budget/volume limits
5. **Export Settings** - Allow saving/loading buyer preference templates
