/**
 * Optimized Prompt Engineering Module
 * Simplified, effective prompts for flashcard generation
 */

/**
 * System message - short and clear
 */
const SYSTEM_MESSAGE = "You are an expert educational flashcard creator. Extract key definitions and concepts from academic text and format them as flashcards.";

/**
 * Few-shot examples for better results
 */
const FEW_SHOT_EXAMPLES = [
  {
    role: "user",
    content: `Extract flashcards from this text:

Machine Learning is a subset of AI that provides systems the ability to automatically learn and improve from experience without being explicitly programmed.

Neural Network is a computing system inspired by biological neural networks. It consists of interconnected nodes that process information.`
  },
  {
    role: "assistant",
    content: JSON.stringify({
      document_title: "Machine Learning Basics",
      flashcard_decks: [
        {
          chapter_title: "Introduction",
          card_count: 2,
          cards: [
            {
              Question: "What is Machine Learning?",
              Answer: "A subset of AI that provides systems the ability to automatically learn and improve from experience without being explicitly programmed."
            },
            {
              Question: "What is a Neural Network?",
              Answer: "A computing system inspired by biological neural networks that consists of interconnected nodes that process information."
            }
          ]
        }
      ]
    })
  },
  {
    role: "user",
    content: `Extract flashcards from this text:

CHAPTER 1: DATA STRUCTURES

Array: A collection of elements stored at contiguous memory locations. Arrays allow random access to elements.

Linked List: A linear data structure where elements are stored in nodes. Each node contains data and a reference to the next node.`
  },
  {
    role: "assistant",
    content: JSON.stringify({
      document_title: "Data Structures",
      flashcard_decks: [
        {
          chapter_title: "Chapter 1: Data Structures",
          card_count: 2,
          cards: [
            {
              Question: "What is an Array?",
              Answer: "A collection of elements stored at contiguous memory locations that allows random access to elements."
            },
            {
              Question: "What is a Linked List?",
              Answer: "A linear data structure where elements are stored in nodes, with each node containing data and a reference to the next node."
            }
          ]
        }
      ]
    })
  }
];

/**
 * Create optimized user message
 */
function createUserMessage(text, documentTitle = null) {
  let message = "Extract key definitions and concepts from this text and create flashcards.\n\n";
  
  if (documentTitle) {
    message += `Document: ${documentTitle}\n\n`;
  }
  
  message += "Rules:\n";
  message += "1. Extract ONLY clear definitions and key concepts\n";
  message += "2. Skip metadata, examples, and procedural content\n";
  message += "3. Create concise questions (\"What is X?\")\n";
  message += "4. Keep answers clear and complete (1-3 sentences)\n";
  message += "5. Organize by chapters if present\n\n";
  message += "Text:\n" + text;
  
  return message;
}

/**
 * Build complete message array for OpenAI
 */
function buildMessages(text, documentTitle = null) {
  return [
    { role: "system", content: SYSTEM_MESSAGE },
    ...FEW_SHOT_EXAMPLES,
    { role: "user", content: createUserMessage(text, documentTitle) }
  ];
}

/**
 * Get optimal OpenAI configuration
 */
function getOptimalConfig() {
  return {
    model: 'gpt-4o-mini',  // Best balance of speed, cost, and quality
    temperature: 0.3,       // Lower for consistency
    max_tokens: 4000,       // Sufficient for most documents
    response_format: { type: "json_object" }  // Ensure JSON output
  };
}

/**
 * Chunk large text for processing
 */
function chunkText(text, maxChunkSize = 8000) {
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  const chunks = [];
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += '\n\n' + para;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Merge flashcards from multiple chunks
 */
function mergeChunkedResults(results) {
  const merged = {
    document_title: results[0]?.document_title || "Document",
    flashcard_decks: []
  };
  
  const deckMap = new Map();
  
  results.forEach(result => {
    if (result.flashcard_decks) {
      result.flashcard_decks.forEach(deck => {
        const key = deck.chapter_title || 'Main';
        
        if (deckMap.has(key)) {
          // Merge cards into existing deck
          const existing = deckMap.get(key);
          existing.cards.push(...deck.cards);
          existing.card_count = existing.cards.length;
        } else {
          // Add new deck
          deckMap.set(key, { ...deck });
        }
      });
    }
  });
  
  merged.flashcard_decks = Array.from(deckMap.values());
  return merged;
}

module.exports = {
  SYSTEM_MESSAGE,
  FEW_SHOT_EXAMPLES,
  createUserMessage,
  buildMessages,
  getOptimalConfig,
  chunkText,
  mergeChunkedResults
};
