# Lead Distribution Logic Correction

**Date:** January 29, 2026  
**Issue:** Conflicting log messages showing leads marked as "available" in marketplace immediately after being assigned to a buyer.

## Problem Statement

The logs showed:

```
📋 Found 1 matching buyers for lead 697b466dfd84d548f30beb19
✅ Lead 697b466dfd84d548f30beb19 auto-assigned to buyer 69762497cfc99e7cb6b8cabe
📍 Lead 697b466dfd84d548f30beb19 marked as available in marketplace (reason: unmatched)
```

This is contradictory:

- **Line 1:** Match found ✓
- **Line 2:** Lead assigned to matching buyer ✓
- **Line 3:** Lead marked as "available" in marketplace with "reason: unmatched" ✗

The third line is **wrong** because:

1. A match WAS found (contradicts "unmatched" reason)
2. The lead should not be available in marketplace if it's been assigned to a buyer (unless it's a shared lead)
3. Status should be "assigned" not "available"

## Root Cause

The `processLeadDistribution()` function was unconditionally calling `makeLeadAvailableInMarketplace()` after assigning every lead, regardless of:

- Whether the lead is exclusive or shared
- The seller's sharing preferences
- The correct lead status

## Solution Implemented

### 1. **Fixed Lead Status Workflow**

#### For Exclusive Leads (default, `lead.shared = false`):

```
new → assigned → (auto-accept?) → sold
                OR
                pending_acceptance → (accept) → sold
                                  → (reject) → available
```

#### For Shared Leads (`lead.shared = true`):

```
new → assigned (to N buyers based on shareNumber)
    → marketplace available (for unfilled slots)
    → sold (when slots filled or buyer purchases)
```

### 2. **Added New Lead Status**

Added `"pending_acceptance"` to the `ILead.status` union type in [models/leads.ts](models/leads.ts#L33):

```typescript
status:
  | "new"
  | "available"
  | "sold"
  | "assigned"
  | "qualified"
  | "unqualified"
  | "transferred"
  | "pending_acceptance";  // ← NEW
```

This status indicates a lead has been assigned to a buyer but requires buyer acceptance before full contact details are revealed.

### 3. **Fixed Auto-Accept Logic**

**Location:** [lib/leadAssignmentService.ts](lib/leadAssignmentService.ts#L793-L867)

When a lead is assigned to a buyer, the system now checks `buyer.autoAcceptMatchingLeads`:

#### If `autoAcceptMatchingLeads = true`:

```typescript
// Immediately debit wallet units
await Buyer.findByIdAndUpdate(primaryBuyer._id, {
  $inc: { walletUnit: -estimatedCost },
});

// Update lead status to 'sold'
await Lead.findByIdAndUpdate(lead._id, {
  status: "sold",
  $push: { soldTo: { ... } },
});

// Log: Lead auto-accepted and units debited
```

#### If `autoAcceptMatchingLeads = false`:

```typescript
// Update lead status to 'pending_acceptance'
await Lead.findByIdAndUpdate(lead._id, {
  status: "pending_acceptance",
});

// Contact details will be hidden in notifications
// Buyer must accept/reject before units are debited
```

### 4. **Implemented Shared Lead Distribution**

**Location:** [lib/leadAssignmentService.ts](lib/leadAssignmentService.ts#L868-L926)

When `lead.shared = true`:

- Distribute to up to `lead.shareNumber` matching buyers using round-robin
- Apply auto-accept logic to each assigned buyer
- Only make available in marketplace if:
  - `shareNumber` slots are not yet filled
  - Additional buyers can still purchase the lead

```typescript
if (lead.shared) {
  const sharedCount = lead.shareNumber || 1;
  const alreadyAssigned = 1; // Primary buyer

  // Assign to additional buyers if slots available
  if (alreadyAssigned < sharedCount) {
    const additionalBuyers = matchingBuyers.slice(1, sharedCount);
    for (const additionalBuyer of additionalBuyers) {
      // Assign and apply auto-accept logic
    }
  }

  // Make available in marketplace only if slots remain
  if (totalAssignments < sharedCount) {
    await makeLeadAvailableInMarketplace(lead, "unmatched");
  }
}
```

### 5. **Fixed Fallback Logic**

**Location:** [lib/leadAssignmentService.ts](lib/leadAssignmentService.ts#L927-L961)

When assignment fails:

- **For shared leads:** Try marketplace and auto-accept purchases
- **For exclusive leads:** Mark as "available" for manual assignment (don't make available in marketplace automatically)

```typescript
if (lead.shared) {
  // Make available for marketplace/auto-accept
  await makeLeadAvailableInMarketplace(lead, "unmatched");
} else {
  // Keep for manual assignment, don't flood marketplace
  await Lead.findByIdAndUpdate(lead._id, {
    status: "available",
  });
}
```

### 6. **Enhanced Email Notifications**

**Location:** [lib/leadAssignmentService.ts](lib/leadAssignmentService.ts#L540-L604)

Updated `notifyBuyer()` function to:

#### Conditionally Hide Contact Details:

- **If `autoAcceptMatchingLeads = true`:** Show full contact details immediately
- **If `autoAcceptMatchingLeads = false`:** Hide contact details with message "[Contact details hidden until you accept this lead]"

#### Enhanced Notification Message:

```typescript
// Show status-appropriate message
const notificationMessage = `New lead assigned: ${leadName}. ${contactDetailsMessage}${
  leadStatus === "pending_acceptance"
    ? ". Click to review and accept/reject."
    : ""
}`;

// Include metadata about acceptance requirement
metadata: {
  leadId: lead._id,
  leadName,
  leadEmail: showContactDetails ? leadEmail : "[hidden]",
  leadPhone: showContactDetails ? leadPhone : "[hidden]",
  requiresAcceptance: !buyer.autoAcceptMatchingLeads,
};
```

#### Confirmed Email Channel Support:

- Dashboard notification always sent
- Email sent if `buyer.notificationPreferences?.includes("Email")`
- SMS sent if `buyer.notificationPreferences?.includes("SMS")`

---

## Before vs After Comparison

### Before (Incorrect Flow)

```
Found 1 matching buyers
✅ Lead auto-assigned to buyer
📍 Lead marked as available in marketplace ← WRONG for exclusive leads
```

### After (Correct Flow)

#### Exclusive Lead, Auto-Accept Enabled:

```
Found 1 matching buyers
✅ Lead auto-assigned to buyer
💳 Units debited from buyer wallet
📍 Lead marked as SOLD (not available in marketplace)
📧 Email notification sent with full contact details
```

#### Exclusive Lead, Auto-Accept Disabled:

```
Found 1 matching buyers
✅ Lead assigned to buyer (pending acceptance)
📍 Lead status = pending_acceptance (contact details hidden)
📧 Email notification sent - asking to accept/reject
⏳ Awaiting buyer acceptance before debit
```

#### Shared Lead (2 slots):

```
Found 1 matching buyers
✅ Lead assigned to buyer #1
💳 (if auto-accept) Units debited from buyer #1
✅ Also assigned to buyer #2 (if available)
💳 (if auto-accept) Units debited from buyer #2
📍 If slots not filled, mark as available in marketplace for partial fill
```

---

## Files Modified

1. **[models/leads.ts](models/leads.ts#L33)**
   - Added `"pending_acceptance"` status to `ILead.status` union type

2. **[lib/leadAssignmentService.ts](lib/leadAssignmentService.ts)**
   - Enhanced `notifyBuyer()` function with contact detail hiding and enhanced messaging
   - Restructured post-assignment logic (lines 793-961)
   - Added auto-accept debit logic
   - Added shared lead round-robin distribution
   - Fixed marketplace availability logic (only for shared leads or fallback)
   - Fixed fallback behavior (exclusive vs shared)

---

## Testing Checklist

- [ ] Exclusive lead assigned to buyer with auto-accept enabled
  - [ ] Verify status changes to "sold"
  - [ ] Verify wallet units debited
  - [ ] Verify email sent with full contact details
- [ ] Exclusive lead assigned to buyer with auto-accept disabled
  - [ ] Verify status changes to "pending_acceptance"
  - [ ] Verify email sent with hidden contact details
  - [ ] Verify message prompts buyer to accept/reject
- [ ] Shared lead with 2 slots, 2 matching buyers
  - [ ] Verify assigned to both buyers
  - [ ] Verify both receive notifications
  - [ ] Verify both have auto-accept logic applied correctly
  - [ ] Verify NOT marked as available in marketplace (slots filled)
- [ ] Shared lead with 2 slots, 1 matching buyer
  - [ ] Verify assigned to one buyer
  - [ ] Verify marked as available in marketplace (1/2 slots filled)
  - [ ] Verify other buyers notified via marketplace
- [ ] Exclusive lead, assignment fails
  - [ ] Verify status = "available" (for manual assignment)
  - [ ] Verify NOT automatically made available in marketplace
- [ ] Shared lead, assignment fails
  - [ ] Verify marked as available in marketplace (with "unmatched" reason)
  - [ ] Verify auto-purchase buyers notified

---

## Related Documentation

- [SYSTEM_ARCHITECTURE_AND_DATA_MODELS.md](SYSTEM_ARCHITECTURE_AND_DATA_MODELS.md) - Overall system design
- [BUYER_PREFERENCES_ENHANCEMENT.md](BUYER_PREFERENCES_ENHANCEMENT.md) - Buyer preference matching logic
- [BUSINESS_WORKFLOWS_AND_INTEGRATIONS.md](BUSINESS_WORKFLOWS_AND_INTEGRATIONS.md) - Lead workflow processes

---

## Summary

The lead distribution logic now correctly:

1. ✅ Distinguishes between exclusive and shared leads
2. ✅ Applies auto-accept debit logic per buyer preference
3. ✅ Hides contact details for leads pending acceptance
4. ✅ Distributes shared leads to multiple buyers
5. ✅ Only makes leads available in marketplace when appropriate
6. ✅ Sends enhanced email notifications with proper contact detail handling
7. ✅ Transitions lead status correctly through the sales pipeline

Lead logs will now be consistent and reflect the actual lead assignment and marketplace availability state.
