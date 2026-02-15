# Buyer Management Test Plan

## Overview

This document outlines all buyer registration, profile management, lead preferences, and buyer-related workflows for comprehensive testing of the Lead Generation Web App.

---

## 1. Buyer Registration & Onboarding

### 1.1 Buyer Account Creation

**Endpoint:** `POST /api/users/register` (role: buyer)

#### Test Scenarios:

##### 1.1.1 Basic Registration

- **Steps:**
  1. Navigate to buyer registration
  2. Enter required information:
     - Name
     - Email
     - Company name
     - Password
  3. Select role: "buyer"
  4. Submit registration
- **Expected Results:**
  - Buyer account created
  - Status set to "new" (requires completion)
  - Welcome email sent
  - Redirect to complete registration

##### 1.1.2 Complete Buyer Registration

**Endpoint:** `POST /api/completeregistration`

**Extended Profile Information:**

- **Business Details:**
  - Company name (required)
  - Business description
  - Company registration number
  - VAT/Tax registration number
  - Business website URL
  - Contact address:
    - Address Line 1
    - Address Line 2
    - City
    - Post Code

- **Buyer Priority & Capacity:**
  - Priority (1-10 scale) - default: 5
  - Max leads per day - default: 10
  - Qualification score minimum (0-100) - default: 50
  - Max concurrent leads - default: 5

- **Contact Information:**
  - Email (from registration)
  - Phone number
  - Timezone selection

##### 1.1.3 Lead Preferences Configuration

- **Industry Preferences:**
  - Select multiple industries
  - Industry-service pairs (industry + specific services)
  - Example: "Technology - Software Development, IT Support"

- **Location Preferences:**
  - Service locations array:
    - City
    - State
    - Country
    - Zip codes (array)
    - Service radius (miles/km)
  - Location matching strictness:
    - strict: Only exact matches
    - soft: Nearby locations acceptable
    - flexible: Wide geographic area

- **Quality Preferences:**
  - Minimum quality score (0-100)
  - Accept low quality leads: yes/no
  - Preference matching threshold:
    - strict (70% match required)
    - moderate (50% match)
    - flexible (20% match)

##### 1.1.4 Operational Settings

- **Working Hours:**
  - Start time (e.g., "09:00")
  - End time (e.g., "17:00")
  - Weekly schedule:
    - Monday: enabled/disabled, start/end
    - Tuesday: enabled/disabled, start/end
    - ... (all days of week)
- **Availability Settings:**
  - Accept only during business hours: true/false
  - Notify on weekends: true/false
- **Vacation Mode:**
  - Enabled: true/false
  - Pause until: date
  - Auto-reject leads: true/false

##### 1.1.5 Budget & Volume Limits

- **Budget Controls:**
  - Budget cap type: daily, weekly, monthly
  - Budget limit amount
  - Volume limit count (max leads per period)
- **Current Period Tracking:**
  - Current period spent (auto-updated)
  - Current period count (auto-updated)
  - Period start date (auto-reset)

- **Daily Limits:**
  - Max leads per day (separate from period limit)
  - Current leads today counter
  - Last assigned reset date

##### 1.1.6 Notification Preferences

- **Channels:**
  - Email notifications
  - SMS notifications
  - In-App notifications
- **Notification Types:**
  - New leads available
  - Lead assigned
  - Lead expiring
  - Budget alerts
  - Volume limit alerts

##### 1.1.7 Integration Setup

- **Webhook Configuration:**
  - Enabled: true/false
  - Webhook URL
  - Auth token
  - Events to subscribe to

---

## 2. Buyer Profile Management

### 2.1 View Buyer Profile

**Endpoint:** `GET /api/buyers/route` (buyer viewing own profile)

#### Test Scenarios:

- Fetch current buyer profile
- Verify all fields returned
- Check sensitive data handling
- Test profile caching

### 2.2 Update Buyer Profile

**Endpoint:** `PUT /api/buyers/route` (implied)

#### Test Scenarios:

##### 2.2.1 Update Business Information

- Modify company name
- Update business description
- Change business website
- Update contact address
- Verify validation rules

##### 2.2.2 Update Priority & Status

- **Priority (1-10):**
  - Lower number = higher priority
  - Affects assignment order
  - Test priority sorting in round-robin
- **Status Changes:**
  - new → active (after first purchase)
  - active → inactive (manual deactivation)
  - active → suspended (admin action)
  - inactive → active (reactivation)
- **isActive Flag:**
  - Toggle buyer availability
  - Affects assignment eligibility

##### 2.2.3 Update Capacity Limits

- **Max Leads Per Day:**
  - Change daily limit
  - Cannot exceed subscription tier limit
  - Verify enforcement
- **Max Concurrent Leads:**
  - Set maximum active leads
  - Prevent over-assignment
- **Budget Limits:**
  - Update daily/weekly/monthly budget
  - Change budget cap type
  - Reset period dates

##### 2.2.4 Wallet Management (Buyer)

- View wallet balance: `GET /api/buyers/walletBalance`
- View wallet units
- Buy credits: `POST /api/buyers/buyerbuycredit`
- View transaction history

---

## 3. Lead Preferences Management

### 3.1 Update Industry Preferences

#### Test Scenarios:

- **Single Industry Selection:**
  - Select one industry
  - Receive all leads from that industry
- **Multiple Industries:**
  - Select multiple industries (array)
  - Receive leads from any selected industry
- **Industry-Service Pairs:**
  - Industry: "Healthcare"
  - Services: ["Dental", "Medical"]
  - Only receive healthcare leads specifically for dental/medical
- **No Industry Preference:**
  - Receive leads from all industries (if location/quality match)

### 3.2 Update Location Preferences

#### Test Scenarios:

##### 3.2.1 Service Locations Configuration

**Endpoint:** `POST /api/buyers/service-locations`

- **Add Service Location:**
  1. Enter city
  2. Enter state
  3. Select country
  4. Add zip codes (optional array)
  5. Set service radius (miles)
  6. Save location
- **Multiple Service Locations:**
  - Add multiple cities
  - Different states
  - International locations
- **Preferred Zones:**
  - Specify high-priority zones
  - City-level targeting
  - State-level targeting
  - Zip code targeting

##### 3.2.2 Location Matching Settings

- **locationMatchingStrict:**
  - true: Only accept leads from defined serviceLocations
  - false: Accept nearby leads based on radius
- **radiusFlexibility:**
  - strict: Exact radius enforcement
  - soft: +10-20% radius tolerance
  - flexible: Wide area consideration
- **Geographic Radius:**
  - serviceRadius: default radius in miles
  - Override per location
  - Test distance calculations

### 3.3 Update Quality Preferences

#### Test Scenarios:

- **Minimum Quality Score:**
  - qualificationScoreMinimum (0-100)
  - Only accept leads above threshold
  - Test with different thresholds
- **Preference Matching Threshold:**
  - strict: 70% match required
  - moderate: 50% match
  - flexible: 20% match
  - Affects lead assignment eligibility

### 3.4 Lead Age/Freshness Preferences

#### Test Scenarios:

- **maxLeadAge (hours):**
  - Set maximum acceptable lead age
  - Examples: 1, 24, 48, 72 hours
  - Reject stale leads
  - Test age calculation

---

## 4. Buyer Status Management

### 4.1 Update Buyer Status (Seller/Admin)

**Endpoint:** `POST /api/sellers/update-buyer-status`

#### Test Scenarios:

##### 4.1.1 Auto-Activate Buyers (POST)

- **Trigger Conditions:**
  - Buyer status: "new"
  - Registered with seller
  - Has at least one purchase in purchaseHistory
- **Process:**
  1. Seller calls endpoint
  2. System finds all "new" buyers registered with seller
  3. Checks purchaseHistory.length > 0
  4. Updates status to "active"
  5. Returns updated buyer list
- **Query Parameters:**
  - buyerId (optional): Update specific buyer only
- **Response Validation:**
  - updatedCount: number of buyers activated
  - updatedBuyers: array with id, name, email, purchaseCount
  - checkedCount: total buyers checked

##### 4.1.2 Preview Activation (GET)

**Endpoint:** `GET /api/sellers/update-buyer-status`

- **Dry Run:**
  - Show which buyers eligible for activation
  - No status changes
  - Display criteria met
- **Response Fields:**
  - eligibleForActivation: buyers with purchases
  - notEligible: buyers without purchases
  - For eligible:
    - purchaseCount
    - firstPurchase date
    - lastPurchase date
  - For not eligible:
    - reason: "No lead purchases found"

##### 4.1.3 Manual Status Changes

- **Set to Inactive:**
  - Buyer requests pause
  - Stops receiving leads
  - Retains profile and history
- **Set to Suspended:**
  - Admin enforcement
  - Payment issues
  - Policy violations
  - Cannot access system
- **Reactivate:**
  - inactive → active
  - suspended → active (admin only)

---

## 5. Buyer Lead Assignment

### 5.1 Get Assigned Leads (Buyer)

**Endpoint:** `GET /api/buyers/getAssignedLeads`

#### Test Scenarios:

- **View All Assigned Leads:**
  - Pending acceptance
  - Assignment date
  - Assignment expiration
  - Seller notes
  - Preview information (limited)
- **Filter Assigned Leads:**
  - Pending only
  - Accepted
  - Rejected
  - Expired
- **Sort Options:**
  - By assignment date
  - By priority
  - By quality score
  - By expiration time

### 5.2 Accept or Reject Assigned Lead

**Endpoint:** `POST /api/buyers/acceptOrRejectlead`

#### Test Scenarios:

##### 5.2.1 Accept Lead

- **Steps:**
  1. Review assigned lead preview
  2. Click "Accept"
  3. Confirm acceptance
  4. System checks:
     - Wallet balance sufficient
     - Within daily limits
     - Within budget limits
  5. Deduct cost from wallet
  6. Update assignedTo[].accepted = true
  7. Add to purchaseHistory
  8. Update currentLeads counter
  9. Update currentLeadsToday counter
  10. Full lead details revealed
  11. Notifications sent
- **Validations:**
  - Insufficient balance → error
  - Over daily limit → error
  - Over budget limit → error
  - Already accepted/rejected → error
  - Assignment expired → error

##### 5.2.2 Reject Lead

- **Steps:**
  1. Click "Reject"
  2. Optionally provide rejection reason
  3. Confirm rejection
  4. Update assignedTo[].rejected = true
  5. No charge
  6. Lead returned to pool
  7. Notifications sent
- **Rejection Reasons (optional):**
  - Outside service area
  - Poor quality
  - Duplicate lead
  - Budget constraints
  - Other (specify)

### 5.3 Auto-Accept Leads (Future Feature)

**Endpoint:** `POST /api/buyers/auto-accept-settings`

#### Test Scenarios:

- Enable auto-accept for specific criteria
- Quality threshold for auto-accept
- Budget limits enforcement
- Auto-accept notification

---

## 6. Buyer Lead Purchase

### 6.1 View Available Marketplace Leads

**Endpoint:** `GET /api/leads/available`

#### Test Scenarios:

##### 6.1.1 Leads Matching Buyer Preferences

- **Filtering Applied:**
  - Industry match
  - Location match
  - Quality score minimum
  - Not already purchased by buyer
  - Not over budget limits
  - Within maxLeadAge

##### 6.1.2 Lead Information Display

- **Preview Information:**
  - Quality level (High/Medium/Low)
  - AI quality score
  - Industry
  - Location (city, state)
  - Lead age
  - Price
  - Exclusive vs shared
  - Share count (if shared)
- **Hidden Information (until purchase):**
  - Full name
  - Email address
  - Phone number
  - Custom fields

### 6.2 Purchase Lead

**Endpoint:** `POST /api/buyers/buyerpurchaselead`

#### Test Scenarios:

(Covered in detail in Lead Management Test Plan)

- Buy exclusive lead
- Buy shared lead
- Balance validation
- Limits enforcement
- Transaction recording
- Notification delivery

### 6.3 View Purchased Leads

**Endpoint:** `GET /api/buyers/fetchleadforbuyer`

#### Test Scenarios:

##### 6.3.1 Lead Access Post-Purchase

- **Full Details Visible:**
  - All contact information
  - All custom fields
  - Lead source
  - Form submission data
  - Conversation history (if chatbot lead)
  - Call records (if applicable)

##### 6.3.2 Purchase History

- **Fields:**
  - Lead ID
  - Purchase date
  - Amount paid
  - Lead quality
  - Lead source
  - Transaction ID

### 6.4 Buyer Purchase Analytics

**Endpoint:** `GET /api/buyers/buyeroverview`

#### Test Scenarios:

- **Purchase Statistics:**
  - Total leads purchased
  - Total amount spent
  - Average cost per lead
  - Leads by quality level
  - Leads by industry
  - Leads by location
  - Purchase trends (daily, weekly, monthly)
- **ROI Metrics:**
  - Conversion rates
  - Revenue per lead (if integrated)
  - Cost per acquisition

---

## 7. Buyer Unit Pricing

### 7.1 Configure Unit Price Options

**Endpoint:** `POST /api/buyers/buyerunitpriceOption`

#### Test Scenarios:

- **Buyer-Specific Pricing:**
  - Negotiate custom pricing with seller
  - Volume discounts
  - Loyalty pricing
  - Industry-specific pricing
- **Pricing Tiers:**
  - Standard rate
  - High quality premium
  - Low quality discount
  - Bulk purchase discounts

---

## 8. Buyer General Settings

### 8.1 Update General Settings

**Endpoint:** `POST /api/buyers/general-settings`

#### Test Scenarios:

##### 8.1.1 Communication Preferences

- Update email address
- Update phone number
- Set notification preferences
- Configure alert thresholds

##### 8.1.2 Operational Preferences

- Update working hours
- Modify weekly schedule
- Set vacation mode
- Configure auto-responses

##### 8.1.3 Distribution Preferences

- **preferredDistribution:**
  - "Automatic": Auto-receive assigned leads
  - "Manual": Marketplace purchases only
  - "Both": Accept both methods
- Test each mode's behavior

---

## 9. Buyer Call Management

### 9.1 Call Leads

**Endpoint:** `GET /api/buyers/buyerCallleads`

#### Test Scenarios:

- View leads with associated calls
- Filter by call status
- View call analytics
- Access call recordings
- View call transcriptions

**Note:** Detailed call testing in Call Tracking Test Plan

### 9.2 Call Analytics (Buyer)

**Endpoint:** `GET /api/buyers/callAnalytics`

#### Test Scenarios:

- Total calls made to purchased leads
- Call duration statistics
- Call outcome analytics
- Best performing time slots
- Call conversion rates

---

## 10. Buyer Performance Tracking

### 10.1 Buyer Overview Dashboard

**Endpoint:** `GET /api/buyers/buyeroverview`

#### Test Scenarios:

##### 10.1.1 Key Performance Indicators

- **Activity Metrics:**
  - Current leads count
  - Current leads today
  - Leads assigned but pending
  - Leads purchased this period
- **Financial Metrics:**
  - Wallet balance
  - Current period spent
  - Average cost per lead
  - Budget utilization %
- **Capacity Metrics:**
  - Leads vs max per day %
  - Concurrent leads vs max %
  - Budget spent vs limit %

##### 10.1.2 Performance Trends

- Leads acquired over time
- Spending over time
- Acceptance rate trend
- Response time to assignments

##### 10.1.3 Alerts & Recommendations

- Approaching budget limit
- Approaching volume limit
- Under-utilized capacity
- Preference optimization suggestions

---

## 11. Buyer-Seller Relationship

### 11.1 Registration with Seller

**Field:** `registeredWith` (seller user ID)

#### Test Scenarios:

- Buyer registers under specific seller
- View seller information
- Seller-specific pricing
- Seller-managed leads only
- Transfer between sellers (admin)

### 11.2 Multiple Seller Management (if applicable)

#### Test Scenarios:

- Buyer registered with multiple sellers
- Separate lead pools
- Different pricing per seller
- Independent preferences per seller

---

## 12. Buyer Assignment Tracking

### 12.1 Assignment History

#### Test Scenarios:

- **lastAssignedAt:**
  - Track most recent assignment
  - Used for round-robin fairness
  - Reset on new assignments
- **lastAssignedLeadId:**
  - Track last assigned lead ID
  - Prevent duplicate assignments
  - Debugging aid

### 12.2 Assignment Rotation

#### Test Scenarios:

- Verify fair rotation
- Priority influences rotation
- Skip inactive buyers
- Skip over-capacity buyers
- Skip vacation mode buyers
- Skip out-of-hours buyers (if configured)

---

## 13. Buyer Limits Enforcement

### 13.1 Daily Limit Enforcement

**Fields:** `maxLeadsPerDay`, `currentLeadsToday`

#### Test Scenarios:

- **At Limit:**
  - Attempt assignment when at maxLeadsPerDay
  - Expected: Skipped in rotation
  - No new assignments until reset
- **Daily Reset:**
  - Verify reset at midnight (buyer's timezone)
  - currentLeadsToday → 0
  - Buyer eligible again

### 13.2 Budget Limit Enforcement

**Fields:** `budgetLimitAmount`, `currentPeriodSpent`, `budgetCapType`

#### Test Scenarios:

##### 13.2.1 Daily Budget

- budgetCapType: "daily"
- Spend up to budgetLimitAmount
- Attempt purchase/accept over limit
- Expected: Error "Budget limit reached"
- Reset at period start

##### 13.2.2 Weekly Budget

- budgetCapType: "weekly"
- Track spending across week
- Reset on periodStartDate (weekly)

##### 13.2.3 Monthly Budget

- budgetCapType: "monthly"
- Track spending across month
- Reset on periodStartDate (monthly)

##### 13.2.4 Period Reset

- Automatic reset based on periodStartDate
- currentPeriodSpent → 0
- currentPeriodCount → 0
- New periodStartDate set

### 13.3 Volume Limit Enforcement

**Fields:** `volumeLimitCount`, `currentPeriodCount`

#### Test Scenarios:

- Track lead count per period
- Enforce volumeLimitCount
- Prevent exceeding volume
- Independent from budget limit
- Both must be satisfied

### 13.4 Concurrent Leads Limit

**Fields:** `maxConcurrentLeads`, `currentLeads`

#### Test Scenarios:

- Track active leads (currentLeads)
- Prevent exceeding maxConcurrentLeads
- Decrease when lead marked completed/lost
- Test limit during assignment
- Test limit during purchase

---

## 14. Buyer Business Hours & Availability

### 14.1 Working Hours Enforcement

**Fields:** `workingHours`, `acceptOnlyDuringBusinessHours`

#### Test Scenarios:

##### 14.1.1 Simple Working Hours

- **workingHours.start:** "09:00"
- **workingHours.end:** "17:00"
- **acceptOnlyDuringBusinessHours:** true
- **Test:**
  - Assign lead at 10:00 → Accepted
  - Assign lead at 20:00 → Skipped
  - Assign lead at 08:00 → Skipped

##### 14.1.2 Weekly Schedule

- **weeklySchedule:**
  - Monday: enabled: true, start: "09:00", end: "17:00"
  - Saturday: enabled: false
  - Sunday: enabled: false
- **Test:**
  - Assign on weekday during hours → Accepted
  - Assign on Saturday → Skipped
  - notifyOnWeekends: false → No weekend notifications

##### 14.1.3 Timezone Handling

- **timezone:** "America/New_York"
- Convert assignment time to buyer timezone
- Verify hours enforcement in correct timezone
- Test daylight saving transitions

### 14.2 Vacation Mode

**Fields:** `vacationMode.enabled`, `vacationMode.pauseUntil`, `vacationMode.autoReject`

#### Test Scenarios:

##### 14.2.1 Enable Vacation Mode

- Set enabled: true
- Set pauseUntil: future date
- autoReject: true
- **Expected:**
  - Skipped in assignment rotation
  - No marketplace visibility (optional)
  - Auto-reject any assignments
  - No notifications

##### 14.2.2 Vacation Mode with Manual Handling

- enabled: true
- autoReject: false
- **Expected:**
  - Assignments queue (not auto-rejected)
  - Available when vacation ends
  - Notifications paused

##### 14.2.3 Automatic Vacation End

- pauseUntil date reached
- Automatic reactivation
- Resume normal operations
- Notification of reactivation

---

## 15. Buyer Webhooks

### 15.1 Configure Webhook

**Fields:** `webhookConfig.enabled`, `webhookConfig.url`, `webhookConfig.authToken`

#### Test Scenarios:

##### 15.1.1 Enable Webhook

- Set enabled: true
- Provide webhook URL
- Set auth token
- Validate URL format
- Test endpoint reachability

##### 15.1.2 Webhook Events

**Events to send:**

- lead.assigned
- lead.available (matching preferences)
- lead.purchased
- lead.accepted
- budget.limit.warning
- volume.limit.warning
- credits.low

##### 15.1.3 Webhook Delivery

- **Test Successful Delivery:**
  - POST to webhook URL
  - Include auth token in header
  - Send event payload
  - Verify 200 OK response
  - Log successful delivery
- **Test Failed Delivery:**
  - Webhook endpoint down
  - Retry logic (3 attempts)
  - Exponential backoff
  - Eventual failure notification
  - Log failed delivery

##### 15.1.4 Webhook Security

- Validate auth token
- HTTPS required
- Signature verification (HMAC)
- Prevent replay attacks (timestamp)

---

## 16. Buyer Reporting & Analytics

### 16.1 Purchase Reports

#### Test Scenarios:

- Generate purchase report
- Filter by date range
- Group by industry
- Group by quality level
- Export to CSV/PDF

### 16.2 Performance Reports

#### Test Scenarios:

- Lead conversion reports
- ROI analysis
- Cost per acquisition
- Lead source effectiveness
- Time to contact analysis

---

## 17. Buyer Data Management

### 17.1 Export Buyer Data

#### Test Scenarios:

- Export all purchased leads
- Export purchase history
- Export transaction history
- GDPR compliance (data portability)

### 17.2 Delete Buyer Account

#### Test Scenarios:

- Request account deletion
- Data retention policy
- Purchased leads remain for seller
- Personal data anonymization
- GDPR compliance (right to erasure)

---

## 18. Buyer Permissions & Security

### 18.1 Access Control

#### Test Scenarios:

- Buyer can only view own profile
- Cannot view other buyers
- Cannot access seller functions
- Cannot access admin functions
- Can view purchased leads only
- Cannot modify leads

### 18.2 Data Privacy

#### Test Scenarios:

- Lead details hidden until purchase
- Secure payment processing
- Encrypted sensitive data
- Audit log of data access

---

## 19. Edge Cases & Boundary Testing

### 19.1 Edge Cases

#### Test Scenarios:

- **Simultaneous Assignment:**
  - Two sellers assign to same buyer simultaneously
  - Buyer exactly at capacity limit
  - Race condition handling
- **Budget Edge Cases:**
  - Purchase exactly at budget limit
  - Budget reset during purchase flow
  - Currency rounding edge cases
- **Time Edge Cases:**
  - Assignment at exactly end of business hours
  - Purchase during timezone transition
  - Vacation mode end during assignment
- **Preference Edge Cases:**
  - No matching leads available
  - All matching leads already purchased
  - Location just outside radius
  - Quality score exactly at threshold

### 19.2 Boundary Testing

#### Test Scenarios:

- priority: 1 (min), 10 (max), 0 (invalid), 11 (invalid)
- maxLeadsPerDay: 0, 1, 1000, -1 (invalid)
- qualificationScoreMinimum: 0, 50, 100, 101 (invalid)
- serviceRadius: 0, 1, 1000, -1 (invalid)
- budgetLimitAmount: 0, 0.01, 1000000, -1 (invalid)

---

## Testing Checklist

### Pre-Testing Setup

- [ ] Seller account(s) created
- [ ] Lead inventory available
- [ ] Payment processing configured
- [ ] Notification system enabled
- [ ] Webhook test endpoint ready
- [ ] Test credit packages defined

### Functional Testing

- [ ] Buyer registration & onboarding
- [ ] Profile management
- [ ] Lead preferences configuration
- [ ] Operational settings
- [ ] Assignment acceptance/rejection
- [ ] Lead purchase workflow
- [ ] Wallet & credit management
- [ ] Status transitions

### Business Logic Testing

- [ ] Daily limits enforcement
- [ ] Budget limits enforcement
- [ ] Volume limits enforcement
- [ ] Concurrent leads limits
- [ ] Working hours enforcement
- [ ] Vacation mode handling
- [ ] Priority-based assignment
- [ ] Preference matching

### Integration Testing

- [ ] Seller integration
- [ ] Payment integration
- [ ] Notification system
- [ ] Webhook delivery
- [ ] Analytics integration
- [ ] Call tracking integration

### Security Testing

- [ ] Access control (RBAC)
- [ ] Data privacy
- [ ] Secure payments
- [ ] Webhook security
- [ ] PII protection

### Performance Testing

- [ ] Assignment at scale
- [ ] Concurrent purchases
- [ ] Preference matching performance
- [ ] Dashboard load time
- [ ] Report generation speed

---

## Test Data Requirements

### Sample Buyers:

```json
{
  "high_priority_buyer": {
    "name": "Premium Buyer",
    "company": "ABC Corp",
    "email": "premium@buyer.com",
    "priority": 1,
    "maxLeadsPerDay": 50,
    "budgetCapType": "monthly",
    "budgetLimitAmount": 10000,
    "status": "active",
    "isActive": true,
    "leadPreferences": {
      "industries": ["Technology", "Finance"],
      "location": "California"
    }
  },
  "standard_buyer": {
    "name": "Standard Buyer",
    "company": "XYZ Inc",
    "email": "standard@buyer.com",
    "priority": 5,
    "maxLeadsPerDay": 10,
    "budgetCapType": "daily",
    "budgetLimitAmount": 100,
    "status": "active"
  },
  "restricted_buyer": {
    "name": "Limited Buyer",
    "company": "Small Business",
    "priority": 8,
    "maxLeadsPerDay": 3,
    "acceptOnlyDuringBusinessHours": true,
    "workingHours": {
      "start": "09:00",
      "end": "17:00"
    }
  }
}
```

---

## Automation Recommendations

### High Priority for Automation

1. Registration and onboarding flow
2. Preference configuration
3. Assignment acceptance/rejection
4. Purchase workflow
5. Limits enforcement
6. Status transitions
7. Webhook delivery

### Manual Testing Recommended

1. UI/UX validation
2. Preference matching reasonableness
3. Dashboard visualization
4. Complex business rule interactions
5. Email/notification content

---

## Sign-off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| QA Lead       |      |      |           |
| Product Owner |      |      |           |
| Dev Lead      |      |      |           |
