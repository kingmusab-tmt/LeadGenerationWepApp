# Admin Dashboard & Management Test Plan

## Overview

This document outlines all administrative features, system management, user management, monitoring, reporting, and admin-specific workflows for comprehensive testing of the Lead Generation Web App.

---

## 1. Admin Dashboard Access

### 1.1 Admin Authentication

#### Test Scenarios:

##### 1.1.1 Admin Login

- Login with admin role user
- Verify admin dashboard redirect
- Check admin-specific navigation menu
- Validate admin permissions applied

##### 1.1.2 Access Control

- **Admin-only routes:**
  - `/admindashboard/*`
  - `/api/admin/*`
- **Test unauthorized access:**
  - Seller attempts admin route → 403 Forbidden
  - Buyer attempts admin route → 403 Forbidden
  - Unauthenticated user → 401 Unauthorized

### 1.2 Admin Navigation

**Path:** `app/admindashboard/`

#### Test sections:

- Dashboard Overview
- User Management
- Lead Management
- Buyer Management
- Seller Management
- Transaction Management
- System Settings
- Reports & Analytics
- Maintenance Tools
- Audit Logs

---

## 2. User Management (Admin)

### 2.1 View All Users

**Endpoint:** `GET /api/users` (admin context)

#### Test Scenarios:

##### 2.1.1 User List

- **Display all users with:**
  - User ID
  - Name
  - Email
  - Role (admin, seller, buyer, user, staff, business-admin)
  - Status (active, suspended)
  - Registration date
  - Last login
  - Subscription status
- **Filters:**
  - Filter by role
  - Filter by status
  - Filter by registration date
  - Search by name/email
- **Actions:**
  - View details
  - Edit user
  - Suspend user
  - Delete user
  - Audit user activity

### 2.2 User Details View

**Endpoint:** `GET /api/admin/users/[id]`

#### Test Scenarios:

- Full user profile
- Activity timeline
- Login history
- Transaction history
- Lead/buyer associations
- Wallet balance
- Subscription details
- Invoices
- Support tickets

### 2.3 Edit User (Admin)

**Endpoint:** `PUT /api/admin/users/[id]`

#### Test Scenarios:

##### 2.3.1 Update User Information

- Change name, email, phone
- Update business details
- Modify user role
- Change status (active/suspended)
- Adjust wallet balance manually
- Override subscription limits

##### 2.3.2 Impersonate User

- Login as user (for support)
- View system from user's perspective
- Exit impersonation
- Audit impersonation events

### 2.4 Suspend/Activate User

#### Test Scenarios:

##### 2.4.1 Suspend User

- Change status to "suspended"
- User cannot login
- Active sessions terminated
- Scheduled actions paused
- User notified (optional)
- Reason logged

##### 2.4.2 Activate User

- Change status to "active"
- User can login again
- Resume normal operations
- Notification sent

### 2.5 Delete User

**Endpoint:** `DELETE /api/admin/users/[id]`

#### Test Scenarios:

- **Soft delete:**
  - Mark as deleted
  - Anonymize data
  - Preserve transactions/leads
- **Hard delete:**
  - Permanent removal (GDPR compliance)
  - Cascade delete associated data
  - Backup before deletion
  - Cannot be undone warning

---

## 3. Lead Management (Admin)

### 3.1 View All Leads

**Endpoint:** `GET /api/admin/leads`

#### Test Scenarios:

- View leads from all sellers
- Filter by seller
- Filter by buyer
- Filter by quality
- Filter by status
- Global search

### 3.2 Lead Actions (Admin)

#### Test Scenarios:

##### 3.2.1 Flag/Unflag Lead

**Endpoint:** `PUT /api/admin/[type]s/[id]/flag`

- Flag lead for review
- Add flag reason
- Assign for investigation
- Unflag after resolution

##### 3.2.2 Override Lead Status

- Change lead status manually
- Override AI quality score
- Reassign lead
- Refund lead purchase

##### 3.2.3 Bulk Lead Operations

- Bulk status update
- Bulk deletion
- Bulk export
- Bulk quality rescore

---

## 4. Buyer Management (Admin)

### 4.1 View All Buyers

#### Test Scenarios:

- List all buyers across all sellers
- Filter by status (new, active, inactive, suspended)
- Filter by registration date
- Search by company/email
- Sort by purchase volume
- Sort by wallet balance

### 4.2 Buyer Performance Monitoring

#### Test Scenarios:

- **Metrics per Buyer:**
  - Total leads purchased
  - Total spent
  - Average lead cost
  - Conversion rate (if tracked)
  - Activity status
  - Last purchase date
  - Wallet balance
  - Budget utilization

### 4.3 Buyer Actions (Admin)

#### Test Scenarios:

- Suspend buyer account
- Activate buyer account
- Adjust wallet balance
- Override purchase limits
- Force-assign leads
- View buyer disputes

---

## 5. Seller Management (Admin)

### 5.1 View All Sellers

#### Test Scenarios:

- List all seller accounts
- View seller stats (leads, revenue, buyers)
- Filter by performance
- Filter by subscription tier

### 5.2 Seller Actions (Admin)

#### Test Scenarios:

- Approve new seller registration
- Verify business details
- Adjust commission rates (if applicable)
- Grant special permissions
- Suspend seller account
- Review seller quality

---

## 6. Transaction & Financial Management

### 6.1 All Transactions View

**Endpoint:** `GET /api/admin/transactions`

#### Test Scenarios:

##### 6.1.1 Transaction List

- View all system transactions
- Filter by type (purchase, refund, payout, credit)
- Filter by status
- Filter by user
- Filter by date range
- Filter by amount range
- Search by transaction ID

##### 6.1.2 Transaction Details

- View complete transaction info
- Seller involved
- Buyer involved
- Lead involved
- Amount
- Payment method
- Status
- Timestamps
- Related invoice

### 6.2 Manual Refunds

**Endpoint:** `POST /api/admin/refunds`

#### Test Scenarios:

- Issue refund to buyer
- Partial or full refund
- Add refund reason
- Option to credit wallet or payment method
- Notify all parties
- Update transaction status
- Create credit note

### 6.3 Manual Credits

**Endpoint:** `POST /api/sellers/manual-credit`

#### Test Scenarios:

- Add credits to buyer/seller wallet
- Deduct credits (adjustments)
- Add reason/notes
- Audit trail
- Notify recipient
- Generate adjustment invoice

### 6.4 Payout Management

#### Test Scenarios:

- View all payout requests
- Approve/reject payouts
- Manual payout processing
- Payout history
- Failed payout handling

### 6.5 Financial Reports

#### Test Scenarios:

- **Revenue Reports:**
  - Total revenue
  - Revenue by seller
  - Revenue by time period
  - Revenue by subscription tier
  - Revenue trends
- **Transaction Reports:**
  - Transaction volume
  - Average transaction value
  - Transaction success rate
  - Payment method breakdown
- **Export Reports:**
  - CSV export
  - PDF reports
  - Scheduled reports (email)

---

## 7. Invoice Management (Admin)

### 7.1 Invoice Overview

**Endpoint:** `GET /api/admin/invoices`

#### Test Scenarios:

- View all invoices (all users)
- Filter by status (paid, pending, overdue)
- Filter by user
- Filter by date
- Aging reports (30, 60, 90 days overdue)

### 7.2 Invoice Actions (Admin)

#### Test Scenarios:

- Create invoice for any user
- Edit any invoice
- Mark invoice as paid manually
- Void invoice
- Send payment reminders
- Generate credit notes

### 7.3 Invoice Statistics

**Endpoint:** `GET /api/invoices/stats` (admin view)

#### Test Scenarios:

- Total invoiced
- Total collected
- Outstanding amount
- Overdue invoices
- Payment trends

---

## 8. Subscription Management (Admin)

### 8.1 View All Subscriptions

#### Test Scenarios:

- List all user subscriptions
- Filter by tier
- Filter by status (active, expired, trial)
- Expiring soon alerts
- Revenue by tier

### 8.2 Subscription Actions (Admin)

#### Test Scenarios:

- Manually upgrade/downgrade user
- Extend subscription
- Cancel subscription
- Grant free trial extension
- Override subscription limits
- Apply promotional pricing

### 8.3 Tier Management

**Endpoint:** `GET /api/tiers` (admin edit)

#### Test Scenarios:

- Create new subscription tier
- Edit tier features
- Edit tier pricing
- Deactivate tier
- Migrate users between tiers

---

## 9. System Settings

### 9.1 General Settings

**Endpoint:** `GET/POST /api/settings`

#### Test Scenarios:

##### 9.1.1 Application Settings

- **Company Information:**
  - Company name
  - Logo upload
  - Contact information
  - Business address
  - Support email
- **Regional Settings:**
  - Default timezone
  - Default currency
  - Date format
  - Number format
- **Feature Toggles:**
  - Enable/disable chatbot globally
  - Enable/disable call tracking
  - Enable/disable AI features
  - Enable/disable marketplace

##### 9.1.2 Email Settings

**Endpoint:** `GET/POST /api/settings`

- **SMTP Configuration:**
  - SMTP host
  - SMTP port
  - SMTP username
  - SMTP password
  - Encryption (TLS/SSL)
  - From name
  - From email
  - Test email: `POST /api/settings/test-smtp`

##### 9.1.3 Payment Settings

- **Stripe Configuration:**
  - API keys (publishable, secret)
  - Webhook endpoint
  - Test mode toggle

##### 9.1.4 Integration Settings

- **Twilio:**
  - Account SID
  - Auth Token
  - Default from number
- **AI/ML Settings:**
  - API keys
  - Model selection
  - Confidence thresholds

### 9.2 Security Settings

**Endpoint:** `GET/POST /api/security/*`

#### Test Scenarios:

##### 9.2.1 API Key Management

- Generate API keys: `POST /api/security/api-keys`
- Rotate API keys: `POST /api/security/api-keys/rotate`
- Revoke API keys
- View API usage
- Rate limiting configuration

##### 9.2.2 Audit API Key Usage

**Endpoint:** `GET /api/security/api-keys/audit`

- View all API calls
- Filter by key
- Filter by endpoint
- Identify abuse
- Block suspicious activity

##### 9.2.3 Password Policies

- Minimum password length
- Require special characters
- Password expiration
- Prevent password reuse
- Two-factor authentication

##### 9.2.4 Session Settings

- Session timeout
- Concurrent session limits
- Force logout on password change
- Remember me duration

---

## 10. Maintenance & Data Management

### 10.1 Fix Marketplace Leads

**Endpoints:**

- `GET /api/maintenance/fix-marketplace-leads` (preview)
- `POST /api/maintenance/fix-marketplace-leads` (execute)

#### Test Scenarios:

##### 10.1.1 Preview Fixes (GET)

- Identify data inconsistencies
- Show affected leads
- Display proposed fixes
- Estimate impact
- No data changes

##### 10.1.2 Execute Fixes (POST)

- Apply data corrections
- Fix status mismatches
- Correct sold counts
- Update assignment records
- Log all changes
- Generate fix report

### 10.2 Data Migration Tools

#### Test Scenarios:

- Import leads from CSV
- Import buyers from CSV
- Export all data (backup)
- Database migration scripts
- Data validation after migration

### 10.3 Cache Management

#### Test Scenarios:

- View cache statistics
- Clear cache (all or selective)
- Redis cache management
- Memory cache management

### 10.4 System Health Checks

**Endpoint:** `GET /api/health`

#### Test Scenarios:

- Database connectivity
- Redis connectivity
- Email service status
- Payment gateway status
- API service status
- Disk space monitoring
- Memory usage
- CPU usage

---

## 11. Monitoring & Analytics

### 11.1 System Dashboard

#### Test Scenarios:

##### 11.1.1 Overview Metrics

- Total users (by role)
- Total leads
- Total transactions
- Revenue (today, week, month)
- Active subscriptions
- System uptime

##### 11.1.2 Real-Time Metrics

- Active users online
- Leads created today
- Transactions today
- API requests (current rate)

##### 11.1.3 Trend Charts

- User growth
- Lead volume trends
- Revenue trends
- Conversion rates
- System performance

### 11.2 User Analytics

#### Test Scenarios:

- User acquisition funnel
- User retention rate
- Churn rate
- User lifetime value (LTV)
- User engagement metrics
- Most active users

### 11.3 Performance Monitoring

#### Test Scenarios:

- API response times
- Database query performance
- Slow queries identification
- Error rate tracking
- Resource usage (CPU, RAM, Disk)

---

## 12. Audit Logs

### 12.1 Activity Logs

**Endpoint:** `GET /api/admin/audit-logs`

#### Test Scenarios:

##### 12.1.1 View Audit Trail

- **Log Entries:**
  - Timestamp
  - User (who performed action)
  - Action (what was done)
  - Resource (what was affected)
  - IP address
  - User agent
  - Result (success/failure)

##### 12.1.2 Filter Audit Logs

- By user
- By action type
- By date range
- By resource type
- By success/failure

##### 12.1.3 Auditable Actions

**Track all sensitive operations:**

- User login/logout
- User role changes
- Password changes
- Data exports
- Bulk operations
- Configuration changes
- Financial transactions
- Refunds issued
- User suspensions
- Data deletions

### 12.2 Compliance Reports

#### Test Scenarios:

- GDPR compliance report
- Access logs for PII
- Data modification history
- User consent tracking
- Data deletion records

---

## 13. Support & Help Management

### 13.1 Support Tickets

**Endpoints:**

- `POST /api/support/tickets` - Create ticket
- `GET /api/support/tickets` - List tickets (admin sees all)
- `POST /api/support/tickets/status` - Update status
- `POST /api/support/tickets/followup` - Add follow-up

#### Test Scenarios:

##### 13.1.1 View All Tickets

- List all support tickets
- Filter by status (open, in-progress, closed)
- Filter by priority
- Filter by category
- Assign to support agent

##### 13.1.2 Ticket Management

- View ticket details
- Add internal notes
- Update ticket status
- Escalate ticket
- Merge duplicate tickets
- Close ticket

##### 13.1.3 Ticket Analytics

- Average response time
- Average resolution time
- Tickets by category
- Tickets by priority
- Agent performance

### 13.2 FAQ Management

**Endpoints:**

- `POST /api/support/help/faqs` - Create FAQ
- `GET /api/support/help/faqs` - List FAQs
- `PUT /api/support/help/faqs` - Update FAQ
- `DELETE /api/support/help/faqs` - Delete FAQ

#### Test Scenarios:

- Create FAQ articles
- Organize FAQs by category
- Publish/unpublish FAQs
- Track FAQ views
- Search FAQ content

### 13.3 Help Videos

**Model:** `models/helpVideo.ts`

#### Test Scenarios:

- Upload help videos
- Organize video library
- Embed videos in help center
- Track video views
- Video transcripts (accessibility)

---

## 14. Notifications Management

### 14.1 System-Wide Announcements

#### Test Scenarios:

- Create announcement
- Target specific user roles
- Banner notification
- Email broadcast
- Schedule announcement
- Expire announcement

### 14.2 Notification Templates

#### Test Scenarios:

- Manage email templates (admin override)
- Manage SMS templates
- Manage in-app notification templates
- Preview notifications
- Variable testing

---

## 15. Reports & Exports

### 15.1 Standard Reports

#### Test Scenarios:

##### 15.1.1 User Reports

- User registration report
- User activity report
- User segmentation report

##### 15.1.2 Financial Reports

- Revenue report
- Transaction report
- Subscription revenue report
- Payout report
- Tax report

##### 15.1.3 Lead Reports

- Lead generation report
- Lead quality report
- Lead conversion report
- Lead source report

##### 15.1.4 Performance Reports

- Seller performance report
- Buyer performance report
- Campaign performance report

### 15.2 Custom Reports

#### Test Scenarios:

- Build custom report
- Select data sources
- Apply filters
- Choose visualizations
- Save report template
- Schedule automated reports

### 15.3 Data Export

#### Test Scenarios:

- Export users to CSV
- Export leads to CSV/Excel
- Export transactions
- Export complete database (backup)
- GDPR data export (user request)

---

## 16. Email/SMS Oversight

### 16.1 Campaign Oversight

#### Test Scenarios:

- View all email campaigns (all sellers)
- View all SMS campaigns (all sellers)
- Review campaign content (compliance)
- Pause/stop campaigns
- Blacklist monitoring

### 16.2 Deliverability Monitoring

#### Test Scenarios:

- Global bounce rate
- Global complaint rate
- Domain reputation
- IP reputation
- Blacklist status

---

## 17. Lead Quality Oversight

### 17.1 Quality Monitoring

#### Test Scenarios:

- Review AI quality scores distribution
- Identify low-quality sources
- Flag suspicious patterns
- Review spam leads
- Adjust quality thresholds globally

### 17.2 Manual Review Queue

#### Test Scenarios:

- Queue of flagged leads
- Admin reviews leads
- Approve/reject leads
- Adjust AI model based on feedback

---

## 18. Platform Statistics

### 18.1 Usage Statistics

#### Test Scenarios:

- Total platform users
- Total leads generated
- Total revenue
- Growth rates
- Market share by industry

### 18.2 Feature Usage

#### Test Scenarios:

- Most used features
- Least used features
- Feature adoption rate
- Feature request tracking

---

## Testing Checklist

### Pre-Testing Setup

- [ ] Admin account created
- [ ] Test users across all roles
- [ ] Sample data populated
- [ ] Audit logging enabled
- [ ] Monitoring tools configured

### Functional Testing - User Management

- [ ] View all users
- [ ] Edit user details
- [ ] Change user roles
- [ ] Suspend/activate users
- [ ] Delete users
- [ ] Impersonate users

### Functional Testing - Content Management

- [ ] Lead management
- [ ] Buyer management
- [ ] Seller management
- [ ] Transaction management
- [ ] Invoice management
- [ ] Subscription management

### Functional Testing - System Settings

- [ ] General settings
- [ ] Email configuration
- [ ] Payment configuration
- [ ] Security settings
- [ ] API key management
- [ ] Feature toggles

### Functional Testing - Maintenance

- [ ] Data fixes
- [ ] Cache management
- [ ] Health checks
- [ ] Database maintenance

### Functional Testing - Support

- [ ] Support tickets
- [ ] FAQ management
- [ ] Help video management
- [ ] Announcements

### Reporting & Analytics

- [ ] Dashboard metrics
- [ ] User analytics
- [ ] Financial reports
- [ ] Custom reports
- [ ] Data exports

### Security & Compliance

- [ ] Audit logs
- [ ] Access control
- [ ] API security
- [ ] Compliance reports
- [ ] Data privacy

### Performance Testing

- [ ] Dashboard load time
- [ ] Report generation time
- [ ] Bulk operations
- [ ] Concurrent admin users
- [ ] Large dataset handling

---

## Test Data Requirements

### Admin Test Accounts:

```json
{
  "super_admin": {
    "email": "admin@leadgen.com",
    "role": "admin",
    "permissions": "all"
  },
  "staff_admin": {
    "email": "staff@leadgen.com",
    "role": "staff",
    "permissions": "limited"
  }
}
```

---

## Automation Recommendations

### High Priority

1. User CRUD operations
2. Transaction processing
3. Report generation
4. Data exports
5. API key management
6. Audit log creation

### Manual Testing

1. Dashboard UI review
2. Complex reports validation
3. Data integrity checks
4. Multi-step workflows
5. User impersonation flow

---

## Sign-off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| QA Lead       |      |      |           |
| System Admin  |      |      |           |
| Product Owner |      |      |           |
