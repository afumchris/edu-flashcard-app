import React, { useState, useEffect } from 'react';

const SavedFlashcards = ({ onLoadFlashcards }) => {
  const [savedSets, setSavedSets] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    loadSavedSets();
  }, []);

  const loadSavedSets = () => {
    const saved = JSON.parse(localStorage.getItem('batmanFlashcards') || '[]');
    setSavedSets(saved);
  };

  const deleteSet = (id) => {
    const updated = savedSets.filter(set => set.id !== id);
    localStorage.setItem('batmanFlashcards', JSON.stringify(updated));
    setSavedSets(updated);
  };

  const loadSet = (set) => {
    onLoadFlashcards(set.flashcards, set.metadata);
    setShowSaved(false);
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setShowSaved(!showSaved)}
        className="bg-batman-yellow text-batman-dark px-6 py-3 rounded-lg font-batman font-bold hover:bg-yellow-400 transition-colors duration-300 shadow-batman"
      >
        🦇 SAVED FLASHCARD SETS ({savedSets.length})
      </button>

      {showSaved && (
        <div className="mt-4 bg-batman-gradient rounded-xl border-2 border-batman-yellow p-4 max-h-64 overflow-y-auto">
          {savedSets.length === 0 ? (
            <p className="text-white text-center py-4">No saved flashcard sets yet.</p>
          ) : (
            <div className="space-y-3">
              {savedSets.map((set) => (
                <div key={set.id} className="bg-batman-gray rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-batman-yellow font-bold text-sm">{set.metadata.fileName}</h3>
                    <p className="text-white text-xs">
                      {set.flashcards.length} cards • {set.metadata.pageCount} pages • 
                      Saved: {new Date(set.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadSet(set)}
                      className="bg-batman-yellow text-batman-dark px-3 py-1 rounded text-xs font-bold hover:bg-yellow-400 transition-colors"
                    >
                      LOAD
                    </button>
                    <button
                      onClick={() => deleteSet(set.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedFlashcards;