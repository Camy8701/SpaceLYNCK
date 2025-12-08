import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Star, Target, Zap, Award, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 20000];

const BADGE_DEFINITIONS = {
  first_task: { name: 'First Steps', icon: '🎯', description: 'Complete your first task' },
  task_master_10: { name: 'Task Master', icon: '✅', description: 'Complete 10 tasks' },
  task_master_50: { name: 'Productivity Pro', icon: '🚀', description: 'Complete 50 tasks' },
  task_master_100: { name: 'Task Legend', icon: '👑', description: 'Complete 100 tasks' },
  streak_3: { name: 'On Fire', icon: '🔥', description: '3 day streak' },
  streak_7: { name: 'Week Warrior', icon: '⚡', description: '7 day streak' },
  streak_30: { name: 'Unstoppable', icon: '💪', description: '30 day streak' },
  early_bird: { name: 'Early Bird', icon: '🌅', description: 'Check in before 8 AM' },
  night_owl: { name: 'Night Owl', icon: '🦉', description: 'Work past 10 PM' },
  project_complete: { name: 'Project Hero', icon: '🏆', description: 'Complete a project' },
  time_tracker_10: { name: 'Time Keeper', icon: '⏰', description: 'Track 10 hours' },
  time_tracker_100: { name: 'Time Master', icon: '⌛', description: 'Track 100 hours' },
  team_player: { name: 'Team Player', icon: '🤝', description: 'Collaborate on 5 tasks' },
  level_5: { name: 'Rising Star', icon: '⭐', description: 'Reach level 5' },
  level_10: { name: 'Superstar', icon: '🌟', description: 'Reach level 10' },
};

// This widget displays placeholder - user_gamification table not configured
export default function GamificationWidget() {
  // Return static placeholder data since user_gamification table doesn't exist
  const gamification = {
    total_points: 0,
    level: 1,
    current_streak: 0,
    longest_streak: 0,
    tasks_completed: 0,
    badges: [],
    weekly_points: 0,
    monthly_points: 0
  };
  
  const isLoading = false;

  const currentLevel = gamification.level || 1;
  const currentPoints = gamification.total_points || 0;
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const pointsInLevel = currentPoints - currentThreshold;
  const pointsNeeded = nextThreshold - currentThreshold;
  const progressPercent = Math.min((pointsInLevel / pointsNeeded) * 100, 100);

  const recentBadges = (gamification.badges || []).slice(-3).reverse();

  return (
    <div className="space-y-4">
      {/* Level & XP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-lg">
            {currentLevel}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Level {currentLevel}</p>
            <p className="text-xs text-slate-500">{currentPoints.toLocaleString()} XP</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-orange-500">
          <Flame className="w-5 h-5" />
          <span className="font-bold">{gamification.current_streak || 0}</span>
          <span className="text-xs text-slate-500">day streak</span>
        </div>
      </div>

      {/* Progress to next level */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Progress to Level {currentLevel + 1}</span>
          <span>{pointsInLevel} / {pointsNeeded} XP</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/40 rounded-lg p-2 text-center">
          <Target className="w-4 h-4 mx-auto text-green-600 mb-1" />
          <p className="text-lg font-bold text-slate-700">{gamification.tasks_completed || 0}</p>
          <p className="text-[10px] text-slate-500">Tasks Done</p>
        </div>
        <div className="bg-white/40 rounded-lg p-2 text-center">
          <Zap className="w-4 h-4 mx-auto text-blue-600 mb-1" />
          <p className="text-lg font-bold text-slate-700">{gamification.weekly_points || 0}</p>
          <p className="text-[10px] text-slate-500">This Week</p>
        </div>
        <div className="bg-white/40 rounded-lg p-2 text-center">
          <Award className="w-4 h-4 mx-auto text-purple-600 mb-1" />
          <p className="text-lg font-bold text-slate-700">{(gamification.badges || []).length}</p>
          <p className="text-[10px] text-slate-500">Badges</p>
        </div>
      </div>

      {/* Recent Badges */}
      {recentBadges.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Recent Badges</p>
          <div className="flex gap-2">
            {recentBadges.map((badge, idx) => {
              const def = BADGE_DEFINITIONS[badge.id];
              if (!def) return null;
              return (
                <motion.div
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-xl shadow-sm border border-white/40"
                  title={def.name}
                >
                  {def.icon}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Export badge definitions for use elsewhere
export { BADGE_DEFINITIONS, LEVEL_THRESHOLDS };