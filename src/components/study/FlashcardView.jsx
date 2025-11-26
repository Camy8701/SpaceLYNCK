import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Shuffle, Check, X, Clock, Flame, Star } from "lucide-react";
import { toast } from "sonner";

// SM-2 Spaced Repetition Algorithm
function calculateNextReview(card, quality) {
  // quality: 0 = complete fail, 1-2 = fail, 3 = hard, 4 = good, 5 = easy
  let { ease_factor = 2.5, interval_days = 1, review_count = 0 } = card;
  
  if (quality < 3) {
    // Failed - reset interval
    interval_days = 1;
    review_count = 0;
  } else {
    // Passed
    if (review_count === 0) {
      interval_days = 1;
    } else if (review_count === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }
    review_count++;
  }
  
  // Update ease factor
  ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  
  const next_review_date = new Date();
  next_review_date.setDate(next_review_date.getDate() + interval_days);
  
  return {
    ease_factor,
    interval_days,
    review_count,
    next_review_date: next_review_date.toISOString().split('T')[0],
    last_reviewed_at: new Date().toISOString(),
    mastery_level: Math.min(5, Math.max(0, Math.round(ease_factor - 1)))
  };
}

export default function FlashcardView({ lessonId, studySetId, onBack, sidebarCollapsed, onPointsEarned }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ easy: 0, good: 0, hard: 0, again: 0 });
  const [pointsEarned, setPointsEarned] = useState(0);
  const queryClient = useQueryClient();

  const { data: allFlashcards = [] } = useQuery({
    queryKey: ['flashcards', lessonId, studySetId],
    queryFn: () => {
      if (lessonId) return base44.entities.Flashcard.filter({ lesson_id: lessonId });
      if (studySetId) return base44.entities.Flashcard.filter({ study_set_id: studySetId });
      return [];
    }
  });

  // Sort by spaced repetition - due cards first
  const flashcards = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [...allFlashcards].sort((a, b) => {
      const aDue = !a.next_review_date || a.next_review_date <= today;
      const bDue = !b.next_review_date || b.next_review_date <= today;
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      return (a.mastery_level || 0) - (b.mastery_level || 0);
    });
  }, [allFlashcards]);

  const dueCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return flashcards.filter(c => !c.next_review_date || c.next_review_date <= today).length;
  }, [flashcards]);

  const updateCardMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Flashcard.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['flashcards']);
    }
  });

  const currentCard = flashcards[currentIndex];
  const totalReviewed = sessionStats.easy + sessionStats.good + sessionStats.hard + sessionStats.again;

  const handleResponse = (quality) => {
    if (!currentCard) return;
    
    const updateData = calculateNextReview(currentCard, quality);
    updateCardMutation.mutate({ id: currentCard.id, data: updateData });
    
    // Update session stats
    const statKey = quality >= 4 ? 'easy' : quality === 3 ? 'good' : quality === 2 ? 'hard' : 'again';
    setSessionStats(prev => ({ ...prev, [statKey]: prev[statKey] + 1 }));
    
    // Award points
    const points = quality >= 4 ? 15 : quality === 3 ? 10 : quality === 2 ? 5 : 2;
    setPointsEarned(prev => prev + points);
    
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
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const shuffle = () => {
    setCurrentIndex(Math.floor(Math.random() * flashcards.length));
    setIsFlipped(false);
  };

  const reset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStats({ easy: 0, good: 0, hard: 0, again: 0 });
  };

  const handleFinish = () => {
    if (onPointsEarned && pointsEarned > 0) {
      onPointsEarned(pointsEarned, totalReviewed);
    }
    onBack();
  };

  if (flashcards.length === 0) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10">
          <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-center">
            <p className="text-white/70">No flashcards available.</p>
          </Card>
        </div>
      </div>
    );
  }

  // Session complete
  if (currentIndex >= flashcards.length - 1 && totalReviewed >= flashcards.length) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10 max-w-2xl mx-auto">
          <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-center">
            <div className="w-20 h-20 mx-auto bg-green-500/30 rounded-full flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Session Complete!</h2>
            
            {/* Points earned */}
            <div className="flex items-center justify-center gap-2 mb-6 text-yellow-400">
              <Star className="w-6 h-6 fill-yellow-400" />
              <span className="text-2xl font-bold">+{pointsEarned} XP</span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <p className="text-2xl font-bold text-green-400">{sessionStats.easy}</p>
                <p className="text-white/60 text-xs">Easy</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{sessionStats.good}</p>
                <p className="text-white/60 text-xs">Good</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <p className="text-2xl font-bold text-yellow-400">{sessionStats.hard}</p>
                <p className="text-white/60 text-xs">Hard</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-lg">
                <p className="text-2xl font-bold text-red-400">{sessionStats.again}</p>
                <p className="text-white/60 text-xs">Again</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={reset} className="bg-white/10 border-white/30 text-white">
                <RotateCcw className="w-4 h-4 mr-2" /> Study Again
              </Button>
              <Button onClick={handleFinish} className="bg-blue-600 hover:bg-blue-700">
                Finish
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
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={handleFinish} className="text-white/80 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <Star className="w-4 h-4 fill-yellow-400" />
              <span className="font-medium">{pointsEarned} XP</span>
            </div>
            {dueCount > 0 && (
              <div className="flex items-center gap-1 text-orange-400 text-sm">
                <Clock className="w-4 h-4" />
                <span>{dueCount} due</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/60 text-sm">Card {currentIndex + 1} of {flashcards.length}</span>
          <span className="text-white/60 text-sm">{totalReviewed} reviewed</span>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full mb-6">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" 
               style={{ width: `${(totalReviewed / flashcards.length) * 100}%` }} />
        </div>

        {/* Card interval info */}
        {currentCard?.interval_days > 1 && (
          <div className="text-center mb-4">
            <span className="text-white/50 text-sm">
              Current interval: {currentCard.interval_days} days
            </span>
          </div>
        )}

        {/* Flashcard */}
        <div onClick={() => setIsFlipped(!isFlipped)} className="cursor-pointer">
          <Card className={`relative h-64 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl transition-all duration-300 ${isFlipped ? 'bg-white/25' : ''}`}>
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <p className="text-xl text-white text-center font-medium">
                {isFlipped ? currentCard?.back_text : currentCard?.front_text}
              </p>
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white/40 text-sm">{isFlipped ? 'Answer' : 'Click to reveal'}</p>
            </div>
            {/* Mastery indicator */}
            <div className="absolute top-3 right-3 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < (currentCard?.mastery_level || 0) ? 'bg-green-400' : 'bg-white/20'}`} />
              ))}
            </div>
          </Card>
        </div>

        {/* Spaced Repetition Controls */}
        <div className="mt-6">
          {isFlipped ? (
            <div className="grid grid-cols-4 gap-2">
              <Button onClick={() => handleResponse(1)} className="bg-red-600 hover:bg-red-700 flex-col py-4">
                <X className="w-4 h-4 mb-1" />
                <span className="text-xs">Again</span>
                <span className="text-[10px] opacity-70">1d</span>
              </Button>
              <Button onClick={() => handleResponse(2)} className="bg-yellow-600 hover:bg-yellow-700 flex-col py-4">
                <span className="text-sm mb-1">😐</span>
                <span className="text-xs">Hard</span>
                <span className="text-[10px] opacity-70">{Math.round((currentCard?.interval_days || 1) * 0.5)}d</span>
              </Button>
              <Button onClick={() => handleResponse(3)} className="bg-blue-600 hover:bg-blue-700 flex-col py-4">
                <span className="text-sm mb-1">👍</span>
                <span className="text-xs">Good</span>
                <span className="text-[10px] opacity-70">{currentCard?.interval_days || 1}d</span>
              </Button>
              <Button onClick={() => handleResponse(5)} className="bg-green-600 hover:bg-green-700 flex-col py-4">
                <Check className="w-4 h-4 mb-1" />
                <span className="text-xs">Easy</span>
                <span className="text-[10px] opacity-70">{Math.round((currentCard?.interval_days || 1) * (currentCard?.ease_factor || 2.5))}d</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={goPrev} disabled={currentIndex === 0} className="text-white/60 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button onClick={shuffle} variant="outline" className="bg-white/10 border-white/30 text-white">
                <Shuffle className="w-4 h-4" />
              </Button>
              <Button variant="ghost" onClick={goNext} disabled={currentIndex >= flashcards.length - 1} className="text-white/60 hover:text-white">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}