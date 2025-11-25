import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Circle, Lock, PlayCircle, BookOpen } from "lucide-react";
import LessonView from './LessonView';
import QuizView from './QuizView';
import FlashcardView from './FlashcardView';

export default function CourseDetail({ course, onBack, sidebarCollapsed }) {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const queryClient = useQueryClient();

  const { data: lessons = [] } = useQuery({
    queryKey: ['courseLessons', course.id],
    queryFn: () => base44.entities.CourseLesson.filter({ course_id: course.id }, 'lesson_number')
  });

  const completedCount = lessons.filter(l => l.completed).length;
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // Find current lesson (first incomplete)
  const currentLesson = lessons.find(l => !l.completed) || lessons[lessons.length - 1];

  const handleTakeQuiz = (lessonId) => {
    setCurrentLessonId(lessonId);
    setShowQuiz(true);
  };

  const handleStudyFlashcards = (lessonId) => {
    setCurrentLessonId(lessonId);
    setShowFlashcards(true);
  };

  if (selectedLesson) {
    return (
      <LessonView 
        lesson={selectedLesson} 
        lessons={lessons}
        onBack={() => setSelectedLesson(null)}
        onNext={() => {
          const idx = lessons.findIndex(l => l.id === selectedLesson.id);
          if (idx < lessons.length - 1) {
            setSelectedLesson(lessons[idx + 1]);
          } else {
            setSelectedLesson(null);
          }
        }}
        onPrev={() => {
          const idx = lessons.findIndex(l => l.id === selectedLesson.id);
          if (idx > 0) {
            setSelectedLesson(lessons[idx - 1]);
          }
        }}
        onTakeQuiz={() => handleTakeQuiz(selectedLesson.id)}
        onStudyFlashcards={() => handleStudyFlashcards(selectedLesson.id)}
        sidebarCollapsed={sidebarCollapsed}
      />
    );
  }

  if (showQuiz) {
    return (
      <QuizView 
        lessonId={currentLessonId}
        onBack={() => setShowQuiz(false)}
        sidebarCollapsed={sidebarCollapsed}
      />
    );
  }

  if (showFlashcards) {
    return (
      <FlashcardView 
        lessonId={currentLessonId}
        onBack={() => setShowFlashcards(false)}
        sidebarCollapsed={sidebarCollapsed}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Courses
        </Button>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              <span className="text-3xl">{course.icon || '📚'}</span>
              {course.name}
            </h1>
            <p className="text-white/60 mt-2">{course.description}</p>
          </div>
        </div>

        {/* Progress */}
        <Card className="p-4 mb-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80">Progress: {completedCount}/{lessons.length} lessons</span>
            <span className="text-white font-semibold">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>

        {/* Lessons List */}
        <Card className="p-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
          <h2 className="text-lg font-semibold text-white mb-4">Lessons</h2>
          
          <div className="space-y-2">
            {lessons.map((lesson, idx) => {
              const isCompleted = lesson.completed;
              const isCurrent = lesson.id === currentLesson?.id;
              const isLocked = !isCompleted && idx > 0 && !lessons[idx - 1]?.completed;

              return (
                <button
                  key={lesson.id}
                  onClick={() => !isLocked && setSelectedLesson(lesson)}
                  disabled={isLocked}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg transition-all text-left ${
                    isLocked 
                      ? 'opacity-50 cursor-not-allowed bg-white/5' 
                      : isCurrent
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : isLocked ? (
                    <Lock className="w-5 h-5 text-white/40 flex-shrink-0" />
                  ) : isCurrent ? (
                    <PlayCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-white/40 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${isCompleted ? 'text-white/60' : 'text-white'}`}>
                      {lesson.lesson_number}. {lesson.title}
                    </p>
                    {isCurrent && !isCompleted && (
                      <p className="text-blue-400 text-sm">Current</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Actions */}
        {currentLesson && (
          <div className="flex gap-4 mt-6">
            <Button 
              onClick={() => setSelectedLesson(currentLesson)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Continue Lesson {currentLesson.lesson_number}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}