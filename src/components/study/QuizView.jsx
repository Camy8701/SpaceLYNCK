import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function QuizView({ lessonId, onBack, sidebarCollapsed }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [fillBlankAnswer, setFillBlankAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [quizComplete, setQuizComplete] = useState(false);

  const { data: questions = [] } = useQuery({
    queryKey: ['quizQuestions', lessonId],
    queryFn: () => base44.entities.QuizQuestion.filter({ lesson_id: lessonId })
  });

  const currentQuestion = questions[currentIndex];
  const questionType = currentQuestion?.question_type || 'multiple_choice';
  
  const correctCount = answers.filter((a, i) => {
    const q = questions[i];
    if (!q) return false;
    const type = q.question_type || 'multiple_choice';
    if (type === 'fill_blank') {
      return a?.toLowerCase().trim() === q.blank_answer?.toLowerCase().trim();
    }
    return a?.toUpperCase() === q.correct_answer?.toUpperCase();
  }).length;
  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const handleSubmit = () => {
    const type = questionType;
    let answer = selectedAnswer;
    
    if (type === 'fill_blank') {
      if (!fillBlankAnswer.trim()) return;
      answer = fillBlankAnswer.trim();
    } else if (!selectedAnswer) {
      return;
    }
    
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setFillBlankAnswer('');
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setFillBlankAnswer('');
    setShowResult(false);
    setAnswers([]);
    setQuizComplete(false);
  };

  // Check if current answer is correct
  const isCorrect = (() => {
    if (questionType === 'fill_blank') {
      return fillBlankAnswer?.toLowerCase().trim() === currentQuestion?.blank_answer?.toLowerCase().trim();
    }
    return selectedAnswer?.toUpperCase() === currentQuestion?.correct_answer?.toUpperCase();
  })();

  // Get question type badge
  const getTypeBadge = (type) => {
    switch(type) {
      case 'fill_blank': return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Fill in the Blank</Badge>;
      case 'true_false': return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">True/False</Badge>;
      default: return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Multiple Choice</Badge>;
    }
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

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10 max-w-2xl">
        <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
          {/* Progress */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm">Question {currentIndex + 1} of {questions.length}</span>
              {getTypeBadge(questionType)}
            </div>
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

          {/* Render based on question type */}
          {questionType === 'fill_blank' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <HelpCircle className="w-4 h-4" />
                Fill in the blank with the correct answer
              </div>
              <Input
                value={fillBlankAnswer}
                onChange={(e) => setFillBlankAnswer(e.target.value)}
                disabled={showResult}
                placeholder="Type your answer..."
                className={`bg-white/10 border-white/30 text-white placeholder:text-white/40 text-lg ${
                  showResult ? (isCorrect ? 'border-green-500 bg-green-500/20' : 'border-red-500 bg-red-500/20') : ''
                }`}
                onKeyDown={(e) => e.key === 'Enter' && !showResult && handleSubmit()}
              />
              {showResult && (
                <div className={`p-3 rounded-lg ${isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {isCorrect ? (
                    <p className="text-green-300 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Correct!
                    </p>
                  ) : (
                    <p className="text-red-300 flex items-center gap-2">
                      <XCircle className="w-5 h-5" /> Incorrect. The answer is: <span className="font-bold">{currentQuestion?.blank_answer}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : questionType === 'true_false' ? (
            <div className="space-y-3">
              {['True', 'False'].map((option) => {
                const isSelected = selectedAnswer?.toLowerCase() === option.toLowerCase();
                const isCorrectOption = currentQuestion?.correct_answer?.toLowerCase() === option.toLowerCase();

                let bgClass = 'bg-white/10 hover:bg-white/20';
                if (showResult) {
                  if (isCorrectOption) bgClass = 'bg-green-500/30 border-green-500';
                  else if (isSelected && !isCorrectOption) bgClass = 'bg-red-500/30 border-red-500';
                } else if (isSelected) {
                  bgClass = 'bg-blue-500/30 border-blue-500';
                }

                return (
                  <button
                    key={option}
                    onClick={() => !showResult && setSelectedAnswer(option.toLowerCase())}
                    disabled={showResult}
                    className={`w-full p-4 rounded-lg border border-transparent text-left transition-all ${bgClass}`}
                  >
                    <span className="text-white font-medium">{option}</span>
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
          ) : (
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((letter) => {
                const optionKey = `option_${letter.toLowerCase()}`;
                const optionText = currentQuestion?.[optionKey];
                if (!optionText) return null;
                
                const isSelected = selectedAnswer === letter;
                const isCorrectOption = letter === currentQuestion?.correct_answer?.toUpperCase();

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
          )}

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
                disabled={questionType === 'fill_blank' ? !fillBlankAnswer.trim() : !selectedAnswer}
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