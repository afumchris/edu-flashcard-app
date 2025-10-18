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

2. IMPORTANT INFORMATION EXTRACTION
Focus ONLY on extracting:
- Key concepts and theories that are central to understanding the topic
- Critical definitions and terminology
- Important processes, procedures, and methodologies
- Significant facts, figures, and data points
- Essential principles and laws
- Major historical events or milestones (if relevant)
- Important names and their contributions
- Core formulas and equations (if applicable)

DO NOT extract:
- Trivial details or examples
- Redundant information
- Filler content or transitional text
- Author's personal anecdotes unless they illustrate a key concept
- Minor supporting details

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

4. FLASHCARD QUANTITY PER CHAPTER
- Generate as many flashcards as needed to cover ALL important concepts in each chapter
- Shorter chapters (1-3 pages): 8-15 flashcards minimum
- Medium chapters (4-8 pages): 15-30 flashcards minimum
- Longer chapters (9+ pages): 30-50 flashcards minimum
- Do not limit flashcards - if a chapter has 100 important concepts, create 100 flashcards
- Ensure EVERY important concept, definition, process, and key fact in each chapter is covered

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

EXAMPLE OF GOOD FLASHCARD:
{
  "Question": "What is machine learning and how does it differ from traditional programming?",
  "Answer": "Machine learning is a subset of AI that enables computers to learn from data without being explicitly programmed. Unlike traditional programming where developers write specific rules, machine learning algorithms identify patterns in data and make decisions based on those patterns. The system improves its performance as it processes more data."
}

EXAMPLE OF BAD FLASHCARD (too simple):
{
  "Question": "What is ML?",
  "Answer": "Machine Learning"
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

// Generate flashcards from chapter content
function generateChapterFlashcards(chapterText, chapterTitle) {
  const flashcards = [];
  
  // Extract sentences and paragraphs
  const sentences = chapterText.split(/[.!?]+/).filter(s => s.trim().length > 30);
  const paragraphs = chapterText.split(/\n\s*\n/).filter(p => p.trim().length > 100);
  
  // 1. Definition-based flashcards
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.match(/\b(is|are|means|refers to|defined as)\b/i)) {
      const parts = trimmed.split(/\b(?:is|are|means|refers to|defined as)\b/i);
      if (parts.length >= 2 && parts[0].length < 100) {
        flashcards.push({
          question: `What ${parts[0].trim().toLowerCase()}?`,
          answer: parts.slice(1).join(' ').trim()
        });
      }
    }
  });
  
  // 2. Concept explanation flashcards
  paragraphs.slice(0, 8).forEach((para, idx) => {
    const firstSentence = para.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 20 && firstSentence.length < 150) {
      flashcards.push({
        question: `Explain the concept: "${firstSentence.substring(0, 80)}${firstSentence.length > 80 ? '...' : ''}"`,
        answer: para.substring(0, 300) + (para.length > 300 ? '...' : '')
      });
    }
  });
  
  // 3. Key terms flashcards
  const keyTermPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  const keyTerms = new Set();
  let match;
  while ((match = keyTermPattern.exec(chapterText)) !== null) {
    const term = match[1];
    if (term.length > 3 && term.length < 40 && !commonWords.includes(term.toLowerCase())) {
      keyTerms.add(term);
    }
  }
  
  Array.from(keyTerms).slice(0, 5).forEach(term => {
    // Find context around the term
    const termIndex = chapterText.indexOf(term);
    if (termIndex !== -1) {
      const contextStart = Math.max(0, termIndex - 100);
      const contextEnd = Math.min(chapterText.length, termIndex + 200);
      const context = chapterText.substring(contextStart, contextEnd).trim();
      
      flashcards.push({
        question: `What is ${term}?`,
        answer: context
      });
    }
  });
  
  // 4. Process/procedure flashcards
  paragraphs.forEach(para => {
    if (para.match(/\b(first|second|third|then|next|finally|step)\b/i)) {
      const firstSentence = para.split(/[.!?]/)[0].trim();
      flashcards.push({
        question: `Describe the process: ${firstSentence.substring(0, 60)}...`,
        answer: para.substring(0, 350) + (para.length > 350 ? '...' : '')
      });
    }
  });
  
  // Ensure minimum flashcards per chapter
  if (flashcards.length < 5) {
    sentences.slice(0, 10).forEach((sentence, idx) => {
      if (flashcards.length < 10 && sentence.trim().length > 50) {
        flashcards.push({
          question: `What does the text say about: "${sentence.substring(0, 50)}..."?`,
          answer: sentence.trim()
        });
      }
    });
  }
  
  // Remove duplicates and limit
  const uniqueFlashcards = [];
  const seen = new Set();
  
  flashcards.forEach(card => {
    const key = card.question.toLowerCase().substring(0, 50);
    if (!seen.has(key) && uniqueFlashcards.length < 25) {
      seen.add(key);
      uniqueFlashcards.push(card);
    }
  });
  
  return uniqueFlashcards;
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