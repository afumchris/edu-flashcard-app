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
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    if (fileExt !== '.pdf') {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Only PDFs are supported for processing' });
    }

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    const chunks = [];
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i += 500) {
      chunks.push(words.slice(i, i + 500).join(' '));
    }

    const flashcards = [];
    for (const chunk of chunks) {
      const prompt = `Generate educational flashcards for learning purposes from this text. Each flashcard should have a question on one side and answer on the other. Focus on key concepts: ${chunk}`;
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      });
      flashcards.push(...parseFlashcards(response.choices[0].message.content));
    }

    fs.unlinkSync(filePath);

    res.json({
      metadata: { fileName: req.file.originalname, pageCount: data.numpages, chunkCount: chunks.length },
      flashcards,
    });
  } catch (error) {
    console.error(error);
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

app.listen(5000, () => console.log('Backend API running on http://localhost:5000'));