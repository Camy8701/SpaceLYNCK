import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Medal, Crown, Flame, Star, TrendingUp, Calendar, Award } from "lucide-react";
import { motion } from "framer-motion";
import { BADGE_DEFINITIONS } from '@/components/gamification/GamificationWidget';

// This page uses placeholder data since user_gamification and user tables are not configured
export default function Leaderboard({ sidebarCollapsed }) {
  const [timeframe, setTimeframe] = useState('weekly'); // weekly, monthly, alltime

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Return empty arrays - no API calls to User/UserGamification tables to prevent 404 errors
  const users = [];
  const gamificationData = [];
  const isLoading = false;

  // Combine user data with gamification data (will be empty)
  const leaderboard = gamificationData
    .map(g => {
      const user = users.find(u => u.id === g.user_id);
      if (!user) return null;
      return {
        ...g,
        user_name: user.full_name,
        user_email: user.email,
        avatar: user.avatar_url
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (timeframe === 'weekly') return (b.weekly_points || 0) - (a.weekly_points || 0);
      if (timeframe === 'monthly') return (b.monthly_points || 0) - (a.monthly_points || 0);
      return (b.total_points || 0) - (a.total_points || 0);
    });

  const getPoints = (entry) => {
    if (timeframe === 'weekly') return entry.weekly_points || 0;
    if (timeframe === 'monthly') return entry.monthly_points || 0;
    return entry.total_points || 0;
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-slate-500 font-bold">#{rank}</span>;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const currentUserRank = leaderboard.findIndex(e => e.user_id === currentUser?.id) + 1;
  const currentUserData = leaderboard.find(e => e.user_id === currentUser?.id);

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white/50 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/40">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              Leaderboard
            </h1>
            <p className="text-white/70 text-sm">Compete with your team!</p>
          </div>
        </div>

        {/* Timeframe Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'weekly', label: 'This Week', icon: Calendar },
            { id: 'monthly', label: 'This Month', icon: TrendingUp },
            { id: 'alltime', label: 'All Time', icon: Star }
          ].map(tab => (
            <Button
              key={tab.id}
              onClick={() => setTimeframe(tab.id)}
              className={timeframe === tab.id 
                ? 'bg-white/40 text-slate-800 border border-white/40' 
                : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Full Leaderboard */}
        <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 overflow-hidden">
          <div className="p-4 border-b border-white/30">
            <h3 className="font-semibold text-slate-700">Full Rankings</h3>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-white/20">
              {leaderboard.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center justify-between p-4 hover:bg-white/30 transition-colors ${
                    entry.user_id === currentUser?.id ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center">
                      {getRankIcon(idx + 1)}
                    </div>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={entry.avatar} />
                      <AvatarFallback className="bg-slate-200 text-slate-600">
                        {getInitials(entry.user_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-800">{entry.user_name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Level {entry.level || 1}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500" />
                          {entry.current_streak || 0}
                        </span>
                        <span>•</span>
                        <span>{(entry.badges || []).length} badges</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{getPoints(entry).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">XP</p>
                  </div>
                </motion.div>
              ))}
              
              {leaderboard.length === 0 && !isLoading && (
                <div className="p-8 text-center text-slate-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium mb-2">Leaderboard Coming Soon</p>
                  <p className="text-sm">The gamification system requires additional database configuration.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Badges Section */}
        <div className="mt-8 bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 p-5">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-500" />
            Available Badges
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {Object.entries(BADGE_DEFINITIONS).map(([id, badge]) => {
              const earned = false; // No data available
              return (
                <div
                  key={id}
                  className={`p-3 rounded-xl text-center transition-all ${
                    earned 
                      ? 'bg-white/60 border border-white/40' 
                      : 'bg-white/20 border border-white/20 opacity-50'
                  }`}
                  title={badge.description}
                >
                  <div className={`text-2xl mb-1 ${earned ? '' : 'grayscale'}`}>{badge.icon}</div>
                  <p className="text-xs font-medium text-slate-700 truncate">{badge.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
