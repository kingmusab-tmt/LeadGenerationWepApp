# Integrations & Third-Party Services Test Plan

## Overview

This document outlines testing procedures for all third-party integrations, webhooks, API connections, and external service dependencies in the Lead Generation Web App.

---

## 1. Zapier Integration

### 1.1 Zapier Setup & Authentication

**Reference:** `documents/Integration-Guide-Zapier.md`

#### Test Scenarios:

##### 1.1.1 Connect Zapier Account

- User navigates to Integrations page
- Click "Connect Zapier"
- Authenticate with Zapier
- Grant permissions
- Connection status shown as "Connected"
- API key generated for Zapier

##### 1.1.2 Disconnect Zapier

- Click "Disconnect"
- Confirm disconnection
- API access revoked
- Existing Zaps continue vs. stop (test both scenarios)

### 1.2 Zapier Triggers

**Endpoint:** Webhook-based triggers

#### Test Scenarios:

##### 1.2.1 New Lead Trigger

**Trigger:** When new lead is created

**Test Steps:**

- Create Zap with "New Lead" trigger
- Create test lead in system
- Verify trigger fires
- Verify lead data passed to Zapier:
  ```json
  {
    "id": "lead_123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "source": "contact-form",
    "aiQualityScore": 85,
    "customFields": {...}
  }
  ```

##### 1.2.2 Lead Purchased Trigger

**Trigger:** When buyer purchases a lead

**Test Steps:**

- Create Zap with "Lead Purchased" trigger
- Complete lead purchase
- Verify trigger fires
- Verify data includes:
  - Lead details
  - Buyer details
  - Transaction details
  - Purchase timestamp

##### 1.2.3 New Buyer Registered Trigger

**Trigger:** When new buyer signs up

**Test Steps:**

- Create Zap
- Register new buyer
- Verify trigger
- Verify buyer data passed

##### 1.2.4 Form Submission Trigger

**Trigger:** When form is submitted

**Test Steps:**

- Create Zap for specific form
- Submit test form
- Verify trigger fires
- Verify form fields mapped correctly

### 1.3 Zapier Actions

**Endpoint:** Incoming actions from Zapier

#### Test Scenarios:

##### 1.3.1 Create Lead Action

**Action:** Create a lead from Zapier

**Test Steps:**

- Create Zap with external trigger (e.g., Google Sheets)
- Use "Create Lead" action
- Map fields from source to lead
- Trigger Zap
- Verify lead created in system
- Verify all fields mapped correctly
- Check lead appears in dashboard

##### 1.3.2 Update Lead Action

**Action:** Update existing lead

**Test Steps:**

- Create Zap with "Update Lead" action
- Trigger update
- Verify lead updated
- Check audit log

##### 1.3.3 Create Buyer Action

**Action:** Register buyer via Zapier

**Test Steps:**

- Create Zap
- Send buyer data
- Verify buyer account created
- Verify email invitation sent

### 1.4 Zapier Webhook Testing

#### Test Scenarios:

##### 1.4.1 Outgoing Webhooks

**Endpoint:** `POST https://hooks.zapier.com/...`

- Configure webhook URL in Zapier
- Trigger event in app
- Verify webhook payload sent
- Check webhook delivery status
- Test retry logic on failure
- Verify webhook signature (if implemented)

##### 1.4.2 Incoming Webhooks

**Endpoint:** `POST /api/webhooks/zapier`

- Send test data from Zapier
- Verify authentication (API key)
- Verify data validation
- Test error handling
- Test rate limiting

### 1.5 Error Handling

#### Test Scenarios:

- Invalid API key → 401 Unauthorized
- Malformed data → 400 Bad Request
- Missing required fields → 422 Unprocessable Entity
- Zapier service down → Queue for retry
- Rate limit exceeded → 429 Too Many Requests

---

## 2. Native Ad Platform Integrations

**Reference:** `documents/Native-Integrations-Guide-Ad-Platforms.md`

### 2.1 Google Ads Integration

#### Test Scenarios:

##### 2.1.1 Connect Google Ads Account

**Endpoint:** OAuth-based

**Test Steps:**

- Navigate to Integrations → Google Ads
- Click "Connect Google Ads"
- OAuth consent screen
- Select Google account
- Grant permissions
- Select ad account
- Connection successful
- Account ID stored

##### 2.1.2 Conversion Tracking Setup

**Endpoint:** `POST /api/integrations/google-ads/conversion`

**Test Steps:**

- Create conversion action
- Name: "Lead Submission"
- Category: "Lead"
- Value: Dynamic based on lead price
- Attribution model: Data-driven
- Generate conversion tag
- Install tag on website
- Test conversion fires

##### 2.1.3 Send Conversion Data

**Payload:**

```json
{
  "conversion_action": "lead_submission",
  "gclid": "abc123...",
  "conversion_value": 25.0,
  "conversion_currency": "USD",
  "conversion_time": "2024-01-15T10:30:00Z"
}
```

**Test Steps:**

- Lead submitted with gclid parameter
- System send conversion to Google Ads API
- Verify in Google Ads interface
- Check conversion attributed to correct campaign

##### 2.1.4 Offline Conversion Import

**Endpoint:** `POST /api/integrations/google-ads/offline-conversions`

**Test Steps:**

- Lead purchased (offline conversion)
- Map lead purchase to gclid
- Send offline conversion
- Include enhanced conversion data (email, phone)
- Verify in Google Ads
- Check attribution window (30/90 days)

### 2.2 Facebook Ads Integration

#### Test Scenarios:

##### 2.2.1 Connect Facebook Ads

**Endpoint:** OAuth-based

**Test Steps:**

- Navigate to Integrations → Facebook
- Click "Connect Facebook"
- Facebook login
- Select ad account
- Grant pages and ads permissions
- Connection successful

##### 2.2.2 Conversion API Setup

**Endpoint:** `POST /api/integrations/facebook/conversions`

**Test Steps:**

- Configure Pixel ID
- Configure Conversion API token
- Set up server-side events
- Test event: Lead
- Event parameters:
  ```json
  {
    "event_name": "Lead",
    "event_time": 1234567890,
    "user_data": {
      "em": "hashed_email",
      "ph": "hashed_phone",
      "client_ip_address": "1.2.3.4",
      "client_user_agent": "Mozilla/5.0..."
    },
    "custom_data": {
      "value": 25.0,
      "currency": "USD",
      "content_name": "Contact Form"
    }
  }
  ```
- Verify in Facebook Test Events

##### 2.2.3 Lead Ads Integration

**Endpoint:** Webhook from Facebook

**Test Steps:**

- Create Lead Ad on Facebook
- Configure leadgen webhook
- Subscribe to page
- Submit lead via Lead Ad
- Webhook received: `POST /api/webhooks/facebook`
- Lead created in system
- Verify lead data mapped correctly

### 2.3 LinkedIn Ads Integration

#### Test Scenarios:

##### 2.3.1 Connect LinkedIn

- OAuth authentication
- Select ad account
- Grant permissions

##### 2.3.2 Conversion Tracking

- Install Insight Tag
- Create conversion
- Track lead submissions
- Send offline conversions via API

### 2.4 Microsoft Ads Integration

#### Test Scenarios:

- OAuth connection
- UET tag installation
- Conversion goals setup
- Offline conversion import
- Enhanced conversions

---

## 3. CRM Integrations

### 3.1 Salesforce Integration

#### Test Scenarios:

##### 3.1.1 Connect Salesforce

**Endpoint:** OAuth 2.0

**Test Steps:**

- Navigate to Integrations → Salesforce
- Click "Connect Salesforce"
- Login to Salesforce
- Grant permissions
- Connection successful
- Instance URL stored

##### 3.1.2 Sync Leads to Salesforce

**Endpoint:** `POST /api/integrations/salesforce/sync`

**Test Steps:**

- Create lead in system
- Trigger sync (auto or manual)
- Lead created as **Lead** object in Salesforce
- Field mapping:
  - firstName → FirstName
  - lastName → LastName
  - email → Email
  - phone → Phone
  - company → Company
  - Custom fields → Custom fields
- Verify in Salesforce
- Check for duplicates handling

##### 3.1.3 Two-Way Sync

- Lead updated in Salesforce
- Webhook/polling updates lead in system
- Lead updated in system
- Push update to Salesforce
- Conflict resolution (last write wins)

##### 3.1.4 Sync Purchased Leads

- Buyer purchases lead
- Lead converted to **Contact** in Salesforce
- Association with buyer's account
- Opportunity created (optional)

### 3.2 HubSpot Integration

#### Test Scenarios:

##### 3.2.1 Connect HubSpot

- OAuth authentication
- Select portal
- Grant permissions

##### 3.2.2 Sync Contacts

- Create lead in system → Contact in HubSpot
- Map custom properties
- Sync lifecycle stage
- Create deals for purchases

##### 3.2.3 Bidirectional Sync

- Update contact in HubSpot → Update lead
- Update lead → Update contact
- Webhook-based real-time sync

### 3.3 Pipedrive Integration

#### Test Scenarios:

- OAuth connection
- Sync leads as Persons
- Create Deals for purchases
- Two-way sync
- Activity logging

---

## 4. Email Service Providers

### 4.1 SendGrid Integration

#### Test Scenarios:

##### 4.1.1 SMTP Configuration

**Settings:**

- Host: smtp.sendgrid.net
- Port: 587 (TLS)
- Username: apikey
- Password: <API_KEY>

**Test:**

- Send test email
- Verify delivery
- Check SPF/DKIM records
- Monitor deliverability

##### 4.1.2 API Integration

**Endpoint:** `POST /api/integrations/sendgrid/send`

**Test Steps:**

- Send email via SendGrid API
- Template usage
- Personalization
- Attachments
- Track opens/clicks

##### 4.1.3 Webhook Events

**Endpoint:** `POST /api/webhooks/sendgrid`

**Test Events:**

- Delivered
- Opened
- Clicked
- Bounced
- Spam report
- Unsubscribed

**Test Steps:**

- Configure webhook URL in SendGrid
- Send test email
- Perform actions (open, click)
- Verify webhook received
- Update lead engagement data

### 4.2 Mailgun Integration

#### Test Scenarios:

- SMTP configuration
- API sending
- Webhook processing
- Bounce handling
- Suppression list sync

### 4.3 Amazon SES Integration

#### Test Scenarios:

- SMTP credentials
- SES API usage
- SNS webhook
- Bounce/complaint handling
- Sending limits monitoring

---

## 5. SMS Providers

### 5.1 Twilio Integration

**Primary SMS/Voice provider**

#### Test Scenarios:

##### 5.1.1 Account Configuration

**Settings:**

- Account SID
- Auth Token
- Default From Number

**Test:**

- Verify credentials: `GET https://api.twilio.com/2010-04-01/Accounts/{SID}.json`
- List phone numbers
- Check balance

##### 5.1.2 Send SMS

**Endpoint:** `POST /api/sms/send`

**Test Steps:**

- Send SMS to valid number
- Verify delivery
- Check message status
- Handle delivery webhook

##### 5.1.3 Receive SMS

**Endpoint:** `POST /api/webhooks/twilio/sms`

**Test Steps:**

- Send SMS to Twilio number
- Webhook received
- Parse message body
- Respond to sender
- Log conversation

##### 5.1.4 Voice Calls (Already covered in Call Tracking test plan)

- Make call
- Receive call
- Call recording
- Voicemail

##### 5.1.5 Webhooks

**Endpoints:**

- `/api/webhooks/twilio/sms` - SMS status
- `/api/webhooks/twilio/voice` - Call status
- `/api/webhooks/twilio/recording` - Recording ready

**Test Events:**

- Message sent, delivered, failed
- Call initiated, ringing, answered, completed
- Recording available

---

## 6. Payment Gateways

### 6.1 Stripe Integration

**Primary payment processor**

#### Test Scenarios:

##### 6.1.1 Account Connection (Already covered in Subscription test plan)

- Connect Stripe account
- Webhook configuration
- Test mode vs. Live mode

##### 6.1.2 Webhook Processing

**Endpoint:** `POST /api/webhooks/stripe`

**Test Events:**

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `charge.refunded`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

**Test Steps:**

- Trigger event in Stripe (or use Stripe CLI)
- Verify webhook received
- Verify signature validation
- Verify event processing
- Check database updates
- Verify user notifications

##### 6.1.3 Error Handling

- Invalid signature → Reject webhook
- Duplicate event ID → Idempotency
- Unknown event type → Log and ignore
- Processing error → Retry mechanism

---

## 7. AI/ML Services

### 7.1 Google Gemini AI

**Used for:** Lead quality scoring, chatbot, sentiment analysis

#### Test Scenarios:

##### 7.1.1 API Configuration

**Settings:**

- API key
- Model: gemini-pro
- Temperature, top-p parameters

**Test:**

- Verify API key: Test request
- Check quota/limits
- Monitor usage

##### 7.1.2 Lead Quality Scoring

**Endpoint:** `POST /api/ai/score-lead`

**Test Steps:**

- Submit lead data
- AI analyzes and scores (0-100)
- Verify score accuracy
- Check reasoning provided
- Test various lead qualities

##### 7.1.3 Chatbot Responses

**Endpoint:** `POST /api/chatbot/message`

**Test Steps:**

- Send user message
- AI generates response
- Response relevance
- Response tone
- Context maintenance

##### 7.1.4 Sentiment Analysis

**Endpoint:** `POST /api/ai/sentiment`

**Test Steps:**

- Analyze lead message/email
- Return sentiment (positive, neutral, negative)
- Confidence score
- Key phrases extraction

##### 7.1.5 Error Handling

- API quota exceeded
- Invalid API key
- Timeout handling
- Fallback responses

### 7.2 OpenAI Integration (if used)

#### Test Scenarios:

- API key configuration
- GPT model selection
- Prompt engineering
- Response quality
- Cost monitoring

---

## 8. Chat Widgets

### 8.1 Tawk.to Integration

#### Test Scenarios:

##### 8.1.1 Widget Installation

**Test Steps:**

- Add Tawk.to script to site
- Widget appears on page
- Widget loads correctly
- Mobile responsive

##### 8.1.2 Chat Functionality

- Start conversation
- Agent receives message
- Agent responds
- User receives response
- Conversation history

##### 8.1.3 Visitor Tracking

- Track visitor behavior
- Trigger proactive chat
- Capture visitor info

##### 8.1.4 Integration with Lead System

- Chat conversation → Create lead
- Capture contact info
- Store conversation history
- Assign to seller

### 8.2 Custom Chatbot Integration

#### Test Scenarios:

- Chatbot widget embed
- AI-powered responses
- Lead capture flow
- Handoff to human agent
- Analytics tracking

---

## 9. Analytics & Tracking

### 9.1 Google Analytics 4

#### Test Scenarios:

##### 9.1.1 Installation

- Add GA4 script
- Configure Measurement ID
- Test pageview tracking
- Verify in GA4 real-time

##### 9.1.2 Event Tracking

**Custom Events:**

- `lead_created`
- `form_submitted`
- `lead_purchased`
- `subscription_started`
- `checkout_completed`

**Test:**

- Trigger events
- Verify in GA4 DebugView
- Check event parameters
- Verify in GA4 reports

##### 9.1.3 E-commerce Tracking

- Track transactions
- Revenue tracking
- Product performance
- Conversion tracking

### 9.2 Facebook Pixel

#### Test Scenarios:

- Install pixel code
- Track page views
- Track custom events (Lead, Purchase)
- Verify in Facebook Test Events
- Custom audience creation

### 9.3 Google Tag Manager

#### Test Scenarios:

- Install GTM container
- Create tags (GA4, Facebook, etc.)
- Trigger configuration
- Variable setup
- Preview mode testing
- Publish container

---

## 10. Cloud Storage

### 10.1 AWS S3 (if used)

#### Test Scenarios:

##### 10.1.1 File Upload

**Endpoint:** `POST /api/upload`

**Test Steps:**

- Upload file (image, document, CSV)
- File stored in S3 bucket
- Verify bucket, key, region
- Check file permissions (private/public)
- Generate signed URL for download

##### 10.1.2 File Download

- Request file
- Generate signed URL
- Download file
- URL expiration (e.g., 1 hour)

##### 10.1.3 File Deletion

- Delete file from system
- Verify deleted from S3

### 10.2 Google Cloud Storage (if used)

#### Test Scenarios:

- Upload files
- Download via signed URLs
- Bucket policies
- File lifecycle management

---

## 11. Webhooks (Custom)

### 11.1 Outgoing Webhooks

#### Test Scenarios:

##### 11.1.1 Configure Webhook

**Endpoint:** `POST /api/webhooks`

**Payload:**

```json
{
  "url": "https://example.com/webhook",
  "events": ["lead.created", "lead.purchased"],
  "secret": "webhook_secret"
}
```

**Test:**

- Create webhook configuration
- Verify URL validation
- Store webhook details

##### 11.1.2 Trigger Webhook

**Test Steps:**

- Perform action (e.g., create lead)
- System sends webhook to configured URL
- **Verify payload:**
  ```json
  {
    "event": "lead.created",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "id": "lead_123",
      "email": "john@example.com",
      ...
    }
  }
  ```
- Verify HMAC signature in headers
- Verify retry logic on failure

##### 11.1.3 Webhook Security

- HMAC signature validation
- HTTPS only URLs
- IP whitelisting (optional)
- Secret rotation

##### 11.1.4 Webhook Logs

**Endpoint:** `GET /api/webhooks/logs`

**Test:**

- View webhook delivery attempts
- Success/failure status
- Response codes
- Retry count
- Payload sent

### 11.2 Incoming Webhooks

#### Test Scenarios:

- `/api/webhooks/zapier` - From Zapier
- `/api/webhooks/stripe` - From Stripe
- `/api/webhooks/twilio/sms` - From Twilio
- `/api/webhooks/facebook` - From Facebook

**Test for Each:**

- Signature verification
- Payload validation
- Processing logic
- Idempotency
- Error handling

---

## 12. Calendar Integration

### 12.1 Google Calendar

#### Test Scenarios:

##### 12.1.1 Connect Google Calendar

- OAuth authorization
- Select calendar
- Grant permissions

##### 12.1.2 Create Calendar Events

**Use Case:** Scheduled callbacks

**Test Steps:**

- Schedule callback for lead
- Event created in Google Calendar
- Verify event details (title, time, description)
- Add lead info to description
- Set reminder

##### 12.1.3 Sync Events

- Event updated in Google Calendar
- Update reflected in system
- Event deleted
- System updated

### 12.2 Outlook Calendar

#### Test Scenarios:

- OAuth connection
- Create events
- Sync events
- Handle conflicts

---

## 13. Map & Geolocation Services

### 13.1 Google Maps API

#### Test Scenarios:

##### 13.1.1 Geocoding

**Endpoint:** Internal wrapper to Google Geocoding API

**Test:**

- Convert address to lat/lng
- Display lead location on map
- Calculate distance between lead and buyer

##### 13.1.2 Map Display

- Display leads on map
- Cluster markers
- Info windows on click
- Filter by location

### 13.2 IP Geolocation

#### Test Scenarios:

- Detect visitor location by IP
- Personalize content by location
- Track lead sources geographically

---

## 14. Document Generation

### 14.1 PDF Generation

#### Test Scenarios:

##### 14.1.1 Invoice PDF

**Library:** Puppeteer or PDFKit

**Test Steps:**

- Generate invoice PDF
- Verify layout, branding
- All data present
- Download PDF
- Email PDF attachment

##### 14.1.2 Report PDF

- Generate analytics report
- Charts included
- Proper formatting
- Download/email

---

## 15. API Rate Limiting & Throttling

### 15.1 External API Rate Limits

#### Test Scenarios:

##### 15.1.1 Monitor API Usage

- Track API calls per integration
- Alert when approaching limit
- Graceful degradation

##### 15.1.2 Respect Rate Limits

- Google Ads API: X requests/day
- Facebook API: Y requests/hour
- Twilio: Z messages/second
- Implement backoff strategy
- Queue requests if needed

---

## Testing Checklist

### Pre-Testing Setup

- [ ] All integration accounts created (sandbox/test)
- [ ] API keys and credentials configured
- [ ] Webhook endpoints accessible (ngrok for local)
- [ ] Test data prepared

### Zapier Integration

- [ ] Connection setup
- [ ] Triggers (new lead, purchased, buyer, form)
- [ ] Actions (create lead, update, create buyer)
- [ ] Error handling

### Ad Platform Integrations

- [ ] Google Ads (OAuth, conversions, offline)
- [ ] Facebook Ads (OAuth, Conversion API, Lead Ads)
- [ ] LinkedIn Ads
- [ ] Microsoft Ads

### CRM Integrations

- [ ] Salesforce (OAuth, sync leads, two-way)
- [ ] HubSpot (OAuth, sync contacts)
- [ ] Pipedrive

### Email Service Providers

- [ ] SendGrid (SMTP, API, webhooks)
- [ ] Mailgun
- [ ] Amazon SES

### SMS & Voice

- [ ] Twilio (SMS send/receive, calls, webhooks)

### Payment Gateways

- [ ] Stripe (webhooks, events)

### AI/ML Services

- [ ] Gemini AI (lead scoring, chatbot, sentiment)
- [ ] OpenAI (if applicable)

### Chat Widgets

- [ ] Tawk.to integration
- [ ] Custom chatbot

### Analytics

- [ ] Google Analytics 4
- [ ] Facebook Pixel
- [ ] Google Tag Manager

### Cloud Storage

- [ ] AWS S3 / Google Cloud Storage

### Custom Webhooks

- [ ] Outgoing webhooks (configure, trigger, logs)
- [ ] Incoming webhooks (all sources)

### Calendar

- [ ] Google Calendar
- [ ] Outlook Calendar

### Other Services

- [ ] Google Maps API
- [ ] PDF Generation
- [ ] IP Geolocation

### Security & Error Handling

- [ ] Signature verification for all webhooks
- [ ] API authentication
- [ ] Rate limiting
- [ ] Error logging
- [ ] Retry mechanisms
- [ ] Graceful failure

### Performance

- [ ] Webhook processing time
- [ ] API response time
- [ ] Bulk data sync
- [ ] Concurrent integrations

---

## Test Data Requirements

### API Credentials (Test/Sandbox)

```
Zapier: Test API key
Google Ads: Test account ID
Facebook Ads: Test ad account
Stripe: Test API keys
Twilio: Test Account SID
Gemini AI: Test API key
```

### Test Accounts

- Test email addresses
- Test phone numbers (Twilio test numbers)
- Test credit cards (Stripe test cards)

---

## Automation Recommendations

### High Priority for Automation

1. Webhook signature validation
2. API connection tests
3. Data sync accuracy
4. Error handling flows
5. Retry mechanisms

### Manual Testing

1. OAuth flows (requires human interaction)
2. UI-based integrations
3. Complex multi-step integrations
4. Visual validation (maps, PDFs)

---

## Sign-off

| Role                   | Name | Date | Signature |
| ---------------------- | ---- | ---- | --------- |
| QA Lead                |      |      |           |
| Integration Specialist |      |      |           |
| Product Owner          |      |      |           |
