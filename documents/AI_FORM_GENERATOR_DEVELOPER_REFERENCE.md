# AI Form Generator - Developer Reference

## Quick Facts

| Aspect                   | Details                           |
| ------------------------ | --------------------------------- |
| **Feature Name**         | AI Form Generator                 |
| **Component**            | Form Builder Dialog               |
| **API Endpoint**         | POST `/api/form/generate-with-ai` |
| **AI Model**             | Gemini 1.5 Flash                  |
| **Auth Required**        | Seller role                       |
| **Response Time**        | 1-3 seconds (typical)             |
| **Environment Variable** | GEMINI_API_KEY                    |
| **Status**               | ✅ Production Ready               |

## Code Locations

### Frontend

```
📁 app/components/leadcapture/
├── formbuilder.tsx          ← Main component with AI dialog
└── FormPreview.tsx          ← Form preview component
```

### Backend

```
📁 app/api/form/
├── generate-with-ai/
│   └── route.ts            ← Gemini API integration
├── route.ts                ← Form CRUD operations
└── submit/route.ts         ← Form submission
```

### Documentation

```
📁 documents/
├── AI_FORM_GENERATION_INTEGRATION.md     ← Technical docs
├── AI_FORM_GENERATOR_USER_GUIDE.md       ← User instructions
└── AI_FORM_GENERATOR_IMPLEMENTATION_SUMMARY.md ← Summary
```

## Key Files & Functions

### Frontend - formbuilder.tsx

**State Variables:**

```typescript
const [aiDialogOpen, setAiDialogOpen] = useState<boolean>(false);
const [aiPrompt, setAiPrompt] = useState<string>("");
const [isGenerating, setIsGenerating] = useState<boolean>(false);
```

**Main Handler:**

```typescript
const handleAIGenerate = async () => {
  // 1. Validate prompt
  // 2. Call /api/form/generate-with-ai
  // 3. Parse response
  // 4. Populate formName and fields
  // 5. Show success notification
};
```

**UI Components:**

- Button: "Generate with AI" (purple, icon-based)
- Dialog: AI generation modal
- TextField: Prompt input (5 rows, multiline)
- CircularProgress: Loading spinner

### Backend - generate-with-ai/route.ts

**Request:**

```typescript
POST /api/form/generate-with-ai
Content-Type: application/json

{
  "prompt": "string describing leads to capture"
}
```

**Response:**

```typescript
{
  "success": true,
  "data": {
    "formName": "string",
    "description": "string",
    "fields": [
      {
        "id": "unique_string",
        "type": "text|email|phone|select|checkbox|...",
        "label": "Field Label",
        "required": boolean,
        "options": ["option1", "option2"]
      }
    ]
  }
}
```

**Key Steps:**

1. Check seller authentication
2. Validate GEMINI_API_KEY
3. Validate prompt
4. Call Gemini API
5. Parse and validate response
6. Add field IDs
7. Return structured response

## Common Modifications

### Add New Field Type Support

1. Update type in FormBuilder:

```typescript
type: "text" |
  "email" |
  "phone" |
  "select" |
  "checkbox" |
  "textarea" |
  "date" |
  "number" |
  "radio" |
  "header" |
  "paragraph" |
  "NEW_TYPE"; // ← Add here
```

2. Update API route FormField interface

3. Add rendering logic in form preview

### Change AI Model

In `app/api/form/generate-with-ai/route.ts`:

```typescript
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2-flash:generateContent";
// Change from gemini-1.5-flash to gemini-2-flash, etc.
```

### Modify System Prompt

In `app/api/form/generate-with-ai/route.ts`, update the `systemPrompt`:

```typescript
const systemPrompt = `
Generate a form JSON structure that captures...
[Customize instructions here]
`;
```

### Add Rate Limiting

In `app/api/form/generate-with-ai/route.ts`:

```typescript
// Add before Gemini API call
if (!rateLimit.check(session.user.email)) {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

## Debugging

### Check API Key

```bash
echo $GEMINI_API_KEY
# Should output: sk-proj-xxx...
```

### Test API Endpoint

```bash
curl -X POST http://localhost:3000/api/form/generate-with-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "contact form with name and email"}'
```

### Browser DevTools

1. Open Network tab
2. Click "Generate with AI"
3. Look for `/api/form/generate-with-ai` request
4. Check Response tab for JSON structure
5. Check Console for JavaScript errors

### Server Logs

```bash
# Monitor Next.js server for API errors
npm run dev
# Look for log messages when AI generation is called
```

## Performance Tips

1. **Caching Prompts**: Store successful prompts to avoid re-generating
2. **Async Generation**: Current implementation is already async
3. **Progressive Loading**: Show spinner to indicate processing
4. **Error Recovery**: Allow retry on failure

## Security Checklist

- ✅ Role check: `session.user?.role !== "seller"`
- ✅ API Key: Stored in environment variable, never exposed
- ✅ Input validation: Prompt validated before API call
- ✅ Response validation: Fields structure checked
- ✅ Error handling: No sensitive data in error messages

## Testing

### Unit Test Example

```typescript
test("handleAIGenerate with valid prompt", async () => {
  // Mock fetch
  // Set aiPrompt state
  // Call handleAIGenerate
  // Assert fields are populated
  // Assert dialog closes
});
```

### Integration Test Example

```typescript
test("Complete AI form generation flow", async () => {
  // 1. Render FormBuilder component
  // 2. Click Generate with AI
  // 3. Enter prompt
  // 4. Click Generate
  // 5. Wait for API response
  // 6. Verify form fields appear
  // 7. Edit and publish form
});
```

## Monitoring

### Metrics to Track

- API response time
- Error rates (401, 500, etc.)
- Average prompt length
- Popular field types generated
- User satisfaction (if survey added)

### Error Logging

```typescript
catch (error) {
  console.error("AI generation failed:", {
    userId: session.user.id,
    prompt: aiPrompt.substring(0, 100),
    error: error.message,
    timestamp: new Date()
  });
}
```

## Future Enhancements

### Short Term

- [ ] Add prompt templates for common industries
- [ ] Cache successful forms by industry
- [ ] Add field suggestion based on lead type

### Medium Term

- [ ] AI refinement dialog (regenerate with modifications)
- [ ] Form analysis and improvement suggestions
- [ ] Multi-language support

### Long Term

- [ ] Machine learning on successful forms
- [ ] Predictive form optimization
- [ ] AI-powered form analytics

## Dependencies

**Runtime:**

- @mui/material (UI components)
- next (framework)
- next-auth (authentication)
- axios (HTTP requests)

**Build-time:**

- typescript (type checking)
- react (framework)

**External APIs:**

- Gemini API (Google AI)

## Environment Setup

### Development

```bash
# .env.local
GEMINI_API_KEY=your_development_key

# Start server
npm run dev
```

### Production

```bash
# Environment variables (set on deployment platform)
GEMINI_API_KEY=your_production_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Troubleshooting Common Issues

| Issue                 | Cause                    | Solution                |
| --------------------- | ------------------------ | ----------------------- |
| Button not appearing  | CSS not loaded           | Check MUI import        |
| Dialog won't open     | Event handler not firing | Check onClick binding   |
| API returns 401       | Non-seller user          | Check session.user.role |
| API returns 500       | Missing GEMINI_API_KEY   | Add to env vars         |
| Response parse error  | Invalid JSON from AI     | Improve system prompt   |
| Fields don't populate | Type mismatch            | Check field mapping     |

## Related Documentation

- [User Guide](AI_FORM_GENERATOR_USER_GUIDE.md)
- [Technical Details](AI_FORM_GENERATION_INTEGRATION.md)
- [Implementation Summary](AI_FORM_GENERATOR_IMPLEMENTATION_SUMMARY.md)
- [Gemini API Docs](https://ai.google.dev/gemini-2/docs)
- [Material-UI Docs](https://mui.com)

## Contact & Support

- **Questions:** Check documentation first
- **Bug Reports:** Include console errors and server logs
- **Feature Requests:** Create issue with use case details
- **Performance Issues:** Include response times and prompt length

---

**Last Updated:** 2024
**Maintained By:** Development Team
