# Testing Guide - Cloud Functions Integration

**Last Updated:** October 15, 2025  
**Status:** Ready for Testing

---

## 🎯 What to Test

After the recent API migration to Cloud Functions, please test the following features to ensure everything works correctly:

---

## 1️⃣ Home Page Chat (Priority: HIGH)

### **Feature:** AI Assistant on Home Page

### **How to Test:**
1. Navigate to the Home page (`/`)
2. Scroll to the "Ask me anything about insurance products..." section
3. Enter a query, for example:
   - "What types of insurance products are available?"
   - "Explain property insurance coverages"
   - "What are common exclusions in insurance policies?"
4. Click "Ask" or press Enter
5. Wait for the AI response

### **Expected Behavior:**
- ✅ Loading indicator appears
- ✅ Response appears within 5-10 seconds
- ✅ Response is relevant and well-formatted
- ✅ No error messages in console

### **What to Check in Console:**
```
🚀 Calling generateChatResponse with: {
  messagesCount: 2,
  model: "gpt-4o-mini",
  maxTokens: 1000,
  temperature: 0.7
}
```

### **If It Fails:**
- Check browser console for errors
- Verify you're logged in
- Check that Cloud Functions are deployed
- See troubleshooting section below

---

## 2️⃣ Product Summary Generation (Priority: HIGH)

### **Feature:** Generate AI Summary from PDF

### **How to Test:**
1. Navigate to Product Hub (`/products`)
2. Find a product that has a PDF form uploaded
3. Click the "Generate Summary" button (sparkle icon ✨)
4. Wait for the summary to generate

### **Expected Behavior:**
- ✅ Loading indicator appears on the button
- ✅ Summary modal opens within 10-30 seconds (depending on PDF size)
- ✅ Summary contains:
   - Product category
   - List of coverages
   - Key features
- ✅ Summary is in JSON format and properly parsed

### **What to Check in Console:**
```
🔍 Starting PDF extraction from URL: https://...
📝 PDF text extracted: { textLength: 12345, ... }
✂️ Text snippet created: { snippetLength: 12345, ... }
📄 Sending PDF text to AI: { payloadSizeMB: "0.05", ... }
🚀 Calling Cloud Function with payload: { hasPdfText: true, ... }
```

### **If It Fails:**
- Check if PDF is accessible (try opening the URL directly)
- Verify PDF is not too large (>9MB)
- Check Cloud Function logs: `firebase functions:log`
- See troubleshooting section below

---

## 3️⃣ Product Chat (Priority: MEDIUM)

### **Feature:** Chat with AI about a specific product

### **How to Test:**
1. Navigate to Product Hub (`/products`)
2. Click the "Chat" button on any product card
3. In the chat modal, enter a question about the product
4. Click "Send"

### **Expected Behavior:**
- ✅ Chat modal opens
- ✅ If product has a PDF, it's loaded for context
- ✅ AI responds with product-specific information
- ✅ Chat history is maintained

---

## 4️⃣ Claims Analysis (Priority: MEDIUM)

### **Feature:** Analyze insurance claims with AI

### **How to Test:**
1. Navigate to Claims Analysis page
2. Enter claim details
3. Click "Analyze Claim"
4. Wait for AI analysis

### **Expected Behavior:**
- ✅ Analysis appears within 10-15 seconds
- ✅ Analysis includes coverage determination
- ✅ Analysis includes reasoning

---

## 🔍 Troubleshooting

### **Error: "PDF text is required"**

**What it means:** The Cloud Function didn't receive the PDF text

**How to fix:**
1. Check browser console for payload info
2. Verify the PDF URL is accessible
3. Try a smaller PDF
4. Check Cloud Function logs

**Command to check logs:**
```bash
firebase functions:log
```

---

### **Error: "Failed to load resource: 500"**

**What it means:** Cloud Function encountered an error

**How to fix:**
1. Check Cloud Function logs:
   ```bash
   firebase functions:log
   ```

2. Verify functions are deployed:
   ```bash
   firebase deploy --only functions
   ```

3. Check OpenAI API key is valid:
   ```bash
   cd functions
   cat .env | grep OPENAI_KEY
   ```

---

### **Error: "Authentication required"**

**What it means:** User is not logged in

**How to fix:**
1. Sign in to the application
2. Refresh the page
3. Try the action again

---

### **Error: "Payload too large"**

**What it means:** PDF text exceeds 9MB limit

**How to fix:**
1. Use a smaller PDF
2. Or split the PDF into multiple parts
3. Or increase the limit in the code (not recommended)

---

## 📊 Performance Benchmarks

### **Expected Response Times:**

| Feature | Expected Time | Acceptable Range |
|---------|---------------|------------------|
| Home Chat | 3-5 seconds | 2-10 seconds |
| PDF Summary | 15-30 seconds | 10-60 seconds |
| Product Chat | 3-5 seconds | 2-10 seconds |
| Claims Analysis | 5-10 seconds | 3-15 seconds |

### **If Response Times Are Slow:**
- Check internet connection
- Check Cloud Function cold start (first request is slower)
- Check PDF size (larger PDFs take longer)
- Check OpenAI API status: https://status.openai.com/

---

## 🧪 Manual Testing Checklist

### **Before Testing:**
- [ ] Ensure you're logged in
- [ ] Clear browser cache
- [ ] Open browser console (F12)
- [ ] Check network tab for errors

### **During Testing:**
- [ ] Monitor console for errors
- [ ] Check network requests
- [ ] Note response times
- [ ] Test with different inputs

### **After Testing:**
- [ ] Document any errors
- [ ] Note any slow responses
- [ ] Report any unexpected behavior
- [ ] Check Cloud Function logs

---

## 🚀 Deployment Checklist

### **Before Deploying to Production:**

1. **Test All Features Locally**
   - [ ] Home chat works
   - [ ] PDF summary works
   - [ ] Product chat works
   - [ ] Claims analysis works

2. **Check Cloud Functions**
   - [ ] All functions deployed
   - [ ] OpenAI API key is valid
   - [ ] Logs show no errors

3. **Verify Security**
   - [ ] No API keys in frontend code
   - [ ] All API calls go through Cloud Functions
   - [ ] Authentication is required

4. **Performance Check**
   - [ ] Response times are acceptable
   - [ ] No memory leaks
   - [ ] No excessive API calls

5. **Deploy**
   ```bash
   # Build frontend
   npm run build
   
   # Deploy Cloud Functions
   firebase deploy --only functions
   
   # Deploy hosting
   firebase deploy --only hosting
   
   # Or deploy everything
   firebase deploy
   ```

---

## 📞 Support

### **If You Encounter Issues:**

1. **Check the logs:**
   ```bash
   firebase functions:log
   ```

2. **Check the console:**
   - Open browser DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed requests

3. **Review the code:**
   - `src/components/Home.tsx` - Home chat
   - `src/components/ProductHub.tsx` - PDF summary
   - `functions/index.js` - Cloud Functions

4. **Contact the development team:**
   - Provide error messages
   - Provide steps to reproduce
   - Provide browser console logs
   - Provide Cloud Function logs

---

## ✅ Success Criteria

The migration is successful if:

- ✅ All features work as before
- ✅ No API keys are exposed in frontend
- ✅ Response times are acceptable
- ✅ No errors in production logs
- ✅ Users can complete their workflows

---

**Happy Testing! 🎉**

