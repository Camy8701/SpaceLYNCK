import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, User, Loader2, Circle } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ChatModal({ open, onOpenChange, currentUser, recipient, projectId }) {
  const [messageText, setMessageText] = useState("");
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // --- Fetch Messages (Polling) ---
  const { data: messages, isLoading } = useQuery({
    queryKey: ['chat', projectId, recipient?.id],
    queryFn: async () => {
      if (!recipient?.id || !projectId) return [];
      
      // Fetch messages where (sender=me AND recipient=them) OR (sender=them AND recipient=me)
      // Base44 filter is typically AND based. We might need to fetch project messages and filter in JS if complex OR is not supported easily.
      // Let's fetch all messages for this project to simplify, then filter in JS. 
      // Optimization: In a real app, use a backend function or specific indexes.
      const allProjectMessages = await base44.entities.ChatMessage.filter({ 
        project_id: projectId 
      }, 'created_date');

      return allProjectMessages.filter(m => 
        (m.sender_id === currentUser.id && m.recipient_id === recipient.id) ||
        (m.sender_id === recipient.id && m.recipient_id === currentUser.id)
      );
    },
    enabled: !!open && !!recipient,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // --- Send Mutation ---
  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      return await base44.entities.ChatMessage.create({
        sender_id: currentUser.id,
        recipient_id: recipient.id,
        project_id: projectId,
        message_text: text,
        read: false
      });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries(['chat']);
    }
  });

  // --- Scroll to bottom & Mark Read ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }

    // Mark unread messages from this recipient as read
    if (messages && messages.length > 0 && open) {
       const unreadIds = messages
         .filter(m => m.sender_id === recipient.id && !m.read)
         .map(m => m.id);
       
       if (unreadIds.length > 0) {
         // Process in parallel/bulk if possible, simplistic loop for now
         unreadIds.forEach(id => {
           base44.entities.ChatMessage.update(id, { read: true }).catch(() => {});
         });
         // Invalidate query to update UI state if needed (badges elsewhere)
         queryClient.invalidateQueries(['unread']); 
       }
    }
  }, [messages, open, recipient?.id]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  if (!recipient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
             <div className="relative">
               <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                 <AvatarImage src="" />
                 <AvatarFallback className="bg-indigo-100 text-indigo-600">
                   {recipient.full_name?.[0] || <User className="w-4 h-4" />}
                 </AvatarFallback>
               </Avatar>
               {/* Online Status Indicator */}
               <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  recipient.last_active && (new Date() - new Date(recipient.last_active) < 5 * 60 * 1000) 
                    ? 'bg-green-500' 
                    : 'bg-slate-300'
               }`} />
             </div>
             <div>
               <DialogTitle className="text-base">{recipient.full_name}</DialogTitle>
               <div className="text-xs text-slate-500 flex items-center gap-1">
                 {recipient.last_active && (new Date() - new Date(recipient.last_active) < 5 * 60 * 1000) 
                    ? 'Online' 
                    : 'Offline'
                 }
               </div>
             </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 bg-slate-50/30">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : messages?.length === 0 ? (
              <div className="text-center text-slate-400 py-12 text-sm">
                No messages yet. Say hi! 👋
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      {msg.message_text}
                      <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                        {format(new Date(msg.created_date), 'p')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSend} className="p-4 border-t bg-white flex gap-2">
          <Input 
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={sendMessageMutation.isPending || !messageText.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}