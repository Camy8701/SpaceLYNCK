import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, GraduationCap, BookOpen } from "lucide-react";
import CreateCourseModal from '@/components/study/CreateCourseModal';
import CourseDetail from '@/components/study/CourseDetail';

export default function SelfStudyView({ sidebarCollapsed }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['studyCourses'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.StudyCourse.filter({ created_by: user.email }, '-created_date');
    }
  });

  if (selectedCourse) {
    return <CourseDetail course={selectedCourse} onBack={() => setSelectedCourse(null)} sidebarCollapsed={sidebarCollapsed} />;
  }

  const totalProgress = courses.length > 0 
    ? Math.round(courses.reduce((acc, c) => acc + (c.progress_percentage || 0), 0) / courses.length)
    : 0;

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <GraduationCap className="w-6 h-6" /> Self-Study with AI
          </h1>
          <Button onClick={() => setShowCreateModal(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </div>

        {/* Overall Progress */}
        {courses.length > 0 && (
          <Card className="p-4 mb-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Overall Progress</span>
              <span className="text-white font-semibold">{totalProgress}%</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full mt-2">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </Card>
        )}

        {/* Courses Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-white/70">Loading courses...</div>
        ) : courses.length === 0 ? (
          <Card className="p-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-center">
            <BookOpen className="w-16 h-16 mx-auto text-white/40 mb-4" />
            <p className="text-white/70 mb-4">No courses yet. Create your first AI-powered course!</p>
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
                className="p-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl cursor-pointer hover:bg-white/30 transition-all hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{course.icon || '📚'}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{course.name}</h3>
                <p className="text-white/60 text-sm mb-4">{course.total_lessons || 0} lessons</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <div className="w-full h-2 bg-white/20 rounded-full">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${course.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-white/80 text-sm font-medium">{course.progress_percentage || 0}%</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateCourseModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}