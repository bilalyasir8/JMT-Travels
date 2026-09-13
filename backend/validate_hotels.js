const fs = require('fs');
const path = require('path');

// Load app.js and extract HOTEL_DATASET
const appJsPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'app.js');
const appContent = fs.readFileSync(appJsPath, 'utf8');

const match = appContent.match(/const HOTEL_DATASET = (\[[\s\S]*?\n\];)/);
if (!match) {
  console.error('❌ ERROR: HOTEL_DATASET array not found in app.js!');
  process.exit(1);
}

let dataset;
try {
  // Use Function evaluator to safely parse JS object literal array
  dataset = new Function(`return ${match[1].slice(0, -1)};`)();
} catch (e) {
  console.error('❌ ERROR parsing HOTEL_DATASET from app.js:', e.message);
  process.exit(1);
}

console.log(`\n=================================================`);
console.log(`🏨 JMT TRAVELS HOTEL INVENTORY VALIDATION REPORT`);
console.log(`=================================================\n`);

const requiredCities = [
  'Muscat', 'Salalah', 'Nizwa', 'Sohar',
  'Dubai', 'Abu Dhabi', 'Al Ain', 'Sharjah',
  'Makkah', 'Madinah'
];

const cityCounts = {};
requiredCities.forEach(c => cityCounts[c] = 0);

const seenIds = new Set();
let invalidItems = 0;
let missingImages = 0;

dataset.forEach((item, index) => {
  // 1. ID uniqueness check
  if (!item.id || seenIds.has(item.id)) {
    console.error(`❌ Validation Failure [Item ${index}]: Duplicate or missing ID "${item.id}"`);
    invalidItems++;
  } else {
    seenIds.add(item.id);
  }

  // 2. Name check
  if (!item.name || typeof item.name !== 'string') {
    console.error(`❌ Validation Failure [Item ${index}]: Invalid name "${item.name}"`);
    invalidItems++;
  }

  // 3. City check
  if (!item.city || !requiredCities.includes(item.city)) {
    console.error(`❌ Validation Failure [Item ${index}]: Invalid city "${item.city}"`);
    invalidItems++;
  } else {
    cityCounts[item.city]++;
  }

  // 4. Country check
  if (!item.country) {
    console.error(`❌ Validation Failure [Item ${index}]: Missing country`);
    invalidItems++;
  }

  // 5. Property type check
  if (!item.propertyType) {
    console.error(`❌ Validation Failure [Item ${index}]: Missing propertyType`);
    invalidItems++;
  }

  // 6. Image path check
  if (!item.image) {
    console.error(`❌ Validation Failure [Item ${index}]: Missing image path`);
    invalidItems++;
  } else {
    const fullImagePath = path.join(__dirname, '..', 'frontend', 'public', item.image.replace(/^\//, ''));
    if (!fs.existsSync(fullImagePath)) {
      console.warn(`⚠️ Warning [Item ${index}]: Image file not found on disk: ${item.image}`);
      missingImages++;
    }
  }

  // 7. Active status
  if (item.active !== true) {
    console.error(`❌ Validation Failure [Item ${index}]: Inactive property "${item.id}"`);
    invalidItems++;
  }
});

console.log(`CITY DISTRIBUTION:`);
let cityFailures = false;
requiredCities.forEach(c => {
  const count = cityCounts[c] || 0;
  const status = count >= 15 ? '✅ PASS' : '❌ FAIL (Below 15 requirement)';
  if (count < 15) cityFailures = true;
  console.log(`  - ${c.padEnd(12)}: ${count} properties [${status}]`);
});

console.log(`\nSUMMARY METRICS:`);
console.log(`  - Total Hotel Properties : ${dataset.length}`);
console.log(`  - Unique Hotel IDs       : ${seenIds.size}`);
console.log(`  - Invalid Property Objects: ${invalidItems}`);
console.log(`  - Missing Image Files    : ${missingImages}`);

if (dataset.length < 150 || cityFailures || invalidItems > 0) {
  console.error(`\n❌ TASK FAILED: Hotel inventory validation did not pass all criteria.`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL HOTEL INVENTORY VALIDATION CHECKS PASSED (150+ Properties Verified)!\n`);
}
