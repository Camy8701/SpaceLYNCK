import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Unlock, BookOpen, Plus, Save, Trash2, Palette } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const NOTE_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
];

export default function DiaryView({ sidebarCollapsed }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [hasPassword, setHasPassword] = useState(null);
  const [storedPasswordHash, setStoredPasswordHash] = useState(null);
  const queryClient = useQueryClient();

  // Check for existing password
  useEffect(() => {
    const checkPassword = async () => {
      const user = await base44.auth.me();
      const entries = await base44.entities.DiaryEntry.filter({ created_by: user.email }, '-created_date', 1);
      if (entries.length > 0 && entries[0].password_hash) {
        setHasPassword(true);
        setStoredPasswordHash(entries[0].password_hash);
      } else {
        setHasPassword(false);
      }
    };
    checkPassword();
  }, []);

  // Fetch entries only when unlocked
  const { data: entries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['diaryEntries'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.DiaryEntry.filter({ created_by: user.email }, '-date');
    },
    enabled: isUnlocked
  });

  // Load selected entry's content
  useEffect(() => {
    if (isUnlocked && selectedEntryId) {
      const entry = entries.find(e => e.id === selectedEntryId);
      if (entry) {
        setTitle(entry.title || '');
        setContent(entry.content || '');
        setColor(entry.color || '#3b82f6');
      }
    }
  }, [selectedEntryId, entries, isUnlocked]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (selectedEntryId) {
        await base44.entities.DiaryEntry.update(selectedEntryId, { 
          title, 
          content, 
          color 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['diaryEntries']);
      toast.success('Entry saved!');
    }
  });

  // Create new entry mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const newEntry = await base44.entities.DiaryEntry.create({
        title: 'Untitled Note',
        date: format(new Date(), 'yyyy-MM-dd'),
        content: '',
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)].value,
        password_hash: storedPasswordHash || password
      });
      return newEntry;
    },
    onSuccess: (newEntry) => {
      queryClient.invalidateQueries(['diaryEntries']);
      setSelectedEntryId(newEntry.id);
      setTitle('Untitled Note');
      setContent('');
      setColor(newEntry.color);
      toast.success('New note created!');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (selectedEntryId) {
        await base44.entities.DiaryEntry.delete(selectedEntryId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['diaryEntries']);
      setSelectedEntryId(null);
      setTitle('');
      setContent('');
      toast.success('Entry deleted');
    }
  });

  const handleUnlock = async () => {
    if (hasPassword && storedPasswordHash) {
      if (password === storedPasswordHash) {
        setIsUnlocked(true);
        toast.success('Diary unlocked!');
      } else {
        toast.error('Incorrect password');
      }
    }
  };

  const handleCreatePassword = async () => {
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    if (password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    setStoredPasswordHash(password);
    setIsUnlocked(true);
    setHasPassword(true);
    toast.success('Password created! Your diary is now protected.');
  };

  // Password setup screen
  if (hasPassword === false) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10 flex items-center justify-center min-h-[80vh]">
          <Card className="p-8 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl max-w-md w-full">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <h2 className="text-xl font-bold text-slate-800">Secure Diary & Notes</h2>
              <p className="text-slate-600 mt-2">Create a password to protect your diary</p>
            </div>

            <div className="space-y-4">
              <div>
                <Input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  className="bg-white/30 border-white/30 text-slate-800"
                />
              </div>
              <div>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="bg-white/30 border-white/30 text-slate-800"
                />
              </div>
              <p className="text-amber-600 text-xs bg-amber-50/50 p-2 rounded-lg">
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
  if (!isUnlocked && hasPassword) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10 flex items-center justify-center min-h-[80vh]">
          <Card className="p-8 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl max-w-md w-full">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <h2 className="text-xl font-bold text-slate-800">Diary & Notes</h2>
              <p className="text-slate-600 mt-2">Enter your password to unlock</p>
            </div>

            <div className="space-y-4">
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-white/30 border-white/30 text-slate-800"
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

  // Loading state
  if (hasPassword === null) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        <div className="p-6 lg:p-10 flex items-center justify-center min-h-[80vh]">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Diary interface
  const selectedEntry = entries.find(e => e.id === selectedEntryId);

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <BookOpen className="w-6 h-6" /> My Diary & Notes
          </h1>
          <Button 
            onClick={() => {
              setIsUnlocked(false);
              setPassword('');
            }}
            variant="outline"
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <Lock className="w-4 h-4 mr-2" /> Lock
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Entries List */}
          <Card className="p-4 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl">
            {/* Create New Button */}
            <Button 
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-full mb-4 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>

            <h2 className="text-slate-800 font-semibold mb-3">Entries</h2>
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {entries.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No entries yet. Create your first note!</p>
              ) : (
                entries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all border-l-4 ${
                      selectedEntryId === entry.id
                        ? 'bg-white/60 shadow-md' 
                        : 'bg-white/30 hover:bg-white/40'
                    }`}
                    style={{ borderLeftColor: entry.color || '#3b82f6' }}
                  >
                    <p className="font-medium text-slate-800 truncate">{entry.title || 'Untitled'}</p>
                    <p className="text-slate-500 text-xs">{format(parseISO(entry.date), 'MMM d, yyyy')}</p>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Editor */}
          <Card 
            className="lg:col-span-3 p-6 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl"
            style={{ borderTopColor: color, borderTopWidth: '4px' }}
          >
            {selectedEntryId ? (
              <>
                {/* Title and Actions */}
                <div className="flex items-center justify-between mb-4 gap-4">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note title..."
                    className="flex-1 bg-transparent border-none text-xl font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:ring-0 p-0"
                  />
                  <div className="flex items-center gap-2">
                    {/* Color Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="bg-white/30 border-white/30 hover:bg-white/50"
                        >
                          <div 
                            className="w-5 h-5 rounded-full border-2 border-white"
                            style={{ backgroundColor: color }}
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 bg-white/90 backdrop-blur-xl border-white/40">
                        <div className="grid grid-cols-4 gap-2">
                          {NOTE_COLORS.map(c => (
                            <button
                              key={c.value}
                              onClick={() => setColor(c.value)}
                              className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${color === c.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                              style={{ backgroundColor: c.value }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button 
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      variant="outline"
                      size="icon"
                      className="bg-white/30 border-white/30 text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>

                    <Button 
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>

                <p className="text-slate-500 text-sm mb-4">
                  {selectedEntry ? format(parseISO(selectedEntry.date), 'EEEE, MMMM d, yyyy') : ''}
                </p>

                <Textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing..."
                  className="w-full h-[55vh] bg-white/30 border-white/30 text-slate-800 placeholder:text-slate-400 resize-none text-lg leading-relaxed rounded-xl"
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-[60vh] text-center">
                <div>
                  <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Select an entry or create a new one</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}