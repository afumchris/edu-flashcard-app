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

  const onDrop = async (acceptedFiles) => {
    setFile(acceptedFiles[0]);
    setError(null);
    setLoading(true);
    setFlashcards([]);
    setMetadata(null);
    
    const formData = new FormData();
    formData.append('file', acceptedFiles[0]);
    console.log('Uploading file:', acceptedFiles[0].name, 'size:', acceptedFiles[0].size);

    try {
      // Use the correct backend URL for Gitpod environment
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://5002--0199996a-a2e1-7b59-83b2-653833a630df.eu-central-1-01.gitpod.dev'
        : 'http://localhost:5002';
      
      const response = await axios.post(`${backendUrl}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minutes timeout
      });
      console.log('Upload response:', response.data);
      setFlashcards(response.data.flashcards || []);
      setMetadata(response.data.metadata);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error('Upload error:', err.message, err.response?.data, err.response?.status);
      setError(err.response?.data?.error || 'Upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] } });

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

  return (
    <div className="min-h-screen bg-batman-dark text-white">
      {/* Batman-themed header */}
      <div className="bg-batman-gradient border-b-2 border-batman-yellow py-6">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-batman font-bold text-batman-yellow mb-2">
            🦇 BATMAN FLASHCARD ACADEMY 🦇
          </h1>
          <p className="text-white text-lg">Transform Your PDFs Into Gotham-Style Learning Cards</p>
        </div>
      </div>

      <div className="container mx-auto flex flex-col items-center justify-center p-8 space-y-8">
        
        {/* Saved Flashcards Section */}
        <SavedFlashcards onLoadFlashcards={handleLoadFlashcards} />

        {/* File Upload Zone */}
        <div 
          {...getRootProps()} 
          className={`w-96 h-48 border-2 border-dashed border-batman-yellow rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 ${
            isDragActive ? 'bg-batman-gray border-yellow-400 shadow-batman' : 'bg-batman-gradient'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-batman-hover'}`}
        >
          <input {...getInputProps()} disabled={loading} />
          <div className="text-center p-6">
            {loading ? (
              <div>
                <div className="animate-bat-signal rounded-full h-12 w-12 border-4 border-batman-yellow border-t-transparent mx-auto mb-4"></div>
                <p className="text-batman-yellow font-batman font-bold">PROCESSING PDF...</p>
                <p className="text-white text-sm mt-2">The Dark Knight is analyzing your document</p>
              </div>
            ) : (
              <div>
                <div className="text-6xl mb-4">🦇</div>
                <p className="text-batman-yellow font-batman font-bold mb-2">
                  {isDragActive ? 'DROP THE PDF HERE!' : 'UPLOAD YOUR PDF'}
                </p>
                <p className="text-white text-sm">
                  Drag & drop a PDF or click to select
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4 w-96">
            <p className="text-red-200 text-center">❌ {error}</p>
          </div>
        )}

        {/* Save Message */}
        {saveMessage && (
          <div className="bg-green-900 border-2 border-green-500 rounded-lg p-4 w-96">
            <p className="text-green-200 text-center">{saveMessage}</p>
          </div>
        )}

        {/* Metadata Display */}
        {metadata && (
          <div className="bg-batman-gradient rounded-xl border-2 border-batman-yellow p-6 w-96">
            <h3 className="text-batman-yellow font-batman font-bold text-lg mb-4 text-center">
              📊 DOCUMENT ANALYSIS
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white">File:</span>
                <span className="text-batman-yellow font-bold">{metadata.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white">Pages:</span>
                <span className="text-batman-yellow font-bold">{metadata.pageCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white">Flashcards:</span>
                <span className="text-batman-yellow font-bold">{metadata.flashcardCount || flashcards.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white">Text Length:</span>
                <span className="text-batman-yellow font-bold">{metadata.textLength?.toLocaleString()} chars</span>
              </div>
            </div>
          </div>
        )}

        {/* Flashcard Display */}
        {flashcards.length > 0 && (
          <>
            <BatmanFlashcard
              flashcard={flashcards[currentIndex]}
              isFlipped={isFlipped}
              onFlip={handleFlip}
              currentIndex={currentIndex}
              totalCards={flashcards.length}
            />

            <BatmanControls
              currentIndex={currentIndex}
              totalCards={flashcards.length}
              onPrevious={handlePrev}
              onNext={handleNext}
              onSave={handleSave}
              metadata={metadata}
              flashcards={flashcards}
            />
          </>
        )}

        {/* Footer */}
        <div className="text-center text-batman-yellow text-sm mt-12">
          <p>🦇 Powered by the Dark Knight's Learning Technology 🦇</p>
        </div>
      </div>
    </div>
  );
}

export default App;