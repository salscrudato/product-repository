/**
 * Test script for org management Cloud Functions
 * Run with: node test-org-functions.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'insurance-product-hub'
  });
}

const db = admin.firestore();

async function testOrgFunctions() {
  console.log('🧪 Testing Org Management Functions\n');
  
  // Test 1: Check if members collection group index works
  console.log('Test 1: Query members collection group...');
  try {
    const testUserId = 'test-user-123';
    const query = await db.collectionGroup('members')
      .where('userId', '==', testUserId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    console.log(`✅ Collection group query works! Found ${query.size} results\n`);
  } catch (error) {
    console.error('❌ Collection group query failed:', error.message);
    if (error.message.includes('index')) {
      console.log('   Index may still be building. Wait a few minutes and try again.\n');
    }
  }

  // Test 2: List all orgs in the system
  console.log('Test 2: List all organizations...');
  try {
    const orgsSnapshot = await db.collection('orgs').limit(10).get();
    console.log(`✅ Found ${orgsSnapshot.size} organizations:`);
    orgsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}: ${data.name}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Failed to list orgs:', error.message, '\n');
  }

  // Test 3: Check a specific org's members
  console.log('Test 3: Check org members...');
  try {
    const orgsSnapshot = await db.collection('orgs').limit(1).get();
    if (orgsSnapshot.empty) {
      console.log('   No orgs found to test members query\n');
    } else {
      const orgId = orgsSnapshot.docs[0].id;
      const membersSnapshot = await db.collection('orgs').doc(orgId).collection('members').get();
      console.log(`✅ Org ${orgId} has ${membersSnapshot.size} members:`);
      membersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: ${data.email || 'no email'} (${data.role})`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('❌ Failed to check members:', error.message, '\n');
  }

  // Test 4: Check users collection
  console.log('Test 4: Check users with primaryOrgId...');
  try {
    const usersSnapshot = await db.collection('users').limit(5).get();
    console.log(`✅ Found ${usersSnapshot.size} users:`);
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}: primaryOrgId=${data.primaryOrgId || 'none'}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Failed to check users:', error.message, '\n');
  }

  console.log('🏁 Tests complete!');
}

// Run tests
testOrgFunctions()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

