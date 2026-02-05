# AI Form Generator - Quick Start Guide

## Feature Overview

The AI Form Generator automatically creates lead capture forms based on your description. Simply describe the type of leads you want to capture, and the AI generates a complete form with appropriate fields.

## How to Use

### Step 1: Open Form Builder

Navigate to your form builder in the dashboard.

### Step 2: Click "Generate with AI"

Look for the purple button with a sparkle icon labeled **"Generate with AI"** in the field selection panel on the left.

### Step 3: Describe Your Leads

In the dialog box that appears, describe:

- What type of leads you want to capture
- What information you need from them
- Any specific fields or requirements

**Example:**
"I need to capture leads interested in solar panel installation. I need their name, email, phone, home address, roof type, current electricity bill range, and whether they have solar experience."

### Step 4: Generate

Click the **"Generate Form"** button. The AI will:

- Analyze your requirements
- Create appropriate form fields
- Auto-populate the form builder with generated fields
- Show a success message

### Step 5: Customize (Optional)

The generated form is now ready to use, but you can:

- **Edit field labels**: Click the edit icon on any field
- **Change field types**: Select dropdown in edit dialog
- **Add more fields**: Use the manual field buttons
- **Remove fields**: Click the delete icon
- **Reorder fields**: Drag and drop fields (if supported)

### Step 6: Publish

Once satisfied with your form:

1. Set the **Form Name** (required)
2. Select **Lead Source** (required)
3. Choose **Industry/Niche** (required)
4. Click **"Publish Form"**

## Example Prompts

### Real Estate

"Generate a form for home buyers. I need name, email, phone, target locations, budget, property type preferences, and timeline."

### Service Industry

"I provide HVAC services. I need customer name, phone, email, service type, issue description, address, and preferred appointment time."

### Lead Generation

"I'm collecting business leads. I need company name, contact person, phone, email, industry, company size, and business needs."

### Education

"I need student inquiry forms with name, email, phone, interested program, education background, and preferred start date."

### E-Commerce

"Generate a form for product pre-orders with customer name, email, phone, preferred delivery location, and product preferences."

## Tips for Best Results

1. **Be Specific**: The more details you provide, the better the form will be
   - ✅ Good: "Real estate leads interested in buying apartments in major cities with budget 200k-500k"
   - ❌ Vague: "Real estate leads"

2. **Include Contact Info**: Always mention that you need name/email/phone
   - Most forms need basic contact information

3. **List Field Types**: Mention if you want checkboxes, dropdowns, or text fields
   - Example: "...with a dropdown for property type (apartment, house, condo)"

4. **Mention Required Fields**: Specify which fields must be filled
   - Example: "I need their phone number (required) and budget (optional)"

5. **Define Options**: For dropdown/radio fields, list possible values
   - Example: "Service type selection: Plumbing, Electrical, HVAC, General Repair"

## What Happens Next?

After generation:

1. **Fields appear automatically** in the form builder
2. **Form name is pre-filled** from your description
3. **You can edit everything** before publishing
4. **Publish as usual** - the form works like any manually created form
5. **Track leads** through your dashboard

## Troubleshooting

### "Authorization Failed" Error

- You must be logged in as a **Seller**
- Check your account role in settings

### "Generating your form..." Takes Too Long

- API calls typically complete in 1-3 seconds
- If longer, try refreshing and regenerating
- Gemini API may be experiencing high load

### Generated Form Looks Wrong

- **Regenerate**: Close the dialog and try again with more specific details
- **Edit manually**: Use the manual field editing tools to fix issues
- **Combine methods**: Keep what's good, add/remove fields manually

### Some Fields Are Missing

- The AI interpreted your prompt differently
- Try being more specific about field names and types
- You can always add missing fields manually

### Form Won't Publish After Generation

- Check that **Form Name** is filled in
- Verify **Lead Source** is selected
- Ensure **Industry/Niche** is selected
- Try editing a few fields and republishing

## FAQ

**Q: Can I edit generated fields?**
A: Yes! Click the edit icon on any field to change its label, type, or required status.

**Q: Can I combine AI-generated and manual fields?**
A: Yes! After generation, use the field buttons to add more fields.

**Q: Is the generated form saved as a template?**
A: No, but you can use the same prompt again to regenerate similar forms.

**Q: Can I regenerate if I'm not happy?**
A: Yes! Close the dialog and click "Generate with AI" again with a different prompt.

**Q: What if my industry isn't covered?**
A: The AI works for any industry. Just describe your specific needs clearly.

**Q: Will my prompts be saved?**
A: Prompts are not saved. They're only used to generate the form once.

**Q: Can I use the generated form multiple times?**
A: Once published, the form works like any other form and can capture unlimited leads.

## Support

If you encounter issues:

1. Check your internet connection
2. Ensure GEMINI_API_KEY is configured on the server
3. Try a simpler, more specific prompt
4. Contact support with your prompt and error message

---

**Pro Tip**: Start with a detailed description, and refine from there. The more context you provide about your ideal lead, the better the form!
