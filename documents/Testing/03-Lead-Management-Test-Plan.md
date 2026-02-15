# Lead Management Test Plan

## Overview

This document outlines all lead creation, management, distribution, and tracking workflows for comprehensive testing of the Lead Generation Web App.

---

## 1. Lead Creation

### 1.1 Create Lead via API

**Endpoint:** `POST /api/leads`

#### Test Scenarios:

##### 1.1.1 Manual Lead Creation (Seller)

- **Steps:**
  1. Navigate to "Create Lead" page
  2. Fill in lead details:
     - Name (optional)
     - Email (optional)
     - Phone (optional)
     - Company (optional)
     - Industry
     - Location (city, state, country, zipCode, address)
     - Custom fields (dynamic based on form)
  3. Set lead properties:
     - Lead source
     - Exclusive flag (true/false)
     - Share number (if shared lead)
     - Unit price
     - Lead status: new, available, sold, assigned, qualified, unqualified
  4. Submit lead
- **Expected Results:**
  - Lead created with unique ID
  - isManual flag set to true
  - AI quality assessment triggered
  - Lead appears in seller's dashboard
  - Lead status set to "new"

##### 1.1.2 Auto Lead Creation (Form Submission)

**Endpoint:** `POST /api/form/submit`

- **Steps:**
  1. User fills out embedded form
  2. Form validation passes
  3. Submit form
  4. Lead created automatically
- **Expected Results:**
  - Lead linked to formId
  - isManual flag set to false
  - Lead source set to form name
  - AI quality scoring applied
  - Seller notified of new lead
  - Auto-assignment triggered (if enabled)

##### 1.1.3 Lead Import (Bulk)

**Endpoint:** `POST /api/leads/import`

- **Steps:**
  1. Prepare CSV file with headers: name, email, phone, company, industry
  2. Navigate to import page
  3. Upload CSV file
  4. Map columns to fields
  5. Preview import
  6. Confirm import
- **Expected Results:**
  - All valid leads imported
  - Invalid rows logged with errors
  - Import summary displayed (success/failed)
  - Duplicate detection
  - Batch AI quality assessment
  - Import confirmation email sent

##### 1.1.4 Lead Validation

Test Required/Optional Fields:

- All fields optional (name, email, phone)
- At least one contact method recommended
- Email format validation
- Phone format validation (E.164)
- Industry validation (from predefined list)
- Location validation

### 1.2 AI Quality Assessment

#### Test Scenarios:

##### 1.2.1 Automatic AI Scoring

**Triggered on lead creation**

- **AI Fields Populated:**
  - `aiQualityScore` (0-100, lower is better)
  - `qualityLevel`: "High" (0-30), "Medium" (30-70), "Low" (70-100)
  - `aiQualityReason`: Explanation from AI
  - `aiQualityAssessment`:
    - isValid (boolean)
    - spamScore (0-100)
    - reason (string)
    - evaluatedAt (timestamp)

##### 1.2.2 Quality Level Application

- **High Quality (Score 0-30):**
  - Premium pricing applied
  - Priority distribution
  - Auto-assignment if enabled
- **Medium Quality (Score 30-70):**
  - Standard pricing
  - Normal distribution
- **Low Quality (Score 70-100):**
  - Discounted pricing
  - Manual review flag
  - Possible rejection

##### 1.2.3 AI Re-evaluation

- Trigger manual re-scoring
- Update after lead enrichment
- Verify score history tracked

---

## 2. Lead Retrieval & Listing

### 2.1 Get Leads

**Endpoint:** `GET /api/leads`

#### Test Scenarios:

##### 2.1.1 List All Leads (Seller)

- **Query Parameters:**
  - page (pagination)
  - limit (results per page)
  - status (filter)
  - qualityLevel (filter)
  - dateFrom/dateTo (date range)
  - industry (filter)
  - location (filter)
  - search (text search)

##### 2.1.2 Response Validation

- **Verify Fields:**
  - \_id
  - name, email, phone, company
  - conversationId (if from chatbot)
  - formId (if from form)
  - userId (seller ID)
  - fields array (custom fields)
  - status
  - exclusive, shared, shareNumber
  - soldCount, unit
  - soldTo array
  - assignedTo array
  - isManual
  - leadSource
  - distributionMethod
  - industry
  - location object
  - AI quality fields
  - followUps array
  - calls array
  - createdAt, updatedAt

##### 2.1.3 Filtering & Search

- **Filter by status:** new, available, sold, assigned, qualified, unqualified, transferred
- **Filter by quality level:** High, Medium, Low
- **Filter by exclusive:** true/false
- **Search:** name, email, phone, company
- **Date range:** created between dates
- **Location filter:** city, state, zipCode
- **Industry filter:** specific industry

##### 2.1.4 Pagination

- Test page 1, page 2, last page
- Verify limit enforcement (10, 25, 50, 100)
- Check total count
- Test edge cases (empty results, single page)

### 2.2 Get Available Leads (Marketplace)

**Endpoint:** `GET /api/leads/available`

#### Test Scenarios:

##### 2.2.1 Buyer Views Available Leads

- **Filters applied:**
  - status: "available" only
  - Not sold to requesting buyer
  - Matches buyer's industry preferences
  - Matches buyer's location preferences
  - Within buyer's budget
  - Respects exclusive/shared settings

##### 2.2.2 Lead Availability Logic

- Exclusive leads show once sold count >= 1
- Shared leads available until shareNumber reached
- Lead age filtering (if buyer has maxLeadAge preference)
- Quality level matching

### 2.3 Get Exclusive Leads

**Endpoint:** `GET /api/leads/getExclusiveleads`

#### Test Scenarios:

- Filter leads with exclusive: true
- Verify only seller's exclusive leads returned
- Check sold status (should be sold to only one buyer)

### 2.4 Get Leads for Specific Buyer

**Endpoint:** `GET /api/leads/getSpecialbuyer`

#### Test Scenarios:

- Admin/Seller views leads assigned to specific buyer
- Filter by buyerId
- Show assignment history
- Display purchase history

---

## 3. Lead Updates

### 3.1 Update Lead

**Endpoint:** `PUT /api/leads`

#### Test Scenarios:

##### 3.1.1 Update Lead Information

- **Updatable Fields:**
  - name, email, phone, company
  - industry
  - location (city, state, country, zipCode, address)
  - status
  - exclusive, shareNumber
  - unit (price)
  - custom fields array

##### 3.1.2 Update Lead Status

**Status Transitions:**

- new → available (marketplace listing)
- new → assigned (assigned to buyer)
- assigned → sold (buyer accepts)
- assigned → available (buyer rejects)
- - → qualified (manual qualification)
- - → unqualified (disqualified)
- sold → transferred (transferred to another buyer)

##### 3.1.3 Field Validation on Update

- Cannot change readonly fields (\_id, createdAt, userId)
- Email format validation
- Phone format validation
- Status transition validation
- Update timestamp (updatedAt) automatic

##### 3.1.4 Partial Updates

- Update only specific fields
- Other fields remain unchanged
- Verify selective update

### 3.2 Lead Enrichment

- Add missing contact information
- Update company details
- Add social media profiles
- Update industry classification
- Re-trigger AI assessment after enrichment

---

## 4. Lead Assignment & Distribution

### 4.1 Distribution Methods

#### 4.1.1 Manual Distribution

**distributionMethod:** "manual"

##### Test Scenarios:

- **Seller Manual Assignment:**
  1. Seller selects lead
  2. Choose buyer from list
  3. Optionally add notes
  4. Assign lead
  5. Verify assignedTo array updated
  6. Buyer notified
  7. Lead status → "assigned"
  8. accepted: false, rejected: false

#### 4.1.2 Automatic Distribution (Round Robin)

**distributionMethod:** "round_robin"

##### Test Scenarios:

- **Basic Round Robin:**
  1. New lead received
  2. Auto-assign enabled (autoAssignLeads: true)
  3. System finds next buyer in rotation
  4. Check lastAssignedIndex incremented
  5. Verify buyer qualification matching
  6. Lead assigned to buyer
  7. Buyer notified
  8. Verify rotation continues correctly

- **Industry-Specific Round Robin:**
  1. Lead has specific industry
  2. System uses industryRoundRobinIndex map
  3. Rotates among buyers interested in that industry
  4. Fair distribution per industry

- **Round Robin Rules:**
  - Only active buyers (status: "active", isActive: true)
  - Buyer not over maxLeadsPerDay limit
  - Buyer within budget limits (budgetCapType constraints)
  - Working hours check (if acceptOnlyDuringBusinessHours: true)
  - Not in vacation mode
  - Matches lead preferences

#### 4.1.3 Marketplace Distribution

**distributionMethod:** "marketplace"

##### Test Scenarios:

- **Send to Marketplace:**
  1. New lead created
  2. distributionMode: "marketplace"
  3. Lead status → "available"
  4. Listed on marketplace
  5. Visible to qualified buyers
  6. First-come-first-served purchase

- **Hybrid Mode (Both):**
  1. distributionMode: "both"
  2. Check aiQualityScore
  3. If score <= aiQualityThreshold: auto-assign
  4. If score > aiQualityThreshold: send to marketplace
  5. Test threshold values (default 50)

### 4.2 Assign Exclusive Lead

**Endpoint:** `POST /api/leads/assignExclusiveLead`

#### Test Scenarios:

- Select buyer(s) for exclusive lead
- Exclusive lead assignment rules:
  - Can only be assigned to one buyer
  - Cannot be shared
  - Higher pricing
- Verify exclusive flag enforced
- Test rejection handling

### 4.3 Auto-Assignment Service

**Module:** `lib/leadAssignmentService.ts`

#### Test Scenarios:

##### Test Daily Limits:

- Seller maxAutoAssignPerDay enforcement
- currentAutoAssignedToday counter
- lastAutoAssignResetDate daily reset
- Buyer maxLeadsPerDay enforcement

##### Test Qualification Matching:

- Industry matching (buyer.leadPreferences.industries)
- Location matching (buyer.serviceLocations)
- Quality score minimum (buyer.qualificationScoreMinimum)
- Budget availability

---

## 5. Lead Purchase (Buyer)

### 5.1 Purchase Lead from Marketplace

**Endpoint:** `POST /api/buyers/buyerpurchaselead`

#### Test Scenarios:

##### 5.1.1 Successful Purchase

- **Steps:**
  1. Buyer views available leads
  2. Select lead to purchase
  3. Verify unit price displayed
  4. Check wallet balance sufficient
  5. Click "Purchase Lead"
  6. Confirm purchase
  7. Deduct credits from wallet
  8. Add to purchaseHistory
  9. Update lead soldTo array
  10. Increment soldCount
  11. Update lead status (if fully sold)
  12. Buyer receives lead details
  13. Seller credited (transaction)
  14. Purchase confirmation email sent

##### 5.1.2 Insufficient Balance

- Attempt purchase with low balance
- Expected: Error message "Insufficient funds"
- Prompt to buy more credits
- No lead access granted

##### 5.1.3 Lead No Longer Available

- Lead sold out between viewing and purchase
- Expected: Error "Lead no longer available"
- Offer similar leads

##### 5.1.4 Exclusive Lead Purchase

- Purchase exclusive lead
- Verify only one sale allowed
- Lead removed from marketplace after purchase
- Higher price charged

##### 5.1.5 Shared Lead Purchase

- Purchase shared lead
- Verify shareNumber limit
- Lead remains available until shareNumber reached
- Track individual purchasers in soldTo array

### 5.2 Fetch Purchased Leads (Buyer)

**Endpoint:** `GET /api/buyers/fetchleadforbuyer`

#### Test Scenarios:

- View all purchased leads
- Filter by purchase date
- Filter by industry
- Filter by quality level
- Show full lead details after purchase
- Access contact information

---

## 6. Lead Assignment Acceptance/Rejection (Buyer)

### 6.1 Accept or Reject Assigned Lead

**Endpoint:** `POST /api/buyers/acceptOrRejectlead`

#### Test Scenarios:

##### 6.1.1 Accept Lead

- **Steps:**
  1. Buyer views assigned leads: `GET /api/buyers/getAssignedLeads`
  2. Review lead details
  3. Click "Accept"
  4. Deduct credits from wallet
  5. Update assignedTo.accepted: true
  6. Add to purchaseHistory
  7. Lead status → "sold"
  8. Seller notified and credited
  9. Lead details fully accessible

##### 6.1.2 Reject Lead

- **Steps:**
  1. View assigned lead
  2. Click "Reject"
  3. Optionally provide rejection reason
  4. Update assignedTo.rejected: true
  5. No charge to buyer
  6. Lead status → "available" (back to marketplace)
  7. Seller notified
  8. Lead available for reassignment

##### 6.1.3 Auto-Rejection (Timeout)

- Assigned lead not accepted within time limit (e.g., 24 hours)
- Automatic rejection
- Lead back to marketplace
- Buyer notified of expiration

### 6.2 Get Assigned Leads (Buyer)

**Endpoint:** `GET /api/buyers/getAssignedLeads`

#### Test Scenarios:

- View all leads assigned to buyer
- Filter by status (pending, accepted, rejected)
- Show assignment date
- Display seller notes
- Show expiration time

---

## 7. Lead Rejection & Maintenance

### 7.1 Reject Lead (Seller)

**Endpoint:** `POST /api/leads/reject`

#### Test Scenarios:

- **Seller Rejects Own Lead:**
  1. Mark lead as unqualified
  2. Remove from marketplace
  3. Archive lead
  4. Optional: refund buyers (if already sold)

### 7.2 Fix Marketplace Leads (Maintenance)

**Endpoints:**

- `POST /api/maintenance/fix-marketplace-leads` (execute fix)
- `GET /api/maintenance/fix-marketplace-leads` (preview fix)

#### Test Scenarios:

- **Data Integrity Check:**
  - Find leads with inconsistent status
  - Fix sold/available mismatches
  - Correct shareNumber vs soldCount
  - Repair assignedTo inconsistencies
- **Preview Mode (GET):**
  - Show issues found
  - Display proposed fixes
  - No data changes
- **Execute Mode (POST):**
  - Apply fixes
  - Log all changes
  - Summary of corrections

---

## 8. Lead Filtering & Search

### 8.1 Advanced Filtering

**Endpoint:** `POST /api/filter-lead`

#### Test Scenarios:

##### 8.1.1 Multi-Criteria Filter

- **Filter Combinations:**
  - Industry + Location
  - Quality Level + Date Range
  - Status + Price Range
  - Exclusive + Industry

##### 8.1.2 Saved Searches

**Endpoint:** `POST /api/searches` (save), `GET /api/searches` (retrieve)

- Create saved search
- Name the search
- Apply saved filters
- Update saved search
- Delete saved search: `DELETE /api/searches`

### 8.2 Search Functionality

#### Test Search Types:

- **Full-text search:**
  - Name, email, phone, company
  - Custom field content
  - Notes/comments
- **Fuzzy matching:**
  - Typo tolerance
  - Similar names
- **Advanced operators:**
  - AND/OR logic
  - Exact phrase matching
  - Wildcards

---

## 9. Lead Follow-Up & Activities

### 9.1 Follow-Up Tracking

#### Test Scenarios (followUps array):

- **Add Follow-Up:**
  - Date of follow-up
  - Method: call, email, message
  - Outcome: contacted, no-response, not-interested
- **View Follow-Up History:**
  - Chronological list
  - Filter by method
  - Filter by outcome
- **Schedule Next Follow-Up:**
  - Set reminder date
  - Notification on due date

---

## 10. Lead Calls Integration

### 10.1 Call Tracking

#### Test Scenarios (calls array):

- Lead has associated call records
- Link call IDs to lead
- View call history for lead
- Play call recordings (if available)
- View call transcriptions
- Call analytics per lead

**Note:** Detailed call testing in Call Tracking Test Plan

---

## 11. Lead Transfer

### 11.1 Transfer Lead to Another Buyer

#### Test Scenarios:

- **Initiate Transfer:**
  1. Seller/Admin selects sold lead
  2. Choose new buyer
  3. Optionally refund original buyer
  4. Transfer ownership
  5. Update soldTo array
  6. Lead status → "transferred"
  7. Both buyers notified
- **Transfer Reasons:**
  - Lead quality issue
  - Buyer request
  - Territory reassignment
  - Service capability change

---

## 12. Lead Deletion

### 12.1 Delete Lead

**Endpoint:** `DELETE /api/leads`

#### Test Scenarios:

##### 12.1.1 Soft Delete (Archive)

- Mark lead as deleted
- Hide from active lists
- Preserve for audit/reporting
- Recoverable

##### 12.1.2 Hard Delete (Permanent)

- Permanently remove lead
- Admin only
- Cannot be recovered
- Compliance (GDPR right to erasure)
- Cascade delete related records

##### 12.1.3 Bulk Delete

- Select multiple leads
- Confirm bulk deletion
- Progress indicator
- Summary of deleted leads

##### 12.1.4 Delete Validation

- Cannot delete sold leads (without admin override)
- Prevent accidental deletion
- Require confirmation
- Audit log entry

---

## 13. Lead Analytics & Reporting

### 13.1 Lead Statistics

#### Test Metrics:

- **Volume Metrics:**
  - Total leads created
  - Leads by status
  - Leads by quality level
  - Leads by source
  - Leads by industry
- **Conversion Metrics:**
  - Lead-to-sale conversion rate
  - Average time to sale
  - Average lead value
  - Quality score distribution
- **Performance Metrics:**
  - Leads created per day/week/month
  - Peak lead times
  - Response time averages
  - Assignment acceptance rate

### 13.2 Lead Export

#### Test Scenarios:

- **Export to CSV:**
  - All leads
  - Filtered leads
  - Selected fields only
  - Date range export
- **Export to Excel:**
  - Formatted workbook
  - Multiple sheets (by status, industry)
  - Charts and summaries
- **API Export:**
  - JSON format
  - XML format
  - Webhook delivery

---

## 14. Lead Ownership & Permissions

### 14.1 Seller Permissions

#### Test Scenarios:

- Seller can only view own leads (userId filter)
- Cannot view other sellers' leads
- Can create leads
- Can update own leads
- Can delete own leads
- Can assign to buyers they manage

### 14.2 Buyer Permissions

#### Test Scenarios:

- Buyer can view marketplace leads (limited info)
- Can view assigned leads (full details after acceptance)
- Can view purchased leads (full access)
- Cannot create leads
- Cannot update leads (except status via accept/reject)
- Cannot delete leads

### 14.3 Admin Permissions

#### Test Scenarios:

- View all leads regardless of owner
- Full CRUD operations
- Transfer lead ownership
- Override restrictions
- Bulk operations
- Data fixes and maintenance

---

## 15. Lead Notifications

### 15.1 Seller Notifications

#### Test Scenarios:

- **New Lead Created:**
  - Email notification
  - Dashboard notification
  - Push notification (if enabled)
- **Lead Purchased:**
  - Buyer details
  - Purchase amount
  - Transaction details
- **Lead Rejected:**
  - Buyer rejection
  - Rejection reason
  - Re-listing notification

### 15.2 Buyer Notifications

#### Test Scenarios:

- **New Lead Available:**
  - Matching preferences
  - Quality level alert
- **Lead Assigned:**
  - Assignment notification
  - Lead preview
  - Acceptance deadline
- **Lead Expiring:**
  - Assignment expiring soon
  - Reminder to accept/reject

---

## 16. Lead Conversation Integration

### 16.1 Chatbot Lead Capture

#### Test Scenarios (conversationId field):

- Lead created from chatbot conversation
- conversationId links to chat
- View conversation history
- Continue conversation
- Convert conversation to lead

**Note:** Detailed testing in Chatbot Test Plan

---

## 17. Custom Fields Management

### 17.1 Dynamic Fields

#### Test Scenarios (fields array):

- **Add Custom Field:**
  - Field ID
  - Field label
  - Field value (any type)
- **Field Types:**
  - Text
  - Number
  - Date
  - Boolean
  - Select (dropdown)
  - Multi-select
- **Field Validation:**
  - Required fields
  - Type validation
  - Format validation
  - Range validation

---

## 18. Lead Exclusivity & Sharing

### 18.1 Exclusive Leads

#### Test Scenarios:

- **exclusive: true**
  - Can only be sold once
  - Higher pricing
  - Premium positioning
  - Immediate removal after sale
  - Refund guarantee (if applicable)

### 18.2 Shared Leads

#### Test Scenarios:

- **shared: true, shareNumber: N**
  - Can be sold N times
  - Lower per-unit pricing
  - Remains visible until quota met
  - Track all purchasers in soldTo array
  - soldCount <= shareNumber validation

---

## 19. Lead Quality & Validation

### 19.1 Data Quality Checks

#### Test Scenarios:

- **Email Validation:**
  - Format check
  - Domain validation
  - Disposable email detection
  - Email verification (optional)
- **Phone Validation:**
  - Format check (E.164)
  - Country code validation
  - Phone number verification (optional)
- **Company Validation:**
  - Company lookup
  - Industry classification
  - Company size estimation

### 19.2 Duplicate Detection

#### Test Scenarios:

- Detect duplicate email
- Detect duplicate phone
- Fuzzy name matching
- Merge duplicate leads
- Prevent duplicate imports

---

## 20. Performance & Scalability

### 20.1 Performance Testing

#### Test Scenarios:

- **High Volume:**
  - 10,000 leads in database
  - 100,000 leads in database
  - 1,000,000 leads in database
- **Concurrent Operations:**
  - Multiple simultaneous imports
  - Concurrent purchases
  - Parallel assignments
- **Query Performance:**
  - Complex filter performance
  - Full-text search speed
  - Export large datasets
  - Pagination efficiency

### 20.2 Database Optimization

#### Test Scenarios:

- Verify indexes on:
  - userId
  - status
  - qualityLevel
  - industry
  - location fields
  - createdAt
  - email, phone (for duplicates)
- Query execution plans
- Index usage monitoring

---

## Testing Checklist

### Pre-Testing Setup

- [ ] Database seeded with test leads
- [ ] Multiple seller accounts created
- [ ] Multiple buyer accounts created
- [ ] Forms configured for auto-lead capture
- [ ] AI quality scoring configured
- [ ] Notification system enabled

### Functional Testing

- [ ] Lead CRUD operations
- [ ] AI quality assessment
- [ ] Manual distribution
- [ ] Auto-assignment (round robin)
- [ ] Marketplace listing
- [ ] Lead purchase flow
- [ ] Accept/reject workflow
- [ ] Lead import
- [ ] Lead export
- [ ] Follow-up tracking

### Integration Testing

- [ ] Form submission integration
- [ ] Chatbot integration
- [ ] Call tracking integration
- [ ] Payment integration
- [ ] Notification system
- [ ] AI scoring service

### Security Testing

- [ ] Access control (RBAC)
- [ ] Data privacy (PII protection)
- [ ] Seller isolation (can't see others' leads)
- [ ] Buyer restrictions
- [ ] Admin override safety

### Performance Testing

- [ ] Large dataset handling
- [ ] Import performance
- [ ] Search performance
- [ ] Filter performance
- [ ] Export performance

---

## Test Data Requirements

### Sample Leads:

```json
{
  "high_quality_lead": {
    "name": "John Smith",
    "email": "john.smith@company.com",
    "phone": "+14155551234",
    "company": "ABC Corporation",
    "industry": "Technology",
    "location": {
      "city": "San Francisco",
      "state": "CA",
      "country": "USA",
      "zipCode": "94102"
    },
    "aiQualityScore": 15,
    "qualityLevel": "High",
    "exclusive": true,
    "unit": 50
  },
  "low_quality_lead": {
    "name": "Test User",
    "email": "test@example.com",
    "aiQualityScore": 85,
    "qualityLevel": "Low",
    "exclusive": false,
    "shared": true,
    "shareNumber": 5,
    "unit": 5
  }
}
```

---

## Automation Recommendations

### High Priority for Automation

1. CRUD operations
2. AI quality assessment
3. Purchase workflow
4. Accept/reject workflow
5. Assignment logic
6. Status transitions
7. Duplicate detection

### Manual Testing Recommended

1. UI/UX validation
2. Complex filter combinations
3. Import CSV edge cases
4. AI quality reasonableness
5. Email content review

---

## Sign-off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| QA Lead       |      |      |           |
| Product Owner |      |      |           |
| Dev Lead      |      |      |           |
