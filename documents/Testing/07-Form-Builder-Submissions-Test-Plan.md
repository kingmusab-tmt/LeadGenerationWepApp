# Form Builder & Submissions Test Plan

## Overview

This document outlines all form creation, customization, submission handling, and form-related workflows for comprehensive testing of the Lead Generation Web App.

---

## 1. Form Creation & Management

### 1.1 Create Form

**Endpoint:** `POST /api/form/route`

#### Test Scenarios:

##### 1.1.1 Basic Form Creation

- **Steps:**
  1. Navigate to "Create Form"
  2. Enter form details:
     - Form name (required)
     - Form description
     - Form type (contact, lead-capture, survey, registration)
  3. Click "Create"
- **Expected Results:**
  - Form created with unique ID
  - Empty form template ready
  - Linked to seller (userId)
  - Status: "draft"

##### 1.1.2 Form Builder Interface

**Drag-and-Drop Components:**

- Text input
- Email input
- Phone input
- Textarea
- Select dropdown
- Radio buttons
- Checkboxes
- Date picker
- File upload
- Hidden fields
- Custom HTML

##### 1.1.3 Field Configuration

**For Each Field Type:**

- Field label
- Field name/ID
- Placeholder text
- Default value
- Required/optional
- Validation rules
- Help text
- Conditional logic
- Field order/position

##### 1.1.4 Form Styling

- Form theme selection
- Custom CSS
- Color scheme
- Font family
- Button styles
- Layout (single column, multi-column)
- Mobile responsiveness

### 1.2 Generate Form with AI

**Endpoint:** `POST /api/form/generate-with-ai`

#### Test Scenarios:

##### 1.2.1 AI-Powered Form Generation

- **Steps:**
  1. Navigate to "Generate with AI"
  2. Enter form purpose/description
     - Example: "Create a real estate lead capture form"
  3. Specify industry
  4. Submit request
  5. AI generates form structure
  6. Preview generated form
  7. Accept or modify
  8. Save form
- **Expected Results:**
  - Relevant fields generated
  - Appropriate field types
  - Logical field order
  - Industry-specific fields included
  - Validation rules applied

##### 1.2.2 AI Form Customization

- Modify AI-generated fields
- Add/remove fields
- Adjust validation
- Regenerate with different parameters

### 1.3 List Forms

**Endpoint:** `GET /api/form/userform`

#### Test Scenarios:

##### 1.3.1 View All Forms (Seller)

- **Query Parameters:**
  - page (pagination)
  - limit (results per page)
  - status (draft, published, archived)
  - search (form name)
- **Response Fields:**
  - Form ID
  - Form name
  - Description
  - Status
  - Submissions count
  - Created date
  - Last modified date
  - Embed code snippet

##### 1.3.2 Filter Forms

- By status
- By creation date
- By submission count
- Search by name/description

### 1.4 View Form Details

**Endpoint:** `GET /api/form/route?formId=[id]`

#### Test Scenarios:

- View complete form configuration
- Preview form rendering
- View submission statistics
- Access embed code
- View form URL

### 1.5 Update Form

**Endpoint:** `PUT /api/form/update`

#### Test Scenarios:

##### 1.5.1 Edit Form Structure

- Add new fields
- Remove fields
- Reorder fields
- Modify field properties
- Update validation rules
- Change form styling

##### 1.5.2 Form Version Control

- Save draft changes
- Publish updated version
- Maintain version history
- Rollback to previous version
- Compare versions

##### 1.5.3 Validation on Update

- Cannot remove required fields with dependencies
- Field name uniqueness
- Validation rule consistency
- Preserve submission data compatibility

### 1.6 Clone Form

**Endpoint:** `POST /api/form/clone`

#### Test Scenarios:

- Select form to clone
- Duplicate all configuration
- Clone styling
- New unique form ID
- Independent from original
- Modify clone without affecting original

### 1.7 Delete Form

**Endpoint:** `POST /api/form/delete`

#### Test Scenarios:

- **Delete Draft Form:** Complete removal
- **Delete Published Form with Submissions:**
  - Archive instead of delete
  - Preserve submission data
  - Mark as archived
  - Remove from active forms
- **Cascade Operations:**
  - Handle embedded forms (show warning)
  - Handle webhook configurations
  - Handle automation triggers

### 1.8 Save Form

**Endpoint:** `POST /api/form/save`

#### Test Scenarios:

- Save draft form
- Validate configuration
- Save as template
- Auto-save functionality
- Conflict resolution (concurrent edits)

---

## 2. Form Fields & Validation

### 2.1 Field Types

#### Test Each Field Type:

##### 2.1.1 Text Input

- Single-line text
- Character limit (min/max)
- Pattern validation (regex)
- Autocomplete options
- Default value

##### 2.1.2 Email Input

- Email format validation
- Multiple emails (comma-separated)
- Domain whitelist/blacklist
- Email verification option
- Disposable email detection

##### 2.1.3 Phone Input

- Phone format validation
- Country code support
- E.164 format
- International phone numbers
- Phone verification (SMS)

##### 2.1.4 Textarea

- Multi-line text
- Character limit
- Rich text editor option
- Auto-resize

##### 2.1.5 Select Dropdown

- Single selection
- Option list configuration
- Default selection
- "Other" option with text input
- Dynamic options (from API)

##### 2.1.6 Radio Buttons

- Single choice
- Option layout (vertical/horizontal)
- Default selection
- Custom values

##### 2.1.7 Checkboxes

- Multiple selections
- Min/max selections
- Select all/none
- Required to check specific option

##### 2.1.8 Date Picker

- Date format (MM/DD/YYYY, DD/MM/YYYY)
- Date range validation
- Min/max date
- Disable specific dates
- Default to today

##### 2.1.9 File Upload

- Allowed file types
- File size limit
- Multiple file upload
- Preview uploaded files
- Virus scanning
- Storage location

##### 2.1.10 Hidden Fields

- UTM parameters
- Referrer URL
- IP address
- Timestamp
- Custom values

### 2.2 Field Validation Rules

#### Test Validation Types:

##### 2.2.1 Required Validation

- Field marked required
- Submission blocked if empty
- Error message display
- Visual indicator (\*)

##### 2.2.2 Format Validation

- Email format
- Phone format
- URL format
- Numeric only
- Alpha only
- Alphanumeric
- Custom regex

##### 2.2.3 Length Validation

- Minimum length
- Maximum length
- Exact length
- Character count display

##### 2.2.4 Range Validation

- Minimum value (numbers, dates)
- Maximum value
- Between range

##### 2.2.5 Custom Validation

- Custom JavaScript function
- Server-side validation
- Cross-field validation
- Async validation (API check)

### 2.3 Conditional Logic

#### Test Scenarios:

##### 2.3.1 Show/Hide Fields

**Condition:** If field X = Y, show field Z

- User selects option
- Conditional field appears
- Required validation applies only when visible
- Submission data includes/excludes based on visibility

##### 2.3.2 Skip Logic

- Skip to specific section
- Jump to end of form
- Show thank you message

##### 2.3.3 Field Value Dependencies

- Populate field based on another field
- Calculate values (arithmetic)
- Concatenate values

---

## 3. Form Submission

### 3.1 Submit Form

**Endpoint:** `POST /api/form/submit`

#### Test Scenarios:

##### 3.1.1 Successful Submission

- **Steps:**
  1. User fills out form
  2. All required fields completed
  3. Validation passes
  4. Click "Submit"
  5. Form submitted
  6. Lead created in database
  7. Confirmation message displayed
  8. Optional redirect
- **Expected Results:**
  - Form data saved
  - Lead record created
  - Linked to formId
  - AI quality assessment triggered
  - Seller notified (if configured)
  - Auto-assignment triggered (if enabled)
  - Confirmation email sent (optional)

##### 3.1.2 Validation Errors

- Submit with missing required fields
- Submit with invalid email
- Submit with invalid phone
- Display specific error messages
- Highlight error fields
- Focus on first error field
- No data saved

##### 3.1.3 Duplicate Submission Prevention

- Prevent double-click submission
- Disable submit button after click
- Loading indicator
- Server-side duplicate detection (email/phone)
- Duplicate handling (update vs reject)

##### 3.1.4 Partial Submission Save

- Save progress functionality
- Resume later with token/link
- Expiration on partial data

### 3.2 Submission Confirmation

#### Test Scenarios:

##### 3.2.1 Confirmation Messages

- **Success message display:**
  - "Thank you! Your information has been submitted."
  - Custom success message
  - Display submission ID

##### 3.2.2 Redirect Options

- Redirect to thank-you page
- Redirect to external URL
- Redirect with parameters (submission ID)
- Conditional redirect (based on form data)

##### 3.2.3 Confirmation Email

- Send confirmation to submitter
- Include submission details
- Custom email template
- PDF attachment (form receipt)

---

## 4. Form Analytics & Tracking

### 4.1 Form Performance Metrics

#### Test Scenarios:

##### 4.1.1 View Form Statistics

- Total views
- Total submissions
- Conversion rate (submissions/views)
- Abandonment rate
- Average completion time
- Submissions over time (chart)

##### 4.1.2 Field-Level Analytics

- Field completion rate
- Fields with most errors
- Fields causing abandonment
- Average time per field

##### 4.1.3 Traffic Source Analytics

- Direct traffic
- Referral sources
- UTM parameter tracking
- Campaign attribution

### 4.2 Submission Data Analysis

#### Test Scenarios:

- View all submissions
- Filter submissions by date
- Search submissions
- Export submissions (CSV, Excel)
- Aggregate data analysis
- Visualizations (charts, graphs)

---

## 5. Form Embedding & Integration

### 5.1 Embed Form on Website

#### Test Scenarios:

##### 5.1.1 Inline Embed

**Embed Code:**

```html
<iframe src="https://app.com/forms/[id]" width="100%" height="500px"></iframe>
```

- Copy embed code
- Paste on external website
- Form renders correctly
- Responsive design
- Submit works from embedded form
- Submissions tracked

##### 5.1.2 Popup/Modal Embed

- Trigger popup on click
- Trigger on page load (with delay)
- Exit-intent popup
- Overlay background
- Close button

##### 5.1.3 Floating Button

- Floating form button
- Customizable position
- Click to open form
- Minimize/maximize

### 5.2 Custom Domain Forms

#### Test Scenarios:

- Host form on custom domain
- forms.yourwebsite.com/contact
- SSL certificate
- Branding consistency

### 5.3 API Integration

#### Test Scenarios:

- Submit form via API
- Retrieve form schema via API
- Get submission data via API
- Webhook notifications

---

## 6. Form Notifications & Automation

### 6.1 Form Submission Notifications

#### Test Scenarios:

##### 6.1.1 Email Notifications (to Seller)

- Immediate email on submission
- Email contains submission data
- Optionally include lead score
- Configure notification recipients
- Email template customization

##### 6.1.2 SMS Notifications

- SMS alert on submission
- High-priority form alerts
- Include key submission data

##### 6.1.3 In-App Notifications

- Real-time dashboard notification
- Badge count
- Notification center

##### 6.1.4 Webhook Notifications

- POST submission data to webhook URL
- Configure webhook URL
- Retry on failure
- Webhook logs

### 6.2 Auto-Responder

#### Test Scenarios:

- Send auto-reply email to submitter
- Personalized message (use form data)
- Custom email template
- Include next steps
- Attach resources (PDF, links)

### 6.3 Automation Triggers

#### Test Scenarios:

- Add to email drip campaign
- Create task for sales team
- Assign to buyer (auto-assignment)
- Update CRM
- Trigger workflow

---

## 7. Form Security

### 7.1 SPAM Protection

#### Test Scenarios:

##### 7.1.1 reCAPTCHA Integration

- Google reCAPTCHA v2 (checkbox)
- Google reCAPTCHA v3 (invisible)
- Score threshold configuration
- Reject low-score submissions

##### 7.1.2 Honeypot Fields

- Hidden field for bots
- Bots fill it, humans don't
- Reject if honeypot filled
- No user-facing impact

##### 7.1.3 Rate Limiting

- Limit submissions per IP
- Limit submissions per email/phone
- Prevent brute force
- Temporary ban on abuse

##### 7.1.4 SPAM Detection

- Content analysis
- Known spam patterns
- Disposable email detection
- Suspicious data patterns

### 7.2 Data Protection

#### Test Scenarios:

##### 7.2.1 HTTPS Enforcement

- All form submissions over HTTPS
- Mixed content prevention
- SSL certificate validation

##### 7.2.2 CSRF Protection

- CSRF token on form
- Validate token on submission
- Token expiration

##### 7.2.3 Input Sanitization

- XSS prevention
- SQL injection prevention
- NoSQL injection prevention
- HTML encoding

##### 7.2.4 PII Encryption

- Encrypt sensitive fields at rest
- Encrypt in transit (HTTPS)
- Mask SSN, credit cards (if collected)

---

## 8. Multi-Page & Multi-Step Forms

### 8.1 Multi-Step Forms

#### Test Scenarios:

##### 8.1.1 Create Multi-Step Form

- **Steps:**
  1. Define steps/pages
  2. Assign fields to each step
  3. Configure navigation (Next/Previous)
  4. Add progress indicator
- **Features:**
  - Step validation (complete step before next)
  - Save progress between steps
  - Review page (summary of all data)
  - Edit previous steps

##### 8.1.2 Progress Indicator

- Step numbers (1/5, 2/5, ...)
- Progress bar (% complete)
- Breadcrumbs
- Step titles

##### 8.1.3 Save & Resume

- Save partial completion
- Email link to resume
- Token-based resume

---

## 9. Form Templates

### 9.1 Form Template Library

#### Test Scenarios:

##### 9.1.1 Pre-Built Templates

**Template Categories:**

- Contact Forms
- Lead Capture Forms
- Registration Forms
- Survey Forms
- Feedback Forms
- Order Forms
- Appointment Scheduling

##### 9.1.2 Use Template

- Browse template library
- Preview template
- Select template
- Customize to needs
- Save as new form

##### 9.1.3 Save Custom Template

- Create form
- Save as template
- Share template (within organization)
- Template marketplace (future)

---

## 10. Form Translations & Localization

### 10.1 Multi-Language Forms

#### Test Scenarios:

- **Configure Languages:**
  - Primary language
  - Additional languages
- **Translate Form:**
  - Translate field labels
  - Translate help text
  - Translate error messages
  - Translate submit button
- **Language Detection:**
  - Browser language detection
  - Geo-location based
  - Language selector dropdown
- **Submission Handling:**
  - Store submission language
  - Report by language

---

## 11. Form Accessibility

### 11.1 WCAG Compliance

#### Test Scenarios:

##### 11.1.1 Keyboard Navigation

- Tab through all fields
- Focus visible
- Logical tab order
- Submit with Enter key

##### 11.1.2 Screen Reader Support

- ARIA labels
- Field descriptions
- Error announcements
- Form structure (fieldsets, legends)

##### 11.1.3 Visual Accessibility

- Color contrast ratio (4.5:1 minimum)
- Text size adjustable
- No color-only indicators
- High-contrast mode support

##### 11.1.4 Error Handling

- Clear error messages
- Error association with fields
- Error summary
- Inline validation feedback

---

## 12. Form Testing & Preview

### 12.1 Form Preview

#### Test Scenarios:

- Preview form before publishing
- Desktop preview
- Mobile preview
- Tablet preview
- Test submission in preview (no data saved)

### 12.2 Test Mode

#### Test Scenarios:

- Enable test mode
- Submissions marked as "test"
- No lead creation
- No notifications sent
- Easy bulk delete of test data

---

## 13. Form Performance

### 13.1 Form Load Time

#### Test Scenarios:

- Form loads in <2 seconds
- Optimize large forms
- Lazy load conditional fields
- Minimize form size
- CDN for assets

### 13.2 Submission Performance

#### Test Scenarios:

- Submit large forms (<5 seconds)
- Handle file uploads (Progress bar)
- Optimize validation
- Asynchronous submission

---

## Testing Checklist

### Pre-Testing Setup

- [ ] Form builder UI accessible
- [ ] Database configured
- [ ] AI form generation enabled
- [ ] Notification system configured
- [ ] Embed code generator working
- [ ] reCAPTCHA configured

### Functional Testing

- [ ] Form creation
- [ ] AI form generation
- [ ] All field types
- [ ] Field validation
- [ ] Conditional logic
- [ ] Form submission
- [ ] Form editing
- [ ] Form cloning
- [ ] Form deletion

### Submission Testing

- [ ] Successful submissions
- [ ] Validation errors
- [ ] Duplicate prevention
- [ ] Confirmation messages
- [ ] Email confirmations
- [ ] Lead creation

### Integration Testing

- [ ] Form embedding
- [ ] Webhook notifications
- [ ] Email notifications
- [ ] Auto-responders
- [ ] API submission
- [ ] CRM integration

### Security Testing

- [ ] SPAM protection (reCAPTCHA)
- [ ] Honeypot fields
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] Input sanitization
- [ ] HTTPS enforcement

### Analytics Testing

- [ ] View tracking
- [ ] Submission tracking
- [ ] Conversion rate
- [ ] Field analytics
- [ ] Traffic source tracking

### Accessibility Testing

- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast
- [ ] ARIA labels
- [ ] Error handling

### Performance Testing

- [ ] Form load time
- [ ] Submission speed
- [ ] Large form handling
- [ ] Concurrent submissions
- [ ] File upload performance

---

## Test Data Requirements

### Sample Forms:

```json
{
  "contact_form": {
    "name": "Contact Us",
    "fields": ["name", "email", "phone", "message"],
    "submit_button": "Send Message"
  },
  "lead_capture": {
    "name": "Get a Quote",
    "fields": ["name", "email", "company", "industry", "service_interest"],
    "conditional_logic": true
  },
  "multi_step": {
    "name": "Detailed Registration",
    "steps": ["Personal Info", "Business Details", "Preferences"],
    "fields_per_step": [3, 4, 5]
  }
}
```

---

## Automation Recommendations

### High Priority for Automation

1. Form CRUD operations
2. Field validation testing
3. Submission processing
4. Lead creation linkage
5. Notification delivery
6. Duplicate detection

### Manual Testing Recommended

1. Form builder UI/UX
2. Drag-and-drop interactions
3. Visual design rendering
4. Responsive design on devices
5. Accessibility review
6. User experience flow

---

## Sign-off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| QA Lead       |      |      |           |
| Product Owner |      |      |           |
| Dev Lead      |      |      |           |
