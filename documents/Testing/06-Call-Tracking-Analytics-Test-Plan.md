# Call Tracking & Analytics Test Plan

## Overview

This document outlines all call tracking, call analytics, voice recording, transcription, and call-related workflows for comprehensive testing of the Lead Generation Web App.

---

## 1. Call Tracking Setup

### 1.1 Twilio Integration

#### Test Scenarios:

##### 1.1.1 Configure Twilio Account

**User Settings (Seller):**

- **Fields:**
  - twilioActivated: boolean
  - twilioAccountSid: string (format: AC + 32 chars)
  - twilioAuthToken: string (min 32 chars)

**Test Steps:**

1. Navigate to Settings → Integrations
2. Enter Twilio Account SID
3. Enter Twilio Auth Token
4. Validate format
5. Test connection
6. Enable twilioActivated
7. Save configuration

**Expected Results:**

- Credentials validated
- Connection successful
- twilioActivated set to true
- Ready to receive calls

##### 1.1.2 Tracking Numbers Management

**Endpoint:** `POST /api/calls/tracking` (implied from schema)

**TrackingNumber Schema Fields:**

- number: string (phone number)
- friendlyName: string
- isActive: boolean
- assignedTo: ObjectId (lead, campaign, buyer)
- callHandling: object
- recordings: array
- usageMetadata: object

**Test Steps:**

1. Purchase tracking number from Twilio
2. Configure call forwarding
3. Set friendly name
4. Assign to campaign/lead
5. Enable call recording
6. Set call handling rules
7. Activate number

**Call Handling Configuration:**

- Forward to primary number
- Play custom greeting
- Enable voicemail
- Whisper message
- Call screening
- Business hours routing

### 1.2 Hold Music Configuration

**Field:** `holdMusicUrl` (User schema)

#### Test Scenarios:

- Upload custom hold music
- Validate audio format (MP3, WAV)
- Test playback quality
- Default hold music fallback

---

## 2. Call Management

### 2.1 Initiate Call

#### Test Scenarios:

##### 2.1.1 Click-to-Call from Lead

- **Steps:**
  1. View lead details
  2. Click phone number / "Call" button
  3. Select tracking number (if multiple)
  4. Initiate call via Twilio
  5. Browser-based call OR forward to agent phone
- **Expected Results:**
  - Call initiated
  - Call record created
  - Status: "initiated"
  - Timer started

##### 2.1.2 Manual Dial

- Agent enters phone number
- Select tracking number
- Add call notes before dialing
- Link to existing lead (optional)

##### 2.1.3 Inbound Call

**Endpoint:** `POST /api/calls/twilio/inbound` (implied)

- **Steps:**
  1. Customer calls tracking number
  2. Twilio webhook fires
  3. Identify caller (number lookup)
  4. Link to lead (if exists)
  5. Route call based on rules
  6. Create call record
  7. Start recording (if enabled)

### 2.2 Call Record Creation

**Model:** `models/call.ts`

#### Test Scenarios:

##### 2.2.1 Call Record Fields

**Create and verify all fields:**

- callSid (Twilio unique ID)
- from (caller number)
- to (tracking/destination number)
- direction (inbound, outbound)
- status (queued, ringing, in-progress, completed, failed, busy, no-answer)
- duration (seconds)
- recordingUrl (if recorded)
- transcriptionUrl (if transcribed)
- startTime (timestamp)
- endTime (timestamp)
- leadId (linked lead)
- userId (seller/agent)
- buyerId (if buyer call)
- disposition (answered, voicemail, busy, no-answer, wrong-number)
- notes (agent notes)
- tags (categorization)
- aiFeedback (AI analysis)
- sentimentScore (from sentiment analysis)

##### 2.2.2 Call Status Progression

**Test Status Flow:**

1. queued → ringing
2. ringing → in-progress
3. in-progress → completed
4. Alternative: ringing → no-answer
5. Alternative: ringing → busy
6. Alternative: queued → failed

### 2.3 Call Duration Tracking

#### Test Scenarios:

- Start timer on call initiated
- Update duration during call
- Final duration on call end
- Accuracy validation (within 1 second)
- Billing duration vs actual duration

---

## 3. Call Recording

### 3.1 Enable Call Recording

#### Test Scenarios:

##### 3.1.1 Recording Configuration

- Enable recording per tracking number
- Enable recording per campaign
- Enable recording for all calls
- Recording consent message (legal compliance)
- Dual-channel recording (caller + agent separate)

##### 3.1.2 Start Recording

**Twilio Webhook:**

- Call connected
- Recording starts automatically
- Recording URL generated
- URL stored in call record
- Recording status: "in-progress"

##### 3.1.3 Stop Recording

- Call ends
- Recording finalized
- Final URL updated
- Recording status: "completed"
- Duration matches call duration

### 3.2 Access Call Recordings

#### Test Scenarios:

##### 3.2.1 Playback Recording

- Navigate to call record
- Click "Play Recording"
- Stream audio from Twilio
- Playback controls (play, pause, seek)
- Volume control
- Playback speed (1x, 1.5x, 2x)

##### 3.2.2 Download Recording

- Click "Download"
- Audio file downloaded (MP3/WAV)
- Filename: callSid_date_time.mp3
- File size validation

##### 3.2.3 Access Control

- Seller can access own call recordings
- Buyer can access calls for purchased leads (if permitted)
- Admin can access all recordings
- Encryption at rest and transit

### 3.3 Recording Storage & Retention

#### Test Scenarios:

- Recordings stored in Twilio
- Optional: Copy to own storage (S3, etc.)
- Retention policy configuration
- Auto-delete after X days
- Legal hold exceptions
- GDPR compliance (right to deletion)

---

## 4. Call Transcription

### 4.1 Generate Transcription

**Endpoint:** `POST /api/calls/transcription` (implied)

#### Test Scenarios:

##### 4.1.1 Automatic Transcription

**Twilio Speech-to-Text:**

- Recording completed
- Trigger transcription job
- Wait for completion
- Transcription URL generated
- Store in call record
- Status: "completed"

##### 4.1.2 Manual Transcription Request

- Admin/agent requests transcription
- Select call record
- Submit transcription request
- Process via API
- Receive transcription

##### 4.1.3 Transcription Quality

- Verify accuracy on sample calls
- Handle accents and dialects
- Background noise filtering
- Speaker identification (caller vs agent)
- Punctuation and formatting
- Timestamps for each sentence

### 4.2 View Transcription

#### Test Scenarios:

- Display transcription in call details
- Highlight keywords
- Search within transcription
- Export transcription (TXT, PDF)
- Link transcription segments to audio playback

### 4.3 Transcription Analytics

#### Test Scenarios:

- Extract keywords from transcription
- Sentiment analysis from text
- Intent detection
- Compliance monitoring (keywords, phrases)
- Call quality scoring

---

## 5. Call Disposition

### 5.1 Set Call Disposition

**Endpoint:** `PUT /api/calls/disposition`

#### Test Scenarios:

##### 5.1.1 Disposition Options

**Standard Dispositions:**

- Answered - Contact Made
- Voicemail - Left Message
- Voicemail - No Message Left
- Busy
- No Answer
- Wrong Number
- Do Not Call
- Callback Scheduled
- Sale Made
- Not Interested

##### 5.1.2 Set Disposition Post-Call

- Call ends
- Prompt agent for disposition
- Select from dropdown
- Add notes (optional)
- Tag call (optional)
- Save disposition
- Update call record

##### 5.1.3 Disposition Reporting

- Calls by disposition
- Conversion rate by disposition
- Follow-up needed filter
- Callback queue

---

## 6. Call Voicemail

### 6.1 Voicemail Handling

**Endpoint:** `POST /api/calls/voicemail`

#### Test Scenarios:

##### 6.1.1 Voicemail Recording

- No answer on call
- Route to voicemail
- Play greeting message
- Record voicemail (beep)
- Voicemail duration limit (e.g., 3 minutes)
- Save recording
- Create voicemail record

##### 6.1.2 Voicemail Notification

- Agent notified of new voicemail
- Email notification
- SMS notification (optional)
- In-app notification
- Voicemail count badge

##### 6.1.3 Voicemail Playback

**Endpoint:** `GET /api/calls/voicemail/[id]`

- List all voicemails
- Play voicemail recording
- View caller information
- Mark as read/unread
- Delete voicemail
- Return call from voicemail

##### 6.1.4 Voicemail Transcription

- Auto-transcribe voicemail
- Display transcription
- Search voicemail transcriptions
- Keyword alerts

---

## 7. Scheduled Callbacks

### 7.1 Schedule Callback

**Model:** `models/scheduledCallback.ts`
**Endpoint:** `POST /api/calls/scheduled-callbacks`

#### Test Scenarios:

##### 7.1.1 Create Scheduled Callback

- **Fields:**
  - leadId
  - contactNumber
  - scheduledTime
  - timezone
  - assignedTo (agent/buyer)
  - notes
  - status (pending, completed, cancelled)
- **Steps:**
  1. During call or post-call
  2. Click "Schedule Callback"
  3. Select date and time
  4. Add notes
  5. Assign to agent
  6. Save callback
- **Expected Results:**
  - Callback scheduled
  - Agent notified
  - Appears in calendar
  - Reminder set

##### 7.1.2 Callback Reminders

- Email reminder (30 mins before)
- In-app notification
- Desktop notification
- SMS reminder (optional)

##### 7.1.3 Execute Callback

**Endpoint:** `POST /api/calls/scheduled-callbacks/execute`

- Reminder fires
- Agent clicks "Call Now"
- Initiated call linked to callback
- Callback marked as "in-progress"
- On call end, mark as "completed"

##### 7.1.4 Manage Callbacks

- View all scheduled callbacks
- Filter by agent
- Filter by date
- Reschedule callback
- Cancel callback
- Callback queue/dashboard

---

## 8. Call Analytics

### 8.1 Call Analytics Dashboard

**Endpoint:** `GET /api/calls/analytics`

#### Test Scenarios:

##### 8.1.1 Call Volume Metrics

- **Display:**
  - Total calls (inbound, outbound)
  - Calls today
  - Calls this week
  - Calls this month
  - Trend line (calls over time)
  - Peak call times (hourly, daily)

##### 8.1.2 Call Duration Metrics

- Average call duration
- Total talk time
- Longest call
- Shortest call
- Duration distribution histogram

##### 8.1.3 Call Outcome Metrics

- Answered calls count & %
- Voicemail count & %
- No answer count & %
- Busy count & %
- Failed calls count & %
- Conversion rate
- Callbacks scheduled

##### 8.1.4 Call Quality Metrics

- First call resolution rate
- Average calls per lead
- Call abandonment rate
- Hold time statistics
- Agent talk time vs hold time ratio

### 8.2 Agent Performance Analytics

**Endpoint:** `GET /api/calls/analytics/agent/[id]`

#### Test Scenarios:

##### 8.2.1 Agent Metrics

- Calls handled
- Average handle time
- Conversion rate
- Calls per day
- Talk time percentage
- Hold time percentage
- After-call work time
- Disposition breakdown

##### 8.2.2 Agent Comparison

- Leaderboard (by calls, conversions)
- Performance trends
- Best practices identification

### 8.3 Buyer Call Analytics

**Endpoint:** `GET /api/buyers/callAnalytics`

#### Test Scenarios:

- Calls made by buyer to purchased leads
- Call outcome breakdown
- Response time to new leads
- Conversion rate
- ROI per call

---

## 9. Call AI Analysis

### 9.1 AI Call Feedback

**Module:** `lib/callAIAnalysis.ts`

#### Test Scenarios:

##### 9.1.1 Call Quality Analysis

**AI-Generated Feedback:**

- Overall call quality score (1-10)
- Communication clarity
- Professionalism
- Script adherence
- Objection handling
- Closing technique
- Improvement suggestions

##### 9.1.2 Call Summarization

- Auto-generate call summary
- Key points discussed
- Action items identified
- Follow-up requirements
- Decision outcome

##### 9.1.3 Keyword Detection

- Product/service mentioned
- Competitor mentions
- Pricing discussions
- Pain points identified
- Buying signals detected

---

## 10. Sentiment Analysis

### 10.1 Call Sentiment Scoring

**Module:** `lib/sentimentEngine.ts`
**Field:** `sentimentScore` (Call model)

#### Test Scenarios:

##### 10.1.1 Real-Time Sentiment

- Analyze call transcription
- Sentiment score: -1 (negative) to +1 (positive)
- Sentiment trends during call
- Identify turning points
- Alerts for negative sentiment

##### 10.1.2 Sentiment Breakdown

- Overall call sentiment
- Caller sentiment
- Agent sentiment
- Sentiment by call segment
- Emotion detection (frustration, happiness, confusion)

##### 10.1.3 Sentiment Reporting

- Average sentiment by agent
- Sentiment trends over time
- Correlation with outcomes
- Low sentiment alert system

---

## 11. Call Feedback Management

### 11.1 Post-Call Feedback

**Endpoint:** `POST /api/calls/feedback`

#### Test Scenarios:

##### 11.1.1 Agent Feedback

- Rate call quality (1-5 stars)
- Rate lead quality
- Add notes
- Tag call (hot-lead, follow-up-needed, etc.)
- Submit feedback

##### 11.1.2 Customer Feedback (IVR)

- Post-call survey
- "Rate your experience (1-5)"
- "Was your issue resolved?"
- Voice or keypad input
- Store feedback in call record

---

## 12. Do Not Call (DNC) Management

### 12.1 DNC List Management

**Endpoint:** `POST /api/calls/dnc`

#### Test Scenarios:

##### 12.1.1 Add to DNC

- Customer requests no contact
- Manually add number to DNC list
- Option during call (disposition: "Do Not Call")
- Import DNC list (CSV)
- Compliance with regulations

##### 12.1.2 DNC Enforcement

- Check number against DNC before calling
- Prevent outbound calls to DNC numbers
- Warning if attempting to call DNC number
- Remove from marketing campaigns
- Audit log of DNC additions

##### 12.1.3 DNC Removal

- Customer requests removal (rare)
- Admin approval required
- Audit trail

---

## 13. Call Routing & IVR

### 13.1 Intelligent Call Routing

#### Test Scenarios:

##### 13.1.1 Skills-Based Routing

- Route by lead industry
- Route by language preference
- Route by agent expertise
- Route by product/service

##### 13.1.2 Availability-Based Routing

- Route to available agents only
- Check working hours
- Queue if all busy
- Overflow to voicemail

##### 13.1.3 Priority Routing

- VIP leads first
- High-quality leads priority
- Callback priority over new calls

### 13.2 Interactive Voice Response (IVR)

#### Test Scenarios:

##### 13.2.1 IVR Menu

**Example Flow:**

1. "Thank you for calling. Press 1 for sales, 2 for support."
2. Caller presses 1
3. "You'll be connected to our sales team."
4. Route to sales queue

##### 13.2.2 IVR Configuration

- Multi-level menus
- Dynamic menus (based on CRM data)
- Business hours messages
- Holiday messages
- Queue position announcements

---

## 14. Call Queue Management

### 14.1 Call Queue

#### Test Scenarios:

##### 14.1.1 Queue Configuration

- Maximum queue size
- Maximum wait time
- Queue priority rules
- Overflow handling (voicemail, callback)
- Queue position messaging

##### 14.1.2 Queue Monitoring

- Real-time queue dashboard
- Calls in queue
- Average wait time
- Longest wait time
- Abandoned calls

##### 14.1.3 Agent Queue Management

- View next call in queue
- Accept call
- Defer call
- Escalate call

---

## 15. Call Whisper & Screening

### 15.1 Call Whisper

#### Test Scenarios:

- Agent answers call
- Whisper message plays (caller can't hear)
- "This is a call from lead: John Smith, Industry: Technology"
- Whisper ends, caller connected
- Agent prepared with context

### 15.2 Call Screening

#### Test Scenarios:

- Caller states name/purpose (recorded)
- Agent hears recording
- Option to accept, reject, or send to voicemail
- Spam call prevention

---

## 16. Call Transfer & Conference

### 16.1 Call Transfer

#### Test Scenarios:

##### 16.1.1 Warm Transfer

- Agent speaks to recipient first
- Explain context
- Connect caller
- Agent drops off

##### 16.1.2 Cold Transfer

- Transfer without introduction
- Caller directly connected

##### 16.1.3 Transfer to Voicemail

- Transfer to specific agent's voicemail
- Leave message

### 16.2 Conference Calls

#### Test Scenarios:

- Add third party to call
- Multiple participants
- Conference controls (mute, drop participant)
- Conference recording

---

## 17. Call Tracking by Campaign

### 17.1 Campaign-Specific Tracking

#### Test Scenarios:

- Assign tracking number to campaign
- Track calls from specific ads
- Track calls from specific forms
- Attribution reporting
- ROI per campaign

### 17.2 Dynamic Number Insertion (DNI)

#### Test Scenarios:

- Display different tracking number based on:
  - Traffic source
  - Visitor session
  - Geographic location
- Track source attribution
- Pool management

---

## 18. Buyer Call Performance

### 18.1 Buyer Call Tracking

**Endpoint:** `GET /api/buyers/buyer-performance`

#### Test Scenarios:

##### 18.1.1 Response Time Tracking

- Time between lead assignment and first call
- Average response time
- Response time by lead quality
- Response time goals/SLAs

##### 18.1.2 Call Frequency

- Calls per lead
- Optimal call frequency
- Over-calling detection
- Under-follow-up alerts

##### 18.1.3 Conversion Tracking

- Calls that led to conversions
- Conversion rate by call count
- Best practices identification

---

## 19. Call Cost Management

### 19.1 Call Pricing

**User Schema:** `callChargeOptions`

#### Test Scenarios:

##### 19.1.1 Configure Call Pricing

- Per-minute rate
- Connection fee
- Inbound vs outbound rates
- International rates
- Buyer call charges

##### 19.1.2 Call Billing

- Track call duration
- Calculate cost
- Deduct from buyer wallet
- Invoice generation
- Cost breakdown by campaign

##### 19.1.3 Call Budget Management

- Set call budget limits
- Real-time budget tracking
- Alert at thresholds
- Prevent over-spending

---

## 20. Compliance & Recording Consent

### 20.1 Call Recording Consent

#### Test Scenarios:

##### 20.1.1 Two-Party Consent States

**States requiring both parties consent:**

- California, Connecticut, Florida, etc.
- Play consent message
- "This call may be recorded for quality purposes."
- Confirm consent or disconnect

##### 20.1.2 One-Party Consent States

- Recording allowed with one party consent
- Notify as courtesy
- No explicit consent required

##### 20.1.3 Consent Logging

- Log consent acceptance
- Timestamp
- Recording ID linked
- Audit trail

---

## 21. Call Integration with Leads

### 21.1 Link Calls to Leads

#### Test Scenarios:

- Automatic linking (caller ID match)
- Manual linking (agent selects lead)
- Create lead from call (new contact)
- View all calls for a lead
- Call history timeline
- Call activity in lead details

### 21.2 Call-Based Lead Scoring

#### Test Scenarios:

- Increase score on call answered
- Decrease score on no-answer
- Engagement scoring
- Readiness-to-buy indicators

---

## 22. Call Reports & Export

### 22.1 Call Reports

#### Test Scenarios:

- Daily call report
- Weekly call summary
- Monthly performance report
- Agent performance report
- Campaign attribution report
- Export to CSV, PDF

### 22.2 Call Logs

#### Test Scenarios:

- Complete call log
- Filter by date, agent, disposition
- Search by phone number
- Export call log
- Compliance audit reports

---

## Testing Checklist

### Pre-Testing Setup

- [ ] Twilio account configured
- [ ] Tracking numbers purchased
- [ ] Webhooks configured
- [ ] Recording enabled
- [ ] Transcription service enabled
- [ ] Test phone numbers ready

### Functional Testing

- [ ] Call initiation (inbound/outbound)
- [ ] Call recording
- [ ] Call transcription
- [ ] Voicemail handling
- [ ] Scheduled callbacks
- [ ] Call disposition
- [ ] DNC management
- [ ] Call routing

### Analytics Testing

- [ ] Call volume metrics
- [ ] Call duration tracking
- [ ] Agent performance
- [ ] Buyer performance
- [ ] Sentiment analysis
- [ ] AI feedback

### Integration Testing

- [ ] Twilio integration
- [ ] Lead linkage
- [ ] CRM integration
- [ ] Payment integration (call billing)
- [ ] Notification system

### Compliance Testing

- [ ] Recording consent
- [ ] DNC enforcement
- [ ] Data retention policies
- [ ] Privacy regulations
- [ ] Audit trail

### Performance Testing

- [ ] Concurrent calls handling
- [ ] Queue management
- [ ] Recording storage
- [ ] Transcription performance
- [ ] Dashboard load time

---

## Test Data Requirements

### Test Phone Numbers:

```
Test Caller: +1-555-001-0001
Test Agent: +1-555-002-0002
Test Tracking: +1-555-003-0003
DNC Number: +1-555-999-9999
```

### Sample Call Dispositions:

```json
{
  "dispositions": [
    "Answered - Contact Made",
    "Voicemail - Message Left",
    "No Answer",
    "Busy",
    "Wrong Number",
    "Do Not Call"
  ]
}
```

---

## Automation Recommendations

### High Priority

1. Call status progression
2. Recording storage
3. Transcription processing
4. Disposition setting
5. Analytics calculations
6. DNC enforcement

### Manual Testing

1. Call quality assessment
2. Transcription accuracy
3. IVR usability
4. Agent experience
5. Recording playback quality

---

## Sign-off

| Role            | Name | Date | Signature |
| --------------- | ---- | ---- | --------- |
| QA Lead         |      |      |           |
| Operations Lead |      |      |           |
| Dev Lead        |      |      |           |
