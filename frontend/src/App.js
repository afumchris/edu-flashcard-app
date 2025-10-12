import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import BatmanFlashcard from './components/BatmanFlashcard';
import BatmanControls from './components/BatmanControls';
import SavedFlashcards from './components/SavedFlashcards';

function App() {
  const [file, setFile] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [sessions, setSessions] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [chapters, setChapters] = useState([]);

  const onDrop = async (acceptedFiles) => {
    setFile(acceptedFiles[0]);
    setError(null);
    setLoading(true);
    setFlashcards([]);
    setMetadata(null);
    setChapters([]);
    
    const formData = new FormData();
    formData.append('file', acceptedFiles[0]);
    console.log('Uploading file:', acceptedFiles[0].name, 'size:', acceptedFiles[0].size);

    try {
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://5002--0199996a-a2e1-7b59-83b2-653833a630df.eu-central-1-01.gitpod.dev'
        : 'http://localhost:5002';
      
      const response = await axios.post(`${backendUrl}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      console.log('Upload response:', response.data);
      const flashcardsData = response.data.flashcards || [];
      const metadataData = response.data.metadata;
      
      setFlashcards(flashcardsData);
      setMetadata(metadataData);
      setCurrentIndex(0);
      setIsFlipped(false);
      
      // Generate chapters dynamically based on flashcards
      const generatedChapters = generateChapters(flashcardsData, metadataData);
      setChapters(generatedChapters);
      
      // Add to sessions
      const newSession = {
        id: Date.now(),
        name: acceptedFiles[0].name,
        cards: flashcardsData.length,
        chapters: generatedChapters.length,
        timestamp: 'Just now',
        active: true,
        flashcards: flashcardsData,
        metadata: metadataData,
        generatedChapters
      };
      
      setSessions(prev => [newSession, ...prev.map(s => ({ ...s, active: false }))]);
    } catch (err) {
      console.error('Upload error:', err.message, err.response?.data, err.response?.status);
      setError(err.response?.data?.error || 'Upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateChapters = (flashcards, metadata) => {
    if (!flashcards || flashcards.length === 0) return [];
    
    const cardsPerChapter = Math.ceil(flashcards.length / Math.min(metadata?.pageCount || 5, 10));
    const chapters = [];
    
    for (let i = 0; i < flashcards.length; i += cardsPerChapter) {
      const chapterCards = flashcards.slice(i, i + cardsPerChapter);
      const chapterNum = Math.floor(i / cardsPerChapter) + 1;
      
      // Extract topic from first question
      const firstQuestion = chapterCards[0]?.question || '';
      const topic = firstQuestion.split(/[?.!]/)[0].substring(0, 40);
      
      chapters.push({
        id: chapterNum,
        title: `Chapter ${chapterNum}: ${topic}${topic.length >= 40 ? '...' : ''}`,
        cards: chapterCards.length,
        startIndex: i,
        endIndex: Math.min(i + cardsPerChapter - 1, flashcards.length - 1)
      });
    }
    
    return chapters;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/mp4': ['.m4a']
    } 
  });

  const handleFlip = () => setIsFlipped(!isFlipped);
  
  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };
  
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleSave = () => {
    setSaveMessage('✅ Flashcard set saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleLoadFlashcards = (loadedFlashcards, loadedMetadata) => {
    setFlashcards(loadedFlashcards);
    setMetadata(loadedMetadata);
    setCurrentIndex(0);
    setIsFlipped(false);
    setError(null);
  };

  const handleDeleteSession = (sessionId) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
    if (sessions.find(s => s.id === sessionId)?.active) {
      setFlashcards([]);
      setMetadata(null);
    }
  };

  const handleSessionClick = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setSessions(sessions.map(s => ({
        ...s,
        active: s.id === sessionId
      })));
      setFlashcards(session.flashcards);
      setMetadata(session.metadata);
      setChapters(session.generatedChapters);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  };

  const handleChapterClick = (chapter) => {
    setCurrentIndex(chapter.startIndex);
    setIsFlipped(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      darkMode ? 'bg-neutral-900' : 'bg-white'
    }`}>
      {/* Left Sidebar */}
      <div className={`w-64 min-h-screen p-4 flex flex-col border-r transition-colors duration-300 ${
        darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-200'
      }`}>
        <div className="mb-6">
          <h2 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-neutral-100' : 'text-neutral-900'}`}>
            My Sessions
          </h2>
          <button 
            {...getRootProps()}
            className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all mb-4 ${
              darkMode 
                ? 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600' 
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-300'
            }`}
          >
            <input {...getInputProps()} disabled={loading} />
            + New Upload
          </button>
          
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <p className={`text-sm text-center py-4 ${darkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                No sessions yet
              </p>
            ) : (
              sessions.map(session => (
                <div 
                  key={session.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all relative group ${
                    session.active 
                      ? darkMode 
                        ? 'bg-neutral-700 text-neutral-100' 
                        : 'bg-white text-neutral-900 shadow-sm border border-neutral-200'
                      : darkMode 
                        ? 'text-neutral-400 hover:bg-neutral-700/50' 
                        : 'text-neutral-600 hover:bg-white hover:shadow-sm'
                  }`}
                  onClick={() => handleSessionClick(session.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md w-6 h-6 flex items-center justify-center text-sm ${
                      darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                    title="Delete session"
                  >
                    ×
                  </button>
                  <div className="font-medium text-sm mb-1 pr-7 truncate">{session.name}</div>
                  <div className="text-xs opacity-75">{session.cards} cards • {session.chapters} chapters</div>
                  <div className="text-xs opacity-60 mt-1">{session.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Banner */}
        <div className={`py-4 px-6 flex items-center justify-between border-b transition-colors duration-300 ${
          darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        }`}>
          <div>
            <h1 className={`text-2xl font-semibold ${darkMode ? 'text-neutral-100' : 'text-neutral-900'}`}>
              Andor
            </h1>
            <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Transform Your Content Into Smart Learning Cards
            </p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              darkMode 
                ? 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600' 
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Chapters Section */}
          {metadata && (
            <div className={`w-72 border-r p-4 transition-colors duration-300 overflow-y-auto ${
              darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className={`rounded-lg p-3 mb-4 ${
                darkMode ? 'bg-neutral-800' : 'bg-white border border-neutral-200'
              }`}>
                <h3 className={`font-semibold text-sm mb-1 ${darkMode ? 'text-neutral-100' : 'text-neutral-900'}`}>
                  Chapters
                </h3>
                <p className={`text-xs truncate ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  {metadata.fileName}
                </p>
              </div>
              
              <div className="space-y-2">
                {chapters.length === 0 ? (
                  <p className={`text-sm text-center py-4 ${darkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    No chapters available
                  </p>
                ) : (
                  chapters.map(chapter => (
                    <div 
                      key={chapter.id}
                      onClick={() => handleChapterClick(chapter)}
                      className={`rounded-lg p-3 cursor-pointer transition-all ${
                        currentIndex >= chapter.startIndex && currentIndex <= chapter.endIndex
                          ? darkMode 
                            ? 'bg-primary text-white' 
                            : 'bg-primary text-white'
                          : darkMode 
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' 
                            : 'bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200'
                      }`}
                    >
                      <div className="font-medium text-sm mb-1">{chapter.title}</div>
                      <div className="text-xs opacity-75">
                        {chapter.cards} cards
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Flashcard Display Area */}
          <div className={`flex-1 p-8 flex flex-col items-center justify-center transition-colors duration-300 ${
            darkMode ? 'bg-neutral-900' : 'bg-white'
          }`}>
            {error && (
              <div className={`rounded-lg p-4 mb-4 max-w-2xl border ${
                darkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <p className="text-center text-sm">❌ {error}</p>
              </div>
            )}

            {saveMessage && (
              <div className={`rounded-lg p-4 mb-4 max-w-2xl border ${
                darkMode ? 'bg-green-900/20 border-green-800 text-green-300' : 'bg-green-50 border-green-200 text-green-700'
              }`}>
                <p className="text-center text-sm">{saveMessage}</p>
              </div>
            )}

            {loading && (
              <div className="text-center">
                <div className={`animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto mb-4 ${
                  darkMode ? 'border-primary' : 'border-primary'
                }`}></div>
                <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Processing your file...
                </p>
              </div>
            )}

            {!loading && flashcards.length > 0 ? (
              <div className="w-full max-w-3xl">
                <BatmanFlashcard
                  flashcard={flashcards[currentIndex]}
                  isFlipped={isFlipped}
                  onFlip={handleFlip}
                  currentIndex={currentIndex}
                  totalCards={flashcards.length}
                  darkMode={darkMode}
                />

                <BatmanControls
                  currentIndex={currentIndex}
                  totalCards={flashcards.length}
                  onPrevious={handlePrev}
                  onNext={handleNext}
                  onSave={handleSave}
                  metadata={metadata}
                  flashcards={flashcards}
                  darkMode={darkMode}
                />
              </div>
            ) : !loading && (
              <div className={`text-center ${darkMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                <div className="text-6xl mb-4">📚</div>
                <p className="text-lg font-medium mb-2">Upload content to get started</p>
                <p className="text-sm">PDF, Text, or Audio files supported</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`py-3 px-6 text-center border-t transition-colors duration-300 ${
          darkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-400' : 'bg-neutral-50 border-neutral-200 text-neutral-600'
        }`}>
          <p className="text-sm">May the Force be With You! ⚔️</p>
        </div>
      </div>
    </div>
  );
}

export default App;