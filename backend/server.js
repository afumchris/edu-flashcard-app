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

app.use(cors());
app.use(express.json());

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
    for (const chunk of chunks) {
      console.log('Processing chunk:', chunk.substring(0, 50) + '...');
      
      try {
        const prompt = `Generate educational flashcards from this text. Format each flashcard exactly as:
Question: [question text]
Answer: [answer text]

Focus on key concepts, definitions, and important facts. Generate 3-5 flashcards from this text:

${chunk}`;
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
        });
        console.log('OpenAI response received');
        flashcards.push(...parseFlashcards(response.choices[0].message.content));
      } catch (openaiError) {
        console.log('OpenAI API error:', openaiError.message);
        console.log('Generating fallback flashcards...');
        
        // Fallback: Generate simple flashcards from the text
        const sentences = chunk.split(/[.!?]+/).filter(s => s.trim().length > 20);
        for (let i = 0; i < Math.min(3, sentences.length); i++) {
          const sentence = sentences[i].trim();
          if (sentence) {
            flashcards.push({
              question: `What is mentioned about: ${sentence.substring(0, 50)}...?`,
              answer: sentence
            });
          }
        }
      }
    }

    console.log('Flashcards generated:', flashcards.length);
    fs.unlinkSync(filePath);

    res.json({
      metadata: { fileName: req.file.originalname, pageCount: data.numpages, chunkCount: chunks.length },
      flashcards,
    });
  } catch (error) {
    console.error('Upload error:', error.message, error.stack);
    res.status(500).json({ error: 'Server error: ' + (error.message || 'Unknown error') });
  }
});

function parseFlashcards(text) {
  const cards = [];
  const lines = text.split('\n');
  let question = '';
  let answer = '';
  lines.forEach(line => {
    if (line.startsWith('Question:')) {
      if (question && answer) cards.push({ question, answer });
      question = line.replace('Question:', '').trim();
      answer = '';
    } else if (line.startsWith('Answer:')) {
      answer = line.replace('Answer:', '').trim();
    }
  });
  if (question && answer) cards.push({ question, answer });
  return cards;
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