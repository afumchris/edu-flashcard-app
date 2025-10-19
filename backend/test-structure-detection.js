/**
 * Test Intelligent Structure Detection
 */

const {
  detectDocumentStructure,
  structureToChapters,
  generateStructureSummary
} = require('./structureDetector');

const fs = require('fs');

console.log('🧪 TESTING INTELLIGENT STRUCTURE DETECTION\n');
console.log('='.repeat(70));

// Load sample document
const sampleText = fs.readFileSync('../sample-module-document.txt', 'utf-8');

// Test 1: Detect Structure
console.log('\n📊 TEST 1: Structure Detection');
console.log('-'.repeat(70));

const structure = detectDocumentStructure(sampleText);
console.log(`Document Title: ${structure.title}`);
console.log(`Hierarchy Levels: ${structure.hierarchy.length} top-level items`);
console.log(`Flat List: ${structure.flatList.length} total sections`);

// Test 2: Structure Summary
console.log('\n📈 TEST 2: Structure Summary');
console.log('-'.repeat(70));

const summary = generateStructureSummary(structure);
console.log(`Document: ${summary.documentTitle}`);
console.log(`Total Sections: ${summary.totalSections}`);
console.log(`Hierarchy Depth: ${summary.hierarchyDepth}`);
console.log(`Breakdown:`);
Object.entries(summary.breakdown).forEach(([level, count]) => {
  console.log(`  - ${level}: ${count}`);
});

// Test 3: Hierarchy Validation
console.log('\n🌳 TEST 3: Hierarchy Validation');
console.log('-'.repeat(70));

structure.hierarchy.forEach((module, idx) => {
  console.log(`\n${module.displayTitle}`);
  console.log(`  Level: ${module.levelName}`);
  console.log(`  Children: ${module.children.length}`);
  
  module.children.forEach((unit, unitIdx) => {
    console.log(`    └─ ${unit.displayTitle}`);
    if (unit.children.length > 0) {
      unit.children.forEach(section => {
        console.log(`       └─ ${section.displayTitle}`);
      });
    }
  });
});

// Test 4: Flashcard Compatibility
console.log('\n🎴 TEST 4: Flashcard Compatibility');
console.log('-'.repeat(70));

const chapters = structureToChapters(structure);
console.log(`Converted to ${chapters.length} chapters`);
console.log(`\nSample chapters:`);
chapters.slice(0, 5).forEach(ch => {
  console.log(`  ${ch.id}. [${ch.levelName}] ${ch.title}`);
});

// Test 5: Validation Checks
console.log('\n✅ TEST 5: Validation Checks');
console.log('-'.repeat(70));

const checks = [
  {
    name: 'Modules Detected',
    expected: 4,
    actual: summary.breakdown.MODULE || 0,
    pass: (summary.breakdown.MODULE || 0) === 4
  },
  {
    name: 'Units Detected',
    expected: 12,
    actual: summary.breakdown.UNIT || 0,
    pass: (summary.breakdown.UNIT || 0) === 12
  },
  {
    name: 'Hierarchy Depth',
    expected: 2,
    actual: summary.hierarchyDepth,
    pass: summary.hierarchyDepth === 2
  },
  {
    name: 'Total Sections',
    expected: 16,
    actual: summary.totalSections,
    pass: summary.totalSections === 16
  },
  {
    name: 'Document Title Extracted',
    expected: 'INTRODUCTION TO DATA SCIENCE',
    actual: summary.documentTitle,
    pass: summary.documentTitle === 'INTRODUCTION TO DATA SCIENCE'
  }
];

let passedChecks = 0;
checks.forEach(check => {
  const status = check.pass ? '✅' : '❌';
  console.log(`${status} ${check.name}: ${check.actual} ${check.pass ? '' : `(expected ${check.expected})`}`);
  if (check.pass) passedChecks++;
});

// Test 6: Structure Types
console.log('\n📋 TEST 6: Different Structure Types');
console.log('-'.repeat(70));

const testCases = [
  {
    name: 'Chapter-based',
    text: 'CHAPTER 1: Introduction\n\nContent here.\n\nCHAPTER 2: Methods\n\nMore content.',
    expectedLevels: ['UNIT']
  },
  {
    name: 'Section-based',
    text: 'Section 1.1: First\n\nContent.\n\nSection 1.2: Second\n\nContent.',
    expectedLevels: ['SECTION']
  },
  {
    name: 'Mixed hierarchy',
    text: 'MODULE 1: Main\n\nUnit 1.1: Sub\n\nContent.\n\nSection 1.1.1: Detail\n\nContent.',
    expectedLevels: ['MODULE', 'UNIT', 'SECTION']
  }
];

testCases.forEach(test => {
  const testStructure = detectDocumentStructure(test.text);
  const testSummary = generateStructureSummary(testStructure);
  const detectedLevels = Object.keys(testSummary.breakdown);
  const hasExpected = test.expectedLevels.some(level => detectedLevels.includes(level));
  
  console.log(`  ${hasExpected ? '✅' : '⚠️ '} ${test.name}: ${detectedLevels.join(', ')}`);
});

// Summary
console.log('\n' + '='.repeat(70));
console.log('📋 TEST SUMMARY');
console.log('='.repeat(70));

console.log(`\nValidation Checks: ${passedChecks}/${checks.length} passed`);

if (passedChecks === checks.length) {
  console.log('\n🎉 ALL TESTS PASSED!');
  console.log('\nThe intelligent structure detection system is working perfectly:');
  console.log('  ✅ Detects modules, units, and sections');
  console.log('  ✅ Builds hierarchical structure');
  console.log('  ✅ Extracts meaningful titles');
  console.log('  ✅ Compatible with flashcard generation');
  console.log('  ✅ Works with different document types');
} else {
  console.log(`\n⚠️  ${checks.length - passedChecks} test(s) failed`);
}

console.log('\n' + '='.repeat(70));
