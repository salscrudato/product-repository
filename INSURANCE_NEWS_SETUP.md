# Insurance News Feed Implementation Guide

This guide will help you implement the automated insurance news feed system that fetches news articles, processes them with AI, and displays them in your application.

## 🏗️ What's Already Implemented

✅ **React Component**: `InsuranceNewsFeed.js` - Modern, styled news feed component
✅ **Cloud Function**: Added to `functions/index.js` - Scheduled news processing
✅ **Frontend Integration**: Added to Home page layout
✅ **Dependencies**: Updated `functions/package.json`

## 🔧 Setup Steps

### 1. Test the Current Setup

The news feed component is already working! You can test it right now:

1. **Add Test Data**: Go to Firebase Console → Firestore Database
2. **Create Collection**: Create a collection called `newsSummaries`
3. **Add Sample Document**: Add a document with this structure:
   ```json
   {
     "title": "Major Insurance Company Announces Digital Innovation",
     "summary": "Leading insurer unveils comprehensive digital strategy aimed at improving customer experience and operational efficiency. The initiative includes AI-powered claims processing and enhanced data analytics.",
     "source": "Insurance Journal",
     "url": "https://example.com/news1",
     "imageUrl": "",
     "category": "insurance",
     "timestamp": "2024-01-15T10:00:00Z"
   }
   ```
4. **Check Your App**: The news should appear immediately in your home page!

### 2. Deploy the News Function (Optional)

The function is ready but had deployment issues. Here's a simpler approach:

**Option A: Manual Testing**
```bash
# Try deploying just the updateNews function
firebase deploy --only functions:updateNews
```

**Option B: Use Firebase Console**
1. Go to Firebase Console → Functions
2. Create a new function manually
3. Copy the code from `functions/index.js` (updateNews function)
4. Set environment variables for API keys

### 3. Get API Keys (When Ready for Automation)

**NewsAPI Key** (Free tier: 100 requests/day)
1. Go to [https://newsapi.org/](https://newsapi.org/)
2. Sign up for a free account
3. Get your API key from the dashboard

**OpenAI API Key** (You already have this)
- Use your existing OpenAI API key

### 4. Configure API Keys

```bash
# Set NewsAPI key
firebase functions:config:set newsapi.key="YOUR_NEWS_API_KEY_HERE"

# Set OpenAI key (if not already set)
firebase functions:config:set openai.key="YOUR_OPENAI_API_KEY_HERE"

# View current config to verify
firebase functions:config:get
```

### 5. Test the Function

Once deployed, you can test it:

```bash
# Get the function URL from Firebase Console, then:
curl -X GET "https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/updateNews"
```

Or trigger it from the Firebase Console:
1. Go to Firebase Console → Functions
2. Find `updateNews`
3. Click "Test function"

## 📊 How It Works

### Automated Process
1. **Schedule**: Runs every 6 hours automatically
2. **Fetch**: Gets latest insurance news from NewsAPI
3. **AI Processing**: OpenAI selects the most relevant article and creates a summary
4. **Storage**: Saves to Firestore `newsSummaries` collection
5. **Display**: React component shows real-time updates

### Data Flow
```
NewsAPI → Cloud Function → OpenAI → Firestore → React Component
```

### Firestore Schema
Collection: `newsSummaries`
```javascript
{
  title: "Article headline",
  summary: "AI-generated 3-4 sentence summary",
  source: "Publication name",
  url: "Full article link",
  imageUrl: "Optional thumbnail",
  category: "insurance",
  timestamp: "Server timestamp"
}
```

## 🎨 Frontend Features

The `InsuranceNewsFeed` component includes:
- **Real-time updates** via Firestore listeners
- **Modern styling** matching your app design
- **Responsive design** for mobile/desktop
- **Loading states** and error handling
- **External link indicators**
- **Timestamp formatting** (e.g., "2h ago", "Yesterday")

## 💰 Cost Estimation

**Daily costs** (running every 6 hours = 4 times/day):
- NewsAPI: Free (100 requests/day limit)
- OpenAI GPT-4o: ~$0.20/day (4 calls × ~1.6k tokens)
- Firestore: Free (well within free tier limits)
- Cloud Scheduler: Free (first 3 jobs free)

**Monthly**: ~$6-8 total

## 🔍 Monitoring & Troubleshooting

### Check Function Logs
```bash
firebase functions:log --only scheduledNewsUpdate
```

### Common Issues

1. **"Missing API keys" error**
   - Verify keys are set: `firebase functions:config:get`
   - Redeploy after setting keys

2. **"No articles found"**
   - NewsAPI might be rate-limited
   - Check NewsAPI dashboard for usage

3. **OpenAI errors**
   - Check OpenAI API key and billing
   - Monitor token usage

4. **No news showing in app**
   - Check Firestore rules allow reads
   - Verify collection name is `newsSummaries`
   - Check browser console for errors

### Manual Testing

Add a test article to Firestore manually:
```javascript
// In Firebase Console → Firestore
{
  title: "Test Insurance News",
  summary: "This is a test article to verify the news feed is working correctly.",
  source: "Test Source",
  url: "https://example.com",
  imageUrl: "",
  category: "insurance",
  timestamp: new Date()
}
```

## 🚀 Next Steps

### Optional Enhancements

1. **Multiple Categories**: Add filters for different insurance types
2. **User Preferences**: Let users choose news topics
3. **More Frequent Updates**: Change schedule to hourly
4. **Multiple Articles**: Process 3-5 articles per run instead of 1
5. **Image Processing**: Add image optimization
6. **Analytics**: Track which articles are most clicked

### Production Considerations

1. **Security Rules**: Update Firestore rules for production
2. **Error Monitoring**: Add error logging to Firestore
3. **Rate Limiting**: Monitor API usage
4. **Backup**: Consider multiple news sources

## 📝 Files Modified/Created

- ✅ `src/components/InsuranceNewsFeed.js` - New component
- ✅ `src/components/Home.js` - Updated to include news feed
- ✅ `functions/index.js` - Added news functions
- ✅ `functions/package.json` - Added node-fetch dependency
- ✅ `INSURANCE_NEWS_SETUP.md` - This setup guide

## 🎯 Ready to Deploy!

Once you've completed steps 1-4 above, your insurance news feed will be fully operational. The system will automatically fetch and process news every 6 hours, and your users will see real-time updates in the application.

The news feed is already integrated into your home page layout and styled to match your application's design system.
