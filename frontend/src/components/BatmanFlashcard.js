import React from 'react';

const BatmanFlashcard = ({ flashcard, isFlipped, onFlip, currentIndex, totalCards }) => {
  return (
    <div className="relative w-96 h-80 perspective-1000 mb-6 cursor-pointer" onClick={onFlip}>
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front of card - Question */}
        <div className="absolute w-full h-full bg-batman-gradient rounded-xl shadow-batman border-2 border-batman-yellow flex flex-col backface-hidden overflow-hidden">
          {/* Batman logo header */}
          <div className="bg-batman-yellow text-batman-dark px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-batman-dark rounded-full flex items-center justify-center">
                <span className="text-batman-yellow font-batman text-sm">🦇</span>
              </div>
              <span className="font-batman text-sm font-bold">QUESTION</span>
            </div>
            <span className="text-xs font-bold">{currentIndex + 1}/{totalCards}</span>
          </div>
          
          {/* Question content */}
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-white text-lg font-medium text-center leading-relaxed">
              {flashcard.question}
            </p>
          </div>
          
          {/* Bottom hint */}
          <div className="bg-batman-gray px-4 py-2 text-center">
            <p className="text-batman-yellow text-xs font-batman">CLICK TO REVEAL ANSWER</p>
          </div>
        </div>

        {/* Back of card - Answer */}
        <div className="absolute w-full h-full bg-batman-gradient rounded-xl shadow-batman border-2 border-batman-yellow flex flex-col backface-hidden rotate-y-180 overflow-hidden">
          {/* Batman logo header */}
          <div className="bg-batman-yellow text-batman-dark px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-batman-dark rounded-full flex items-center justify-center">
                <span className="text-batman-yellow font-batman text-sm">🦇</span>
              </div>
              <span className="font-batman text-sm font-bold">ANSWER</span>
            </div>
            <span className="text-xs font-bold">{currentIndex + 1}/{totalCards}</span>
          </div>
          
          {/* Answer content */}
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-white text-lg font-medium text-center leading-relaxed">
              {flashcard.answer}
            </p>
          </div>
          
          {/* Bottom hint */}
          <div className="bg-batman-gray px-4 py-2 text-center">
            <p className="text-batman-yellow text-xs font-batman">CLICK TO FLIP BACK</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatmanFlashcard;