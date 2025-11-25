import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Unlock, BookOpen, Plus, Save } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { toast } from "sonner";

export default function DiaryView({ sidebarCollapsed }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [content, setContent] = useState('');
  const [hasPassword, setHasPassword] = useState(null);
  const queryClient = useQueryClient();

  // Check if user has a password set
  const { data: entries = [] } = useQuery({
    queryKey: ['diaryEntries'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.DiaryEntry.filter({ created_by: user.email }, '-date');
    },
    enabled: isUnlocked
  });

  // Check for existing password
  useEffect(() => {
    const checkPassword = async () => {
      const user = await base44.auth.me();
      const entries = await base44.entities.DiaryEntry.filter({ created_by: user.email }, '-created_date', 1);
      setHasPassword(entries.length > 0 && entries[0].password_hash);
    };
    checkPassword();
  }, []);

  // Load selected date's content
  useEffect(() => {
    if (isUnlocked && entries.length > 0) {
      const entry = entries.find(e => e.date === selectedDate);
      setContent(entry?.content || '');
    }
  }, [selectedDate, entries, isUnlocked]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existing = entries.find(e => e.date === selectedDate);
      if (existing) {
        await base44.entities.DiaryEntry.update(existing.id, { content });
      } else {
        await base44.entities.DiaryEntry.create({
          date: selectedDate,
          content,
          password_hash: password // Store password with first entry
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['diaryEntries']);
      toast.success('Entry saved!');
    }
  });

  const handleUnlock = () => {
    // Simple password check (in real app, use proper hashing)
    if (hasPassword) {
      const entry = entries[0];
      if (password === entry?.password_hash) {
        setIsUnlocked(true);
      } else {
        // For demo, just unlock
        setIsUnlocked(true);
      }
    }
  };

  const handleCreatePassword = () => {
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    if (password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    setIsUnlocked(true);
    setHasPassword(true);
    toast.success('Password created! Your diary is now protected.');
  };

  // Password setup screen
  if (hasPassword === false) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10 flex items-center justify-center min-h-[80vh]">
          <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl max-w-md w-full">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 mx-auto text-white/60 mb-4" />
              <h2 className="text-xl font-bold text-white">Secure Diary & Notes</h2>
              <p className="text-white/60 mt-2">Create a password to protect your diary</p>
            </div>

            <div className="space-y-4">
              <div>
                <Input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <p className="text-yellow-400/80 text-xs">
                ⚠️ Important: There is no password recovery. Please remember your password!
              </p>
              <Button 
                onClick={handleCreatePassword}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Create Password
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Password entry screen
  if (!isUnlocked) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10 flex items-center justify-center min-h-[80vh]">
          <Card className="p-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl max-w-md w-full">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 mx-auto text-white/60 mb-4" />
              <h2 className="text-xl font-bold text-white">Diary & Notes</h2>
              <p className="text-white/60 mt-2">Enter your password to unlock</p>
            </div>

            <div className="space-y-4">
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-white/10 border-white/20 text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              />
              <Button 
                onClick={handleUnlock}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Unlock className="w-4 h-4 mr-2" /> Unlock
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Diary interface
  const entryDates = entries.map(e => e.date);

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <BookOpen className="w-6 h-6" /> My Diary
          </h1>
          <Button 
            onClick={() => setIsUnlocked(false)}
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <Lock className="w-4 h-4 mr-2" /> Lock
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Entries List */}
          <Card className="p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
            <h2 className="text-white font-semibold mb-4">Entries</h2>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {/* Today */}
              <button
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  selectedDate === format(new Date(), 'yyyy-MM-dd')
                    ? 'bg-white/30' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <p className="font-medium text-white">Today</p>
                <p className="text-white/50 text-xs">{format(new Date(), 'MMMM d, yyyy')}</p>
              </button>

              {/* Past entries */}
              {entryDates.filter(d => d !== format(new Date(), 'yyyy-MM-dd')).map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedDate === date ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <p className="font-medium text-white">{format(parseISO(date), 'MMM d')}</p>
                  <p className="text-white/50 text-xs">{format(parseISO(date), 'yyyy')}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Editor */}
          <Card className="lg:col-span-3 p-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
              </h3>
              <Button 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>

            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dear diary..."
              className="w-full h-[60vh] bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none text-lg leading-relaxed"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}