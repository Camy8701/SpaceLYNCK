import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Shuffle, Check, X } from "lucide-react";

export default function FlashcardView({ lessonId, onBack, sidebarCollapsed }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState([]);
  const [reviewCards, setReviewCards] = useState([]);
  const queryClient = useQueryClient();

  const { data: flashcards = [] } = useQuery({
    queryKey: ['flashcards', lessonId],
    queryFn: () => base44.entities.Flashcard.filter({ lesson_id: lessonId })
  });

  const updateMasteryMutation = useMutation({
    mutationFn: async ({ id, level }) => {
      await base44.entities.Flashcard.update(id, { mastery_level: level });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['flashcards', lessonId]);
    }
  });

  const currentCard = flashcards[currentIndex];
  const progress = flashcards.length > 0 ? Math.round(((knownCards.length) / flashcards.length) * 100) : 0;

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleKnow = () => {
    if (currentCard && !knownCards.includes(currentCard.id)) {
      setKnownCards([...knownCards, currentCard.id]);
      updateMasteryMutation.mutate({ id: currentCard.id, level: Math.min((currentCard.mastery_level || 0) + 1, 5) });
    }
    goNext();
  };

  const handleReview = () => {
    if (currentCard && !reviewCards.includes(currentCard.id)) {
      setReviewCards([...reviewCards, currentCard.id]);
      updateMasteryMutation.mutate({ id: currentCard.id, level: Math.max((currentCard.mastery_level || 0) - 1, 0) });
    }
    goNext();
  };

  const goNext = () => {
    setIsFlipped(false);
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const shuffle = () => {
    setCurrentIndex(Math.floor(Math.random() * flashcards.length));
    setIsFlipped(false);
  };

  const reset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards([]);
    setReviewCards([]);
  };

  if (flashcards.length === 0) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10">
          <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-center">
            <p className="text-white/70">No flashcards available for this lesson.</p>
          </Card>
        </div>
      </div>
    );
  }

  // Session complete
  if (currentIndex >= flashcards.length - 1 && (knownCards.length + reviewCards.length) >= flashcards.length) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10 max-w-2xl mx-auto">
          <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-center">
            <div className="w-20 h-20 mx-auto bg-green-500/30 rounded-full flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Session Complete!</h2>
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{knownCards.length}</p>
                <p className="text-white/60 text-sm">Known</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{reviewCards.length}</p>
                <p className="text-white/60 text-sm">Need Review</p>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={reset} className="bg-white/10 border-white/30 text-white">
                <RotateCcw className="w-4 h-4 mr-2" /> Study Again
              </Button>
              <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700">
                Back to Lesson
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/60 text-sm">Card {currentIndex + 1} of {flashcards.length}</span>
          <span className="text-white/60 text-sm">{progress}% mastered</span>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full mb-6">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* Flashcard */}
        <div 
          onClick={handleFlip}
          className="cursor-pointer perspective-1000"
        >
          <Card className={`relative h-64 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            <div className="absolute inset-0 flex items-center justify-center p-8 backface-hidden">
              <p className="text-xl text-white text-center font-medium">
                {isFlipped ? currentCard?.back_text : currentCard?.front_text}
              </p>
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white/40 text-sm">{isFlipped ? 'Answer' : 'Click to reveal'}</p>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" onClick={goPrev} disabled={currentIndex === 0} className="text-white/60 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex gap-3">
            <Button onClick={shuffle} variant="outline" className="bg-white/10 border-white/30 text-white">
              <Shuffle className="w-4 h-4" />
            </Button>
            
            {isFlipped && (
              <>
                <Button onClick={handleReview} className="bg-yellow-600 hover:bg-yellow-700">
                  <X className="w-4 h-4 mr-2" /> Review Again
                </Button>
                <Button onClick={handleKnow} className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" /> I Know This
                </Button>
              </>
            )}
          </div>

          <Button variant="ghost" onClick={goNext} disabled={currentIndex >= flashcards.length - 1} className="text-white/60 hover:text-white">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}