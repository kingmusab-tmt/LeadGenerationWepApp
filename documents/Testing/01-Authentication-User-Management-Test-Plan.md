# Authentication & User Management Test Plan

## Overview

This document outlines all authentication and user management activities, tasks, and workflows for comprehensive testing of the Lead Generation Web App.

---

## 1. User Registration

### 1.1 Registration Flow

**Endpoint:** `POST /api/users/register`

#### Test Scenarios:

##### 1.1.1 Successful Registration

- **Prerequisites:** None
- **Steps:**
  1. Navigate to registration page
  2. Enter valid name (2-100 characters)
  3. Enter valid email (format: user@domain.com)
  4. Enter valid password
  5. Select user role: admin, seller, buyer, user, staff, or business-admin
  6. Optionally enter business name (max 150 characters)
  7. Optionally enter mobile number (E.164 format: +1234567890)
  8. Submit registration form
- **Expected Results:**
  - User account created successfully
  - User redirected to appropriate dashboard based on role
  - Welcome email sent (if email configured)
  - User status set to "active" by default

##### 1.1.2 Registration Validation Tests

- **Invalid Email Format:**
  - Test with: "invalidemail", "user@", "@domain.com", "user @domain.com"
  - Expected: Validation error message
- **Name Length Validation:**
  - Test with: 1 character (too short), 101+ characters (too long)
  - Expected: Validation error message
- **Duplicate Email:**
  - Register with existing email
  - Expected: Error message "Email already exists"
- **Business Name Length:**
  - Test with 151+ characters
  - Expected: Validation error message
- **Invalid Phone Number:**
  - Test with: "123", "abc", "12345" (no country code)
  - Expected: Validation error message

##### 1.1.3 Role-Based Registration

Test registration for each role:

- **Admin:** Full system access
- **Seller:** Lead generation and management access
- **Buyer:** Lead purchasing and management access
- **User:** Basic access
- **Staff:** Limited administrative access
- **Business-Admin:** Business-level administration

### 1.2 Complete Registration (Additional Info)

**Endpoint:** `POST /api/completeregistration`

#### Test Scenarios:

- **Buyer Onboarding:**
  1. Enter company name
  2. Enter business description
  3. Enter company registration number
  4. Enter VAT/Tax registration number
  5. Enter business website URL
  6. Enter contact address (line 1, line 2, city, postcode)
  7. Set lead preferences (industries, locations)
  8. Configure service locations
  9. Set working hours and timezone
  10. Configure notification preferences

- **Seller Onboarding:**
  1. Enter business details
  2. Configure credit setup
  3. Set unit pricing options
  4. Configure email settings (SMTP)
  5. Setup Twilio integration (optional)
  6. Accept Terms of Service
  7. Record IP address and acceptance timestamp

---

## 2. Authentication & Login

### 2.1 Credential-Based Login

**Endpoint:** `POST /api/auth/[...nextauth]`
**Provider:** credentials

#### Test Scenarios:

##### 2.1.1 Successful Login

- **Steps:**
  1. Navigate to login page
  2. Enter registered email
  3. Enter correct password
  4. Click "Sign In"
- **Expected Results:**
  - Session created successfully
  - User redirected to role-specific dashboard
  - Session stored in browser
  - User status verified as "active"

##### 2.1.2 Failed Login Attempts

- **Wrong Password:**
  - Enter correct email, wrong password
  - Expected: "Invalid credentials" error
- **Non-existent Email:**
  - Enter unregistered email
  - Expected: "Invalid credentials" error
- **Suspended Account:**
  - Login with suspended user account (status: "suspended")
  - Expected: "Account suspended" error

##### 2.1.3 Email Sign-In Link

**Server Action:** `emailSignInServerAction`

- Test sending magic link to email
- Verify link expiration (typically 24 hours)
- Test link usage (one-time use)
- Verify session creation after link click

### 2.2 OAuth Login

#### 2.2.1 Google OAuth

**Provider:** google

**Test Scenarios:**

1. Click "Sign in with Google"
2. Authorize app with Google account
3. Verify account creation/login
4. Check user provider field set to "google"
5. Verify profile image synced
6. Test account unlinking: `unlinkGoogleAccountServerAction`

#### 2.2.2 GitHub OAuth

**Provider:** github

**Test Scenarios:**

1. Click "Sign in with GitHub"
2. Authorize app with GitHub account
3. Verify account creation/login
4. Check user provider field set to "github"
5. Verify profile information synced

### 2.3 Session Management

#### Test Scenarios:

- **Get Session:** `getServerSession(authOptions)`
  - Verify active session retrieval
  - Test expired session handling
- **Check Authentication:** Server action `checkIsAuthenticated`
  - Verify protected route access
  - Test redirect for unauthenticated users
- **Session Caching:** Module `cachedSession.ts`
  - Test session cache performance
  - Verify cache invalidation
- **Clear Stale Tokens:** Server action `clearStaleTokensServerAction`
  - Test automatic token cleanup
  - Verify expired token removal

---

## 3. User Profile Management

### 3.1 View Profile

**Endpoint:** `GET /api/users`

#### Test Scenarios:

- Fetch current user profile
- Verify all fields returned correctly
- Check sensitive data filtering (passwords, tokens)

### 3.2 Update Profile

**Endpoint:** `PUT /api/users/profile`

#### Test Scenarios:

##### 3.2.1 Basic Information Update

- **Fields to Test:**
  - Name (2-100 characters)
  - Username (3-30 alphanumeric + underscore)
  - Business name (max 150 characters)
  - Mobile number (E.164 format)
  - Image/Avatar upload
  - Login link URL

##### 3.2.2 Notification Preferences

- **Test Options:**
  - Email notifications (enable/disable)
  - SMS notifications (enable/disable)
  - Dashboard notifications (enable/disable)
  - Push token configuration

##### 3.2.3 Business Settings (Seller-specific)

- **Twilio Configuration:**
  - Test setting twilioActivated flag
  - Validate twilioAccountSid format (AC + 32 chars)
  - Validate twilioAuthToken (min 32 chars)
  - Test auto-assign leads toggle
  - Configure maxAutoAssignPerDay (min 0)
- **Distribution Mode:**
  - Test "automatic" mode
  - Test "marketplace" mode
  - Test "both" mode with aiQualityThreshold
- **Lead Pricing:**
  - Set high quality lead price (min 0)
  - Set medium quality lead price (min 0)
  - Set low quality lead price (min 0)

##### 3.2.4 Integration Settings

- **Tawk.to Live Chat:**
  - Set tawkPropertyId
  - Set tawkWidgetId
- **Email Settings:**
  - Configure SMTP host
  - Configure SMTP port
  - Set SMTP username
  - Set SMTP password
  - Test SMTP connection: `POST /api/settings/test-smtp`
- **API Settings:**
  - Enable/disable API access
  - Generate API key
  - Set rate limits

### 3.3 User Type Management

**Endpoint:** `POST /api/users/type`

#### Test Scenarios:

- Change user role (admin only)
- Verify permission changes applied
- Test role-based access after change

### 3.4 Get User Information

#### Test Server Actions:

- **Get User Name:** `getUserNameServerAction`
  - Verify name retrieval from session
- **Get User Role:** `getUserRoleServerAction`
  - Verify role retrieval from session
- **Set User Name:** `setNameServerAction`
  - Update user name
  - Verify database update

---

## 4. Password & Security

### 4.1 Password Management

#### Test Scenarios:

- **Password Requirements:**
  - Minimum length validation
  - Complexity requirements (if configured)
  - Password hashing verification
- **Password Reset:**
  - Request password reset link
  - Verify email delivery
  - Test reset link expiration
  - Complete password reset process
  - Verify old password invalidated

### 4.2 Account Security

#### Test Scenarios:

- **Account Status:**
  - Active account access
  - Suspended account restrictions
  - Status change notifications
- **Session Security:**
  - Test session timeout
  - Test concurrent session limits
  - Verify session hijacking prevention
- **CSRF Protection:**
  - Verify CSRF token on forms
  - Test token validation: `POST /api/csrf-token`
  - Test token expiration
  - Module: `csrfMiddleware.ts`, `csrf.ts`, `csrfRedis.ts`

---

## 5. Sign Out

### 5.1 Logout Flow

**Server Action:** `signOutServerAction`

#### Test Scenarios:

1. Click "Sign Out" button
2. Verify session destroyed
3. Verify redirect to login page
4. Test protected page access after logout
5. Verify "back" button doesn't restore session
6. Check cache cleared
7. Verify tokens revoked

---

## 6. Email Verification

### 6.1 Verification Process

**Endpoint:** `GET /api/verifications`

#### Test Scenarios:

- **Send Verification Email:**
  - Trigger verification email on registration
  - Verify email content and link
- **Verify Email:**
  - Click verification link
  - Verify account marked as verified
  - Test expired verification link
  - Test already-verified account

---

## 7. User Management (Admin)

### 7.1 List Users

**Endpoint:** `GET /api/users`

#### Test Scenarios (Admin Only):

- Fetch all users
- Filter by role
- Search by email/name
- Pagination testing
- Sort by various fields

### 7.2 User Actions (Admin)

#### Test Scenarios:

- **Suspend User:**
  - Change status to "suspended"
  - Verify user cannot login
  - Test access revocation
- **Activate User:**
  - Change status to "active"
  - Verify user can login again
- **Delete User:**
  - Soft delete vs hard delete
  - Verify cascade operations
  - Test data retention policies

---

## 8. Wallet Management

### 8.1 Wallet Balance

**Field:** `walletBalance` (min 0)

#### Test Scenarios:

- **View Balance:**
  - Check current wallet balance
  - Verify non-negative constraint
- **Add Funds:**
  - Add credits to wallet
  - Verify balance update
  - Check transaction record
- **Deduct Funds:**
  - Purchase leads
  - Pay for services
  - Verify insufficient funds handling
- **Transaction History:**
  - View all wallet transactions
  - Filter by date range
  - Export transaction report

---

## 9. Provider Management

### 9.1 Account Linking

#### Test Scenarios:

- **Link Google Account:**
  - Connect Google account to existing user
  - Verify OAuth flow
  - Test account merge
- **Unlink Google Account:**
  - Server action: `unlinkGoogleAccountServerAction`
  - Verify account unlinked
  - Test fallback authentication method
- **Multiple Providers:**
  - Test linking multiple OAuth providers
  - Verify primary login method

---

## 10. Access Control & Permissions

### 10.1 Role-Based Access Control (RBAC)

#### Test Matrix by Role:

| Feature                | Admin | Seller | Buyer | User | Staff | Business-Admin |
| ---------------------- | ----- | ------ | ----- | ---- | ----- | -------------- |
| View Own Profile       | ✓     | ✓      | ✓     | ✓    | ✓     | ✓              |
| Edit Own Profile       | ✓     | ✓      | ✓     | ✓    | ✓     | ✓              |
| View All Users         | ✓     | ✗      | ✗     | ✗    | ✓     | ✓              |
| Manage Users           | ✓     | ✗      | ✗     | ✗    | ✗     | ✓              |
| Access Admin Dashboard | ✓     | ✗      | ✗     | ✗    | ✗     | ✗              |
| Create Leads           | ✓     | ✓      | ✗     | ✗    | ✓     | ✓              |
| Purchase Leads         | ✗     | ✗      | ✓     | ✗    | ✗     | ✗              |
| Manage Subscriptions   | ✓     | ✓      | ✓     | ✓    | ✗     | ✓              |

### 10.2 Permission Testing

#### Test Scenarios:

- **Unauthorized Access:**
  - Attempt to access admin routes as seller
  - Attempt to access seller routes as buyer
  - Verify 403 Forbidden responses
- **Cross-Account Access:**
  - Attempt to view another user's profile
  - Attempt to modify another user's data
  - Verify proper access denial

---

## 11. Data Validation & Error Handling

### 11.1 Input Validation

#### Test Cases:

- **SQL Injection Prevention:**
  - Test common SQL injection patterns
  - Verify sanitization
- **XSS Prevention:**
  - Test script injection in text fields
  - Verify HTML encoding
- **NoSQL Injection:**
  - Test MongoDB injection patterns
  - Verify query sanitization

### 11.2 Error Messages

#### Test Scenarios:

- Verify friendly error messages
- Check no sensitive data in errors
- Test error logging
- Verify error tracking integration

---

## 12. Performance & Scalability

### 12.1 Performance Tests

#### Test Scenarios:

- **Concurrent Logins:**
  - Simulate 100+ concurrent login attempts
  - Measure response time
- **Session Management:**
  - Test with 1000+ active sessions
  - Check memory usage
- **Database Queries:**
  - Verify user queries use indexes
  - Test query optimization

### 12.2 Caching

#### Test Scenarios:

- Verify session caching works
- Test cache invalidation on logout
- Check cache hit/miss ratio

---

## 13. Audit & Compliance

### 13.1 Audit Logging

#### Test Scenarios:

- **Track User Activities:**
  - Login/logout events
  - Profile changes
  - Permission changes
  - Failed login attempts
- **Data Access Logs:**
  - Who accessed what data
  - When data was accessed
  - IP address tracking

### 13.2 Compliance

#### Test Requirements:

- **GDPR Compliance:**
  - Right to access data
  - Right to delete account
  - Data export functionality
  - Cookie consent
- **Data Retention:**
  - Verify retention policies
  - Test automatic data cleanup

---

## 14. Edge Cases & Boundary Testing

### 14.1 Edge Cases

#### Test Scenarios:

- User with maximum field lengths
- User with minimum valid data
- Special characters in names/emails
- Unicode character handling
- Time zone edge cases
- Daylight saving time handling

### 14.2 Race Conditions

#### Test Scenarios:

- Simultaneous profile updates
- Concurrent session creation
- Parallel wallet transactions
- Duplicate registration attempts

---

## Testing Checklist

### Pre-Testing Setup

- [ ] Database seeded with test users
- [ ] Email service configured (test mode)
- [ ] OAuth providers configured
- [ ] CSRF protection enabled
- [ ] SSL/TLS configured

### Functional Testing

- [ ] All registration scenarios
- [ ] All login methods
- [ ] Profile CRUD operations
- [ ] Password management
- [ ] Session management
- [ ] Role-based access

### Security Testing

- [ ] Authentication bypass attempts
- [ ] Authorization checks
- [ ] Input validation
- [ ] CSRF protection
- [ ] Session security

### Integration Testing

- [ ] OAuth providers
- [ ] Email service
- [ ] Database operations
- [ ] Cache layer
- [ ] External APIs

### Performance Testing

- [ ] Load testing
- [ ] Stress testing
- [ ] Concurrent user testing
- [ ] Database optimization

### Compliance Testing

- [ ] GDPR requirements
- [ ] Audit logging
- [ ] Data retention
- [ ] Privacy policies

---

## Test Data Requirements

### Sample Users

```json
{
  "admin": {
    "email": "admin@test.com",
    "password": "Admin123!",
    "role": "admin"
  },
  "seller": {
    "email": "seller@test.com",
    "password": "Seller123!",
    "role": "seller",
    "businessName": "Test Leads Co"
  },
  "buyer": {
    "email": "buyer@test.com",
    "password": "Buyer123!",
    "role": "buyer",
    "company": "ABC Corporation"
  }
}
```

---

## Automation Recommendations

### High Priority for Automation

1. Registration validation tests
2. Login/logout flows
3. Profile CRUD operations
4. Session management
5. Role-based access tests

### Manual Testing Recommended

1. OAuth flows (complex UI interactions)
2. Email verification (requires email access)
3. UX/UI validation
4. Accessibility testing

---

## Known Issues & Limitations

_(Document any known issues discovered during testing)_

---

## Sign-off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| QA Lead       |      |      |           |
| Dev Lead      |      |      |           |
| Product Owner |      |      |           |
