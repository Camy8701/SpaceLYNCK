import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Circle, Lock, PlayCircle, BookOpen, FileText, Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import LessonView from './LessonView';
import QuizView from './QuizView';
import FlashcardView from './FlashcardView';

export default function CourseDetail({ course, onBack, sidebarCollapsed }) {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [showStudyMaterials, setShowStudyMaterials] = useState(false);
  const [isGeneratingMaterials, setIsGeneratingMaterials] = useState(false);
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

  // Generate study materials if they don't exist
  const generateStudyMaterials = async () => {
    if (course.study_guide && course.cheat_sheet) {
      setShowStudyMaterials(true);
      return;
    }

    setIsGeneratingMaterials(true);
    try {
      const lessonsContent = lessons.map(l => `Lesson ${l.lesson_number}: ${l.title}\n${l.content}`).join('\n\n');
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate comprehensive study materials for this course:

Course: ${course.name}
${course.description}

Lessons:
${lessonsContent}

Create:
1. A detailed STUDY GUIDE with key concepts organized by lesson, definitions, and important points
2. A CHEAT SHEET with quick reference formulas, key terms, mnemonics, and essential facts

Return as JSON:`,
        response_json_schema: {
          type: "object",
          properties: {
            study_guide: { type: "string" },
            cheat_sheet: { type: "string" }
          }
        }
      });

      await base44.entities.StudyCourse.update(course.id, {
        study_guide: response.study_guide,
        cheat_sheet: response.cheat_sheet
      });

      course.study_guide = response.study_guide;
      course.cheat_sheet = response.cheat_sheet;
      queryClient.invalidateQueries(['studyCourses']);
      setShowStudyMaterials(true);
      toast.success('Study materials generated!');
    } catch (err) {
      toast.error('Failed to generate study materials');
    }
    setIsGeneratingMaterials(false);
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

        {/* Progress & Actions */}
        <Card className="p-4 mb-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80">Progress: {completedCount}/{lessons.length} lessons</span>
            <span className="text-white font-semibold">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full mb-4">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Study Materials Button */}
          <Button
            onClick={generateStudyMaterials}
            disabled={isGeneratingMaterials}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGeneratingMaterials ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> Study Guide & Cheat Sheet</>
            )}
          </Button>
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

      {/* Study Materials Dialog */}
      <Dialog open={showStudyMaterials} onOpenChange={setShowStudyMaterials}>
        <DialogContent className="max-w-4xl max-h-[85vh] bg-slate-900/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Study Materials - {course.name}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="guide" className="mt-4">
            <TabsList className="bg-white/10 border-white/20">
              <TabsTrigger value="guide" className="data-[state=active]:bg-purple-600">
                <BookOpen className="w-4 h-4 mr-2" /> Study Guide
              </TabsTrigger>
              <TabsTrigger value="cheat" className="data-[state=active]:bg-purple-600">
                <FileText className="w-4 h-4 mr-2" /> Cheat Sheet
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="guide">
              <ScrollArea className="h-[55vh] pr-4">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="prose prose-invert max-w-none text-white/90">
                    <ReactMarkdown>
                      {course.study_guide || 'No study guide available yet. Click generate to create one.'}
                    </ReactMarkdown>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="cheat">
              <ScrollArea className="h-[55vh] pr-4">
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-6 border border-amber-500/20">
                  <h3 className="text-lg font-bold text-amber-400 mb-4">📋 Quick Reference Cheat Sheet</h3>
                  <div className="prose prose-invert max-w-none text-white/90">
                    <ReactMarkdown>
                      {course.cheat_sheet || 'No cheat sheet available yet. Click generate to create one.'}
                    </ReactMarkdown>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}