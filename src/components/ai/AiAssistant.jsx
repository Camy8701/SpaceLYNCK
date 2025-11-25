import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Loader2, Sparkles, Maximize2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import TaskSuggestionBlock from "@/components/ai/TaskSuggestionBlock";
import { createPageUrl } from '@/utils';

export default function AiAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const isProjectDetails = location.pathname.includes('ProjectDetails');
  const urlProjectId = searchParams.get('id');
  const projectId = (isProjectDetails && urlProjectId) ? urlProjectId : 'global';

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['jarvis_chat', projectId],
    queryFn: async () => {
      const user = await base44.auth.me();
      const res = await base44.entities.AiConversation.filter({ project_id: projectId, user_id: user.id }, '', 1);
      return res[0] || { history: [] };
    },
    enabled: isOpen 
  });

  const messages = conversation?.history || [];

  const chatMutation = useMutation({
    mutationFn: async (text) => {
      try {
        const res = await base44.functions.invoke('jarvis', {
          action: 'chat',
          project_id: projectId,
          message: text
        });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data?.response || res.data;
      } catch (err) {
        console.error('Jarvis function error:', err);
        throw err;
      }
    },
    onMutate: async (text) => {
      const previousdata = queryClient.getQueryData(['jarvis_chat', projectId]);
      if (previousdata) {
        queryClient.setQueryData(['jarvis_chat', projectId], {
          ...previousdata,
          history: [...(previousdata.history || []), { role: 'user', content: text }]
        });
      }
      return { previousdata };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jarvis_chat', projectId]); 
    },
    onError: (err, text, context) => {
      if (context?.previousdata) {
        queryClient.setQueryData(['jarvis_chat', projectId], context.previousdata);
      }
      console.error('Chat mutation error:', err);
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

  const openFullJarvis = () => {
    setIsOpen(false);
    navigate(createPageUrl('JarvisView'));
  };

  if (location.pathname === '/JarvisView' || location.pathname === '/Brain' || location.pathname === '/' || location.pathname === '/Home' || location.pathname === '/AboutUs') return null;

  return (
    <>
      {/* Floating Button - Glassmorphism Style */}
      <motion.div 
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <Button 
          size="lg" 
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 bg-white/30 backdrop-blur-xl hover:bg-white/40 shadow-xl border border-white/40 text-rose-500 relative overflow-hidden group"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Chat Window - Glassmorphism Style */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-white/50 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/40 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-white/30 backdrop-blur-sm border-b border-white/30 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center border border-white/40">
                  <Bot className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">Jarvis</h3>
                  <p className="text-[10px] text-slate-500">
                    Context: {projectId === 'global' ? 'Dashboard' : 'Project'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={openFullJarvis} 
                  className="text-slate-500 hover:bg-white/30 hover:text-slate-700 h-8 w-8"
                  title="Open full Jarvis"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-500 hover:bg-white/30 hover:text-slate-700 h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && !isLoading && (
                  <div className="text-center text-slate-500 text-xs py-12 px-4">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 text-rose-400" />
                    <p>I'm Jarvis, ready to help. Ask me about your tasks, documents, or project status.</p>
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-500/80 text-white rounded-br-none' 
                          : 'bg-white/50 border border-white/40 text-slate-700 rounded-bl-none'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <>
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown components={{
                              ul: ({children}) => <ul className="list-disc ml-4 my-1">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal ml-4 my-1">{children}</ol>,
                              li: ({children}) => <li className="my-0.5">{children}</li>,
                              a: ({href, children}) => <a href={href} target="_blank" className="text-blue-600 hover:underline">{children}</a>
                            }}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
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
                    <div className="bg-white/50 border border-white/40 rounded-2xl rounded-bl-none px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                      </div>
                    </div>
                  </div>
                )}

                {chatMutation.isError && (
                  <div className="flex justify-start">
                    <div className="bg-red-100 border border-red-200 rounded-2xl rounded-bl-none px-4 py-3 text-red-700 text-sm">
                      Error: {chatMutation.error?.message || 'Something went wrong. Please try again.'}
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 bg-white/30 border-t border-white/30">
              <form onSubmit={handleSubmit} className="relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Jarvis..."
                  className="pr-10 bg-white/30 border-white/30 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500/50"
                  disabled={chatMutation.isPending}
                  autoFocus
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={chatMutation.isPending || !input.trim()} 
                  className="absolute right-1 top-1 h-8 w-8 bg-rose-500 hover:bg-rose-600 text-white"
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