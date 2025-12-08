import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function CreateChatModal({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [emails, setEmails] = useState(['']);

  const createMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const memberEmails = emails.filter(e => e.trim()).concat(user.email);
      
      return await base44.entities.ChatRoom.create({
        name,
        member_emails: [...new Set(memberEmails)] // Remove duplicates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chatRooms']);
      toast.success('Chat created!');
      onOpenChange(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setName('');
    setEmails(['']);
  };

  const addEmail = () => setEmails([...emails, '']);
  const removeEmail = (idx) => setEmails(emails.filter((_, i) => i !== idx));
  const updateEmail = (idx, value) => {
    const newEmails = [...emails];
    newEmails[idx] = value;
    setEmails(newEmails);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-slate-700">Chat Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing Team"
              className="bg-white/50 border-white/40 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <Label className="text-slate-700">Invite Members (by email)</Label>
            <div className="space-y-2 mt-2">
              {emails.map((email, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(idx, e.target.value)}
                    placeholder="teammate@company.com"
                    className="bg-white/50 border-white/40 text-slate-800 placeholder:text-slate-400"
                  />
                  {emails.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeEmail(idx)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={addEmail}
              className="mt-2 text-slate-500 hover:text-slate-700"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Another Email
            </Button>
          </div>

          <p className="text-slate-500 text-sm">
            Members will be able to see and join the chat.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-700 hover:bg-white/50">
            Cancel
          </Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Chat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}