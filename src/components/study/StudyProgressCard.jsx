import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Star, Flame, Trophy, Target, BookOpen, Brain, Award } from "lucide-react";

const BADGES = {
  first_lesson: { name: 'First Steps', icon: '🎯', desc: 'Complete your first lesson', requirement: 1, type: 'lessons' },
  five_lessons: { name: 'Quick Learner', icon: '📚', desc: 'Complete 5 lessons', requirement: 5, type: 'lessons' },
  twenty_lessons: { name: 'Knowledge Seeker', icon: '🎓', desc: 'Complete 20 lessons', requirement: 20, type: 'lessons' },
  first_quiz: { name: 'Quiz Starter', icon: '✅', desc: 'Complete your first quiz', requirement: 1, type: 'quizzes' },
  perfect_quiz: { name: 'Perfectionist', icon: '💯', desc: 'Get 100% on a quiz', requirement: 1, type: 'perfect' },
  five_perfect: { name: 'Quiz Master', icon: '🏆', desc: 'Get 100% on 5 quizzes', requirement: 5, type: 'perfect' },
  week_streak: { name: 'Week Warrior', icon: '🔥', desc: '7 day streak', requirement: 7, type: 'streak' },
  month_streak: { name: 'Dedicated', icon: '⭐', desc: '30 day streak', requirement: 30, type: 'streak' },
  hundred_cards: { name: 'Card Collector', icon: '🃏', desc: 'Review 100 flashcards', requirement: 100, type: 'flashcards' },
  thousand_points: { name: 'XP Hunter', icon: '💎', desc: 'Earn 1000 XP', requirement: 1000, type: 'points' },
};

export function useStudyProgress() {
  const queryClient = useQueryClient();

  const { data: progress } = useQuery({
    queryKey: ['studyProgress'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const res = await base44.entities.StudyProgress.filter({ created_by: user.email });
      return res[0] || null;
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (updates) => {
      const user = await base44.auth.me();
      if (progress) {
        return await base44.entities.StudyProgress.update(progress.id, updates);
      } else {
        return await base44.entities.StudyProgress.create({ user_id: user.id, ...updates });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['studyProgress']);
    }
  });

  const addPoints = async (points, type = 'general', count = 1) => {
    const today = new Date().toISOString().split('T')[0];
    const currentProgress = progress || {};
    
    // Calculate streak
    let newStreak = currentProgress.current_streak || 0;
    const lastStudy = currentProgress.last_study_date;
    
    if (lastStudy) {
      const lastDate = new Date(lastStudy);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) newStreak++;
      else if (diffDays > 1) newStreak = 1;
    } else {
      newStreak = 1;
    }

    const updates = {
      total_points: (currentProgress.total_points || 0) + points,
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, currentProgress.longest_streak || 0),
      last_study_date: today
    };

    if (type === 'lesson') updates.lessons_completed = (currentProgress.lessons_completed || 0) + count;
    if (type === 'quiz') updates.quizzes_completed = (currentProgress.quizzes_completed || 0) + count;
    if (type === 'flashcard') updates.flashcards_reviewed = (currentProgress.flashcards_reviewed || 0) + count;
    if (type === 'perfect') updates.perfect_quizzes = (currentProgress.perfect_quizzes || 0) + count;

    // Check for new badges
    const currentBadges = currentProgress.badges || [];
    const newBadges = [...currentBadges];
    
    Object.entries(BADGES).forEach(([id, badge]) => {
      if (currentBadges.includes(id)) return;
      
      let earned = false;
      if (badge.type === 'lessons' && updates.lessons_completed >= badge.requirement) earned = true;
      if (badge.type === 'quizzes' && updates.quizzes_completed >= badge.requirement) earned = true;
      if (badge.type === 'perfect' && updates.perfect_quizzes >= badge.requirement) earned = true;
      if (badge.type === 'streak' && updates.current_streak >= badge.requirement) earned = true;
      if (badge.type === 'flashcards' && updates.flashcards_reviewed >= badge.requirement) earned = true;
      if (badge.type === 'points' && updates.total_points >= badge.requirement) earned = true;
      
      if (earned) newBadges.push(id);
    });

    if (newBadges.length > currentBadges.length) {
      updates.badges = newBadges;
    }

    await updateProgressMutation.mutateAsync(updates);
    return newBadges.length > currentBadges.length ? newBadges.filter(b => !currentBadges.includes(b)) : [];
  };

  return { progress, addPoints, BADGES };
}

export default function StudyProgressCard({ compact = false }) {
  const { progress, BADGES } = useStudyProgress();

  if (!progress) return null;

  const level = Math.floor((progress.total_points || 0) / 500) + 1;
  const pointsInLevel = (progress.total_points || 0) % 500;
  const earnedBadges = (progress.badges || []).map(id => ({ id, ...BADGES[id] }));

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-white">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="font-medium">{progress.total_points || 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="w-4 h-4 text-orange-400" />
          <span>{progress.current_streak || 0}</span>
        </div>
        <div className="text-white/60 text-sm">Lvl {level}</div>
      </div>
    );
  }

  return (
    <Card className="p-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" /> Your Progress
        </h3>
        <div className="px-3 py-1 bg-purple-500/30 rounded-full text-purple-300 text-sm font-medium">
          Level {level}
        </div>
      </div>

      {/* XP Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-white/60">XP to next level</span>
          <span className="text-yellow-400 font-medium">{pointsInLevel}/500</span>
        </div>
        <div className="w-full h-3 bg-white/20 rounded-full">
          <div 
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all"
            style={{ width: `${(pointsInLevel / 500) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-white/10 rounded-lg text-center">
          <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{progress.total_points || 0}</p>
          <p className="text-white/50 text-xs">Total XP</p>
        </div>
        <div className="p-3 bg-white/10 rounded-lg text-center">
          <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{progress.current_streak || 0}</p>
          <p className="text-white/50 text-xs">Day Streak</p>
        </div>
        <div className="p-3 bg-white/10 rounded-lg text-center">
          <BookOpen className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{progress.lessons_completed || 0}</p>
          <p className="text-white/50 text-xs">Lessons</p>
        </div>
        <div className="p-3 bg-white/10 rounded-lg text-center">
          <Brain className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{progress.flashcards_reviewed || 0}</p>
          <p className="text-white/50 text-xs">Cards</p>
        </div>
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div>
          <h4 className="text-sm text-white/60 mb-2 flex items-center gap-1">
            <Award className="w-4 h-4" /> Badges ({earnedBadges.length}/{Object.keys(BADGES).length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map(badge => (
              <div 
                key={badge.id}
                className="px-3 py-1.5 bg-white/10 rounded-full flex items-center gap-1.5 text-sm"
                title={badge.desc}
              >
                <span>{badge.icon}</span>
                <span className="text-white/80">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}