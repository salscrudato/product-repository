# Product Creation Agent - Deployment Guide

**Status**: Ready for Deployment  
**Date**: 2025-10-21

## Prerequisites

Before deploying, ensure you have:

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project configured**
   ```bash
   firebase login
   firebase init
   ```

3. **Environment variables set up** in `.env` or Firebase config

## Deployment Steps

### Step 1: Deploy Cloud Functions

The Product Creation Agent requires Cloud Functions to be deployed. This is the most critical step.

```bash
# Navigate to functions directory
cd functions

# Deploy only the Cloud Functions
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

**Expected Output:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/YOUR_PROJECT/overview
```

### Step 2: Verify Cloud Function Deployment

After deployment, verify the function is available:

```bash
# List deployed functions
firebase functions:list

# View function logs
firebase functions:log
```

You should see `createProductFromPDF` in the list.

### Step 3: Deploy Frontend

```bash
# Build the frontend
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Step 4: Test the Feature

1. Navigate to your deployed application
2. Click the sparkles icon (FAB) in the bottom-right corner
3. Upload a PDF file
4. Verify the loading spinner appears
5. Wait for extraction to complete
6. Review and select coverages
7. Click "Create Product"
8. Verify auto-navigation to product page

## Local Testing with Emulator

To test locally without deploying:

### Step 1: Start Firebase Emulator

```bash
# In the functions directory
cd functions
npm run serve

# Or from root
firebase emulators:start --only functions
```

### Step 2: Configure Frontend to Use Emulator

Update `src/firebase.ts` to use the emulator:

```typescript
import { connectFunctionsEmulator } from 'firebase/functions';

// After initializing functions
if (process.env.NODE_ENV === 'development') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

### Step 3: Run Frontend Dev Server

```bash
npm run dev
```

### Step 4: Test Locally

1. Open http://localhost:5173
2. Click the FAB icon
3. Upload a PDF
4. Monitor console for logs

## Troubleshooting

### Issue: "Cloud Function not deployed" Error

**Solution**: Deploy Cloud Functions
```bash
cd functions
firebase deploy --only functions
```

### Issue: "Permission denied" Error

**Solution**: Check Firebase authentication
```bash
firebase login
firebase projects:list
firebase use YOUR_PROJECT_ID
```

### Issue: "PDF extraction failed" Error

**Possible Causes**:
- PDF is corrupted or invalid
- PDF is too large (>10MB)
- PDF is image-based (no text)

**Solution**: Try with a different PDF file

### Issue: "AI extraction failed" Error

**Possible Causes**:
- OpenAI API key not configured
- OpenAI API quota exceeded
- Network connectivity issue

**Solution**: 
1. Check OpenAI API key in Firebase config
2. Check OpenAI API usage and quota
3. Check network connectivity

### Issue: Modal closes without processing

**Possible Causes**:
- Cloud Function not deployed
- Cloud Function has errors
- Network error

**Solution**:
1. Check browser console for errors (F12)
2. Check Cloud Function logs: `firebase functions:log`
3. Verify Cloud Function is deployed: `firebase functions:list`

## Monitoring

### View Cloud Function Logs

```bash
# Real-time logs
firebase functions:log

# Or in Firebase Console
# Go to: Functions > Logs
```

### Monitor Errors

Check the browser console (F12) for:
- Network errors
- JavaScript errors
- Cloud Function response errors

### Track Metrics

Monitor in Firebase Console:
- Function invocations
- Execution time
- Error rate
- Memory usage

## Performance Optimization

### Reduce PDF Processing Time

1. **Optimize PDF size**: Compress PDFs before upload
2. **Limit text extraction**: Truncate large PDFs
3. **Cache results**: Store extraction results

### Reduce AI Processing Time

1. **Optimize prompt**: Reduce prompt length
2. **Use faster model**: Consider using gpt-4o-mini
3. **Batch requests**: Process multiple PDFs together

## Security Checklist

- ✅ Authentication required (Firebase Auth)
- ✅ Rate limiting enabled
- ✅ Input validation implemented
- ✅ Error messages don't expose sensitive data
- ✅ Audit trail via createdBy field
- ✅ PDF size limits enforced

## Rollback Procedure

If you need to rollback to a previous version:

```bash
# View deployment history
firebase functions:list

# Delete current function
firebase functions:delete createProductFromPDF

# Redeploy previous version
git checkout PREVIOUS_COMMIT
firebase deploy --only functions
```

## Post-Deployment Checklist

- [ ] Cloud Functions deployed successfully
- [ ] Frontend deployed successfully
- [ ] FAB icon visible on home page
- [ ] PDF upload works
- [ ] Loading spinner displays
- [ ] Coverage extraction works
- [ ] Review screen displays
- [ ] Product creation works
- [ ] Auto-navigation works
- [ ] Error handling works
- [ ] Cloud Function logs show no errors
- [ ] Performance is acceptable

## Support

If you encounter issues:

1. **Check logs**: `firebase functions:log`
2. **Check console**: Browser F12 console
3. **Check Firebase Console**: https://console.firebase.google.com
4. **Check Cloud Function code**: `functions/src/api/productCreationAgent.js`
5. **Check Modal code**: `src/components/ProductCreationAgentModal.tsx`

## Next Steps

After successful deployment:

1. **Monitor performance** - Track function execution times
2. **Gather feedback** - Get user feedback on UX
3. **Optimize** - Improve based on usage patterns
4. **Enhance** - Add new features based on requirements

---

**Last Updated**: 2025-10-21  
**Status**: Ready for Deployment

