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

    if (fileExt !== '.pdf') {
      console.log('Invalid file type:', fileExt);
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Only PDFs are supported for processing' });
    }

    console.log('Reading PDF file:', filePath);
    const dataBuffer = fs.readFileSync(filePath);
    console.log('Parsing PDF...');
    const data = await pdf(dataBuffer);
    console.log('PDF parsed:', {
      numpages: data.numpages,
      textLength: data.text.length
    });

    const chunks = [];
    const words = data.text.split(/\s+/);
    for (let i = 0; i < words.length; i += 500) {
      chunks.push(words.slice(i, i + 500).join(' '));
    }
    console.log('Chunks created:', chunks.length);

    const flashcards = [];
    const extractedInfo = {
      keyTerms: new Set(),
      concepts: new Set(),
      facts: new Set(),
      definitions: new Set()
    };

    for (const chunk of chunks) {
      console.log('Processing chunk:', chunk.substring(0, 50) + '...');
      
      try {
        // Enhanced prompt for better information extraction
        const prompt = `You are an expert educational content creator. Analyze this text and create high-quality flashcards that capture the most important information.

INSTRUCTIONS:
1. Extract key concepts, definitions, facts, formulas, processes, and relationships
2. Create questions that test understanding, not just memorization
3. Include different question types: definitions, explanations, applications, comparisons
4. Make answers comprehensive but concise
5. Focus on information that would be valuable for learning and retention

Format each flashcard exactly as:
Question: [clear, specific question]
Answer: [comprehensive, accurate answer]

Generate 4-6 high-quality flashcards from this text:

${chunk}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        });
        
        console.log('OpenAI response received');
        const newCards = parseFlashcards(response.choices[0].message.content);
        flashcards.push(...newCards);
        
        // Extract key information for metadata
        newCards.forEach(card => {
          const words = (card.question + ' ' + card.answer).toLowerCase().split(/\W+/);
          words.forEach(word => {
            if (word.length > 4 && !commonWords.includes(word)) {
              extractedInfo.keyTerms.add(word);
            }
          });
        });
        
      } catch (openaiError) {
        console.log('OpenAI API error:', openaiError.message);
        console.log('Generating enhanced fallback flashcards...');
        
        // Enhanced fallback: Generate more meaningful flashcards
        const sentences = chunk.split(/[.!?]+/).filter(s => s.trim().length > 30);
        const paragraphs = chunk.split(/\n\s*\n/).filter(p => p.trim().length > 50);
        
        // Create definition-style flashcards
        for (let i = 0; i < Math.min(2, sentences.length); i++) {
          const sentence = sentences[i].trim();
          if (sentence && sentence.includes(' is ') || sentence.includes(' are ')) {
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
        for (let i = 0; i < Math.min(2, paragraphs.length); i++) {
          const paragraph = paragraphs[i].trim();
          if (paragraph) {
            const firstSentence = paragraph.split(/[.!?]/)[0];
            flashcards.push({
              question: `Explain the concept discussed in: "${firstSentence.substring(0, 60)}..."`,
              answer: paragraph.substring(0, 200) + (paragraph.length > 200 ? '...' : '')
            });
          }
        }
      }
    }

    // Remove duplicate flashcards
    const uniqueFlashcards = flashcards.filter((card, index, self) => 
      index === self.findIndex(c => c.question.toLowerCase() === card.question.toLowerCase())
    );

    console.log('Flashcards generated:', uniqueFlashcards.length);
    fs.unlinkSync(filePath);

    // Enhanced metadata
    const enhancedMetadata = {
      fileName: req.file.originalname,
      pageCount: data.numpages,
      chunkCount: chunks.length,
      flashcardCount: uniqueFlashcards.length,
      textLength: data.text.length,
      keyTermsCount: extractedInfo.keyTerms.size,
      processedAt: new Date().toISOString(),
      fileSize: req.file.size
    };

    res.json({
      metadata: enhancedMetadata,
      flashcards: uniqueFlashcards,
    });
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