const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { OpenAI } = require('openai');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import new modules for improved flashcard generation
const {
  cleanText,
  detectChaptersEnhanced,
  extractDefinitionsImproved,
  scoreFlashcard
} = require('./textPreprocessor');

const {
  buildMessages,
  getOptimalConfig,
  chunkText,
  mergeChunkedResults
} = require('./promptEngine');

const {
  detectDocumentStructure,
  structureToChapters,
  generateStructureSummary
} = require('./structureDetector');

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Initialize OpenAI client only if API key is provided
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('✅ OpenAI API key configured');
} else {
  console.log('⚠️  No OpenAI API key - using fallback mode');
}

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8000',
    /^https:\/\/8000--.*\.gitpod\.dev$/,
    /^https:\/\/3000--.*\.gitpod\.dev$/,
    /^https:\/\/.*\.gitpod\.dev$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received:', req.file, req.body);
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File details:', {
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size
    });
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let extractedText = '';
    let pageCount = 1;

    // Handle different file types
    if (fileExt === '.pdf') {
      console.log('Reading PDF file with PyMuPDF4LLM:', filePath);
      
      try {
        // Use PyMuPDF4LLM for better text extraction
        const pythonScript = path.join(__dirname, 'extract_pdf.py');
        const result = execSync(`python3 ${pythonScript} ${filePath}`, {
          encoding: 'utf-8',
          maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        });
        
        const extraction = JSON.parse(result);
        
        if (extraction.success) {
          extractedText = extraction.text;
          console.log('PDF extracted with PyMuPDF4LLM:', {
            textLength: extraction.length
          });
          
          // Estimate page count from text length
          pageCount = Math.ceil(extraction.length / 3000);
        } else {
          throw new Error(extraction.error);
        }
      } catch (pymupdfError) {
        console.log('PyMuPDF4LLM failed, falling back to pdf-parse:', pymupdfError.message);
        
        // Fallback to pdf-parse
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        console.log('PDF parsed with pdf-parse:', {
          numpages: data.numpages,
          textLength: data.text.length
        });
        extractedText = data.text;
        pageCount = data.numpages;
      }
    } else if (fileExt === '.docx') {
      console.log('Reading Word document:', filePath);
      const dataBuffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      extractedText = result.value;
      pageCount = Math.ceil(extractedText.length / 3000);
      console.log('Word document read:', {
        textLength: extractedText.length,
        estimatedPages: pageCount
      });
    } else if (fileExt === '.txt') {
      console.log('Reading text file:', filePath);
      extractedText = fs.readFileSync(filePath, 'utf-8');
      pageCount = Math.ceil(extractedText.length / 3000);
      console.log('Text file read:', {
        textLength: extractedText.length,
        estimatedPages: pageCount
      });
    } else if (['.mp3', '.wav', '.m4a'].includes(fileExt)) {
      console.log('Audio file detected:', fileExt);
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: 'Audio transcription not yet implemented. Please use PDF, DOCX, or TXT files.' 
      });
    } else {
      console.log('Invalid file type:', fileExt);
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Supported formats: PDF, DOCX, TXT' });
    }

    console.log('Processing document with intelligent structure detection...');
    
    try {
      // Step 1: Clean and preprocess text
      console.log('Step 1: Preprocessing text...');
      const cleanedText = cleanText(extractedText);
      console.log(`Text cleaned: ${cleanedText.length} characters`);
      
      // Step 2: Detect document structure (modules, units, sections)
      console.log('Step 2: Detecting document structure...');
      const documentStructure = detectDocumentStructure(cleanedText);
      const structureSummary = generateStructureSummary(documentStructure);
      console.log(`Structure detected:`, structureSummary);
      
      // Step 3: Convert structure to chapters for processing
      const detectedChapters = structureToChapters(documentStructure);
      console.log(`Converted to ${detectedChapters.length} processable sections`);
      
      // Step 4: Check if text needs chunking
      const chunks = chunkText(cleanedText, 8000);
      console.log(`Step 4: Text split into ${chunks.length} chunk(s)`);
      
      // Step 5: Process with optimized OpenAI configuration
      if (!openai) {
        throw new Error('OpenAI API not configured');
      }
      
      console.log('Step 5: Sending to OpenAI with optimized prompt...');
      const config = getOptimalConfig();
      const chunkResults = [];
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
        const messages = buildMessages(chunks[i], documentStructure.title);
        
        const response = await openai.chat.completions.create({
          ...config,
          messages: messages
        });
        
        const responseText = response.choices[0].message.content.trim();
        console.log(`Chunk ${i + 1} response received (${responseText.length} chars)`);
        
        try {
          const parsed = JSON.parse(responseText);
          chunkResults.push(parsed);
        } catch (parseError) {
          console.error(`Failed to parse chunk ${i + 1}:`, parseError.message);
        }
      }
      
      // Step 6: Merge results if multiple chunks
      let structuredData;
      if (chunkResults.length > 1) {
        console.log('Step 6: Merging chunked results...');
        structuredData = mergeChunkedResults(chunkResults);
      } else {
        structuredData = chunkResults[0];
      }
      
      // Step 7: Map AI results to detected structure
      console.log('Step 7: Mapping results to document structure...');
      structuredData.document_title = documentStructure.title;
      structuredData.structure_summary = structureSummary;
      
      // Flatten flashcards for backward compatibility
      const flashcards = [];
      const chapters = [];
      
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
          
          // Create chapter metadata
          // Fix: Handle empty chapters correctly - endIndex should be startIndex - 1 for empty chapters
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
      
      console.log('Total flashcards extracted:', flashcards.length);
      console.log('Total chapters:', chapters.length);
      
      fs.unlinkSync(filePath);

      // Enhanced metadata with chapter information
      const enhancedMetadata = {
        fileName: req.file.originalname,
        documentTitle: structuredData.document_title || req.file.originalname,
        pageCount: pageCount,
        flashcardCount: flashcards.length,
        chapterCount: chapters.length,
        textLength: extractedText.length,
        processedAt: new Date().toISOString(),
        fileSize: req.file.size,
        fileType: fileExt,
        structure: structuredData.structure_summary || null
      };

      res.json({
        metadata: enhancedMetadata,
        flashcards: flashcards,
        chapters: chapters,
        structuredData: structuredData,
        documentStructure: documentStructure  // Include full structure
      });
      
    } catch (openaiError) {
      console.log('OpenAI API error:', openaiError.message);
      console.log('Using improved fallback with intelligent structure detection...');
      
      // Improved fallback: Use intelligent structure detection
      const cleanedText = cleanText(extractedText);
      const documentStructure = detectDocumentStructure(cleanedText);
      const structureSummary = generateStructureSummary(documentStructure);
      const chapters = structureToChapters(documentStructure);
      const flashcards = [];
      
      console.log(`Detected structure:`, structureSummary);
      console.log(`Processing ${chapters.length} sections for fallback...`);
      
      chapters.forEach((chapter, chapterIndex) => {
        const chapterText = chapter.content;
        
        // Use improved definition extraction
        const definitions = extractDefinitionsImproved(chapterText);
        console.log(`Chapter ${chapter.id}: Found ${definitions.length} definitions`);
        
        // Convert to flashcards with quality scoring
        const chapterFlashcards = definitions
          .map(def => ({
            question: `What is ${def.term}?`,
            answer: def.definition,
            score: scoreFlashcard(def.term, def.definition)
          }))
          .filter(card => card.score >= 60)  // Only keep quality flashcards
          .sort((a, b) => b.score - a.score)  // Best first
          .slice(0, 15)  // Max 15 per chapter
          .map(card => ({
            question: card.question,
            answer: card.answer
          }));
        
        chapter.startIndex = flashcards.length;
        chapterFlashcards.forEach(card => flashcards.push(card));
        // Fix: Handle empty chapters correctly - endIndex should be startIndex - 1 for empty chapters
        chapter.endIndex = chapterFlashcards.length > 0 ? flashcards.length - 1 : chapter.startIndex - 1;
        chapter.cards = chapterFlashcards.length;
        
        console.log(`Chapter ${chapter.id}: Generated ${chapterFlashcards.length} quality flashcards`);
        
        // Clean up chapter object
        delete chapter.content;
        delete chapter.startPos;
        delete chapter.endPos;
      });

      fs.unlinkSync(filePath);

      const enhancedMetadata = {
        fileName: req.file.originalname,
        documentTitle: documentStructure.title || req.file.originalname,
        pageCount: pageCount,
        flashcardCount: flashcards.length,
        chapterCount: chapters.length,
        textLength: extractedText.length,
        processedAt: new Date().toISOString(),
        fileSize: req.file.size,
        fileType: fileExt,
        usedFallback: true,
        structure: structureSummary
      };

      res.json({
        metadata: enhancedMetadata,
        flashcards: flashcards,
        chapters: chapters,
        documentStructure: documentStructure  // Include full structure
      });
    }
  } catch (error) {
    console.error('Upload error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error: ' + (error.message || 'Unknown error') });
  }
});

// Common words to filter out from key terms
const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];

// Intelligent chapter/section detection - detects ANY type of content separation
function detectChapters(text) {
  const chapters = [];
  
  // Comprehensive patterns for ANY type of content separation
  const separatorPatterns = [
    // Standard chapters/units/sections with numbers
    /(?:^|\n)(?:Chapter|CHAPTER|Ch\.|ch\.)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Unit|UNIT)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Section|SECTION|Sec\.|sec\.)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Part|PART|Pt\.|pt\.)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Module|MODULE|Mod\.|mod\.)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Lesson|LESSON)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Week|WEEK|Wk\.|wk\.)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Day|DAY)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Topic|TOPIC)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Exercise|EXERCISE|Ex\.|ex\.)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Assignment|ASSIGNMENT)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    
    // Numbered sections (1., 2., etc.) with substantial titles
    /(?:^|\n)(\d+)\.\s+([A-Z][^\n]{10,100})\n/g,
    
    // Roman numerals as separators
    /(?:^|\n)([IVXLCDM]+)\.\s+([A-Z][^\n]{10,100})\n/g,
    
    // Headers with underlines (Markdown style)
    /(?:^|\n)([^\n]{10,100})\n[=\-]{3,}\n/g,
    
    // Headers with # symbols (Markdown)
    /(?:^|\n)#{1,3}\s+(.+)/g,
    
    // ALL CAPS headers (at least 10 chars)
    /(?:^|\n)([A-Z][A-Z\s]{10,100})\n/g,
    
    // Lecture/Session patterns
    /(?:^|\n)(?:Lecture|LECTURE|Lec\.|lec\.)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)(?:Session|SESSION)\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
  ];
  
  let matches = [];
  
  // Apply all patterns
  separatorPatterns.forEach((pattern, patternIndex) => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(text)) !== null) {
      let number = match[1] || '';
      let title = match[2] || match[1] || '';
      
      // Clean up title
      title = title.trim().replace(/[:\-–—.]+$/, '').trim();
      
      // If title is empty, try to extract from nearby text
      if (!title || title.length < 3) {
        const contextStart = match.index;
        const contextEnd = Math.min(match.index + 200, text.length);
        const context = text.substring(contextStart, contextEnd);
        const lines = context.split('\n').filter(l => l.trim().length > 10);
        if (lines.length > 1) {
          title = lines[1].substring(0, 80).trim();
        }
      }
      
      // Determine separator type
      let type = 'Section';
      const matchText = match[0].toLowerCase();
      if (matchText.includes('chapter') || matchText.includes('ch.')) type = 'Chapter';
      else if (matchText.includes('unit')) type = 'Unit';
      else if (matchText.includes('week') || matchText.includes('wk.')) type = 'Week';
      else if (matchText.includes('module') || matchText.includes('mod.')) type = 'Module';
      else if (matchText.includes('lesson')) type = 'Lesson';
      else if (matchText.includes('lecture') || matchText.includes('lec.')) type = 'Lecture';
      else if (matchText.includes('session')) type = 'Session';
      else if (matchText.includes('part') || matchText.includes('pt.')) type = 'Part';
      else if (matchText.includes('topic')) type = 'Topic';
      else if (matchText.includes('day')) type = 'Day';
      else if (matchText.includes('exercise') || matchText.includes('ex.')) type = 'Exercise';
      else if (matchText.includes('assignment')) type = 'Assignment';
      
      matches.push({
        index: match.index,
        number: number,
        title: title,
        type: type,
        fullMatch: match[0],
        patternIndex: patternIndex
      });
    }
  });
  
  // Sort by position in text
  matches.sort((a, b) => a.index - b.index);
  
  // Remove duplicates (matches within 150 chars of each other)
  const uniqueMatches = [];
  matches.forEach((match, index) => {
    const isDuplicate = uniqueMatches.some(existing => 
      Math.abs(match.index - existing.index) < 150
    );
    if (!isDuplicate) {
      uniqueMatches.push(match);
    }
  });
  
  // Filter out TOC/non-content sections and repeated headers
  const skipKeywords = [
    'table of contents', 'contents', 'index', 'references', 'bibliography', 
    'preface', 'foreword', 'acknowledgment', 'acknowledgement', 'about the author',
    'about this book', 'dedication', 'copyright', 'appendix', 'glossary',
    'national open university', 'school of arts', 'school of science',
    'course guide', 'course code', 'course material', 'study unit',
    'self assessment', 'tutor marked', 'assignment question'
  ];
  
  const contentMatches = uniqueMatches.filter(match => {
    const titleLower = match.title.toLowerCase();
    const fullMatchLower = match.fullMatch.toLowerCase();
    
    // Skip if title contains skip keywords
    const shouldSkip = skipKeywords.some(keyword => 
      titleLower.includes(keyword) || fullMatchLower.includes(keyword)
    );
    
    // Skip if title is too short (likely not a real section)
    const tooShort = match.title.length < 3;
    
    // Skip if title is ALL CAPS and very long (likely a header)
    const isHeader = match.title === match.title.toUpperCase() && match.title.length > 30;
    
    // Skip if title repeats common institutional phrases
    const isInstitutionalHeader = /university|school|department|faculty|college/i.test(titleLower) &&
                                  titleLower.length > 40;
    
    return !shouldSkip && !tooShort && !isHeader && !isInstitutionalHeader;
  });
  
  // Extract content for each detected section
  if (contentMatches.length > 0) {
    for (let i = 0; i < contentMatches.length; i++) {
      const start = contentMatches[i].index;
      const end = i < contentMatches.length - 1 ? contentMatches[i + 1].index : text.length;
      const content = text.substring(start, end).trim();
      
      // Only include sections with substantial content (at least 300 chars)
      if (content.length > 300) {
        const displayNumber = contentMatches[i].number || (i + 1).toString();
        const displayTitle = contentMatches[i].title || 'Untitled Section';
        
        chapters.push({
          id: i + 1,
          title: `${contentMatches[i].type} ${displayNumber}: ${displayTitle}`,
          content: content,
          type: contentMatches[i].type
        });
      }
    }
  }
  
  // Fallback: If no sections detected, try to split by large gaps (multiple newlines)
  if (chapters.length === 0) {
    const sections = text.split(/\n\s*\n\s*\n+/); // Split by 3+ newlines
    const substantialSections = sections.filter(s => s.trim().length > 500);
    
    if (substantialSections.length > 1) {
      substantialSections.forEach((section, index) => {
        const firstLine = section.trim().split('\n')[0];
        const title = firstLine.substring(0, 60).replace(/[^\w\s]/g, ' ').trim();
        
        chapters.push({
          id: index + 1,
          title: `Section ${index + 1}: ${title}${title.length >= 60 ? '...' : ''}`,
          content: section.trim(),
          type: 'Section'
        });
      });
    }
  }
  
  // Final fallback: Divide by content length
  if (chapters.length === 0) {
    const targetSections = Math.min(5, Math.ceil(text.length / 3000));
    const chunkSize = Math.ceil(text.length / targetSections);
    
    for (let i = 0; i < targetSections; i++) {
      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize, text.length);
      const content = text.substring(start, end).trim();
      
      if (content.length > 500) {
        const firstPara = content.split(/\n\s*\n/)[0];
        const topic = firstPara.substring(0, 50).replace(/\n/g, ' ').trim();
        
        chapters.push({
          id: i + 1,
          title: `Section ${i + 1}: ${topic}${topic.length >= 50 ? '...' : ''}`,
          content: content,
          type: 'Section'
        });
      }
    }
  }
  
  return chapters;
}

// ULTRA-STRICT: Generate flashcards ONLY for clear definitions and key concepts
function generateChapterFlashcards(chapterText, chapterTitle) {
  const flashcards = [];
  
  // Blacklist: Skip these completely (metadata, admin info, etc.)
  const blacklistPatterns = [
    /course\s+code/i,
    /course\s+name/i,
    /instructor/i,
    /professor/i,
    /assignment/i,
    /due\s+date/i,
    /page\s+\d+/i,
    /chapter\s+\d+\s*$/i,
    /section\s+\d+\s*$/i,
    /table\s+of\s+contents/i,
    /references/i,
    /bibliography/i,
    /\d{4}-\d{4}/,  // Academic years
    /\d+\s+credits?/i,
    /prerequisite/i,
    /grading/i,
    /syllabus/i
  ];
  
  // Check if text contains blacklisted content
  const hasBlacklistedContent = (text) => {
    return blacklistPatterns.some(pattern => pattern.test(text));
  };
  
  // PATTERN 1: Explicit definitions with "is/are" 
  // Example: "Photosynthesis is the process..." or "An editorial is a written article..."
  const sentences = chapterText.split(/[.!?]+/).filter(s => s.trim().length > 30);
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    
    // Skip if contains blacklisted content
    if (hasBlacklistedContent(trimmed)) return;
    
    // Match patterns: "Term is/are [definition]" or "An/A/The Term is/are [definition]"
    const patterns = [
      /^([A-Z][a-zA-Z\s]{2,50}?)\s+(is|are)\s+(a|an|the)?\s*(.{20,300})$/i,
      /^(An?|The)\s+([A-Z][a-zA-Z\s]{2,50}?)\s+(is|are)\s+(.{20,300})$/i
    ];
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      
      if (match) {
        let term, definition;
        
        if (match[1] && (match[1].toLowerCase() === 'a' || match[1].toLowerCase() === 'an' || match[1].toLowerCase() === 'the')) {
          // Pattern: "An editorial is..."
          term = match[2].trim();
          definition = match[4].trim();
        } else {
          // Pattern: "Editorial is..."
          term = match[1].trim();
          definition = match[4].trim();
        }
        
        // Validation checks
        const wordCount = term.split(/\s+/).length;
        const isValidLength = wordCount >= 1 && wordCount <= 6;
        const noCommas = !term.includes(',');
        const notQuestion = !term.includes('?');
        const notMetadata = !hasBlacklistedContent(term);
        const hasSubstantiveDefinition = definition.length > 20 && definition.length < 300;
        
        // Must not be a pronoun or common word
        const pronouns = ['it', 'they', 'this', 'that', 'these', 'those', 'he', 'she', 'we', 'you'];
        const notPronoun = !pronouns.includes(term.toLowerCase());
        
        // Must be a proper term (not just articles)
        const articles = ['a', 'an', 'the'];
        const notArticle = !articles.includes(term.toLowerCase());
        
        // Must not be procedural
        const notProcedural = !/\b(first|then|next|finally|step|follow|click|submit|upload)\b/i.test(definition);
        
        // Must not be an example
        const notExample = !/\b(for example|for instance|such as|e\.g\.)\b/i.test(definition);
        
        // Must not be administrative
        const notAdmin = !/\b(due|submit|upload|download|register|enroll|assignment)\b/i.test(definition);
        
        if (isValidLength && noCommas && notQuestion && notMetadata && 
            hasSubstantiveDefinition && notProcedural && notExample && notAdmin &&
            notPronoun && notArticle) {
          
          flashcards.push({
            question: `What is ${term}?`,
            answer: definition.replace(/^(a|an|the)\s+/i, '').trim()
          });
          break; // Found a match, no need to try other patterns
        }
      }
    }
  });
  
  // PATTERN 2: "Term: definition" format
  // Example: "Algorithm: a step-by-step procedure..."
  const colonPattern = /^([A-Z][a-zA-Z\s]{3,40}):\s+(.{30,250})[.!?]/gm;
  let match;
  
  while ((match = colonPattern.exec(chapterText)) !== null) {
    const term = match[1].trim();
    const definition = match[2].trim();
    
    // Skip if blacklisted
    if (hasBlacklistedContent(term) || hasBlacklistedContent(definition)) continue;
    
    const wordCount = term.split(/\s+/).length;
    const isValid = wordCount >= 1 && wordCount <= 4 && 
                   !term.includes(',') && 
                   definition.length > 30;
    
    if (isValid) {
      flashcards.push({
        question: `What is ${term}?`,
        answer: definition
      });
    }
  }
  
  // PATTERN 3: "Term (definition)" format
  // Example: "API (Application Programming Interface)"
  const parenPattern = /([A-Z][a-zA-Z\s]{3,40})\s*\(([^)]{30,200})\)/g;
  
  while ((match = parenPattern.exec(chapterText)) !== null) {
    const term = match[1].trim();
    const definition = match[2].trim();
    
    // Skip if blacklisted
    if (hasBlacklistedContent(term) || hasBlacklistedContent(definition)) continue;
    
    const wordCount = term.split(/\s+/).length;
    const isValid = wordCount >= 1 && wordCount <= 4 && 
                   !term.includes(',') &&
                   definition.length > 30;
    
    if (isValid) {
      flashcards.push({
        question: `What is ${term}?`,
        answer: definition
      });
    }
  }
  
  // PATTERN 4: "Term refers to/means" format
  // Example: "Encapsulation refers to the bundling..."
  const refersPattern = /^([A-Z][a-zA-Z\s]{3,40}?)\s+(refers to|means)\s+(.{30,250})[.!?]/gm;
  
  while ((match = refersPattern.exec(chapterText)) !== null) {
    const term = match[1].trim();
    const definition = match[3].trim();
    
    // Skip if blacklisted
    if (hasBlacklistedContent(term) || hasBlacklistedContent(definition)) continue;
    
    const wordCount = term.split(/\s+/).length;
    const isValid = wordCount >= 1 && wordCount <= 4 && 
                   !term.includes(',') &&
                   definition.length > 30;
    
    if (isValid) {
      flashcards.push({
        question: `What is ${term}?`,
        answer: definition
      });
    }
  }
  
  // Remove duplicates and validate quality
  const uniqueFlashcards = [];
  const seen = new Set();
  
  flashcards.forEach(card => {
    // Normalize for duplicate detection
    const key = card.question.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Final validation
    const answerLength = card.answer.length;
    const isQualityAnswer = answerLength >= 30 && answerLength <= 300;
    const notBlacklisted = !hasBlacklistedContent(card.question) && 
                          !hasBlacklistedContent(card.answer);
    
    if (!seen.has(key) && isQualityAnswer && notBlacklisted) {
      seen.add(key);
      
      // Clean up answer
      card.answer = card.answer
        .replace(/^(is|are|means|refers to|defined as)\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      uniqueFlashcards.push(card);
    }
  });
  
  // Strict limit: Maximum 12 flashcards per chapter
  return uniqueFlashcards.slice(0, 12);
}

function parseFlashcards(text) {
  const cards = [];
  const lines = text.split('\n');
  let question = '';
  let answer = '';
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('Question:')) {
      if (question && answer) {
        cards.push({ 
          question: question.trim(), 
          answer: answer.trim(),
          id: Date.now() + Math.random() // Add unique ID
        });
      }
      question = trimmedLine.replace('Question:', '').trim();
      answer = '';
    } else if (trimmedLine.startsWith('Answer:')) {
      answer = trimmedLine.replace('Answer:', '').trim();
    } else if (answer && trimmedLine) {
      // Continue multi-line answers
      answer += ' ' + trimmedLine;
    }
  });
  
  if (question && answer) {
    cards.push({ 
      question: question.trim(), 
      answer: answer.trim(),
      id: Date.now() + Math.random()
    });
  }
  
  // Filter out low-quality cards
  return cards.filter(card => 
    card.question.length > 10 && 
    card.answer.length > 10 &&
    !card.question.toLowerCase().includes('undefined') &&
    !card.answer.toLowerCase().includes('undefined')
  );
}

const PORT = process.env.PORT || 5002;

// Add health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Backend server is running!',
    port: PORT,
    endpoints: {
      upload: 'POST /upload - Upload PDF files for flashcard generation',
      health: 'GET / - Health check',
      test: 'GET /test-openai - Test OpenAI connection'
    }
  });
});

// Save flashcard set endpoint
app.post('/save-flashcards', (req, res) => {
  try {
    const { flashcards, metadata, name } = req.body;
    
    if (!flashcards || !metadata) {
      return res.status(400).json({ error: 'Missing flashcards or metadata' });
    }

    const savedSet = {
      id: Date.now().toString(),
      name: name || metadata.fileName,
      flashcards,
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString()
      }
    };

    // In a real app, you'd save to a database
    // For now, we'll return the set to be saved on frontend
    res.json({ 
      success: true, 
      savedSet,
      message: 'Flashcard set prepared for saving'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get saved flashcard sets (placeholder - in real app would query database)
app.get('/saved-flashcards', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Saved flashcards are stored locally in browser',
    sets: []
  });
});

// Test OpenAI endpoint
app.get('/test-openai', async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Generate one flashcard about machine learning. Format: Question: [question] Answer: [answer]' }],
    });
    res.json({ 
      success: true, 
      model: 'gpt-3.5-turbo',
      response: response.choices[0].message.content 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Backend API Server Started`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  // Detect environment
  const isGitpod = process.env.GITPOD_ENVIRONMENT_ID !== undefined;
  
  if (isGitpod) {
    // Use Gitpod CLI to get the actual URL
    try {
      const { execSync } = require('child_process');
      const url = execSync(`/usr/local/bin/gitpod environment port list | grep "^${PORT}" | awk '{print $3}'`, { encoding: 'utf-8' }).trim();
      if (url) {
        console.log(`📍 Backend URL: ${url}`);
      } else {
        console.log(`📍 Backend URL: Check PORTS panel for port ${PORT}`);
      }
      console.log(`🌐 Environment: Gitpod`);
    } catch (err) {
      console.log(`📍 Backend URL: Check PORTS panel for port ${PORT}`);
      console.log(`🌐 Environment: Gitpod`);
    }
  } else {
    console.log(`📍 Backend URL: http://localhost:${PORT}`);
    console.log(`🌐 Environment: Local`);
  }
  
  console.log(`⚡ Port: ${PORT}`);
  console.log(`✅ Status: Ready`);
  console.log(`💡 Tip: Use the PORTS panel to access the URL`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});