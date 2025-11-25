import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";

export default function LessonView({ lesson, lessons, onBack, onNext, onPrev, onTakeQuiz, onStudyFlashcards, sidebarCollapsed }) {
  const queryClient = useQueryClient();
  const lessonIndex = lessons.findIndex(l => l.id === lesson.id);
  const isFirst = lessonIndex === 0;
  const isLast = lessonIndex === lessons.length - 1;

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CourseLesson.update(lesson.id, {
        completed: true,
        completed_at: new Date().toISOString()
      });

      // Update course progress
      const allLessons = await base44.entities.CourseLesson.filter({ course_id: lesson.course_id });
      const completedCount = allLessons.filter(l => l.completed || l.id === lesson.id).length;
      const progress = Math.round((completedCount / allLessons.length) * 100);

      // Find course to update
      const courses = await base44.entities.StudyCourse.filter({ id: lesson.course_id });
      if (courses.length > 0) {
        await base44.entities.StudyCourse.update(courses[0].id, {
          completed_lessons: completedCount,
          progress_percentage: progress
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['courseLessons']);
      queryClient.invalidateQueries(['studyCourses']);
      toast.success('Lesson completed!');
      onNext();
    }
  });

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10 max-w-4xl">
        {/* Header */}
        <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Course
        </Button>

        <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
          {/* Lesson Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Lesson {lesson.lesson_number}</p>
              <h1 className="text-xl font-bold text-white">{lesson.title}</h1>
            </div>
            {lesson.completed && (
              <CheckCircle className="w-6 h-6 text-green-400 ml-auto" />
            )}
          </div>

          {/* Lesson Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown className="text-white/90 leading-relaxed whitespace-pre-wrap">
              {lesson.content}
            </ReactMarkdown>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={onPrev}
            disabled={isFirst}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
          </Button>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={onTakeQuiz}
              className="bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30"
            >
              Take Quiz
            </Button>
            <Button 
              variant="outline"
              onClick={onStudyFlashcards}
              className="bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30"
            >
              Flashcards
            </Button>
            
            {!lesson.completed ? (
              <Button 
                onClick={() => markCompleteMutation.mutate()}
                disabled={markCompleteMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {markCompleteMutation.isPending ? 'Saving...' : 'Mark Complete'}
              </Button>
            ) : (
              <Button 
                onClick={onNext}
                disabled={isLast}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next Lesson <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}