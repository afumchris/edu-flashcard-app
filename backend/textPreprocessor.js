/**
 * Text Preprocessing Module
 * Cleans and prepares extracted text for flashcard generation
 */

/**
 * Clean and normalize text
 */
function cleanText(text) {
  if (!text) return '';
  
  // Remove page numbers
  text = text.replace(/\bPage\s+\d+\b/gi, '');
  text = text.replace(/\b\d+\s+of\s+\d+\b/gi, '');
  
  // Remove common headers/footers
  text = text.replace(/^.*Copyright.*$/gim, '');
  text = text.replace(/^.*All rights reserved.*$/gim, '');
  
  // Remove excessive whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  
  // Remove metadata patterns
  text = text.replace(/^Course Code:.*$/gim, '');
  text = text.replace(/^Instructor:.*$/gim, '');
  text = text.replace(/^Professor:.*$/gim, '');
  
  return text.trim();
}

/**
 * Extract meaningful chapter title from text
 */
function extractChapterTitle(chapterText, chapterNumber) {
  // Try to find explicit title
  const titlePatterns = [
    /(?:CHAPTER|Chapter)\s+\d+[:\s\-–—.]+([^\n]{10,100})/i,
    /^([A-Z][A-Z\s]{10,80})$/m,
    /^#{1,3}\s+(.{10,80})$/m
  ];
  
  for (const pattern of titlePatterns) {
    const match = chapterText.match(pattern);
    if (match && match[1]) {
      let title = match[1].trim();
      // Clean up title
      title = title.replace(/[:\-–—.]+$/, '').trim();
      if (title.length >= 10 && title.length <= 80) {
        return title;
      }
    }
  }
  
  // Fallback: Extract topic from first meaningful paragraph
  const paragraphs = chapterText.split(/\n\s*\n/).filter(p => p.trim().length > 50);
  if (paragraphs.length > 0) {
    const firstPara = paragraphs[0];
    // Extract first sentence
    const firstSentence = firstPara.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 20 && firstSentence.length < 100) {
      return firstSentence.trim();
    }
  }
  
  return `Chapter ${chapterNumber}`;
}

/**
 * Detect and extract chapters with better context
 */
function detectChaptersEnhanced(text) {
  const chapters = [];
  
  // Comprehensive chapter patterns
  const patterns = [
    /(?:^|\n)(CHAPTER|Chapter)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)\n/gi,
    /(?:^|\n)(UNIT|Unit)\s+(\d+)[:\s\-–—.]*([^\n]*)\n/gi,
    /(?:^|\n)#{1,3}\s+(\d+)[.\s]+([^\n]+)\n/g,
    /(?:^|\n)([A-Z][A-Z\s]{15,80})\n={3,}\n/g
  ];
  
  const matches = [];
  
  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        fullMatch: match[0],
        number: match[2] || match[1] || matches.length + 1,
        title: match[3] || match[2] || match[1] || ''
      });
    }
  });
  
  // Sort by position
  matches.sort((a, b) => a.index - b.index);
  
  // Remove duplicates (within 100 chars)
  const uniqueMatches = [];
  matches.forEach(match => {
    const isDuplicate = uniqueMatches.some(existing => 
      Math.abs(match.index - existing.index) < 100
    );
    if (!isDuplicate) {
      uniqueMatches.push(match);
    }
  });
  
  // Extract chapter content
  for (let i = 0; i < uniqueMatches.length; i++) {
    const start = uniqueMatches[i].index;
    const end = i < uniqueMatches.length - 1 ? uniqueMatches[i + 1].index : text.length;
    const content = text.substring(start, end).trim();
    
    // Only include substantial chapters
    if (content.length > 300) {
      const chapterNum = uniqueMatches[i].number;
      const title = extractChapterTitle(content, chapterNum);
      
      chapters.push({
        id: i + 1,
        number: chapterNum,
        title: title,
        content: content,
        startPos: start,
        endPos: end
      });
    }
  }
  
  // Fallback: If no chapters found, create one from entire text
  if (chapters.length === 0 && text.length > 500) {
    chapters.push({
      id: 1,
      number: 1,
      title: 'Main Content',
      content: text,
      startPos: 0,
      endPos: text.length
    });
  }
  
  return chapters;
}

/**
 * Extract definitions using improved patterns
 */
function extractDefinitionsImproved(text) {
  const definitions = [];
  
  // More flexible patterns
  const patterns = [
    // Pattern 1: "Term is/are definition"
    {
      regex: /([A-Z][a-zA-Z\s]{2,50}?)\s+(?:is|are)\s+(.{20,400}?)(?:\.|$)/gi,
      termIndex: 1,
      defIndex: 2
    },
    // Pattern 2: "Term: definition"
    {
      regex: /([A-Z][a-zA-Z\s]{2,40}):\s*(.{20,400}?)(?:\n|$)/g,
      termIndex: 1,
      defIndex: 2
    },
    // Pattern 3: "Term refers to/means definition"
    {
      regex: /([A-Z][a-zA-Z\s]{2,50}?)\s+(?:refers to|means)\s+(.{20,400}?)(?:\.|$)/gi,
      termIndex: 1,
      defIndex: 2
    },
    // Pattern 4: "(Term) definition" or "Term (definition)"
    {
      regex: /([A-Z][a-zA-Z\s]{2,40})\s*\(([^)]{20,200})\)/g,
      termIndex: 1,
      defIndex: 2
    }
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const term = match[pattern.termIndex]?.trim();
      const definition = match[pattern.defIndex]?.trim();
      
      if (term && definition && isValidDefinition(term, definition)) {
        definitions.push({
          term: term,
          definition: definition,
          position: match.index
        });
      }
    }
  });
  
  // Remove duplicates
  const seen = new Set();
  return definitions.filter(def => {
    const key = def.term.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Validate if a term-definition pair is good quality
 */
function isValidDefinition(term, definition) {
  // Term validation
  const wordCount = term.split(/\s+/).length;
  if (wordCount < 1 || wordCount > 8) return false;
  if (term.includes(',')) return false;
  if (term.length < 3 || term.length > 80) return false;
  
  // Definition validation
  if (definition.length < 20 || definition.length > 400) return false;
  
  // Blacklist check (less aggressive)
  const blacklist = [
    /course\s+code/i,
    /page\s+\d+/i,
    /\d{4}-\d{4}/,  // Years
    /click here/i,
    /see (page|chapter|section)/i
  ];
  
  for (const pattern of blacklist) {
    if (pattern.test(term) || pattern.test(definition)) {
      return false;
    }
  }
  
  // Must not be a pronoun
  const pronouns = ['it', 'they', 'this', 'that', 'these', 'those'];
  if (pronouns.includes(term.toLowerCase())) return false;
  
  return true;
}

/**
 * Score flashcard quality (0-100)
 */
function scoreFlashcard(term, definition) {
  let score = 50; // Base score
  
  // Length scoring
  if (definition.length >= 50 && definition.length <= 200) score += 20;
  if (term.length >= 5 && term.length <= 40) score += 10;
  
  // Completeness
  if (definition.includes('is') || definition.includes('are')) score += 10;
  if (definition.match(/\b(process|method|technique|system|concept)\b/i)) score += 10;
  
  // Clarity
  const sentences = definition.split(/[.!?]/).filter(s => s.trim());
  if (sentences.length >= 1 && sentences.length <= 3) score += 10;
  
  // Penalize issues
  if (definition.includes('...')) score -= 10;
  if (definition.match(/\b(etc|and so on)\b/i)) score -= 5;
  
  return Math.max(0, Math.min(100, score));
}

module.exports = {
  cleanText,
  extractChapterTitle,
  detectChaptersEnhanced,
  extractDefinitionsImproved,
  isValidDefinition,
  scoreFlashcard
};
