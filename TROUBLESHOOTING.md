# Product Creation Agent - Troubleshooting Guide

## Issue: Modal Closes and Nothing Happens

This is the most common issue when the Cloud Function is not deployed.

### Quick Diagnosis

1. **Open Browser Console** (Press F12)
2. **Click the FAB icon** to open the modal
3. **Upload a PDF**
4. **Look for error messages** in the console

### Common Error Messages and Solutions

#### Error: "Cloud Function not deployed"

**Cause**: The `createProductFromPDF` Cloud Function hasn't been deployed to Firebase.

**Solution**:
```bash
# Navigate to functions directory
cd functions

# Deploy Cloud Functions
firebase deploy --only functions

# Wait for deployment to complete
# You should see: ✔  Deploy complete!
```

**Verification**:
```bash
# List deployed functions
firebase functions:list

# You should see: createProductFromPDF
```

---

#### Error: "createProductFromPDF is not a function"

**Cause**: Cloud Function exists but isn't properly exported.

**Solution**:
1. Check `functions/index.js` has the export:
   ```javascript
   exports.createProductFromPDF = productCreationAgentAPI.createProductFromPDF;
   ```

2. Redeploy:
   ```bash
   cd functions
   firebase deploy --only functions
   ```

---

#### Error: "Permission denied" or "Unauthenticated"

**Cause**: User is not authenticated or doesn't have permission.

**Solution**:
1. Ensure user is logged in
2. Check Firebase Authentication is enabled
3. Check Firestore security rules allow writes

---

#### Error: "PDF extraction failed"

**Cause**: PDF file is invalid, corrupted, or too large.

**Solution**:
1. Try with a different PDF file
2. Ensure PDF is not image-based (must have extractable text)
3. Ensure PDF is less than 10MB
4. Try a simple, well-formatted PDF

---

#### Error: "AI extraction failed"

**Cause**: OpenAI API issue or configuration problem.

**Solution**:
1. Check OpenAI API key is configured in Firebase
2. Check OpenAI API quota hasn't been exceeded
3. Check network connectivity
4. Check Cloud Function logs:
   ```bash
   firebase functions:log
   ```

---

## Step-by-Step Debugging

### Step 1: Check Cloud Function Deployment

```bash
# List all deployed functions
firebase functions:list

# Expected output should include:
# createProductFromPDF
```

If `createProductFromPDF` is not listed, deploy it:
```bash
cd functions
firebase deploy --only functions
```

### Step 2: Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Upload a PDF
4. Look for error messages

**Expected console output**:
```
File selected: document.pdf 1234567
Starting product creation with file: document.pdf
Calling Cloud Function createProductFromPDF...
Cloud Function response: {success: true, extractionResult: {...}, ...}
```

### Step 3: Check Cloud Function Logs

```bash
# View real-time logs
firebase functions:log

# Or check Firebase Console:
# https://console.firebase.google.com
# → Functions → Logs
```

**Expected log output**:
```
Product creation from PDF requested
PDF extraction started
AI extraction started
Product created successfully
```

### Step 4: Check Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Upload a PDF
4. Look for `createProductFromPDF` request
5. Check response status (should be 200)

---

## Common Scenarios

### Scenario 1: First Time Setup

**Problem**: Modal closes immediately after upload

**Solution**:
1. Deploy Cloud Functions:
   ```bash
   cd functions
   firebase deploy --only functions
   ```
2. Wait 30 seconds for deployment to propagate
3. Try again

### Scenario 2: After Code Changes

**Problem**: Modal closes after uploading

**Solution**:
1. Redeploy Cloud Functions:
   ```bash
   cd functions
   firebase deploy --only functions
   ```
2. Clear browser cache (Ctrl+Shift+Delete)
3. Refresh page
4. Try again

### Scenario 3: Local Development

**Problem**: Modal closes when testing locally

**Solution**:
1. Start Firebase Emulator:
   ```bash
   firebase emulators:start --only functions
   ```
2. Configure frontend to use emulator (see DEPLOYMENT_GUIDE.md)
3. Run dev server:
   ```bash
   npm run dev
   ```
4. Try again

### Scenario 4: Production Issue

**Problem**: Works locally but not in production

**Solution**:
1. Verify Cloud Functions are deployed to production project:
   ```bash
   firebase use YOUR_PRODUCTION_PROJECT
   firebase functions:list
   ```
2. Check Cloud Function logs in production
3. Verify environment variables are set correctly
4. Check Firestore security rules

---

## Verification Checklist

Before testing, verify:

- [ ] Cloud Functions deployed: `firebase functions:list`
- [ ] `createProductFromPDF` function exists
- [ ] Firebase Authentication enabled
- [ ] Firestore database created
- [ ] OpenAI API key configured
- [ ] PDF file is valid and readable
- [ ] Browser console shows no errors
- [ ] Network requests are successful (200 status)

---

## Getting Help

If you're still having issues:

1. **Check logs**:
   ```bash
   firebase functions:log
   ```

2. **Check browser console** (F12)

3. **Check Firebase Console**:
   - https://console.firebase.google.com
   - Go to Functions → Logs

4. **Check Cloud Function code**:
   - `functions/src/api/productCreationAgent.js`

5. **Check Modal code**:
   - `src/components/ProductCreationAgentModal.tsx`

6. **Check for error messages** in the modal UI

---

## Quick Fix Checklist

Try these in order:

1. ✅ Deploy Cloud Functions: `firebase deploy --only functions`
2. ✅ Clear browser cache: Ctrl+Shift+Delete
3. ✅ Refresh page: Ctrl+R
4. ✅ Check browser console: F12
5. ✅ Check Cloud Function logs: `firebase functions:log`
6. ✅ Try with different PDF file
7. ✅ Check Firebase project is correct: `firebase projects:list`
8. ✅ Redeploy everything: `firebase deploy`

---

**Last Updated**: 2025-10-21  
**Status**: Ready for Use

