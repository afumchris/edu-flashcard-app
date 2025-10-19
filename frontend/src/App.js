import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { API_BASE_URL } from './config/api';
import BatmanFlashcard from './components/BatmanFlashcard';
import BatmanControls from './components/BatmanControls';

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
  const [currentChapter, setCurrentChapter] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Check backend connectivity on mount
  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/`, { timeout: 5000 });
        if (response.data.status) {
          setBackendStatus('connected');
          console.log('✅ Backend connected:', response.data);
        }
      } catch (err) {
        setBackendStatus('disconnected');
        console.error('❌ Backend connection failed:', err.message);
        setError(`Cannot connect to backend at ${API_BASE_URL}. Please ensure the backend server is running.`);
      }
    };
    checkBackend();
  }, []);

  const onDrop = async (acceptedFiles) => {
    setFile(acceptedFiles[0]);
    setError(null);
    setLoading(true);
    setFlashcards([]);
    setMetadata(null);
    setChapters([]);
    setCurrentChapter(null);
    
    const formData = new FormData();
    formData.append('file', acceptedFiles[0]);
    console.log('Uploading file:', acceptedFiles[0].name, 'size:', acceptedFiles[0].size);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      });
      
      console.log('Upload response:', response.data);
      const flashcardsData = response.data.flashcards || [];
      const metadataData = response.data.metadata;
      const chaptersData = response.data.chapters || [];
      
      setFlashcards(flashcardsData);
      setMetadata(metadataData);
      setChapters(chaptersData);
      setCurrentIndex(0);
      setIsFlipped(false);
      
      if (chaptersData.length > 0) {
        setCurrentChapter(chaptersData[0]);
      }
      
      // Add to sessions
      const newSession = {
        id: Date.now(),
        name: acceptedFiles[0].name,
        cards: flashcardsData.length,
        chapters: chaptersData.length,
        timestamp: new Date().toLocaleTimeString(),
        active: true,
        flashcards: flashcardsData,
        metadata: metadataData,
        generatedChapters: chaptersData
      };
      
      setSessions(prev => [newSession, ...prev.map(s => ({ ...s, active: false }))]);
      
      if (metadataData.usedFallback) {
        setError('⚠️ Using fallback mode (OpenAI quota exceeded). Flashcards generated from text analysis.');
      }
    } catch (err) {
      console.error('Upload error:', err.message, err.response?.data, err.response?.status);
      
      // Provide more helpful error messages
      let errorMessage = 'Upload failed: ';
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage += 'Request timeout. The document may be too large or the server is slow.';
      } else if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        errorMessage += `Cannot connect to backend at ${API_BASE_URL}. Please check if the backend server is running.`;
      } else if (err.response?.status === 429) {
        errorMessage += 'OpenAI API quota exceeded. Using fallback mode.';
      } else {
        errorMessage += err.response?.data?.error || err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    } 
  });

  const handleFlip = () => setIsFlipped(!isFlipped);
  
  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setIsFlipped(false);
      updateCurrentChapter(newIndex);
    }
  };
  
  const handlePrev = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setIsFlipped(false);
      updateCurrentChapter(newIndex);
    }
  };

  const updateCurrentChapter = (index) => {
    // Fix: Handle empty chapters (where endIndex < startIndex)
    const chapter = chapters.find(ch => {
      if (ch.cards === 0) {
        // Empty chapter: check if index would be in this chapter's position
        return false;
      }
      return index >= ch.startIndex && index <= ch.endIndex;
    });
    if (chapter) {
      setCurrentChapter(chapter);
    }
  };

  const handleSave = () => {
    setSaveMessage('✅ Flashcard set saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleDeleteSession = (sessionId) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
    if (sessions.find(s => s.id === sessionId)?.active) {
      setFlashcards([]);
      setMetadata(null);
      setChapters([]);
      setCurrentChapter(null);
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
      if (session.generatedChapters.length > 0) {
        setCurrentChapter(session.generatedChapters[0]);
      }
    }
  };

  const handleChapterClick = (chapter) => {
    setCurrentIndex(chapter.startIndex);
    setCurrentChapter(chapter);
    setIsFlipped(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const getCurrentChapterProgress = () => {
    if (!currentChapter) return 0;
    // Fix: Handle empty chapters to prevent division by zero
    if (currentChapter.cards === 0) return 0;
    const chapterCards = currentChapter.endIndex - currentChapter.startIndex + 1;
    const currentCardInChapter = currentIndex - currentChapter.startIndex + 1;
    return (currentCardInChapter / chapterCards) * 100;
  };

  return (
    <div className={`h-screen flex overflow-hidden transition-colors duration-300 ${
      darkMode ? 'bg-neutral-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      {/* Left Sidebar - Sessions */}
      <div className={`w-72 h-screen p-5 flex flex-col border-r transition-colors duration-300 overflow-hidden ${
        darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white/80 backdrop-blur-sm border-neutral-200'
      }`}>
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3">
              <span className="text-white text-xl">📚</span>
            </div>
            <div className="flex-1">
              <h2 className={`text-lg font-bold ${darkMode ? 'text-neutral-100' : 'text-neutral-900'}`}>
                Andor
              </h2>
              <p className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Smart Flashcards
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                backendStatus === 'connected' ? 'bg-green-500' : 
                backendStatus === 'disconnected' ? 'bg-red-500' : 
                'bg-yellow-500 animate-pulse'
              }`}></div>
              <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                {backendStatus === 'connected' ? 'Online' : 
                 backendStatus === 'disconnected' ? 'Offline' : 
                 'Checking...'}
              </span>
            </div>
          </div>
          
          <button 
            {...getRootProps()}
            className={`w-full px-4 py-3 rounded-xl font-medium transition-all mb-4 shadow-sm ${
              isDragActive
                ? 'bg-blue-500 text-white scale-105'
                : darkMode 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:scale-105'
            }`}
          >
            <input {...getInputProps()} disabled={loading} />
            {isDragActive ? '📥 Drop here!' : '+ New Upload'}
          </button>
          
          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
            {sessions.length === 0 ? (
              <div className={`text-center py-8 px-4 rounded-xl border-2 border-dashed ${
                darkMode ? 'border-neutral-700 text-neutral-500' : 'border-neutral-300 text-neutral-400'
              }`}>
                <p className="text-sm">No sessions yet</p>
                <p className="text-xs mt-1">Upload a document to start</p>
              </div>
            ) : (
              sessions.map(session => (
                <div 
                  key={session.id}
                  className={`p-3 rounded-xl cursor-pointer transition-all relative group ${
                    session.active 
                      ? darkMode 
                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-2 border-blue-500/50 text-neutral-100 shadow-lg' 
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400 text-neutral-900 shadow-md'
                      : darkMode 
                        ? 'bg-neutral-700/50 text-neutral-400 hover:bg-neutral-700 border border-neutral-600' 
                        : 'bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200 hover:shadow-sm'
                  }`}
                  onClick={() => handleSessionClick(session.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg w-6 h-6 flex items-center justify-center text-sm bg-red-500 hover:bg-red-600 text-white shadow-sm"
                    title="Delete session"
                  >
                    ×
                  </button>
                  <div className="font-semibold text-sm mb-1 pr-7 truncate">{session.name}</div>
                  <div className="flex items-center gap-2 text-xs opacity-75">
                    <span>📝 {session.cards} cards</span>
                    <span>•</span>
                    <span>📖 {session.chapters} chapters</span>
                  </div>
                  <div className="text-xs opacity-60 mt-1">{session.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Banner */}
        <div className={`py-4 px-6 flex items-center justify-between border-b transition-colors duration-300 flex-shrink-0 ${
          darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white/80 backdrop-blur-sm border-neutral-200'
        }`}>
          <div>
            <h1 className={`text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
              {metadata?.documentTitle || 'Transform Your Content Into Smart Learning Cards'}
            </h1>
            {metadata && (
              <p className={`text-sm mt-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                {metadata.chapterCount} chapters • {metadata.flashcardCount} flashcards • {metadata.pageCount} pages
              </p>
            )}
          </div>
          <button
            onClick={toggleDarkMode}
            className={`px-4 py-2 rounded-xl font-medium transition-all shadow-sm ${
              darkMode 
                ? 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600' 
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chapters Section */}
          {chapters.length > 0 && (
            <div className={`w-80 border-r p-5 transition-colors duration-300 overflow-y-auto flex-shrink-0 ${
              darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white/50 backdrop-blur-sm border-neutral-200'
            }`}>
              <div className={`rounded-xl p-4 mb-4 shadow-sm ${
                darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200'
              }`}>
                <h3 className={`font-bold text-base mb-2 ${darkMode ? 'text-neutral-100' : 'text-neutral-900'}`}>
                  📖 Chapters
                </h3>
                <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  {chapters.length} chapters • {flashcards.length} total cards
                </p>
                {currentChapter && (
                  <div className="mt-3">
                    <div className={`text-xs mb-1 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      Current chapter progress
                    </div>
                    <div className={`w-full rounded-full h-2 ${
                      darkMode ? 'bg-neutral-700' : 'bg-white'
                    }`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                        style={{ width: `${getCurrentChapterProgress()}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {chapters.map(chapter => {
                  // Fix: Handle empty chapters in active state calculation
                  const isActive = chapter.cards > 0 && currentIndex >= chapter.startIndex && currentIndex <= chapter.endIndex;
                  const isEmpty = chapter.cards === 0;
                  return (
                    <div 
                      key={chapter.id}
                      onClick={() => !isEmpty && handleChapterClick(chapter)}
                      className={`rounded-xl p-4 transition-all shadow-sm ${
                        isEmpty 
                          ? darkMode
                            ? 'bg-neutral-800/50 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-50'
                            : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed opacity-50'
                          : isActive
                            ? darkMode 
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105 cursor-pointer' 
                              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105 cursor-pointer'
                            : darkMode 
                              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 cursor-pointer' 
                              : 'bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          isActive 
                            ? 'bg-white/20' 
                            : darkMode 
                              ? 'bg-neutral-700' 
                              : 'bg-neutral-100'
                        }`}>
                          Ch {chapter.id}
                        </div>
                        <div className="text-xs opacity-75">
                          {chapter.cards} cards
                        </div>
                      </div>
                      <div className="font-semibold text-sm leading-tight">
                        {chapter.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Flashcard Display Area */}
          <div className={`flex-1 p-8 flex flex-col items-center justify-center transition-colors duration-300 overflow-y-auto ${
            darkMode ? 'bg-neutral-900' : 'bg-transparent'
          }`}>
            {error && (
              <div className={`rounded-xl p-4 mb-4 max-w-2xl border shadow-sm ${
                error.includes('⚠️')
                  ? darkMode 
                    ? 'bg-yellow-900/20 border-yellow-700 text-yellow-300' 
                    : 'bg-yellow-50 border-yellow-300 text-yellow-800'
                  : darkMode 
                    ? 'bg-red-900/20 border-red-800 text-red-300' 
                    : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <p className="text-center text-sm">{error}</p>
              </div>
            )}

            {saveMessage && (
              <div className={`rounded-xl p-4 mb-4 max-w-2xl border shadow-sm ${
                darkMode ? 'bg-green-900/20 border-green-800 text-green-300' : 'bg-green-50 border-green-200 text-green-700'
              }`}>
                <p className="text-center text-sm">{saveMessage}</p>
              </div>
            )}

            {loading && (
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-purple-600 animate-spin"></div>
                </div>
                <p className={`text-base font-medium ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Processing your document...
                </p>
                <p className={`text-sm mt-2 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Detecting chapters and generating flashcards
                </p>
              </div>
            )}

            {!loading && flashcards.length > 0 ? (
              <div className="w-full max-w-4xl">
                {currentChapter && (
                  <div className={`mb-4 text-center ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    <span className="text-sm font-medium">
                      📖 {currentChapter.title}
                    </span>
                    <span className="text-xs ml-2">
                      (Card {currentIndex - currentChapter.startIndex + 1} of {currentChapter.cards})
                    </span>
                  </div>
                )}
                
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
                <div className="text-7xl mb-6">📚</div>
                <p className="text-xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Upload Your Document
                </p>
                <p className="text-base mb-2">PDF, Word (DOCX), or Text files</p>
                <p className="text-sm opacity-75">Flashcards will be organized by chapters automatically</p>
                <div className={`mt-6 p-4 rounded-xl max-w-md mx-auto ${
                  darkMode ? 'bg-neutral-800' : 'bg-white border border-neutral-200'
                }`}>
                  <p className="text-xs font-semibold mb-2">✨ Features:</p>
                  <ul className="text-xs space-y-1 text-left">
                    <li>✓ Automatic chapter detection</li>
                    <li>✓ Smart content extraction</li>
                    <li>✓ Skips TOC, intro, references</li>
                    <li>✓ Comprehensive flashcard generation</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`py-3 px-6 text-center border-t transition-colors duration-300 flex-shrink-0 ${
          darkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-400' : 'bg-white/80 backdrop-blur-sm border-neutral-200 text-neutral-600'
        }`}>
          <p className="text-sm">May the Force be With You! ⚔️</p>
        </div>
      </div>
    </div>
  );
}

export default App;
