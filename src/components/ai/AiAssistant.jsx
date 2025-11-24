import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import TaskSuggestionBlock from "@/components/ai/TaskSuggestionBlock";

export default function AiAssistant() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Context detection
  const isProjectDetails = location.pathname.includes('ProjectDetails');
  const urlProjectId = searchParams.get('id');
  const projectId = (isProjectDetails && urlProjectId) ? urlProjectId : 'global';

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
    enabled: isOpen 
  });

  const messages = conversation?.history || [];

  // Send Message Mutation
  const chatMutation = useMutation({
    mutationFn: async (text) => {
      const res = await base44.functions.invoke('aiAssistant', {
        project_id: projectId,
        // project_name is now optional or handled by backend for non-global
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
      // Refetch is safer to get proper history shape if backend did something
      queryClient.invalidateQueries(['ai_chat', projectId]); 
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

  // Hide the assistant if we are on the Brain page
  if (location.pathname === '/Brain') return null;

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
          className="rounded-full h-14 w-14 bg-zinc-900 hover:bg-zinc-800 shadow-xl border border-zinc-700 text-white relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-violet-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Sparkles className="w-6 h-6 text-pink-500" />
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800 text-zinc-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-violet-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">ProjectFlow Brain</h3>
                  <p className="text-[10px] text-zinc-400">
                    Context: {projectId === 'global' ? 'Dashboard' : 'Project'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-zinc-900">
              <div className="space-y-4">
                {messages.length === 0 && !isLoading && (
                  <div className="text-center text-zinc-500 text-xs py-12 px-4">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-20 text-pink-500" />
                    <p>I'm ready to help. Ask me about your tasks, documents, or project status.</p>
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-bl-none prose prose-invert prose-sm max-w-none'
                      }`}
                    >
                      {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                          <>
                          <ReactMarkdown components={{
                              ul: ({children}) => <ul className="list-disc ml-4 my-1">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal ml-4 my-1">{children}</ol>,
                              li: ({children}) => <li className="my-0.5">{children}</li>,
                              a: ({href, children}) => <a href={href} target="_blank" className="text-indigo-400 hover:underline">{children}</a>
                          }}>
                              {msg.content}
                          </ReactMarkdown>
                          {(() => {
                            const jsonMatch = msg.content.match(/```json\n([\s\S]*?)\n```/);
                            if (jsonMatch) {
                                try {
                                    const data = JSON.parse(jsonMatch[1]);
                                    if (data.suggested_tasks) {
                                        return <TaskSuggestionBlock tasks={data.suggested_tasks} projectId={projectId} />;
                                    }
                                } catch (e) {}
                            }
                            return null;
                          })()}
                          </>
                      )}
                    </div>
                  </div>
                ))}

                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-none px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800">
                <form onSubmit={handleSubmit} className="relative">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Brain..."
                        className="pr-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500/50"
                        disabled={chatMutation.isPending}
                        autoFocus
                    />
                    <Button 
                        type="submit" 
                        size="icon" 
                        disabled={chatMutation.isPending || !input.trim()} 
                        className="absolute right-1 top-1 h-8 w-8 bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}