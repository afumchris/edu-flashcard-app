# AI Flashcard Generation - Structured Prompt Documentation

## Overview
The application now uses an advanced structured prompt that generates flashcards organized by chapters/units/sections from the uploaded document.

## Prompt Structure

### Input
The entire document content (PDF text, plain text, or audio transcript) is sent to the AI in a single request.

### Processing Instructions

#### 1. Extraction and Formatting Rules

**Identify and Isolate Units:**
- Parse the document to identify major headings (Chapter 1, Unit 2, Section A, etc.)
- Each distinct unit forms its own deck of flashcards
- Maintains the document's hierarchical structure

**Flashcard Quantity per Unit:**
- Shorter units: 8-15 flashcards minimum
- Longer, denser units: 20-40 flashcards
- Ensures comprehensive coverage of all key concepts

**Content Focus:**
- Core concepts and definitions
- Processes and procedures
- Important figures and names
- Critical facts unique to each chapter/unit

**Card Structure:**
- JSON format with "Question" and "Answer" keys
- Questions require active recall and test comprehension
- Answers are precise, complete, and extracted from source content

#### 2. Output Format

The AI returns a structured JSON object:

```json
{
  "document_title": "Inferred or actual document title",
  "flashcard_decks": [
    {
      "chapter_title": "Chapter/Unit/Section Title",
      "card_count": 21,
      "cards": [
        {
          "Question": "Question text here",
          "Answer": "Answer text here"
        }
      ]
    }
  ]
}
```

## Backend Processing

### API Endpoint: `/upload`

**Request:**
- Multipart form data with file upload
- Supports: PDF, TXT, MP3, WAV, M4A

**Processing Steps:**

1. **File Type Detection**
   - PDF: Extract text using pdf-parse
   - TXT: Read directly as UTF-8
   - Audio: Placeholder for future transcription

2. **AI Processing**
   - Send entire document to OpenAI GPT-3.5-turbo-16k
   - Use structured prompt for chapter-based generation
   - Temperature: 0.7 for balanced creativity
   - Max tokens: 8000 for comprehensive output

3. **Response Parsing**
   - Parse JSON response from AI
   - Handle markdown code blocks if present
   - Fallback parsing if JSON is malformed

4. **Data Transformation**
   - Flatten flashcards array for frontend compatibility
   - Create chapter metadata with start/end indices
   - Generate enhanced metadata

**Response:**
```json
{
  "metadata": {
    "fileName": "document.pdf",
    "documentTitle": "AI-extracted title",
    "pageCount": 10,
    "flashcardCount": 85,
    "chapterCount": 4,
    "textLength": 15000,
    "processedAt": "2025-10-12T11:00:00Z",
    "fileSize": 524288,
    "fileType": ".pdf"
  },
  "flashcards": [
    {
      "question": "Question text",
      "answer": "Answer text"
    }
  ],
  "chapters": [
    {
      "id": 1,
      "title": "Chapter 1: Introduction",
      "cards": 21,
      "startIndex": 0,
      "endIndex": 20
    }
  ],
  "structuredData": {
    // Original AI response
  }
}
```

### Fallback Mechanism

If OpenAI API fails:
1. Extract sentences and paragraphs from text
2. Create basic flashcards from definitions and concepts
3. Generate single "Main Content" chapter
4. Return minimal but functional flashcard set

## Frontend Integration

### Chapter Display

**Dynamic Generation:**
- Chapters only appear after document upload
- Uses backend-provided chapter structure
- Falls back to frontend generation if needed

**Chapter Features:**
- Click to jump to specific chapter
- Active chapter highlighted in green
- Shows card count per chapter
- Displays document title

**Session Management:**
- Each upload creates new session
- Sessions store flashcards and chapters
- Switch between sessions to load different documents
- Delete sessions with hover button

### User Experience Flow

1. **Upload Document**
   - Drag & drop or click to select
   - Supports PDF, TXT, audio files
   - Loading indicator during processing

2. **View Chapters**
   - Chapters appear in left sidebar
   - Document title displayed
   - Card count per chapter shown

3. **Study Flashcards**
   - Navigate by chapter or card
   - Flip cards to reveal answers
   - Track progress with progress bar

4. **Save & Manage**
   - Save flashcard sets to local storage
   - Load previous sessions
   - Delete unwanted sessions

## Benefits of Structured Approach

### For Users:
- **Better Organization**: Content grouped by natural document structure
- **Easier Navigation**: Jump to specific chapters/topics
- **Comprehensive Coverage**: Ensures all sections are covered
- **Accurate Counts**: Know exactly how many cards per chapter

### For Learning:
- **Contextual Learning**: Cards grouped by related topics
- **Progressive Study**: Study chapter by chapter
- **Better Retention**: Organized structure aids memory
- **Flexible Review**: Focus on specific chapters as needed

### Technical Advantages:
- **Single API Call**: More efficient than chunked processing
- **Better Context**: AI sees entire document structure
- **Consistent Quality**: Uniform flashcard generation
- **Scalable**: Handles documents of varying sizes

## Testing

### Test Document
A sample document (`test-content.txt`) is provided with 4 clear chapters:
1. Fundamentals of AI
2. Machine Learning Fundamentals
3. Neural Networks and Deep Learning
4. AI Ethics and Future Implications

### Expected Output
- 4 distinct chapters
- 8-15 cards per chapter (depending on content density)
- Questions testing comprehension
- Complete, accurate answers

### Verification Steps
1. Upload test document
2. Verify chapters appear correctly
3. Check card counts per chapter
4. Review flashcard quality
5. Test chapter navigation
6. Verify session persistence

## Future Enhancements

### Planned Features:
- Audio transcription support
- Multi-language support
- Custom chapter definitions
- Export to Anki/Quizlet
- Spaced repetition algorithm
- Progress tracking and analytics

### Potential Improvements:
- Image extraction from PDFs
- Diagram-based questions
- Difficulty levels per card
- User feedback on card quality
- Collaborative deck sharing
