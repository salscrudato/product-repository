# User Guide - New Features

## 🤖 AI Builder Page

### Access
- Navigate to **AI Builder** from the main navigation menu
- URL: `/ai-builder`

### How to Use
1. **Start a Conversation**: Type your product vision in the chat input
   - Example: "Create a condo insurance product similar to HO3"
   - Example: "Build a cyber liability product for tech companies"

2. **Use Suggestions**: Click any suggestion chip to quickly start a conversation
   - Pre-populated suggestions based on common product types

3. **Get Intelligent Recommendations**:
   - AI analyzes existing products and coverages
   - Suggests optimal coverage combinations
   - Recommends appropriate forms
   - Provides step-by-step guidance

4. **Rich Formatting**: Responses include markdown formatting for:
   - Bullet points and lists
   - Code blocks
   - Emphasis and headers

### Tips
- Be specific about your product requirements
- Ask follow-up questions for clarification
- Use the AI to understand product structures
- Reference existing products for comparison

---

## 🏗️ Builder Page

### Access
- Navigate to **Builder** from the main navigation menu
- URL: `/builder`

### Step 1: Browse Coverage Library
1. **Search**: Use the search bar to find coverages by name or code
2. **Filter**: 
   - Filter by Product (dropdown)
   - Filter by Category (dropdown)
3. **Select**: Click coverage cards to select them
   - Selected coverages highlight in blue
   - Visual feedback shows selection status

### Step 2: View Coverage Details
- **Automatically Loaded** when you select a coverage:
  - Number of sub-coverages
  - Associated limits
  - Associated deductibles
  - Linked forms
- Details appear in the right panel

### Step 3: Create Product
1. **Fill Product Details**:
   - **Product Name** (required): e.g., "Homeowners Insurance"
   - **Form Number** (required): e.g., "HO-001"
   - **Product Code** (optional): e.g., "HO"
   - **Effective Date** (required): Select from date picker

2. **Upload Form** (optional):
   - Click the file upload area
   - Select a PDF form
   - File name displays when selected

3. **Create Product**:
   - Click "Create Product" button
   - System automatically:
     - Creates product in database
     - Clones selected coverages
     - Uploads form file to storage
     - Links form to all selected coverages
     - Creates form-coverage relationships

### Tips
- Select multiple coverages to build comprehensive products
- Upload forms during creation for automatic linking
- Use search to quickly find specific coverages
- Check coverage details before creating product

---

## 📋 Claims Analysis Page

### What Changed
- **Forms List**: Now only shows forms with PDF uploads
- **Benefit**: Cleaner interface, only actionable forms displayed
- **Hidden**: Forms without PDF files are automatically filtered out

### How to Use
1. Navigate to **Claims Analysis**
2. Browse available forms (all have PDFs)
3. Select forms for claims analysis
4. All forms shown are ready to download/use

---

## 🔗 Form-Coverage Linking

### Automatic Linking
When you create a product with a form upload:
- Form is automatically linked to all selected coverages
- No manual linking required
- Relationships stored in `formCoverages` collection

### Manual Linking (if needed)
- Use Coverage Screen for manual form-coverage linking
- Select coverage → Link forms
- Changes reflected immediately

---

## 📊 Data Inheritance

### What It Means
When you select a coverage in the Builder:
- **Sub-coverages**: All child coverages automatically loaded
- **Limits**: Coverage limits retrieved
- **Deductibles**: Deductible options loaded
- **Forms**: Associated forms displayed

### Benefits
- Complete product structure visible
- No missing data
- Faster product creation
- Accurate coverage relationships

---

## 🚀 Best Practices

### Product Creation
1. Use AI Builder first to plan your product
2. Switch to Builder to execute the plan
3. Select all necessary coverages
4. Upload form during creation
5. Verify product in Product Hub

### Form Management
1. Always upload PDFs with forms
2. Use consistent naming conventions
3. Keep form numbers aligned with product codes
4. Update effective dates regularly

### Coverage Organization
1. Use categories for organization
2. Create sub-coverages for complex products
3. Link all relevant forms to coverages
4. Document coverage relationships

---

## ❓ Troubleshooting

### Forms Not Showing in Claims Analysis
- **Issue**: Form doesn't have PDF uploaded
- **Solution**: Upload PDF in Forms Screen or during product creation

### Coverage Details Not Loading
- **Issue**: Network delay or data not synced
- **Solution**: Refresh page or try selecting coverage again

### Product Creation Failed
- **Issue**: Missing required fields
- **Solution**: Ensure Product Name, Form Number, and Effective Date are filled

### Form Upload Failed
- **Issue**: File too large or wrong format
- **Solution**: Use PDF format, keep file size under 50MB

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review the Implementation Summary
3. Check browser console for error messages
4. Contact development team with error details

---

## 🎯 Quick Reference

| Feature | Location | Purpose |
|---------|----------|---------|
| AI Builder | `/ai-builder` | Get AI recommendations |
| Builder | `/builder` | Create products |
| Claims Analysis | `/claims-analysis` | Analyze claims |
| Coverage Screen | `/coverage` | Manage coverages |
| Forms Screen | `/forms` | Manage forms |
| Product Hub | `/` | View all products |

---

**Last Updated**: October 17, 2025
**Version**: 1.0

