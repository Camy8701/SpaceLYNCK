import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, GraduationCap, BookOpen, Brain, Layers } from "lucide-react";
import CreateCourseModal from '@/components/study/CreateCourseModal';
import CreateStudySetModal from '@/components/study/CreateStudySetModal';
import CourseDetail from '@/components/study/CourseDetail';
import StudyProgressCard, { useStudyProgress } from '@/components/study/StudyProgressCard';
import FlashcardView from '@/components/study/FlashcardView';
import { toast } from "sonner";

export default function SelfStudyView({ sidebarCollapsed }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateSetModal, setShowCreateSetModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedStudySet, setSelectedStudySet] = useState(null);
  const [activeTab, setActiveTab] = useState('courses');
  const { progress, addPoints, BADGES } = useStudyProgress();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['studyCourses'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.StudyCourse.filter({ created_by: user.email }, '-created_date');
    }
  });

  const { data: studySets = [], isLoading: loadingSets } = useQuery({
    queryKey: ['studySets'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.StudySet.filter({ created_by: user.email }, '-created_date');
    }
  });

  const handleFlashcardPoints = async (points, cardsReviewed) => {
    const newBadges = await addPoints(points, 'flashcard', cardsReviewed);
    if (newBadges?.length > 0) {
      newBadges.forEach(id => {
        const badge = BADGES[id];
        toast.success(`🎉 New Badge: ${badge.icon} ${badge.name}!`);
      });
    }
  };

  if (selectedCourse) {
    return <CourseDetail course={selectedCourse} onBack={() => setSelectedCourse(null)} sidebarCollapsed={sidebarCollapsed} />;
  }

  if (selectedStudySet) {
    return (
      <FlashcardView 
        studySetId={selectedStudySet.id}
        onBack={() => setSelectedStudySet(null)}
        sidebarCollapsed={sidebarCollapsed}
        onPointsEarned={handleFlashcardPoints}
      />
    );
  }

  const totalProgress = courses.length > 0 
    ? Math.round(courses.reduce((acc, c) => acc + (c.progress_percentage || 0), 0) / courses.length)
    : 0;

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <GraduationCap className="w-6 h-6" /> Self-Study with AI
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateSetModal(true)} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
              <Layers className="w-4 h-4 mr-2" />
              Study Set
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
              <Plus className="w-4 h-4 mr-2" />
              Course
            </Button>
          </div>
        </div>

        {/* Progress Card */}
        <div className="mb-6">
          <StudyProgressCard />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/10 mb-6">
            <TabsTrigger value="courses" className="data-[state=active]:bg-white/20">
              <BookOpen className="w-4 h-4 mr-2" /> Courses
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="data-[state=active]:bg-white/20">
              <Brain className="w-4 h-4 mr-2" /> Study Sets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            {isLoading ? (
              <div className="text-center py-12 text-white/70">Loading courses...</div>
            ) : courses.length === 0 ? (
              <Card className="p-12 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl text-center">
                <BookOpen className="w-16 h-16 mx-auto text-white/40 mb-4" />
                <p className="text-slate-600 mb-4">No courses yet. Create your first AI-powered course!</p>
                <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Create Course
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                  <Card 
                    key={course.id} 
                    onClick={() => setSelectedCourse(course)}
                    className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl cursor-pointer hover:bg-white/60 transition-all hover:-translate-y-1"
                  >
                    <div className="text-4xl mb-4">{course.icon || '📚'}</div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">{course.name}</h3>
                    <p className="text-slate-600 text-sm mb-4">{course.total_lessons || 0} lessons</p>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="w-full h-2 bg-white/20 rounded-full">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${course.progress_percentage || 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-slate-700 text-sm font-medium">{course.progress_percentage || 0}%</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="flashcards">
            {loadingSets ? (
              <div className="text-center py-12 text-white/70">Loading study sets...</div>
            ) : studySets.length === 0 ? (
              <Card className="p-12 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl text-center">
                <Brain className="w-16 h-16 mx-auto text-white/40 mb-4" />
                <p className="text-slate-600 mb-4">No study sets yet. Create flashcards from your notes!</p>
                <Button onClick={() => setShowCreateSetModal(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" /> Create Study Set
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studySets.map(set => (
                  <Card 
                    key={set.id} 
                    onClick={() => setSelectedStudySet(set)}
                    className="p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl cursor-pointer hover:bg-white/60 transition-all hover:-translate-y-1"
                  >
                    <div className="text-4xl mb-4">{set.icon || '📝'}</div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">{set.name}</h3>
                    <p className="text-slate-600 text-sm mb-4">{set.card_count || 0} cards</p>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="w-full h-2 bg-white/20 rounded-full">
                          <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${set.card_count ? ((set.mastered_count || 0) / set.card_count) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-slate-700 text-sm font-medium">
                        {set.mastered_count || 0}/{set.card_count || 0}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateCourseModal open={showCreateModal} onOpenChange={setShowCreateModal} />
      <CreateStudySetModal open={showCreateSetModal} onOpenChange={setShowCreateSetModal} />
    </div>
  );
}