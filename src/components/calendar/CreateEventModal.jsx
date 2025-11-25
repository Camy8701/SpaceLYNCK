import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from 'date-fns';
import { toast } from "sonner";

export default function CreateEventModal({ open, onOpenChange, defaultDate }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState('personal');

  const createMutation = useMutation({
    mutationFn: async () => {
      const startDatetime = new Date(`${date}T${startTime}`);
      const endDatetime = new Date(`${date}T${endTime}`);
      
      return await base44.entities.CalendarEvent.create({
        title,
        description,
        start_datetime: startDatetime.toISOString(),
        end_datetime: endDatetime.toISOString(),
        category,
        reminder_minutes: 15
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarEvents']);
      toast.success('Event created!');
      onOpenChange(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartTime('09:00');
    setEndTime('10:00');
    setCategory('personal');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900/95 border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Event Title</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team Meeting"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <Label>Date</Label>
            <Input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <RadioGroup value={category} onValueChange={setCategory} className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="personal" id="personal" className="border-blue-500 text-blue-500" />
                <Label htmlFor="personal" className="text-blue-400">Personal</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="work" id="work" className="border-green-500 text-green-500" />
                <Label htmlFor="work" className="text-green-400">Work</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="meeting" id="meeting" className="border-purple-500 text-purple-500" />
                <Label htmlFor="meeting" className="text-purple-400">Meeting</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!title || createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}