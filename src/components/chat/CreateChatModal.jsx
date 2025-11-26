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
      <DialogContent className="bg-slate-900/95 border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Chat Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing Team"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <Label>Invite Members (by email)</Label>
            <div className="space-y-2 mt-2">
              {emails.map((email, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(idx, e.target.value)}
                    placeholder="teammate@company.com"
                    className="bg-white/10 border-white/20 text-white"
                  />
                  {emails.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeEmail(idx)}
                      className="text-white/60 hover:text-white"
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
              className="mt-2 text-white/60 hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Another Email
            </Button>
          </div>

          <p className="text-white/50 text-sm">
            Members will be able to see and join the chat.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Chat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}