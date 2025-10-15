// uploadXlsxToFirestore.js
const XLSX = require('xlsx');
const db = require('./firebase-admin');

const file = XLSX.readFile('./ProductRepositoryData.xlsx');

// Parse sheets
const productsSheet = XLSX.utils.sheet_to_json(file.Sheets['Product']);
const formsSheet = XLSX.utils.sheet_to_json(file.Sheets['Forms']);
const rocSheet = XLSX.utils.sheet_to_json(file.Sheets['ROC']);
const rulesSheet = XLSX.utils.sheet_to_json(file.Sheets['Rules']);

// ID maps for linking
const productMap = {};
const coverageMap = {};

async function uploadProducts() {
  const batch = db.batch();
  for (const row of productsSheet) {
    const docRef = db.collection('products').doc();
    productMap[row.PRODUCT] = docRef.id;
    batch.set(docRef, {
      name: row.PRODUCT,
      status: row.STATUS,
      bureau: row.BUREAU,
      stateAvailability: row['STATE AVAILABILITY']?.split(',') || []
    });
  }
  await batch.commit();
  console.log('✅ Products uploaded.');
}

async function uploadCoverages() {
  for (const row of productsSheet) {
    const productId = productMap[row.PRODUCT];
    if (!productId) continue;

    const coverageData = {
      name: row.COVERAGE,
      type: 'Base coverage',
      description: row['SUB COVERAGE'],
      formNumber: row['FORM NUMBER']
    };
    const docRef = await db.collection(`products/${productId}/coverages`).add(coverageData);
    coverageMap[`${row.PRODUCT}-${row.COVERAGE}`] = docRef.id;
  }
  console.log('✅ Coverages uploaded.');
}

async function uploadForms() {
  for (const row of formsSheet) {
    const form = {
      formName: row['FORM NAME'],
      formNumber: row['FORM NUMBER'],
      effectiveDate: row['FORM EFFECTIVE DATE'],
      type: row.BUREAU,
      category: row['FORM CATEGORY'],
      productId: productMap[row['PRODUCT ID']] || null,
      coverageId: null, // You can match via formNumber if necessary
      formEditionDate: row['FORM EDITION DATE'],
      dynamic: row['DYNAMIC / STATIC'],
      attachmentConditions: row['ATTACHMENT CONDITIONS']
    };
    await db.collection('forms').add(form);
  }
  console.log('✅ Forms uploaded.');
}

async function uploadRules() {
  for (const row of rulesSheet) {
    const rule = {
      name: row['RULE SUB-CATEGORY'],
      condition: row['RULE CONDITION'],
      outcome: row['RULE OUTCOME'],
      proprietary: row.PROPRIETARY === 'YES',
      reference: row.SOURCE,
      productId: productMap[row['PRODUCT FRAMEWORK ID']] || null
    };
    await db.collection('rules').add(rule);
  }
  console.log('✅ Rules uploaded.');
}

async function uploadRocStepsAndDimensions() {
  for (const row of rocSheet) {
    const productId = productMap[row['PRODUCT FRAMEWORK ID']];
    if (!productId) continue;

    const stepRef = await db.collection(`products/${productId}/steps`).add({
      stepName: row['ALGORITHM STEP'],
      calculation: row['CALCULATION'],
      rounding: row['ROUNDING'],
      rules: row['RULES'],
      proprietary: row.PROPRIETARY === 'YES'
    });

    await db.collection(`products/${productId}/steps/${stepRef.id}/dimensions`).add({
      name: row['COVERAGE NAME'],
      technicalCode: row['TABLE NAME'],
      values: row['EXAMPLE VALUES'],
      type: 'Row'
    });
  }
  console.log('✅ ROC Steps + Dimensions uploaded.');
}

async function runUpload() {
  await uploadProducts();
  await uploadCoverages();
  await uploadForms();
  await uploadRules();
  await uploadRocStepsAndDimensions();
  console.log('🎉 All data uploaded.');
}

runUpload().catch(console.error);