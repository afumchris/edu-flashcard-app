/**
 * Test suite for empty chapter handling bug fix
 * 
 * Bug: When a chapter has no flashcards, endIndex was incorrectly set to flashcards.length - 1
 * Fix: endIndex should be startIndex - 1 for empty chapters
 */

// Test data simulating the bug scenario
function testEmptyChapterHandling() {
  console.log('🧪 Testing Empty Chapter Handling Bug Fix\n');
  
  // Simulate the scenario
  const flashcards = [];
  const chapters = [];
  
  // Simulate structured data with mixed empty and non-empty chapters
  const structuredData = {
    document_title: "Test Document",
    flashcard_decks: [
      {
        chapter_title: "Chapter 1: Introduction",
        card_count: 3,
        cards: [
          { Question: "What is A?", Answer: "A is the first letter" },
          { Question: "What is B?", Answer: "B is the second letter" },
          { Question: "What is C?", Answer: "C is the third letter" }
        ]
      },
      {
        chapter_title: "Chapter 2: Empty Chapter",
        card_count: 0,
        cards: []
      },
      {
        chapter_title: "Chapter 3: More Content",
        card_count: 2,
        cards: [
          { Question: "What is D?", Answer: "D is the fourth letter" },
          { Question: "What is E?", Answer: "E is the fifth letter" }
        ]
      }
    ]
  };
  
  // Apply the FIXED logic
  if (structuredData.flashcard_decks && Array.isArray(structuredData.flashcard_decks)) {
    structuredData.flashcard_decks.forEach((deck, index) => {
      const startIndex = flashcards.length;
      
      // Add all cards from this deck
      if (deck.cards && Array.isArray(deck.cards)) {
        deck.cards.forEach(card => {
          flashcards.push({
            question: card.Question || card.question,
            answer: card.Answer || card.answer
          });
        });
      }
      
      // Create chapter metadata with FIX
      const cardCount = deck.card_count || deck.cards?.length || 0;
      chapters.push({
        id: index + 1,
        title: deck.chapter_title || `Chapter ${index + 1}`,
        cards: cardCount,
        startIndex: startIndex,
        endIndex: cardCount > 0 ? flashcards.length - 1 : startIndex - 1
      });
    });
  }
  
  // Verify results
  console.log('📊 Test Results:\n');
  console.log(`Total flashcards: ${flashcards.length}`);
  console.log(`Total chapters: ${chapters.length}\n`);
  
  let allTestsPassed = true;
  
  chapters.forEach((chapter, idx) => {
    console.log(`Chapter ${chapter.id}: ${chapter.title}`);
    console.log(`  Cards: ${chapter.cards}`);
    console.log(`  Range: [${chapter.startIndex}, ${chapter.endIndex}]`);
    
    // Validation checks
    const checks = [];
    
    // Check 1: Empty chapters should have endIndex < startIndex
    if (chapter.cards === 0) {
      const isValid = chapter.endIndex === chapter.startIndex - 1;
      checks.push({
        name: 'Empty chapter endIndex',
        passed: isValid,
        expected: `${chapter.startIndex - 1}`,
        actual: `${chapter.endIndex}`
      });
    }
    
    // Check 2: Non-empty chapters should have valid range
    if (chapter.cards > 0) {
      const rangeSize = chapter.endIndex - chapter.startIndex + 1;
      const isValid = rangeSize === chapter.cards;
      checks.push({
        name: 'Chapter range size',
        passed: isValid,
        expected: `${chapter.cards}`,
        actual: `${rangeSize}`
      });
    }
    
    // Check 3: No overlap with previous chapter
    if (idx > 0) {
      const prevChapter = chapters[idx - 1];
      const noOverlap = chapter.startIndex > prevChapter.endIndex;
      checks.push({
        name: 'No overlap with previous',
        passed: noOverlap,
        expected: `startIndex (${chapter.startIndex}) > prev endIndex (${prevChapter.endIndex})`,
        actual: noOverlap ? 'Valid' : 'OVERLAP DETECTED'
      });
    }
    
    // Print check results
    checks.forEach(check => {
      const status = check.passed ? '✅' : '❌';
      console.log(`  ${status} ${check.name}: ${check.passed ? 'PASS' : 'FAIL'}`);
      if (!check.passed) {
        console.log(`     Expected: ${check.expected}`);
        console.log(`     Actual: ${check.actual}`);
        allTestsPassed = false;
      }
    });
    
    console.log('');
  });
  
  // Test navigation logic
  console.log('🧭 Testing Navigation Logic:\n');
  
  function findChapterForCard(cardIndex) {
    return chapters.find(ch => {
      if (ch.cards === 0) return false;
      return cardIndex >= ch.startIndex && cardIndex <= ch.endIndex;
    });
  }
  
  const navigationTests = [
    { cardIndex: 0, expectedChapter: 1 },
    { cardIndex: 1, expectedChapter: 1 },
    { cardIndex: 2, expectedChapter: 1 },
    { cardIndex: 3, expectedChapter: 3 },
    { cardIndex: 4, expectedChapter: 3 }
  ];
  
  navigationTests.forEach(test => {
    const chapter = findChapterForCard(test.cardIndex);
    const passed = chapter && chapter.id === test.expectedChapter;
    const status = passed ? '✅' : '❌';
    console.log(`${status} Card ${test.cardIndex} -> Chapter ${chapter?.id || 'NOT FOUND'} (expected: ${test.expectedChapter})`);
    if (!passed) allTestsPassed = false;
  });
  
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED - Bug fix is working correctly!');
  } else {
    console.log('❌ SOME TESTS FAILED - Bug fix needs adjustment');
  }
  console.log('='.repeat(60) + '\n');
  
  return allTestsPassed;
}

// Run the test
const success = testEmptyChapterHandling();
process.exit(success ? 0 : 1);
