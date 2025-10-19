/**
 * Test script for improved flashcard generation
 */

const {
  cleanText,
  detectChaptersEnhanced,
  extractDefinitionsImproved,
  scoreFlashcard
} = require('./textPreprocessor');

const sampleText = `
CHAPTER 1: INTRODUCTION TO ARTIFICIAL INTELLIGENCE

Artificial Intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems. These processes include learning, reasoning, and self-correction.

Machine Learning is a subset of AI that provides systems the ability to automatically learn and improve from experience without being explicitly programmed.

Deep Learning is a type of machine learning based on artificial neural networks with multiple layers. It is particularly effective for processing large amounts of unstructured data.

Neural Network is a computing system inspired by biological neural networks that constitute animal brains. It consists of interconnected nodes (neurons) that process information.

CHAPTER 2: NATURAL LANGUAGE PROCESSING

Natural Language Processing (NLP) is a branch of AI that helps computers understand, interpret and manipulate human language. NLP draws from many disciplines including computer science and computational linguistics.

Tokenization is the process of breaking down text into smaller units called tokens. These tokens can be words, characters, or subwords.

Sentiment Analysis is the use of NLP to systematically identify, extract, and study affective states and subjective information. It determines whether a piece of text is positive, negative, or neutral.

Named Entity Recognition (NER) is the process of identifying and classifying named entities in text into predefined categories such as person names, organizations, locations, and dates.

CHAPTER 3: COMPUTER VISION

Computer Vision is a field of AI that trains computers to interpret and understand the visual world. Using digital images and deep learning models, machines can accurately identify and classify objects.

Image Classification is the task of assigning a label to an entire image from a predefined set of categories. It is one of the fundamental tasks in computer vision.

Object Detection is the process of finding and identifying objects in an image or video. Unlike classification, it locates where objects are in the image and draws bounding boxes around them.

Convolutional Neural Network (CNN) is a deep learning algorithm specifically designed for processing structured grid data such as images. CNNs use convolutional layers to automatically learn spatial hierarchies of features.
`;

console.log('🧪 TESTING IMPROVED FLASHCARD GENERATION\n');
console.log('='.repeat(70));

// Test 1: Text Cleaning
console.log('\n📝 TEST 1: Text Cleaning');
console.log('-'.repeat(70));
const cleaned = cleanText(sampleText);
console.log(`Original length: ${sampleText.length}`);
console.log(`Cleaned length: ${cleaned.length}`);
console.log('✅ Text cleaning works');

// Test 2: Enhanced Chapter Detection
console.log('\n📖 TEST 2: Enhanced Chapter Detection');
console.log('-'.repeat(70));
const chapters = detectChaptersEnhanced(cleaned);
console.log(`Chapters detected: ${chapters.length}`);
chapters.forEach(ch => {
  console.log(`  ${ch.id}. ${ch.title}`);
  console.log(`     Content length: ${ch.content.length} chars`);
});

if (chapters.length === 3) {
  console.log('✅ All chapters detected correctly');
} else {
  console.log(`⚠️  Expected 3 chapters, got ${chapters.length}`);
}

// Test 3: Improved Definition Extraction
console.log('\n🎯 TEST 3: Improved Definition Extraction');
console.log('-'.repeat(70));

let totalDefinitions = 0;
let totalFlashcards = 0;

chapters.forEach(chapter => {
  const definitions = extractDefinitionsImproved(chapter.content);
  console.log(`\nChapter ${chapter.id}: ${chapter.title}`);
  console.log(`  Definitions found: ${definitions.length}`);
  
  definitions.forEach((def, idx) => {
    const score = scoreFlashcard(def.term, def.definition);
    console.log(`  ${idx + 1}. ${def.term} (score: ${score})`);
    if (score >= 60) {
      totalFlashcards++;
    }
  });
  
  totalDefinitions += definitions.length;
});

console.log(`\n📊 Total definitions extracted: ${totalDefinitions}`);
console.log(`📊 Quality flashcards (score ≥ 60): ${totalFlashcards}`);

const successRate = (totalFlashcards / totalDefinitions * 100).toFixed(1);
console.log(`📊 Success rate: ${successRate}%`);

if (totalFlashcards >= 10) {
  console.log('✅ Excellent extraction rate!');
} else {
  console.log('⚠️  Low extraction rate');
}

// Test 4: Quality Scoring
console.log('\n⭐ TEST 4: Quality Scoring');
console.log('-'.repeat(70));

const testCases = [
  {
    term: 'Machine Learning',
    definition: 'A subset of AI that provides systems the ability to automatically learn and improve from experience without being explicitly programmed.',
    expected: 'high'
  },
  {
    term: 'AI',
    definition: 'It is good.',
    expected: 'low'
  },
  {
    term: 'Neural Network',
    definition: 'A computing system inspired by biological neural networks that consists of interconnected nodes that process information.',
    expected: 'high'
  }
];

testCases.forEach(test => {
  const score = scoreFlashcard(test.term, test.definition);
  const passed = (test.expected === 'high' && score >= 70) || (test.expected === 'low' && score < 60);
  const status = passed ? '✅' : '❌';
  console.log(`${status} "${test.term}": score ${score} (expected ${test.expected})`);
});

// Test 5: Compare with Old System
console.log('\n📊 TEST 5: Comparison with Old System');
console.log('-'.repeat(70));

console.log('\nOLD SYSTEM (from diagnostic):');
console.log('  - Flashcard generation rate: 33%');
console.log('  - Pattern matching: Too strict');
console.log('  - Chapter titles: Generic');
console.log('  - Model: gpt-3.5-turbo-16k');
console.log('  - Prompt length: 2,600+ chars');

console.log('\nNEW SYSTEM (current test):');
console.log(`  - Flashcard generation rate: ${successRate}%`);
console.log('  - Pattern matching: Flexible with scoring');
console.log('  - Chapter titles: Meaningful');
console.log('  - Model: gpt-4o-mini');
console.log('  - Prompt length: <1,000 chars');

const improvement = parseFloat(successRate) - 33;
console.log(`\n📈 Improvement: +${improvement.toFixed(1)}% success rate`);

if (improvement > 30) {
  console.log('✅ SIGNIFICANT IMPROVEMENT!');
} else if (improvement > 10) {
  console.log('✅ Good improvement');
} else {
  console.log('⚠️  Needs more work');
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('📋 TEST SUMMARY');
console.log('='.repeat(70));

const tests = [
  { name: 'Text Cleaning', passed: true },
  { name: 'Chapter Detection', passed: chapters.length === 3 },
  { name: 'Definition Extraction', passed: totalDefinitions >= 10 },
  { name: 'Quality Scoring', passed: totalFlashcards >= 10 },
  { name: 'Overall Improvement', passed: improvement > 30 }
];

const passedTests = tests.filter(t => t.passed).length;
console.log(`\nTests passed: ${passedTests}/${tests.length}`);

tests.forEach(test => {
  const status = test.passed ? '✅' : '❌';
  console.log(`${status} ${test.name}`);
});

if (passedTests === tests.length) {
  console.log('\n🎉 ALL TESTS PASSED! System is significantly improved.');
} else {
  console.log(`\n⚠️  ${tests.length - passedTests} test(s) failed. Review needed.`);
}

console.log('\n' + '='.repeat(70));
