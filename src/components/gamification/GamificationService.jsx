import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 20000];

const POINTS_CONFIG = {
  task_complete: 10,
  task_complete_on_time: 15,
  task_complete_early: 20,
  project_complete: 100,
  check_in: 5,
  hour_tracked: 2,
  streak_bonus: 5, // per day of streak
  first_task_of_day: 10,
};

// Calculate level from points
export const calculateLevel = (points) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
};

// Award points to user
export const awardPoints = async (userId, points, reason) => {
  try {
    const records = await base44.entities.UserGamification.filter({ user_id: userId }, '', 1);
    let gamification = records[0];
    
    if (!gamification) {
      gamification = await base44.entities.UserGamification.create({
        user_id: userId,
        total_points: 0,
        level: 1,
        current_streak: 0,
        badges: [],
        weekly_points: 0,
        monthly_points: 0
      });
    }

    const newTotalPoints = (gamification.total_points || 0) + points;
    const newWeeklyPoints = (gamification.weekly_points || 0) + points;
    const newMonthlyPoints = (gamification.monthly_points || 0) + points;
    const newLevel = calculateLevel(newTotalPoints);
    const leveledUp = newLevel > (gamification.level || 1);

    await base44.entities.UserGamification.update(gamification.id, {
      total_points: newTotalPoints,
      weekly_points: newWeeklyPoints,
      monthly_points: newMonthlyPoints,
      level: newLevel
    });

    // Show toast notification
    toast.success(`+${points} XP`, {
      description: reason,
      icon: '⭐'
    });

    if (leveledUp) {
      setTimeout(() => {
        toast.success(`🎉 Level Up!`, {
          description: `You've reached Level ${newLevel}!`,
          duration: 5000
        });
      }, 500);
    }

    return { newTotalPoints, newLevel, leveledUp };
  } catch (error) {
    console.error('Failed to award points:', error);
  }
};

// Award badge to user
export const awardBadge = async (userId, badgeId, badgeName) => {
  try {
    const records = await base44.entities.UserGamification.filter({ user_id: userId }, '', 1);
    let gamification = records[0];
    
    if (!gamification) return;

    const existingBadges = gamification.badges || [];
    const alreadyHas = existingBadges.some(b => b.id === badgeId);
    
    if (alreadyHas) return false;

    const newBadges = [...existingBadges, { id: badgeId, earned_at: new Date().toISOString() }];
    
    await base44.entities.UserGamification.update(gamification.id, {
      badges: newBadges,
      achievements_unlocked: newBadges.length
    });

    toast.success(`🏆 Badge Earned!`, {
      description: badgeName,
      duration: 5000
    });

    return true;
  } catch (error) {
    console.error('Failed to award badge:', error);
  }
};

// Update streak
export const updateStreak = async (userId) => {
  try {
    const records = await base44.entities.UserGamification.filter({ user_id: userId }, '', 1);
    let gamification = records[0];
    
    if (!gamification) {
      gamification = await base44.entities.UserGamification.create({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_active_date: new Date().toISOString().split('T')[0]
      });
      return 1;
    }

    const today = new Date().toISOString().split('T')[0];
    const lastActive = gamification.last_active_date;
    
    if (lastActive === today) return gamification.current_streak; // Already active today

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = 1;

    if (lastActive === yesterday) {
      newStreak = (gamification.current_streak || 0) + 1;
    }

    const newLongestStreak = Math.max(newStreak, gamification.longest_streak || 0);

    await base44.entities.UserGamification.update(gamification.id, {
      current_streak: newStreak,
      longest_streak: newLongestStreak,
      last_active_date: today
    });

    // Check for streak badges
    if (newStreak === 3) await awardBadge(userId, 'streak_3', 'On Fire - 3 Day Streak!');
    if (newStreak === 7) await awardBadge(userId, 'streak_7', 'Week Warrior - 7 Day Streak!');
    if (newStreak === 30) await awardBadge(userId, 'streak_30', 'Unstoppable - 30 Day Streak!');

    return newStreak;
  } catch (error) {
    console.error('Failed to update streak:', error);
  }
};

// Handle task completion
export const onTaskComplete = async (userId, task) => {
  const today = new Date().toISOString().split('T')[0];
  let points = POINTS_CONFIG.task_complete;
  
  // Bonus for on-time or early completion
  if (task.due_date) {
    if (task.due_date > today) {
      points = POINTS_CONFIG.task_complete_early;
    } else if (task.due_date === today) {
      points = POINTS_CONFIG.task_complete_on_time;
    }
  }

  await awardPoints(userId, points, 'Task completed!');
  await updateStreak(userId);

  // Update task count and check badges
  const records = await base44.entities.UserGamification.filter({ user_id: userId }, '', 1);
  if (records[0]) {
    const newCount = (records[0].tasks_completed || 0) + 1;
    await base44.entities.UserGamification.update(records[0].id, {
      tasks_completed: newCount
    });

    if (newCount === 1) await awardBadge(userId, 'first_task', 'First Steps - First task completed!');
    if (newCount === 10) await awardBadge(userId, 'task_master_10', 'Task Master - 10 tasks completed!');
    if (newCount === 50) await awardBadge(userId, 'task_master_50', 'Productivity Pro - 50 tasks completed!');
    if (newCount === 100) await awardBadge(userId, 'task_master_100', 'Task Legend - 100 tasks completed!');
  }
};

// Handle check-in
export const onCheckIn = async (userId) => {
  await awardPoints(userId, POINTS_CONFIG.check_in, 'Checked in!');
  await updateStreak(userId);
  
  const hour = new Date().getHours();
  if (hour < 8) {
    await awardBadge(userId, 'early_bird', 'Early Bird - Checked in before 8 AM!');
  }
};

// Handle check-out with hours
export const onCheckOut = async (userId, hoursWorked) => {
  const hourPoints = Math.floor(hoursWorked * POINTS_CONFIG.hour_tracked);
  if (hourPoints > 0) {
    await awardPoints(userId, hourPoints, `Tracked ${hoursWorked.toFixed(1)} hours!`);
  }

  // Update total hours
  const records = await base44.entities.UserGamification.filter({ user_id: userId }, '', 1);
  if (records[0]) {
    const newHours = (records[0].hours_tracked || 0) + hoursWorked;
    await base44.entities.UserGamification.update(records[0].id, {
      hours_tracked: newHours
    });

    if (newHours >= 10 && newHours - hoursWorked < 10) {
      await awardBadge(userId, 'time_tracker_10', 'Time Keeper - 10 hours tracked!');
    }
    if (newHours >= 100 && newHours - hoursWorked < 100) {
      await awardBadge(userId, 'time_tracker_100', 'Time Master - 100 hours tracked!');
    }
  }

  const hour = new Date().getHours();
  if (hour >= 22) {
    await awardBadge(userId, 'night_owl', 'Night Owl - Working past 10 PM!');
  }
};

export { POINTS_CONFIG };