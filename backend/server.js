const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { OpenAI } = require('openai');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      console.log('Reading PDF file:', filePath);
      const dataBuffer = fs.readFileSync(filePath);
      console.log('Parsing PDF...');
      const data = await pdf(dataBuffer);
      console.log('PDF parsed:', {
        numpages: data.numpages,
        textLength: data.text.length
      });
      extractedText = data.text;
      pageCount = data.numpages;
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

    console.log('Processing entire document with structured prompt...');
    
    try {
      // Enhanced structured prompt for chapter-based flashcard generation
      const structuredPrompt = `You are an expert AI Flashcard Creator specializing in educational material. Your task is to analyze the entire document and generate flashcards that are strictly organized by the document's actual chapters or units.

Input Document/Text: 
${extractedText}

CRITICAL INSTRUCTIONS:

1. CHAPTER DETECTION & SKIPPING NON-CONTENT SECTIONS
- First, identify ALL main content chapters/units in the document by looking for chapter headings (e.g., "Chapter 1", "Unit 1", "Section 1", "1.", "Part 1", etc.)
- DO NOT create flashcards for: Title page, Introduction, Preface, Table of Contents, Index, References, Bibliography, Acknowledgments, About the Author, or any preliminary/concluding sections
- ONLY process main content chapters that contain substantive educational material
- Start from the first main content chapter and process ALL chapters through to the last main content chapter
- If the document has 12 chapters of main content, create flashcards for ALL 12 chapters
- Each chapter should be processed separately and have its own deck of flashcards

2. CRITICAL: EXTRACT ONLY DEFINITIONS AND KEY CONCEPTS
Focus EXCLUSIVELY on:
- **Definitions**: Terms that are explicitly defined (e.g., "X is...", "X refers to...", "X means...")
- **Key Concepts**: Core ideas that are fundamental to understanding the topic
- **Terminology**: Important technical terms with their meanings

DO NOT extract:
- Examples or illustrations
- Explanatory paragraphs that don't define something
- Procedural steps or how-to instructions
- Historical context or background stories
- Author opinions or commentary
- Transitional or filler text
- Supporting details or elaborations
- Case studies or scenarios
- Minor facts or figures
- Redundant information

QUALITY OVER QUANTITY:
- Only create flashcards for information that a student MUST memorize
- Each flashcard should test recall of a specific definition or key concept
- Avoid creating flashcards for general explanations
- Skip content that is explanatory but not definitional

3. FLASHCARD STRUCTURE
Card Format: Each flashcard must have:
- Question (Front): A clear, specific question that tests understanding
- Answer (Back): A comprehensive explanation that fully answers the question

Question Guidelines:
- Write questions that require active recall and deep comprehension
- Use question formats like: "What is...", "Explain...", "How does...", "Why is...", "Define...", "Describe..."
- Make questions specific to the chapter content
- Avoid yes/no questions

Answer Guidelines:
- Provide complete, accurate explanations (not just one-word answers)
- Include context and relevant details
- Explain the "why" and "how", not just the "what"
- Keep answers concise but comprehensive (2-5 sentences typically)

4. FLASHCARD QUANTITY PER CHAPTER (QUALITY OVER QUANTITY)
- Only create flashcards for definitions and key concepts that require memorization
- Shorter chapters (1-3 pages): 5-10 flashcards (only essential definitions/concepts)
- Medium chapters (4-8 pages): 10-15 flashcards (only essential definitions/concepts)
- Longer chapters (9+ pages): 15-25 flashcards (only essential definitions/concepts)
- Better to have fewer high-quality flashcards than many low-quality ones
- Each flashcard must test a specific, memorizable definition or concept

5. REQUIRED OUTPUT FORMAT
Return a single, valid JSON object with this exact structure:

{
  "document_title": "[Inferred or actual title of the document]",
  "flashcard_decks": [
    {
      "chapter_title": "[Chapter/Unit/Section Title - MAIN CONTENT ONLY]",
      "card_count": [Number of flashcards in this deck],
      "cards": [
        {
          "Question": "[Clear question testing important concept]",
          "Answer": "[Comprehensive explanation answering the question]"
        }
      ]
    }
  ]
}

EXAMPLE OF GOOD FLASHCARD (Definition):
{
  "Question": "What is machine learning?",
  "Answer": "Machine learning is a subset of artificial intelligence that enables computers to learn from data and improve their performance without being explicitly programmed. It uses algorithms to identify patterns in data and make predictions or decisions based on those patterns."
}

EXAMPLE OF GOOD FLASHCARD (Key Concept):
{
  "Question": "What is encapsulation in object-oriented programming?",
  "Answer": "Encapsulation is the bundling of data and methods that operate on that data within a single unit or class. It restricts direct access to some of an object's components and prevents external interference and misuse of data."
}

EXAMPLE OF BAD FLASHCARD (too vague/explanatory):
{
  "Question": "How does the system work?",
  "Answer": "The system processes data through multiple stages and produces output."
}

EXAMPLE OF BAD FLASHCARD (procedural, not definitional):
{
  "Question": "What are the steps to implement a feature?",
  "Answer": "First, analyze requirements. Then, design the solution. Finally, implement and test."
}

Now, analyze the document content provided and generate flashcards ONLY for main content chapters, extracting ONLY important information. Return ONLY the JSON object, no additional text.`;

      console.log('Sending structured prompt to OpenAI...');
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-16k',
        messages: [{ role: 'user', content: structuredPrompt }],
        temperature: 0.7,
        max_tokens: 12000,
      });
      
      console.log('OpenAI response received');
      const responseText = response.choices[0].message.content.trim();
      console.log('Response preview:', responseText.substring(0, 200));
      
      // Parse the JSON response
      let structuredData;
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        structuredData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('JSON parse error:', parseError.message);
        console.log('Attempting fallback parsing...');
        
        // Fallback: try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse JSON response from OpenAI');
        }
      }
      
      console.log('Structured data parsed successfully');
      console.log('Document title:', structuredData.document_title);
      console.log('Number of chapters:', structuredData.flashcard_decks?.length);
      
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
          chapters.push({
            id: index + 1,
            title: deck.chapter_title || `Chapter ${index + 1}`,
            cards: deck.card_count || deck.cards?.length || 0,
            startIndex: startIndex,
            endIndex: flashcards.length - 1
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
        fileType: fileExt
      };

      res.json({
        metadata: enhancedMetadata,
        flashcards: flashcards,
        chapters: chapters,
        structuredData: structuredData
      });
      
    } catch (openaiError) {
      console.log('OpenAI API error:', openaiError.message);
      console.log('Generating intelligent fallback flashcards with chapter detection...');
      
      // Intelligent fallback: Detect chapters and create flashcards
      const chapters = detectChapters(extractedText);
      const flashcards = [];
      
      chapters.forEach((chapter, chapterIndex) => {
        const chapterText = chapter.content;
        const chapterFlashcards = generateChapterFlashcards(chapterText, chapter.title);
        
        chapter.startIndex = flashcards.length;
        chapterFlashcards.forEach(card => flashcards.push(card));
        chapter.endIndex = flashcards.length - 1;
        chapter.cards = chapterFlashcards.length;
        
        // Clean up chapter object
        delete chapter.content;
      });

      fs.unlinkSync(filePath);

      const enhancedMetadata = {
        fileName: req.file.originalname,
        documentTitle: req.file.originalname,
        pageCount: pageCount,
        flashcardCount: flashcards.length,
        chapterCount: chapters.length,
        textLength: extractedText.length,
        processedAt: new Date().toISOString(),
        fileSize: req.file.size,
        fileType: fileExt,
        usedFallback: true
      };

      res.json({
        metadata: enhancedMetadata,
        flashcards: flashcards,
        chapters: chapters
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
  
  // Filter out TOC/non-content sections
  const skipKeywords = [
    'table of contents', 'contents', 'index', 'references', 'bibliography', 
    'preface', 'foreword', 'acknowledgment', 'acknowledgement', 'about the author',
    'about this book', 'dedication', 'copyright', 'appendix', 'glossary'
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
    
    return !shouldSkip && !tooShort;
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

// Generate flashcards from chapter content - ONLY definitions and key concepts
function generateChapterFlashcards(chapterText, chapterTitle) {
  const flashcards = [];
  
  // Extract sentences
  const sentences = chapterText.split(/[.!?]+/).filter(s => s.trim().length > 30);
  
  // 1. STRICT Definition-based flashcards (highest priority)
  // Look for explicit definition patterns at sentence start
  const definitionPatterns = [
    /(?:^|\.\s+)([A-Z][a-zA-Z\s]{3,50}?)\s+(?:is|are)\s+(?:a|an|the)?\s*([^.!?]{20,250})[.!?]/gm,
    /(?:^|\.\s+)([A-Z][a-zA-Z\s]{3,50}?)\s+(?:refers to|means|is defined as|can be defined as)\s+([^.!?]{20,250})[.!?]/gm,
    /(?:^|\.\s+)The term\s+([A-Z][a-zA-Z\s]{3,50}?)\s+(?:means|refers to|is defined as)\s+([^.!?]{20,250})[.!?]/gm
  ];
  
  definitionPatterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(chapterText)) !== null) {
      const term = match[1]?.trim();
      const definition = match[2]?.trim();
      
      if (term && definition && term.length > 3 && term.length < 60 && definition.length > 20) {
        // Validate term doesn't contain sentence fragments
        const hasProperNoun = /^[A-Z]/.test(term);
        const notTooManyWords = term.split(/\s+/).length <= 6;
        const notSentenceFragment = !term.includes(',') && !term.includes('and');
        
        if (hasProperNoun && notTooManyWords && notSentenceFragment) {
          flashcards.push({
            question: `What is ${term}?`,
            answer: definition.replace(/^(a|an|the)\s+/i, '').trim(),
            type: 'definition'
          });
        }
      }
    }
  });
  
  // 2. Key concept identification (only clear, standalone definitions)
  // Look for sentences that start with a term and define it
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    
    // Must start with a capitalized term (not mid-sentence)
    const startsWithTerm = /^([A-Z][a-zA-Z\s]{2,50}?)\s+(is|are|means|refers to)\s+/i.test(trimmed);
    
    // Must be reasonable length
    const isReasonableLength = trimmed.length > 50 && trimmed.length < 300;
    
    // Must not contain procedural/explanatory words
    const notProcedural = !/\b(first|second|then|next|finally|step|however|therefore|thus|hence)\b/i.test(trimmed);
    
    // Must not be an example or elaboration
    const notExample = !/\b(for example|for instance|such as|e\.g\.|i\.e\.|this means|in other words)\b/i.test(trimmed);
    
    // Must not have multiple clauses (keep it simple)
    const notComplex = (trimmed.match(/,/g) || []).length <= 2;
    
    if (startsWithTerm && isReasonableLength && notProcedural && notExample && notComplex) {
      const match = trimmed.match(/^([A-Z][a-zA-Z\s]{2,50}?)\s+(is|are|means|refers to)\s+(.+)/i);
      
      if (match) {
        const term = match[1].trim();
        const definition = match[3].trim();
        
        // Validate term is a single concept (not a phrase)
        const wordCount = term.split(/\s+/).length;
        const isValidTerm = wordCount >= 1 && wordCount <= 5;
        const notSentenceFragment = !term.includes(',') && !term.includes('and') && !term.includes('or');
        
        if (isValidTerm && notSentenceFragment && definition.length > 20) {
          flashcards.push({
            question: `What is ${term}?`,
            answer: definition.replace(/^(a|an|the)\s+/i, '').trim(),
            type: 'concept'
          });
        }
      }
    }
  });
  
  // 3. Extract only terms that are explicitly defined in parentheses or with colons
  // Pattern: "Term (definition)" or "Term: definition"
  const explicitDefinitions = [
    /([A-Z][a-zA-Z\s]{2,40})\s*\(([^)]{20,200})\)/g,
    /^([A-Z][a-zA-Z\s]{2,40}):\s+([^.!?]{20,250})[.!?]/gm
  ];
  
  explicitDefinitions.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(chapterText)) !== null) {
      const term = match[1]?.trim();
      const definition = match[2]?.trim();
      
      if (term && definition && term.length > 3 && definition.length > 20) {
        const wordCount = term.split(/\s+/).length;
        const isValidTerm = wordCount >= 1 && wordCount <= 5;
        const notCommonWord = !commonWords.includes(term.toLowerCase());
        
        if (isValidTerm && notCommonWord) {
          flashcards.push({
            question: `What is ${term}?`,
            answer: definition,
            type: 'term'
          });
        }
      }
    }
  });
  
  // Remove duplicates and limit to quality flashcards
  const uniqueFlashcards = [];
  const seen = new Set();
  
  flashcards.forEach(card => {
    // Create a key from the question to detect duplicates
    const key = card.question.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Only add if not duplicate and answer is substantial
    if (!seen.has(key) && card.answer.length > 15 && card.answer.length < 400) {
      seen.add(key);
      
      // Clean up the answer
      card.answer = card.answer
        .replace(/^(is|are|means|refers to|defined as)\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Remove type field before adding
      delete card.type;
      
      uniqueFlashcards.push(card);
    }
  });
  
  // Limit to reasonable number (quality over quantity)
  return uniqueFlashcards.slice(0, 15);
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

app.listen(PORT, () => console.log(`Backend API running on port ${PORT}`));