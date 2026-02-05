# AI Form Generation Integration

## Overview

Successfully integrated Gemini AI-powered form generation into the form builder. Users can now describe the leads they want to capture via a text prompt, and the AI automatically generates form fields, labels, and structure.

## Architecture

### Components Modified

#### 1. Form Builder Component

**File:** [app/components/leadcapture/formbuilder.tsx](app/components/leadcapture/formbuilder.tsx)

**Changes:**

- Added AI generation dialog interface
- New state variables:
  - `aiDialogOpen` (boolean): Controls AI generation dialog visibility
  - `aiPrompt` (string): Stores user's lead description prompt
  - `isGenerating` (boolean): Loading state during API call
- New handler: `handleAIGenerate()` - Calls API endpoint and populates form fields
- New UI elements:
  - "Generate with AI" button (purple, icon-based) in field selector
  - Modal dialog for prompt input
  - Loading state with spinner
  - Auto-population of form fields on successful generation

**Integration Points:**

- Button placement: Below "Contact Fields" button in left sidebar
- Dialog styling: Material-UI Dialog with form controls
- Error handling: Snackbar notifications for success/failure

### Backend API

#### 2. Gemini Integration Route

**File:** [app/api/form/generate-with-ai/route.ts](app/api/form/generate-with-ai/route.ts)

**Functionality:**

- POST endpoint: `/api/form/generate-with-ai`
- Required parameter: `prompt` (string describing leads to capture)
- Authentication: Requires seller role (NextAuth)
- AI Model: Gemini 1.5 Flash
- Response format:
  ```json
  {
    "success": true,
    "data": {
      "formName": "Generated Form Name",
      "description": "Form description",
      "fields": [
        {
          "id": "unique_id",
          "type": "text|email|phone|select|checkbox|textarea|date|number|radio",
          "label": "Field Label",
          "required": false,
          "options": ["option1", "option2"] // for select/radio/checkbox
        }
      ]
    }
  }
  ```

**System Prompt:**
The AI is instructed to:

- Generate realistic field names and labels based on the lead type
- Use appropriate field types (email for email addresses, phone for phone, etc.)
- Create logical form structure
- Return valid JSON with all required fields
- Return form name and description based on prompt

**Error Handling:**

- Missing GEMINI_API_KEY: Returns 500 with clear message
- Unauthorized (non-seller): Returns 401
- JSON parse errors: Returns 500 with parse error details
- Invalid field structure: Returns 500 with structure validation error

## Workflow

### User Journey

1. **Access Form Builder**: Navigate to form builder component
2. **Choose Generation Method**:
   - Click "Generate with AI" button (purple button with sparkle icon)
   - OR manually add fields using existing buttons
3. **Describe Requirements**:
   - Open AI generation dialog
   - Enter prompt describing leads (e.g., "Home renovation leads with budget and timeline")
4. **Generate Form**:
   - Click "Generate Form" button
   - System calls Gemini API with prompt
   - Form fields auto-populate
5. **Edit & Customize**:
   - Edit field labels, types, or required status
   - Add/remove fields manually
   - Arrange field order
6. **Publish**:
   - Set form name and lead source
   - Click "Publish Form"

## Field Type Mapping

The following field types are supported:

- `text`: Single-line text input (default)
- `email`: Email input with validation
- `phone`: Phone number input
- `textarea`: Multi-line text area
- `select`: Dropdown selection
- `radio`: Single selection radio buttons
- `checkbox`: Multiple selection checkboxes
- `date`: Date picker
- `number`: Numeric input
- `header`: Section header/heading
- `paragraph`: Informational text block

## Example Prompts

### Example 1: Real Estate

```
I need to capture real estate leads interested in buying a home.
I need their name, email, phone, preferred locations, budget range,
property type they're interested in (apartment, house, commercial),
timeline for purchase, and whether they're first-time buyers.
```

**Generated Fields:**

- Full Name (text, required)
- Email Address (email, required)
- Phone Number (phone, required)
- Preferred Locations (select with multiple options)
- Budget Range (select with ranges)
- Property Type (radio: Apartment, House, Commercial)
- Purchase Timeline (select: Immediate, 1-3 months, 3-6 months, etc.)
- First-Time Buyer (checkbox)

### Example 2: Service Booking

```
Generate a form for plumbing service booking.
Need customer name, phone, email, service type needed (drain cleaning,
pipe repair, water heater, etc.), current issue description,
preferred appointment window, and property type.
```

**Generated Fields:**

- Customer Name (text, required)
- Contact Phone (phone, required)
- Email Address (email, required)
- Service Type (select: Drain Cleaning, Pipe Repair, Water Heater, etc.)
- Issue Description (textarea, required)
- Preferred Appointment Window (select options)
- Property Type (radio: Residential, Commercial, Other)

## Configuration

### Environment Variables Required

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### API Rate Limits

- Gemini API has standard rate limits per project
- Implement rate limiting on backend if needed for production scale

## Error Scenarios & Handling

| Scenario                     | HTTP Status | Response                         | User Action          |
| ---------------------------- | ----------- | -------------------------------- | -------------------- |
| Missing GEMINI_API_KEY       | 500         | "Gemini API key not configured"  | Contact admin        |
| User not authenticated       | 401         | "Unauthorized"                   | Login                |
| Non-seller role              | 401         | "Unauthorized"                   | Use seller account   |
| Empty prompt                 | Client-side | Validation error                 | Fill in prompt       |
| Gemini API failure           | 500         | API error message                | Retry                |
| Invalid JSON response        | 500         | "Failed to parse AI response"    | Try different prompt |
| Malformed response structure | 500         | "Invalid form structure from AI" | Try different prompt |

## Testing Checklist

- [ ] Verify GEMINI_API_KEY is set in environment
- [ ] Click "Generate with AI" button opens dialog
- [ ] Dialog closes when Cancel is clicked
- [ ] Empty prompt shows validation error
- [ ] Generate button is disabled until prompt is filled
- [ ] API call succeeds and returns fields
- [ ] Form name auto-populates
- [ ] Fields auto-populate in form builder
- [ ] Generated fields can be edited (label, type, required)
- [ ] Generated fields can be deleted
- [ ] Form with AI-generated fields publishes successfully
- [ ] Error cases show appropriate snackbar messages
- [ ] Multiple different prompts generate different field structures
- [ ] Form preview works with generated fields

## Performance Considerations

- **API Call Duration**: Gemini 1.5 Flash typically responds in 1-3 seconds
- **UI Responsiveness**: Loading spinner indicates processing
- **Dialog Management**: Dialog prevents interaction during generation
- **Error Recovery**: Clear error messages allow user to retry

## Security Considerations

1. **Authentication**: Only sellers can generate forms
2. **Input Validation**: Prompt text is validated before sending to API
3. **API Key Protection**: Kept in environment variables, never exposed
4. **Response Validation**: Generated fields are validated before populating
5. **XSS Protection**: Material-UI components handle text sanitization

## Future Enhancements

1. **Prompt Refinement**: Allow users to regenerate with different prompts
2. **Template Library**: Save successful prompts as templates
3. **Form Suggestions**: Show example prompts for different industries
4. **Batch Generation**: Generate multiple form variations for A/B testing
5. **AI-Powered Field Validation**: Suggest validation rules based on field type
6. **Lead Quality Optimization**: AI recommends fields that improve lead quality

## Integration Notes

- No database migrations required
- No dependency installations needed (Gemini API client used via HTTP)
- Backward compatible with existing form builder
- Works alongside manual field creation
- Generated forms treated same as manually created forms

## Documentation References

- [Gemini API Documentation](https://ai.google.dev/gemini-2/docs)
- [Form Builder Component](app/components/leadcapture/formbuilder.tsx)
- [API Route](app/api/form/generate-with-ai/route.ts)
- [Form Model](models/form.ts)
