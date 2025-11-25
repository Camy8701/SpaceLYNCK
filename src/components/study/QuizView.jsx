import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, RotateCcw } from "lucide-react";

export default function QuizView({ lessonId, onBack, sidebarCollapsed }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [quizComplete, setQuizComplete] = useState(false);

  const { data: questions = [] } = useQuery({
    queryKey: ['quizQuestions', lessonId],
    queryFn: () => base44.entities.QuizQuestion.filter({ lesson_id: lessonId })
  });

  const currentQuestion = questions[currentIndex];
  const correctCount = answers.filter((a, i) => a === questions[i]?.correct_answer).length;
  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnswers([]);
    setQuizComplete(false);
  };

  if (questions.length === 0) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10">
          <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-center">
            <p className="text-white/70">No quiz questions available for this lesson.</p>
          </Card>
        </div>
      </div>
    );
  }

  if (quizComplete) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10 max-w-2xl">
          <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
              score >= 70 ? 'bg-green-500/30' : 'bg-yellow-500/30'
            }`}>
              <span className="text-3xl font-bold text-white">{score}%</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
            <p className="text-white/70 mb-6">
              You got {correctCount} out of {questions.length} questions correct.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={handleRetry} className="bg-white/10 border-white/30 text-white">
                <RotateCcw className="w-4 h-4 mr-2" /> Retry
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

  const isCorrect = selectedAnswer === currentQuestion?.correct_answer;

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10 max-w-2xl">
        <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
          {/* Progress */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-white/60 text-sm">Question {currentIndex + 1} of {questions.length}</span>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-3 h-3 rounded-full ${
                    i < currentIndex ? 'bg-green-500' : i === currentIndex ? 'bg-blue-500' : 'bg-white/20'
                  }`} 
                />
              ))}
            </div>
          </div>

          {/* Question */}
          <h2 className="text-xl font-semibold text-white mb-6">{currentQuestion?.question_text}</h2>

          {/* Options */}
          <div className="space-y-3">
            {['A', 'B', 'C', 'D'].map((letter) => {
              const optionKey = `option_${letter.toLowerCase()}`;
              const optionText = currentQuestion?.[optionKey];
              const isSelected = selectedAnswer === letter;
              const isCorrectOption = letter === currentQuestion?.correct_answer;

              let bgClass = 'bg-white/10 hover:bg-white/20';
              if (showResult) {
                if (isCorrectOption) bgClass = 'bg-green-500/30 border-green-500';
                else if (isSelected && !isCorrectOption) bgClass = 'bg-red-500/30 border-red-500';
              } else if (isSelected) {
                bgClass = 'bg-blue-500/30 border-blue-500';
              }

              return (
                <button
                  key={letter}
                  onClick={() => !showResult && setSelectedAnswer(letter)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-lg border border-transparent text-left transition-all ${bgClass}`}
                >
                  <span className="font-semibold text-white/80 mr-3">{letter}.</span>
                  <span className="text-white">{optionText}</span>
                  {showResult && isCorrectOption && (
                    <CheckCircle className="w-5 h-5 text-green-400 inline ml-2" />
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-red-400 inline ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showResult && currentQuestion?.explanation && (
            <div className="mt-6 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <p className="text-blue-200 text-sm">{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-end">
            {!showResult ? (
              <Button 
                onClick={handleSubmit}
                disabled={!selectedAnswer}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}