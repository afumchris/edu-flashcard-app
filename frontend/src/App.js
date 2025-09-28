import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
      const response = await axios.post('/upload', formData, {
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

  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <h1 className="text-3xl font-bold text-primary mb-6">Edu Flashcard Generator</h1>

      <div {...getRootProps()} className={`w-96 h-40 border-2 border-dashed border-primary rounded-lg flex items-center justify-center cursor-pointer mb-6 ${isDragActive ? 'bg-secondary' : 'bg-white'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input {...getInputProps()} disabled={loading} />
        <div className="text-center">
          {loading ? (
            <div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-600">Processing PDF...</p>
            </div>
          ) : (
            <p className="text-gray-600">{isDragActive ? 'Drop the PDF here...' : 'Drag & drop a PDF here, or click to select'}</p>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {metadata && (
        <div className="mb-4 text-center">
          <p className="text-lg font-semibold">Metadata:</p>
          <p>File: {metadata.fileName}</p>
          <p>Pages: {metadata.pageCount}</p>
          <p>Chunks: {metadata.chunkCount}</p>
        </div>
      )}

      {flashcards.length > 0 && (
        <>
          <div className="w-96 h-64 perspective-1000 mb-6" onClick={handleFlip}>
            <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
              <div className="absolute w-full h-full bg-white rounded-lg shadow-lg flex items-center justify-center backface-hidden">
                <p className="text-xl font-medium text-center p-4">{flashcards[currentIndex].question}</p>
              </div>
              <div className="absolute w-full h-full bg-secondary rounded-lg shadow-lg flex items-center justify-center backface-hidden rotate-y-180">
                <p className="text-xl font-medium text-center p-4">{flashcards[currentIndex].answer}</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-4 mb-4">
            <button onClick={handlePrev} disabled={currentIndex === 0} className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50">Previous</button>
            <button onClick={handleNext} disabled={currentIndex === flashcards.length - 1} className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50">Next</button>
          </div>

          <div className="w-96 bg-gray-200 rounded-full h-2.5 mb-4">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-sm text-gray-600">Progress: {currentIndex + 1} / {flashcards.length}</p>
        </>
      )}
    </div>
  );
}

export default App;