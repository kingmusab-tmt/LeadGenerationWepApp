# AI Form Generator - UI/UX Overview

## User Interface Flow

### 1. Form Builder Main Screen

```
┌─────────────────────────────────────────────────────────────┐
│ FORM BUILDER                                                 │
├──────────────────┬──────────────────────────────────────────┤
│ FIELD SELECTOR   │ FORM DETAILS & PREVIEW                  │
│ ┌──────────────┐ │ Form Name: [________________]            │
│ │ Add Fields   │ │ Lead Source: [SELECT DROPDOWN]          │
│ │              │ │ Industry: [SELECT DROPDOWN]             │
│ │ ┌──────────┐ │ │                                         │
│ │ │ Contact  │ │ │ [PREVIEW OF FORM FIELDS]                │
│ │ │ Fields   │ │ │ - First Name (text)                    │
│ │ └──────────┘ │ │ - Email (email)                         │
│ │              │ │ - Phone (phone)                         │
│ │ ┌──────────┐ │ │                                         │
│ │ │✨Generate │ │ │ [PUBLISH FORM]                          │
│ │ │ with AI  │ │ │                                         │
│ │ └──────────┘ │ │                                         │
│ │              │ │                                         │
│ │ ┌──────────┐ │ │                                         │
│ │ │Text Input│ │ │                                         │
│ │ └──────────┘ │ │                                         │
│ │              │ │                                         │
│ └──────────────┘ │                                         │
└──────────────────┴──────────────────────────────────────────┘

KEY: [✨] = "Generate with AI" Button (Purple)
```

### 2. AI Generation Dialog (After Clicking Generate with AI)

```
┌────────────────────────────────────────┐
│ ✨ Generate Form with AI               │
├────────────────────────────────────────┤
│                                        │
│ Describe the leads you want to capture │
│ ┌──────────────────────────────────────┐ │
│ │ Example: I need to capture home      │ │
│ │ renovation leads with information    │ │
│ │ about their project type, budget,    │ │
│ │ timeline, property location, and     │ │
│ │ contact details.                     │ │
│ │                                      │ │
│ │ [user enters text here...]           │ │
│ └──────────────────────────────────────┘ │
│                                        │
│ Describe the type of leads and fields  │
│ you need. The AI will generate a form  │
│ structure for you.                     │
│                                        │
├────────────────────────────────────────┤
│                    [Cancel] [Generate] │
└────────────────────────────────────────┘
```

### 3. AI Generating State (Loading)

```
┌────────────────────────────────────────┐
│ ✨ Generate Form with AI               │
├────────────────────────────────────────┤
│                                        │
│ Describe the leads you want to capture │
│ ┌──────────────────────────────────────┐ │
│ │ I need home renovation leads with    │ │
│ │ project type, budget, timeline...    │ │
│ └──────────────────────────────────────┘ │
│                                        │
│ ⟳ Generating your form...              │
│                                        │
│                                        │
├────────────────────────────────────────┤
│          [Cancel] [Generating...] (disabled) │
└────────────────────────────────────────┘
```

### 4. After Generation - Form Fields Populated

```
┌──────────────────────────────────────────────────────────────┐
│ FORM BUILDER                                                  │
├──────────────────┬────────────────────────────────────────────┤
│ FIELD SELECTOR   │ FORM DETAILS                              │
│ ┌──────────────┐ │ Form Name: Home Renovation Lead Capture   │
│ │Generated:    │ │ Lead Source: [Online Form]                │
│ │              │ │ Industry: [Renovation]                    │
│ │ ☑ Full Name  │ │                                          │
│ │ ☑ Email      │ │ FIELDS GENERATED:                        │
│ │ ☑ Phone      │ │ 1. Full Name (text, required)           │
│ │ ☑ Project    │ │ 2. Email (email, required)              │
│ │   Type       │ │ 3. Phone (phone)                        │
│ │ ☑ Budget     │ │ 4. Project Type (select)                │
│ │ ☑ Timeline   │ │    - Kitchen Remodel                    │
│ │ ☑ Property   │ │    - Bathroom Remodel                   │
│ │   Location   │ │    - New Addition                       │
│ │              │ │ 5. Budget (select)                      │
│ │ [Add more]   │ │    - $5K-$10K                           │
│ │ [Edit fields]│ │    - $10K-$25K                          │
│ │              │ │ 6. Timeline (radio)                     │
│ │              │ │    - Immediate                          │
│ │              │ │    - 1-3 months                         │
│ │              │ │ 7. Property Location (text)             │
│ │              │ │                                          │
│ │ [PUBLISH ↓]  │ │ ✅ SUCCESS! Form generated successfully │
│ └──────────────┘ │                                          │
└──────────────────┴────────────────────────────────────────────┘
```

## Color Scheme

```
Primary Colors:
- Purple (#9c27b0): AI Button & Dialog Header Icon
- Dark Purple (#7b1fa2): AI Button on Hover
- Blue (#1976d2): Other primary buttons
- Green: Success messages

Typography:
- Headers: Material-UI Typography h6
- Body: Material-UI Typography body2
- Helper Text: Small, gray

Spacing:
- Button margin-bottom: 1-2rem
- Dialog padding: 16-32px
- Field spacing: 8-16px
```

## Button States

### Normal State (Enabled)

```
┌──────────────────────────┐
│ ✨ Generate with AI      │ ← Purple background (#9c27b0)
└──────────────────────────┘
  Hover: Darker purple (#7b1fa2)
  Click: Ripple effect
```

### Disabled State

```
┌──────────────────────────┐
│ ✨ Generate with AI      │ ← Gray/disabled appearance
└──────────────────────────┘
  When: Prompt is empty or already generating
```

### Loading State

```
┌──────────────────────────┐
│ ⟳ Generating...         │ ← Disabled, text changes
└──────────────────────────┘
```

## Success/Error Notifications

### Success Message

```
┌────────────────────────────────────────┐
│ ✓ Form generated successfully! You can │
│   now edit and customize it.           │
└────────────────────────────────────────┘
  Position: Bottom of screen
  Duration: 6 seconds auto-dismiss
  Color: Green
```

### Error Message (No Prompt)

```
┌────────────────────────────────────────┐
│ ✗ Please enter a description of the    │
│   leads you want to capture.           │
└────────────────────────────────────────┘
  Position: Bottom of screen
  Duration: 6 seconds auto-dismiss
  Color: Red
```

### Error Message (API Failure)

```
┌────────────────────────────────────────┐
│ ✗ Failed to generate form with AI:     │
│   Invalid form structure from AI       │
│   (Suggestion: Try a different prompt) │
└────────────────────────────────────────┘
```

## Field Editing After Generation

```
Original Generated Fields:
- Full Name (text, required)
- Email (email, required)
- Phone (phone)
- Project Type (select)
- Budget (select)
- Timeline (radio)
- Property Location (text)

User can:
┌─────────────────┐
│ Edit Label      │ → Change "Full Name" to "Customer Name"
├─────────────────┤
│ Change Type     │ → Change text to email, textarea, etc.
├─────────────────┤
│ Edit Options    │ → Change select options, radio choices
├─────────────────┤
│ Toggle Required │ → Make optional fields required
├─────────────────┤
│ Delete Field    │ → Remove fields not needed
├─────────────────┤
│ Add Fields      │ → Add more manually
└─────────────────┘
```

## Responsive Design

### Desktop (1024px+)

```
┌────────────────────────────────────────┐
│ [Sidebar] [Main Content]               │
│ Width: Full                            │
└────────────────────────────────────────┘
```

### Tablet (600px-1023px)

```
┌────────────────────────────────────────┐
│ [Sidebar] [Main Content]               │
│ Width: Full (adjusted spacing)         │
└────────────────────────────────────────┘
```

### Mobile (< 600px)

```
┌──────────────────┐
│ [Sidebar]        │  Stacked vertically
│ [Main Content]   │  Full width
└──────────────────┘
Font sizes reduced
Buttons full width
```

## Accessibility Features

```
✓ ARIA Labels: All buttons have descriptive labels
✓ Tooltips: Hover shows helpful descriptions
✓ Focus States: Keyboard navigation supported
✓ Color Contrast: WCAG AA compliant
✓ Helper Text: Clear instructions under inputs
✓ Error Messages: Clear and actionable
✓ Loading States: Visual indicator during processing
```

## Keyboard Navigation

```
TAB:    Move to next interactive element
SHIFT+TAB: Move to previous interactive element
ENTER:  Activate buttons or submit form
ESC:    Close dialogs (if not generating)
SPACE:  Toggle checkboxes, open dropdowns
```

## User Journey Visualization

```
START
  ↓
[Click "Generate with AI"]
  ↓
[Dialog Opens with Text Area]
  ↓
[User Enters Prompt]
  ↓
[Click "Generate Form"]
  ↓
[Loading Spinner Shows] (1-3 seconds)
  ↓
[API Response Received]
  ↓
[Form Fields Auto-Populate]
  ↓
[Dialog Closes]
  ↓
[Success Notification]
  ↓
[User Can Edit Fields]
  ↓
[User Clicks Publish]
  ↓
[Form Published]
  ↓
END
```

## Dialog Layout Details

```
DIALOG
┌─────────────────────────────────┐
│ [Icon] Title                    │  ← DialogTitle
├─────────────────────────────────┤
│                                 │
│ Label: Describe the leads...    │
│ ┌───────────────────────────────┐ │  ← DialogContent
│ │ [5-line Text Area]            │ │
│ │ [Placeholder + Helper Text]   │ │
│ └───────────────────────────────┘ │
│                                 │
│ [Loading Spinner if generating] │
│                                 │
├─────────────────────────────────┤
│              [Cancel] [Generate] │  ← DialogActions
└─────────────────────────────────┘

Sizing:
- Max Width: 600px (sm)
- Full Width: 100% on mobile
```

## Example Generated Forms

### Real Estate Form

```
INPUT: "Home buyer leads with budget 200k-500k"
OUTPUT:
✓ Full Name (text, required)
✓ Email Address (email, required)
✓ Phone Number (phone, required)
✓ Target Cities (select - dropdown)
✓ Budget Range (select - $200K-$300K, $300K-$400K, etc.)
✓ Property Type (radio - Apartment, House, Commercial)
✓ Purchase Timeline (select - Immediate, 1-3mo, 3-6mo)
✓ First-Time Buyer (checkbox)
```

### HVAC Service Form

```
INPUT: "HVAC service booking with issue type"
OUTPUT:
✓ Customer Name (text, required)
✓ Phone Number (phone, required)
✓ Email Address (email, required)
✓ Service Type (select - AC Repair, Heating, Maintenance, Emergency)
✓ Describe Issue (textarea, required)
✓ System Type (select - Central AC, Window Unit, Heat Pump)
✓ Preferred Date (date)
```

## Material-UI Component Reference

```typescript
Components Used:
- Dialog / DialogTitle / DialogContent / DialogActions
- TextField (multiline)
- Button (contained, outlined)
- CircularProgress (loading spinner)
- Tooltip (help text)
- Box (flex layout)
- Snackbar / Alert (notifications)
- Typography (text)

Theme Colors:
- primary: #1976d2
- success: #4caf50
- error: #f44336
- warning: #ff9800
- info: #2196f3
```

---

**Visual Design Status:** ✅ Complete
**Responsive Design:** ✅ Mobile-friendly
**Accessibility:** ✅ WCAG AA Compliant
