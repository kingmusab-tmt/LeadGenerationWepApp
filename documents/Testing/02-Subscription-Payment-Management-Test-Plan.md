# Subscription & Payment Management Test Plan

## Overview

This document outlines all subscription, payment, billing, and financial transaction workflows for comprehensive testing of the Lead Generation Web App.

---

## 1. Subscription Management

### 1.1 View Subscription Tiers

**Endpoint:** `GET /api/subscriptions/tiers`

#### Test Scenarios:

##### 1.1.1 List All Available Tiers

- **Steps:**
  1. Navigate to subscription page
  2. Fetch all available tiers
- **Expected Results:**
  - All tiers displayed with pricing
  - Features list for each tier
  - Clear tier comparison
  - Current tier highlighted (if subscribed)

##### 1.1.2 Tier Information Validation

Test each tier displays:

- Tier name
- Monthly/Annual pricing
- Feature list
- Limits (leads, users, storage, etc.)
- Recommended badge (if applicable)
- Free trial availability

### 1.2 Get Tiers Configuration

**Endpoint:** `GET /api/tiers`

#### Test Scenarios:

- Fetch tier configuration
- Verify tier hierarchy
- Check upgrade/downgrade paths
- Validate pricing structure

### 1.3 Check Subscription Status

**Endpoint:** `GET /api/subscriptions/check`

#### Test Scenarios:

##### 1.3.1 Active Subscription

- **Verify Fields:**
  - Subscription ID
  - Current tier
  - Start date
  - End date/renewal date
  - Status: "active"
  - Auto-renewal status
  - Payment method

##### 1.3.2 Expired Subscription

- Navigate to app with expired subscription
- Verify redirect to renewal page
- Check feature restrictions applied
- Test grace period (if applicable)

##### 1.3.3 Trial Subscription

- Verify trial status
- Check trial expiration date
- Test trial-to-paid conversion

##### 1.3.4 No Subscription

- New user without subscription
- Verify limited feature access
- Check upgrade prompts

### 1.4 Subscription Limits

**Endpoint:** `GET /api/subscriptions/limits`

#### Test Scenarios:

##### 1.4.1 Check Current Usage vs Limits

- **Test Limits:**
  - Maximum leads per month
  - Maximum buyers
  - Maximum forms
  - Maximum API calls
  - Storage limits
  - User seats
  - Email/SMS quota

##### 1.4.2 Limit Enforcement

- Attempt to exceed lead limit
- Try to create buyer beyond limit
- Test storage limit enforcement
- Verify upgrade prompt on limit reach

### 1.5 Update Subscription

**Endpoint:** `POST /api/subscriptions/update`

#### Test Scenarios:

##### 1.5.1 Upgrade Subscription

- **Steps:**
  1. Select higher tier
  2. Confirm upgrade
  3. Process payment (prorated if mid-cycle)
  4. Verify new tier activated
  5. Check new limits applied immediately
- **Expected Results:**
  - Prorated charge calculated correctly
  - Subscription upgraded immediately
  - Email confirmation sent
  - Invoice generated

##### 1.5.2 Downgrade Subscription

- **Steps:**
  1. Select lower tier
  2. Acknowledge feature loss
  3. Confirm downgrade
  4. Verify scheduled for next billing cycle
- **Expected Results:**
  - Downgrade scheduled (not immediate)
  - Credit issued for unused time (if applicable)
  - Notification email sent
  - Current features available until cycle end

##### 1.5.3 Change Billing Cycle

- Switch from monthly to annual
- Switch from annual to monthly
- Verify pricing adjustment
- Check refund/charge calculation

##### 1.5.4 Cancel Subscription

- **Steps:**
  1. Select cancel option
  2. Provide cancellation reason (optional)
  3. Confirm cancellation
  4. Verify access until period end
- **Expected Results:**
  - Auto-renewal disabled
  - Access maintained until expiration
  - Cancellation confirmation email
  - Downgrade to free tier scheduled

### 1.6 Subscription Model Integration

**Model:** User subscription schema field

#### Test Scenarios:

- **Subscription Fields (per User schema):**
  - stripeCustomerId
  - stripeAccountId
  - stripeOnboarded
  - subscription object with tier details

---

## 2. Payment Processing

### 2.1 Stripe Integration

#### 2.1.1 Stripe Customer Creation

**Endpoint:** `POST /api/payments/stripe/create-connected-account`

##### Test Scenarios:

- Create Stripe customer on first payment
- Verify stripeCustomerId stored
- Test customer update on profile change
- Handle duplicate customer creation

#### 2.1.2 Stripe Checkout

**Endpoint:** `POST /api/payments/stripe/stripecheckoutapi`

##### Test Scenarios:

**Successful Payment:**

1. Select subscription tier
2. Click "Subscribe Now"
3. Redirect to Stripe Checkout
4. Enter valid card details:
   - Card: 4242 4242 4242 4242
   - Exp: Any future date
   - CVC: Any 3 digits
5. Complete payment
6. Verify redirect back to app
7. Check subscription activated
8. Verify webhook processed

**Failed Payment:**

- Test declined card: 4000 0000 0000 0002
- Test insufficient funds: 4000 0000 0000 9995
- Test expired card
- Test invalid CVC
- Verify error messages
- Check no subscription created

**Payment Methods:**

- Credit card
- Debit card
- Digital wallets (if enabled)
- Bank transfers (if enabled)

#### 2.1.3 Stripe Onboarding (for Sellers)

**Endpoint:** `POST /api/payments/stripe/onboard`

##### Test Scenarios:

1. Seller initiates Stripe onboarding
2. Complete Stripe Connect flow
3. Verify stripeAccountId stored
4. Check stripeOnboarded flag set to true
5. Test account verification status
6. Verify payout capability enabled

#### 2.1.4 Stripe Account Status

**Endpoint:** `GET /api/payments/stripe/account-status`

##### Test Scenarios:

- Check connected account status
- Verify capabilities (card_payments, transfers)
- Check requirements (pending, overdue)
- Test account restrictions

#### 2.1.5 Stripe Webhooks

**Endpoint:** `POST /api/payments/stripe/stripewebhook`

##### Test Webhook Events:

**Subscription Events:**

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`

**Payment Events:**

- `payment_intent.succeeded`
- `payment_intent.failed`
- `payment_intent.created`
- `charge.succeeded`
- `charge.failed`
- `charge.refunded`

**Invoice Events:**

- `invoice.paid`
- `invoice.payment_failed`
- `invoice.upcoming`

**Test Scenarios for Each Event:**

1. Trigger webhook from Stripe dashboard
2. Verify signature validation
3. Check database update
4. Verify email notification sent
5. Test idempotency (duplicate events)

#### 2.1.6 Stripe Transfers

**Endpoint:** `POST /api/payments/stripe/transfer`

##### Test Scenarios:

- Transfer funds to seller account
- Verify transfer amount
- Check transfer status
- Test transfer reversals
- Verify transfer webhooks

### 2.2 General Payment Operations

#### 2.3.1 Process Payment

**Endpoint:** `POST /api/payments/route`

##### Test Scenarios:

- Process one-time payment
- Process recurring payment
- Verify payment gateway selection
- Test payment retry logic
- Check payment confirmation

#### 2.3.2 Payment Status Check

**Endpoint:** `GET /api/payments/status`

##### Test Scenarios:

- Check payment by transaction ID
- Verify payment status: pending, completed, failed, refunded
- Test status update notifications

---

## 3. Refunds & Disputes

### 3.1 Process Refund

**Endpoint:** `POST /api/payments/refund`

#### Test Scenarios:

##### 3.1.1 Full Refund

- **Steps:**
  1. Admin initiates full refund
  2. Specify transaction ID
  3. Confirm refund
  4. Verify refund processed
  5. Check subscription downgraded
  6. Verify refund notification sent
- **Expected Results:**
  - Full amount refunded
  - Subscription cancelled/downgraded
  - Email sent to customer
  - Transaction marked as refunded

##### 3.1.2 Partial Refund

- Process partial refund
- Verify correct amount refunded
- Check subscription remains active
- Test prorated adjustment

##### 3.1.3 Refund Validation

- Test refund on old transaction (refund window)
- Attempt duplicate refund
- Test refund on already-refunded payment
- Verify insufficient balance handling

---

## 4. Invoicing

### 4.1 Invoice Generation

#### 4.1.1 List Invoices

**Endpoint:** `GET /api/invoices`

##### Test Scenarios:

- Fetch all user invoices
- Filter by date range
- Filter by status (paid, pending, overdue)
- Sort by date, amount
- Pagination testing

#### 4.1.2 Create Invoice

**Endpoint:** `POST /api/invoices`

##### Test Scenarios:

- **Create Subscription Invoice:**
  1. Subscription renewal triggers invoice
  2. Verify invoice created automatically
  3. Check invoice number generated (sequential)
  4. Verify line items correct
  5. Check totals calculated (subtotal, tax, total)
  6. Test tax calculation (if applicable)
- **Create Manual Invoice (Admin):**
  1. Admin creates custom invoice
  2. Add line items
  3. Set due date
  4. Assign to customer
  5. Send invoice
  6. Verify email sent

#### 4.1.3 View Invoice Details

**Endpoint:** `GET /api/invoices/[id]`

##### Test Scenarios:

- Fetch invoice by ID
- Verify all fields present:
  - Invoice number
  - Issue date
  - Due date
  - Bill to (customer details)
  - Bill from (company details)
  - Line items
  - Subtotal
  - Tax
  - Total
  - Payment status
  - Payment date (if paid)
  - Payment method

#### 4.1.4 Update Invoice

**Endpoint:** `PUT /api/invoices/[id]`

##### Test Scenarios:

- Update invoice before payment
- Modify line items
- Change due date
- Update customer info
- Test validation: cannot update paid invoice
- Verify update notifications

#### 4.1.5 Delete Invoice

**Endpoint:** `DELETE /api/invoices/[id]`

##### Test Scenarios:

- Delete draft invoice
- Attempt to delete paid invoice (should fail)
- Verify soft delete vs hard delete
- Check cascade operations

#### 4.1.6 Invoice Actions

**Endpoint:** `POST /api/invoices/[id]/actions`

##### Test Actions:

**Send Invoice:**

- Email invoice to customer
- Verify email content and PDF attachment
- Test reminder emails

**Mark as Paid:**

- Manually mark invoice paid
- Record payment date
- Update payment method
- Verify notification sent

**Void Invoice:**

- Cancel/void invoice
- Update status
- Prevent payment processing

**Duplicate Invoice:**

- Create copy of existing invoice
- Verify new invoice number
- Test data inheritance

#### 4.1.7 Download Invoice PDF

**Endpoint:** `GET /api/invoices/[id]/pdf`

##### Test Scenarios:

- Generate PDF invoice
- Verify PDF formatting
- Check all data rendered correctly
- Test PDF download
- Verify logo and branding
- Test multi-page invoices

#### 4.1.8 Invoice Statistics

**Endpoint:** `GET /api/invoices/stats`

##### Test Scenarios:

- Total invoiced amount
- Total paid amount
- Total outstanding amount
- Average invoice value
- Invoice count by status
- Revenue trends (monthly, yearly)

---

## 5. Transaction Management

### 5.1 View Transactions

**Endpoints:**

- `GET /api/payments/transactions`
- `GET /api/buyers/fetchTransactions` (buyer-specific)

#### Test Scenarios:

##### 5.1.1 Transaction List

- Fetch all transactions for user
- Display transaction details:
  - Transaction ID
  - Date/time
  - Type (payment, refund, credit, debit)
  - Amount
  - Currency
  - Status
  - Payment method
  - Related invoice/subscription
  - Description

##### 5.1.2 Transaction Filtering

- Filter by date range
- Filter by type
- Filter by status
- Filter by payment method
- Filter by amount range

##### 5.1.3 Transaction Search

- Search by transaction ID
- Search by invoice number
- Search by description
- Full-text search

##### 5.1.4 Export Transactions

- Export to CSV
- Export to Excel
- Export to PDF
- Date range export
- Format validation

---

## 6. Credit Management

### 6.1 Buyer Credit System

#### 6.1.1 Buy Credits

**Endpoint:** `POST /api/buyers/buyerbuycredit`

##### Test Scenarios:

**Purchase Credits:**

1. Select credit package
2. Enter quantity
3. View total cost
4. Confirm purchase
5. Select payment method
6. Complete payment
7. Verify credits added to wallet
8. Check transaction recorded
9. Verify receipt emailed

**Credit Packages:**

- Test various package sizes
- Verify volume discounts
- Check promotional pricing
- Test minimum purchase limits

#### 6.1.2 Check Wallet Balance

**Endpoint:** `GET /api/buyers/walletBalance`

##### Test Scenarios:

- View current credit balance
- Check walletUnit field
- Verify balance accuracy
- Test negative balance prevention (min: 0)

#### 6.1.3 Manual Credit Adjustment (Admin/Seller)

**Endpoint:** `POST /api/sellers/manual-credit`

##### Test Scenarios:

**Add Credits:**

1. Admin navigates to user account
2. Select "Add Credits"
3. Enter amount
4. Add reason/note
5. Confirm addition
6. Verify balance updated
7. Check audit log entry
8. Verify notification sent

**Deduct Credits:**

1. Select "Deduct Credits"
2. Enter amount
3. Add reason
4. Confirm deduction
5. Verify balance updated
6. Check audit trail

**Validation:**

- Test insufficient balance deduction
- Verify negative balance prevention
- Test maximum adjustment limits
- Ensure admin authorization

### 6.2 Seller Credit Setup

**Endpoint:** `POST /api/settings/creditsetupapi`

#### Test Scenarios:

- Configure credit pricing
- Set credit packages
- Define volume discounts
- Set minimum purchase
- Configure expiration (if applicable)

---

## 7. Payout Management (for Sellers)

### 7.1 Request Payout

**Endpoints:**

- `POST /api/payments/payout/stripe` (Stripe)

#### Test Scenarios:

##### 7.1.1 Stripe Payout

**Steps:**

1. Seller requests payout
2. Verify minimum payout amount met
3. Check Stripe account connected
4. Confirm payout amount
5. Process payout
6. Verify payout status
7. Check balance deducted
8. Verify payout notification

**Validations:**

- Minimum payout threshold
- Maximum payout per period
- Available balance check
- Account verification status
- Payout frequency limits

##### 7.1.2 Payout History

- View all payouts
- Check payout status
- Filter by date/status
- Export payout report

### 7.2 Payout Settings

- Configure payout method
- Set default payout account
- Define payout schedule (weekly, monthly)
- Set automatic payout threshold
- Configure payout notifications

---

## 8. Pricing Configuration

### 8.1 Unit Pricing Setup

**Endpoint:** `POST /api/settings/unitsettingapi`

#### Test Scenarios:

##### 8.1.1 Create Unit Pricing

**Methods:** POST

- Define pricing tier name
- Set unit price
- Set quantity range
- Configure effective date
- Activate pricing

##### 8.1.2 Read Unit Pricing

**Methods:** GET

- Fetch all pricing tiers
- Get specific pricing tier
- View active pricing
- Check pricing history

##### 8.1.3 Update Unit Pricing

**Methods:** PUT

- Modify existing pricing
- Update price amount
- Change quantity ranges
- Set expiration date
- Verify no retroactive changes

##### 8.1.4 Delete Unit Pricing

**Methods:** DELETE

- Remove pricing tier
- Verify dependent records
- Test soft delete
- Prevent deletion of active pricing

### 8.2 Lead Pricing by Quality

#### Test Scenarios (User model fields):

- **High Quality Leads:**
  - Set leadPricing.high (min 0)
  - Test price application
  - Verify buyer charges
- **Medium Quality Leads:**
  - Set leadPricing.medium (min 0)
  - Test differential pricing
- **Low Quality Leads:**
  - Set leadPricing.low (min 0)
  - Verify discount pricing

---

## 9. Billing & Payment Security

### 9.1 PCI Compliance

#### Test Scenarios:

- Verify no card data stored locally
- Check tokenization implementation
- Test secure payment forms
- Verify SSL/TLS encryption
- Check PCI DSS compliance

### 9.2 Payment Security

#### Test Validations:

- Card number validation (Luhn algorithm)
- CVV validation
- Expiration date validation
- Billing address verification
- 3D Secure implementation (if applicable)

### 9.3 Fraud Prevention

#### Test Scenarios:

- Velocity checks (multiple transactions)
- Geolocation validation
- Device fingerprinting
- Risk scoring
- Manual review triggers

---

## 10. Subscription Trial Management

### 10.1 Free Trial

#### Test Scenarios:

- **Start Free Trial:**
  - Sign up for trial
  - No payment required
  - Full feature access
  - Trial period: 7/14/30 days
- **Trial Expiration:**
  - Access during trial
  - Warning before expiration (3 days)
  - Access restriction on expiry
  - Upgrade prompt
- **Trial to Paid Conversion:**
  - Convert before expiry
  - Automatic conversion (if card on file)
  - Credit card capture timing

### 10.2 Trial Abuse Prevention

#### Test Scenarios:

- One trial per email
- Email verification required
- Card required (but not charged)
- IP address tracking
- Device fingerprinting

---

## 11. Payment Notifications

### 11.1 Email Notifications

#### Test Email Templates:

- **Successful Payment:**
  - Payment confirmation
  - Receipt/invoice attached
  - Subscription details
- **Failed Payment:**
  - Payment failure notice
  - Retry instructions
  - Update payment method link
- **Upcoming Renewal:**
  - Reminder 7 days before
  - Subscription details
  - Cancel/modify option
- **Subscription Cancelled:**
  - Cancellation confirmation
  - Access end date
  - Re-subscribe option
- **Refund Processed:**
  - Refund confirmation
  - Refund amount
  - Timeline for credit

### 11.2 In-App Notifications

#### Test Dashboard Alerts:

- Payment overdue
- Card expiring soon
- Subscription expiring
- Credits low
- Payout processed

---

## 12. Multi-Currency Support (if applicable)

### 12.1 Currency Management

#### Test Scenarios:

- Display pricing in user currency
- Currency conversion rates
- Payment in local currency
- Invoicing in user currency
- Exchange rate updates
- Historical rate storage

---

## 13. Tax Management

### 13.1 Tax Calculation

#### Test Scenarios:

- Determine tax jurisdiction
- Calculate sales tax/VAT
- Apply tax to invoices
- Display tax breakdown
- Store tax information
- Tax exemption handling

### 13.2 Tax Reporting

#### Test Scenarios:

- Generate tax reports
- Export for accounting
- VAT MOSS reporting (EU)
- Sales tax by jurisdiction
- Tax remittance reports

---

## 14. Edge Cases & Testing

### 14.1 Payment Edge Cases

#### Test Scenarios:

- **Concurrent Payments:**
  - Multiple payment attempts
  - Race conditions
  - Duplicate prevention
- **Subscription Changes Mid-Cycle:**
  - Upgrade during billing cycle
  - Downgrade scheduling
  - Proration accuracy
- **Payment Recovery:**
  - Retry failed payments
  - Dunning management
  - Grace period handling
- **Zero-Amount Transactions:**
  - Free tier to free tier
  - 100% discount codes
  - Refund equals payment

### 14.2 Error Handling

#### Test Scenarios:

- Gateway timeout
- Network failure
- Invalid response
- Webhook delivery failure
- Duplicate webhook
- Out-of-order webhooks

---

## Testing Checklist

### Pre-Testing Setup

- [ ] Stripe test mode configured
- [ ] Test cards available
- [ ] Webhook endpoints accessible
- [ ] Email notifications configured

### Functional Testing

- [ ] All subscription flows
- [ ] All payment methods
- [ ] Refund processing
- [ ] Invoice generation
- [ ] Transaction tracking
- [ ] Credit management
- [ ] Payout processing

### Integration Testing

- [ ] Stripe integration
- [ ] Webhook handling
- [ ] Email notifications
- [ ] Tax calculation
- [ ] Currency conversion

### Security Testing

- [ ] PCI compliance
- [ ] Data encryption
- [ ] Secure transmission
- [ ] Token handling
- [ ] Fraud prevention

### Performance Testing

- [ ] High-volume transactions
- [ ] Concurrent payments
- [ ] Webhook processing
- [ ] Report generation

---

## Test Data Requirements

### Test Payment Methods

#### Stripe Test Cards:

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
Expired: 4000 0000 0000 0069
3D Secure: 4000 0027 6000 3184
```

### Test Subscriptions:

```json
{
  "free_tier": {
    "name": "Free",
    "price": 0,
    "features": ["5 leads/month", "1 form"]
  },
  "basic": {
    "name": "Basic",
    "monthly": 29,
    "annual": 290
  },
  "pro": {
    "name": "Professional",
    "monthly": 99,
    "annual": 990
  }
}
```

---

## Automation Recommendations

### High Priority

1. Payment flow end-to-end
2. Subscription lifecycle
3. Webhook processing
4. Refund workflows
5. Invoice generation

### Manual Testing

1. Payment UI/UX
2. 3D Secure flows
3. PDF generation review

---

## Sign-off

| Role     | Name | Date | Signature |
| -------- | ---- | ---- | --------- |
| QA Lead  |      |      |           |
| Finance  |      |      |           |
| Dev Lead |      |      |           |
