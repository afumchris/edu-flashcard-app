import React from 'react';

const BatmanFlashcard = ({ flashcard, isFlipped, onFlip, currentIndex, totalCards, darkMode }) => {
  return (
    <div className="relative w-full max-w-3xl h-96 perspective-1000 mb-6 cursor-pointer" onClick={onFlip}>
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front of card - Question */}
        <div className={`absolute w-full h-full rounded-xl shadow-lg border flex flex-col backface-hidden overflow-hidden transition-colors duration-300 ${
          darkMode 
            ? 'bg-neutral-800 border-neutral-700' 
            : 'bg-white border-neutral-200'
        }`}>
          {/* Header */}
          <div className={`px-6 py-4 flex items-center justify-between border-b transition-colors duration-300 ${
            darkMode ? 'border-neutral-700' : 'border-neutral-200'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                darkMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
              }`}>
                <span className="text-sm">❓</span>
              </div>
              <span className={`font-semibold text-sm ${darkMode ? 'text-neutral-100' : 'text-neutral-900'}`}>
                Question
              </span>
            </div>
            <span className={`text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {currentIndex + 1} / {totalCards}
            </span>
          </div>
          
          {/* Question content */}
          <div className="flex-1 flex items-center justify-center p-8">
            <p className={`text-lg font-medium text-center leading-relaxed ${
              darkMode ? 'text-neutral-100' : 'text-neutral-900'
            }`}>
              {flashcard.question}
            </p>
          </div>
          
          {/* Bottom hint */}
          <div className={`px-6 py-3 text-center border-t transition-colors duration-300 ${
            darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-neutral-200 bg-neutral-50'
          }`}>
            <p className={`text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Click to reveal answer
            </p>
          </div>
        </div>

        {/* Back of card - Answer */}
        <div className={`absolute w-full h-full rounded-xl shadow-lg border flex flex-col backface-hidden rotate-y-180 overflow-hidden transition-colors duration-300 ${
          darkMode 
            ? 'bg-neutral-800 border-neutral-700' 
            : 'bg-white border-neutral-200'
        }`}>
          {/* Header */}
          <div className={`px-6 py-4 flex items-center justify-between border-b transition-colors duration-300 ${
            darkMode ? 'border-neutral-700' : 'border-neutral-200'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                darkMode ? 'bg-accent/20 text-accent-light' : 'bg-accent/10 text-accent'
              }`}>
                <span className="text-sm">✓</span>
              </div>
              <span className={`font-semibold text-sm ${darkMode ? 'text-neutral-100' : 'text-neutral-900'}`}>
                Answer
              </span>
            </div>
            <span className={`text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {currentIndex + 1} / {totalCards}
            </span>
          </div>
          
          {/* Answer content with subtle watermark */}
          <div className="flex-1 flex items-center justify-center p-8 relative">
            {/* Subtle watermark */}
            <div className={`absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none transition-opacity duration-300`}>
              <svg width="200" height="80" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 10 L60 30 Q50 40 40 50 L30 60 Q40 70 60 70 L80 60 Q90 50 100 40 Q110 50 120 60 L140 70 Q160 70 170 60 L160 50 Q150 40 140 30 Z" fill="currentColor" className={darkMode ? 'text-neutral-400' : 'text-neutral-600'}/>
              </svg>
            </div>
            
            <p className={`text-lg font-medium text-center leading-relaxed relative z-10 transition-colors duration-300 ${
              darkMode ? 'text-neutral-200' : 'text-neutral-700'
            }`}>
              {flashcard.answer}
            </p>
          </div>
          
          {/* Bottom hint */}
          <div className={`px-6 py-3 text-center border-t transition-colors duration-300 ${
            darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-neutral-200 bg-neutral-50'
          }`}>
            <p className={`text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Click to flip back
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatmanFlashcard;