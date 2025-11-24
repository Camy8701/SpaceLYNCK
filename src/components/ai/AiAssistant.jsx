import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Loader2, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';

export default function AiAssistant({ projectId, projectName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Load History
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['ai_chat', projectId],
    queryFn: async () => {
      const user = await base44.auth.me();
      const res = await base44.entities.AiConversation.filter({ project_id: projectId, user_id: user.id }, '', 1);
      return res[0] || { history: [] };
    },
    enabled: !!projectId && isOpen
  });

  const messages = conversation?.history || [];

  // Send Message Mutation
  const chatMutation = useMutation({
    mutationFn: async (text) => {
      const res = await base44.functions.invoke('aiAssistant', {
        project_id: projectId,
        project_name: projectName,
        message: text
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data.response;
    },
    onMutate: async (text) => {
      // Optimistic update
      const previousdata = queryClient.getQueryData(['ai_chat', projectId]);
      if (previousdata) {
         queryClient.setQueryData(['ai_chat', projectId], {
           ...previousdata,
           history: [...previousdata.history, { role: 'user', content: text }]
         });
      }
      return { previousdata };
    },
    onSuccess: (response, text) => {
      queryClient.setQueryData(['ai_chat', projectId], (old) => ({
         ...old,
         history: [...(old?.history || []), { role: 'assistant', content: response }]
      }));
    },
    onError: (err, newTodo, context) => {
       if (context?.previousdata) {
         queryClient.setQueryData(['ai_chat', projectId], context.previousdata);
       }
       console.error(err);
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, chatMutation.isPending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate(input);
    setInput("");
  };

  if (!projectId) return null;

  return (
    <>
      {/* Floating Button */}
      <motion.div 
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <Button 
          size="lg" 
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 bg-indigo-600 hover:bg-indigo-700 shadow-xl border-2 border-white"
        >
          <Bot className="w-8 h-8" />
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">AI Assistant</h3>
                  <p className="text-xs text-indigo-200">Context: {projectName}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-indigo-100 hover:bg-indigo-700 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-slate-50">
              <div className="space-y-4">
                {messages.length === 0 && !isLoading && (
                  <div className="text-center text-slate-400 text-sm py-8">
                    <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Ask me anything about your project documents, tasks, or structure!
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm prose prose-sm max-w-none'
                      }`}
                    >
                      {msg.role === 'user' ? msg.content : <ReactMarkdown>{msg.content}</ReactMarkdown>}
                    </div>
                  </div>
                ))}

                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-white border-t flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AI..."
                className="flex-1"
                disabled={chatMutation.isPending}
              />
              <Button type="submit" size="icon" disabled={chatMutation.isPending || !input.trim()} className="bg-indigo-600">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}