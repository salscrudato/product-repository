// Quick script to add sample news data for testing
// Run with: node add-sample-news.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
// For now, this is just a template - you can run this manually in Firebase Console

const sampleNews = [
  {
    title: "Major Insurance Company Announces New Digital Transformation Initiative",
    summary: "Leading insurer unveils comprehensive digital strategy aimed at improving customer experience and operational efficiency. The initiative includes AI-powered claims processing, mobile-first customer portals, and enhanced data analytics capabilities. Industry experts predict this could set new standards for digital innovation in insurance.",
    source: "Insurance Journal",
    url: "https://example.com/news1",
    imageUrl: "",
    category: "insurance",
    timestamp: new Date()
  },
  {
    title: "Cyber Insurance Market Sees 25% Growth Amid Rising Security Threats",
    summary: "The cyber insurance sector continues its rapid expansion as businesses increasingly recognize the need for comprehensive digital protection. New policies now cover ransomware attacks, data breaches, and business interruption from cyber incidents. Market analysts expect continued growth as regulatory requirements tighten.",
    source: "Risk Management Magazine",
    url: "https://example.com/news2",
    imageUrl: "",
    category: "insurance",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  {
    title: "Climate Change Drives Innovation in Property Insurance Models",
    summary: "Insurance companies are developing new risk assessment models to address increasing climate-related claims. Advanced weather prediction technology and satellite imagery are being integrated into underwriting processes. The industry is adapting to more frequent extreme weather events and changing risk patterns.",
    source: "Climate Insurance News",
    url: "https://example.com/news3",
    imageUrl: "",
    category: "insurance",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
  }
];

console.log('Sample news data to add to Firestore:');
console.log(JSON.stringify(sampleNews, null, 2));

console.log('\n🚀 QUICK TEST INSTRUCTIONS:');
console.log('1. Go to Firebase Console → Firestore Database');
console.log('2. Create collection "newsSummaries"');
console.log('3. Add a document with this data:');
console.log('   - title: "Major Insurance Company Announces Digital Innovation"');
console.log('   - summary: "Leading insurer unveils comprehensive digital strategy..."');
console.log('   - source: "Insurance Journal"');
console.log('   - url: "https://example.com/news1"');
console.log('   - category: "insurance"');
console.log('   - timestamp: (use current timestamp)');
console.log('4. Check your app - the news will appear instantly!');
console.log('\n✨ The news feed is already working and will update in real-time!');

// If you want to run this programmatically, uncomment and configure:
/*
admin.initializeApp({
  credential: admin.credential.cert(require('./path-to-service-account-key.json'))
});

const db = admin.firestore();

async function addSampleNews() {
  try {
    for (const news of sampleNews) {
      await db.collection('newsSummaries').add({
        ...news,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    console.log('Sample news added successfully!');
  } catch (error) {
    console.error('Error adding sample news:', error);
  }
}

addSampleNews();
*/
