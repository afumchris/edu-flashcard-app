/**
 * Diagnostic tool to analyze PDF extraction and flashcard generation quality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Sample text for testing (simulating extracted PDF content)
const sampleEducationalText = `
CHAPTER 1: INTRODUCTION TO COMPUTER SCIENCE

Computer Science is the study of computers and computational systems. Unlike electrical and computer engineers, computer scientists deal mostly with software and software systems; this includes their theory, design, development, and application.

Key Concepts:

Algorithm: An algorithm is a step-by-step procedure for solving a problem or completing a task. It consists of a finite sequence of well-defined instructions that can be implemented in a programming language.

Data Structure: A data structure is a specialized format for organizing, processing, retrieving and storing data. Common data structures include arrays, linked lists, stacks, queues, trees, and graphs.

Computational Complexity: Computational complexity refers to the amount of resources (time and space) required to run an algorithm. It is typically expressed using Big O notation.

CHAPTER 2: PROGRAMMING FUNDAMENTALS

Variables and Data Types

A variable is a named storage location in memory that holds a value. Variables have data types that determine what kind of data they can store.

Integer: A whole number without a decimal point (e.g., 5, -3, 0)
Float: A number with a decimal point (e.g., 3.14, -0.5)
String: A sequence of characters (e.g., "Hello World")
Boolean: A logical value that is either true or false

Control Structures

Control structures determine the flow of program execution.

Conditional Statements: if-else statements allow programs to make decisions based on conditions.

Loops: Loops allow code to be executed repeatedly. Common types include for loops, while loops, and do-while loops.

Functions: A function is a reusable block of code that performs a specific task. Functions can accept parameters and return values.

CHAPTER 3: OBJECT-ORIENTED PROGRAMMING

Object-Oriented Programming (OOP) is a programming paradigm based on the concept of "objects" which contain data and code.

Core Principles:

Encapsulation: Encapsulation is the bundling of data and methods within a single unit or class, restricting direct access to some components to prevent external interference.

Inheritance: Inheritance is a mechanism where a new class derives properties and behaviors from an existing class. The new class is called a subclass or derived class.

Polymorphism: Polymorphism allows objects of different classes to be treated as objects of a common parent class. It enables a single interface to represent different underlying forms.

Abstraction: Abstraction is the process of hiding complex implementation details and showing only the necessary features of an object.
`;

console.log('🔍 DIAGNOSTIC: PDF Extraction and Flashcard Quality Analysis\n');
console.log('='.repeat(70));

// Test 1: Analyze text structure
console.log('\n📊 TEST 1: Text Structure Analysis');
console.log('-'.repeat(70));

const lines = sampleEducationalText.split('\n').filter(l => l.trim());
const chapters = sampleEducationalText.match(/CHAPTER \d+:/g) || [];
const definitions = sampleEducationalText.match(/\w+:\s+\w+\s+is\s+/gi) || [];

console.log(`Total lines: ${lines.length}`);
console.log(`Detected chapters: ${chapters.length}`);
console.log(`Potential definitions: ${definitions.length}`);
console.log(`Text length: ${sampleEducationalText.length} characters`);

// Test 2: Chapter detection
console.log('\n📖 TEST 2: Chapter Detection');
console.log('-'.repeat(70));

const detectChapters = require('./server.js').detectChapters || function(text) {
  // Inline simplified version for testing
  const chapterPattern = /(?:^|\n)(?:CHAPTER|Chapter)\s+(\d+)[:\s\-–—.]*([^\n]*)/gi;
  const matches = [];
  let match;
  
  while ((match = chapterPattern.exec(text)) !== null) {
    matches.push({
      number: match[1],
      title: match[2].trim(),
      position: match.index
    });
  }
  
  return matches;
};

const detectedChapters = detectChapters(sampleEducationalText);
console.log(`Chapters found: ${detectedChapters.length}`);
detectedChapters.forEach(ch => {
  console.log(`  - Chapter ${ch.number}: ${ch.title}`);
});

// Test 3: Definition extraction patterns
console.log('\n🎯 TEST 3: Definition Extraction Patterns');
console.log('-'.repeat(70));

const patterns = [
  { name: 'Pattern 1: "Term is..."', regex: /([A-Z][a-zA-Z\s]{2,50}?)\s+is\s+(.{20,200})[.!?]/g },
  { name: 'Pattern 2: "Term: definition"', regex: /([A-Z][a-zA-Z\s]{3,40}):\s+(.{30,200})[.!?]/g },
  { name: 'Pattern 3: "A/An Term is..."', regex: /(An?|The)\s+([A-Z][a-zA-Z\s]{2,50}?)\s+is\s+(.{20,200})[.!?]/g }
];

patterns.forEach(pattern => {
  const matches = [...sampleEducationalText.matchAll(pattern.regex)];
  console.log(`\n${pattern.name}: ${matches.length} matches`);
  matches.slice(0, 3).forEach((m, i) => {
    console.log(`  ${i + 1}. "${m[0].substring(0, 80)}..."`);
  });
});

// Test 4: Quality issues
console.log('\n⚠️  TEST 4: Potential Quality Issues');
console.log('-'.repeat(70));

const issues = [];

// Check for metadata pollution
if (sampleEducationalText.match(/course code|instructor|professor|page \d+/i)) {
  issues.push('❌ Metadata pollution detected');
} else {
  console.log('✅ No metadata pollution');
}

// Check for chapter structure
if (chapters.length === 0) {
  issues.push('❌ No chapters detected');
} else {
  console.log(`✅ ${chapters.length} chapters detected`);
}

// Check for definition density
const definitionDensity = definitions.length / (sampleEducationalText.length / 1000);
console.log(`📈 Definition density: ${definitionDensity.toFixed(2)} per 1000 chars`);
if (definitionDensity < 1) {
  issues.push('⚠️  Low definition density - may generate few flashcards');
}

// Check for noise
const noisePatterns = ['click here', 'see page', 'refer to', 'as shown in'];
const noiseCount = noisePatterns.filter(p => sampleEducationalText.toLowerCase().includes(p)).length;
if (noiseCount > 0) {
  issues.push(`⚠️  ${noiseCount} noise patterns detected`);
} else {
  console.log('✅ No noise patterns detected');
}

if (issues.length > 0) {
  console.log('\nIssues found:');
  issues.forEach(issue => console.log(`  ${issue}`));
}

// Test 5: Simulate flashcard generation
console.log('\n🎴 TEST 5: Simulated Flashcard Generation');
console.log('-'.repeat(70));

const sentences = sampleEducationalText.split(/[.!?]+/).filter(s => s.trim().length > 30);
let flashcardCount = 0;

sentences.forEach(sentence => {
  const trimmed = sentence.trim();
  
  // Simple pattern matching
  const match = trimmed.match(/^([A-Z][a-zA-Z\s]{2,50}?)\s+(is|are)\s+(.{20,300})$/i);
  
  if (match) {
    const term = match[1].trim();
    const definition = match[3].trim();
    
    // Basic validation
    const wordCount = term.split(/\s+/).length;
    if (wordCount >= 1 && wordCount <= 6 && !term.includes(',')) {
      flashcardCount++;
      if (flashcardCount <= 5) {
        console.log(`\n  Flashcard ${flashcardCount}:`);
        console.log(`    Q: What is ${term}?`);
        console.log(`    A: ${definition.substring(0, 100)}...`);
      }
    }
  }
});

console.log(`\n📊 Total flashcards generated: ${flashcardCount}`);
console.log(`📊 Expected flashcards: ~${definitions.length}`);

if (flashcardCount < definitions.length * 0.5) {
  console.log('⚠️  WARNING: Low flashcard generation rate!');
  console.log('   Possible causes:');
  console.log('   - Pattern matching too strict');
  console.log('   - Text structure not recognized');
  console.log('   - Validation rules too restrictive');
}

// Test 6: OpenAI prompt analysis
console.log('\n🤖 TEST 6: OpenAI Prompt Analysis');
console.log('-'.repeat(70));

const promptLength = 2500; // Approximate prompt length from server.js
const textLength = sampleEducationalText.length;
const totalTokens = Math.ceil((promptLength + textLength) / 4); // Rough estimate

console.log(`Prompt length: ~${promptLength} chars`);
console.log(`Text length: ${textLength} chars`);
console.log(`Estimated tokens: ~${totalTokens}`);
console.log(`Model: gpt-3.5-turbo-16k (max 16,384 tokens)`);

if (totalTokens > 12000) {
  console.log('⚠️  WARNING: Approaching token limit!');
  console.log('   Consider chunking for large documents');
} else {
  console.log('✅ Token usage within safe limits');
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('📋 DIAGNOSTIC SUMMARY');
console.log('='.repeat(70));

console.log('\n✅ Strengths:');
console.log('  - PyMuPDF4LLM extracts structured text');
console.log('  - Multiple pattern matching for definitions');
console.log('  - Fallback mechanism when OpenAI fails');

console.log('\n❌ Identified Issues:');
console.log('  1. Pattern matching may be too strict');
console.log('  2. Chapter detection may miss variations');
console.log('  3. No semantic understanding (relies on patterns)');
console.log('  4. Prompt may be too long/complex for GPT-3.5');
console.log('  5. No text preprocessing/cleaning');
console.log('  6. No context preservation between chapters');

console.log('\n💡 Recommended Improvements:');
console.log('  1. Use GPT-4 or GPT-4-turbo for better understanding');
console.log('  2. Implement text preprocessing/cleaning');
console.log('  3. Add semantic chunking (not just pattern-based)');
console.log('  4. Simplify and optimize the prompt');
console.log('  5. Add few-shot examples in the prompt');
console.log('  6. Implement iterative refinement');
console.log('  7. Add quality scoring for generated flashcards');

console.log('\n' + '='.repeat(70));
