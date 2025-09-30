import React from 'react';

const BatmanControls = ({ 
  currentIndex, 
  totalCards, 
  onPrevious, 
  onNext, 
  onSave, 
  metadata,
  flashcards 
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
    <div className="w-96 space-y-4">
      {/* Navigation Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="bg-batman-gray text-batman-yellow px-6 py-3 rounded-lg font-batman font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-batman-lightGray transition-colors duration-300 shadow-lg"
        >
          ← PREVIOUS
        </button>
        
        <button
          onClick={onNext}
          disabled={currentIndex === totalCards - 1}
          className="bg-batman-gray text-batman-yellow px-6 py-3 rounded-lg font-batman font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-batman-lightGray transition-colors duration-300 shadow-lg"
        >
          NEXT →
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-batman-gray rounded-full h-3 border border-batman-yellow">
          <div 
            className="bg-gradient-to-r from-batman-yellow to-yellow-400 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-batman-yellow text-sm font-batman">
          <span>PROGRESS</span>
          <span>{currentIndex + 1} / {totalCards}</span>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSave}
          disabled={totalCards === 0}
          className="bg-batman-yellow text-batman-dark px-8 py-3 rounded-lg font-batman font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-400 transition-colors duration-300 shadow-batman"
        >
          🦇 SAVE FLASHCARD SET
        </button>
      </div>
    </div>
  );
};

export default BatmanControls;