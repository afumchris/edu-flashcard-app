import React from 'react';

const BatmanControls = ({ 
  currentIndex, 
  totalCards, 
  onPrevious, 
  onNext, 
  onSave, 
  metadata,
  flashcards,
  darkMode 
}) => {
  const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

  const handleSave = () => {
    if (flashcards.length === 0) return;
    
    const savedSets = JSON.parse(localStorage.getItem('batmanFlashcards') || '[]');
    const newSet = {
      id: Date.now().toString(),
      flashcards,
      metadata,
      savedAt: new Date().toISOString(),
    };
    
    savedSets.push(newSet);
    localStorage.setItem('batmanFlashcards', JSON.stringify(savedSets));
    
    if (onSave) onSave();
  };

  return (
    <div className="w-full max-w-3xl space-y-4 mt-6">
      {/* Navigation Controls */}
      <div className="flex justify-center items-center space-x-3">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className={`px-5 py-2.5 rounded-lg font-medium border disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 ${
            darkMode 
              ? 'bg-neutral-800 text-neutral-100 border-neutral-700 hover:bg-neutral-700' 
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          ← Previous
        </button>
        
        <button
          className={`px-8 py-2.5 rounded-lg font-medium transition-all duration-300 ${
            darkMode 
              ? 'bg-primary text-white hover:bg-primary-dark' 
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          Flip Card
        </button>
        
        <button
          onClick={onNext}
          disabled={currentIndex === totalCards - 1}
          className={`px-5 py-2.5 rounded-lg font-medium border disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 ${
            darkMode 
              ? 'bg-neutral-800 text-neutral-100 border-neutral-700 hover:bg-neutral-700' 
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          Next →
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className={`w-full rounded-full h-1.5 transition-colors duration-300 ${
          darkMode ? 'bg-neutral-700' : 'bg-neutral-200'
        }`}>
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out bg-primary"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className={`flex justify-between text-sm transition-colors duration-300 ${
          darkMode ? 'text-neutral-400' : 'text-neutral-600'
        }`}>
          <span>Progress</span>
          <span>{currentIndex + 1} / {totalCards}</span>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSave}
          disabled={totalCards === 0}
          className={`px-6 py-2.5 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 ${
            darkMode 
              ? 'bg-accent text-white hover:bg-accent-dark' 
              : 'bg-accent text-white hover:bg-accent-dark'
          }`}
        >
          💾 Save Flashcard Set
        </button>
      </div>
    </div>
  );
};

export default BatmanControls;