const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
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
        error: 'Audio transcription not yet implemented. Please use PDF or TXT files.' 
      });
    } else {
      console.log('Invalid file type:', fileExt);
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Supported formats: PDF, TXT, MP3, WAV' });
    }

    console.log('Processing entire document with structured prompt...');
    
    try {
      // Enhanced structured prompt for chapter-based flashcard generation
      const structuredPrompt = `You are an expert AI Flashcard Creator specializing in educational material. Your task is to analyze the entire structured document and generate flashcards that are strictly organized by the document's main content chapters.

Input Document/Text: 
${extractedText}

CRITICAL INSTRUCTIONS:

1. SKIP NON-CONTENT SECTIONS
- DO NOT create flashcards for: Introduction, Preface, Table of Contents, Index, References, Bibliography, Acknowledgments, or About the Author sections
- ONLY process main content chapters that contain substantive educational material
- Start from the first main content chapter (e.g., Chapter 1, Unit 1, Section 1 with actual content)
- If the document has 10 chapters of main content, create flashcards for ALL 10 chapters

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
- Shorter chapters (1-3 pages): 8-15 flashcards
- Medium chapters (4-8 pages): 15-25 flashcards
- Longer chapters (9+ pages): 25-40 flashcards
- Ensure EVERY important concept in each chapter is covered

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
        max_tokens: 8000,
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
      console.log('Generating fallback flashcards...');
      
      // Fallback: Create basic flashcards from text
      const flashcards = [];
      const sentences = extractedText.split(/[.!?]+/).filter(s => s.trim().length > 30);
      const paragraphs = extractedText.split(/\n\s*\n/).filter(p => p.trim().length > 50);
      
      // Create definition-style flashcards
      for (let i = 0; i < Math.min(5, sentences.length); i++) {
        const sentence = sentences[i].trim();
        if (sentence && (sentence.includes(' is ') || sentence.includes(' are '))) {
          const parts = sentence.split(/ is | are /);
          if (parts.length >= 2) {
            flashcards.push({
              question: `What ${parts[0].toLowerCase()}?`,
              answer: parts.slice(1).join(' is/are ')
            });
          }
        }
      }
      
      // Create concept-based flashcards
      for (let i = 0; i < Math.min(5, paragraphs.length); i++) {
        const paragraph = paragraphs[i].trim();
        if (paragraph) {
          const firstSentence = paragraph.split(/[.!?]/)[0];
          flashcards.push({
            question: `Explain: "${firstSentence.substring(0, 60)}..."`,
            answer: paragraph.substring(0, 200) + (paragraph.length > 200 ? '...' : '')
          });
        }
      }

      // Create a single chapter for fallback
      const chapters = [{
        id: 1,
        title: 'Main Content',
        cards: flashcards.length,
        startIndex: 0,
        endIndex: flashcards.length - 1
      }];

      fs.unlinkSync(filePath);

      const enhancedMetadata = {
        fileName: req.file.originalname,
        documentTitle: req.file.originalname,
        pageCount: pageCount,
        flashcardCount: flashcards.length,
        chapterCount: 1,
        textLength: extractedText.length,
        processedAt: new Date().toISOString(),
        fileSize: req.file.size,
        fileType: fileExt
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