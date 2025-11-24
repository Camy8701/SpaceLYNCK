import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Sparkles, 
    MessageSquare, 
    FileText, 
    ListChecks, 
    Zap, 
    ArrowRight,
    Search,
    Calendar,
    Github,
    Trello
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Brain() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
      { role: 'system', content: "Hi! I'm ProjectFlow Brain. I can help you manage your tasks, draft reports, and more. What would you like to do?" }
  ]);

  const handleAction = async (actionType, data = {}) => {
      setIsLoading(true);
      // Add user message based on action
      let userMsg = "";
      if (actionType === 'chat') userMsg = input;
      if (actionType === 'draft_report') userMsg = "Draft a quick status update for the team";
      if (actionType === 'summarize_tasks') userMsg = "Summarize my pending tasks";

      if (userMsg) {
          setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      }

      try {
          const response = await base44.functions.invoke('projectBrain', { 
              action: actionType === 'chat' ? 'chat' : actionType,
              data: actionType === 'chat' ? { message: input } : data 
          });

          if (response.data.error) throw new Error(response.data.error);
          
          setMessages(prev => [...prev, { role: 'assistant', content: response.data.result }]);
          setInput("");
      } catch (error) {
          toast.error("Failed to process request");
          setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error processing that request." }]);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSubmit = (e) => {
      e.preventDefault();
      if (!input.trim()) return;
      handleAction('chat');
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-zinc-900 text-zinc-100 overflow-hidden rounded-xl border border-zinc-800">
      {/* Header Area */}
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-sm">
         <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <span className="font-semibold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                ProjectFlow Brain
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700">Beta</span>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Main Chat / Content Area */}
          <div className="flex-1 flex flex-col relative">
              <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6 max-w-3xl mx-auto">
                      
                      {/* Connect Apps Banner (Visual only as per request) */}
                      {messages.length === 1 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-zinc-900 border border-indigo-500/20 relative overflow-hidden group"
                          >
                              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                  <div className="flex gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 rotate-12"></div>
                                      <div className="w-8 h-8 rounded-lg bg-green-500/20 -rotate-6"></div>
                                  </div>
                              </div>
                              <h3 className="text-lg font-semibold text-white mb-2">Connect your apps</h3>
                              <p className="text-zinc-400 text-sm mb-4 max-w-md">
                                  Once connected, ProjectFlow Brain can search across your entire digital workspace to find answers.
                              </p>
                              <Button variant="outline" className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-zinc-100">
                                  Connect Apps
                              </Button>
                          </motion.div>
                      )}

                      {/* Messages */}
                      {messages.map((msg, idx) => (
                          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {msg.role !== 'user' && (
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                                      <Sparkles className="w-4 h-4 text-white" />
                                  </div>
                              )}
                              <div className={`p-4 rounded-2xl max-w-[80%] ${
                                  msg.role === 'user' 
                                    ? 'bg-zinc-800 text-zinc-100' 
                                    : 'bg-transparent border border-zinc-800 text-zinc-200'
                              }`}>
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              </div>
                          </div>
                      ))}
                      
                      {isLoading && (
                          <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                  <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
                              </div>
                              <div className="flex items-center gap-1 h-8">
                                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                              </div>
                          </div>
                      )}
                  </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 max-w-3xl mx-auto w-full">
                  {/* Suggestions */}
                  {messages.length === 1 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                          <button onClick={() => handleAction('draft_report', { project_id: 'current' })} className="text-left p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all group">
                              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200 mb-1">
                                  <FileText className="w-4 h-4 text-indigo-400" />
                                  Draft status update
                              </div>
                              <p className="text-xs text-zinc-500 group-hover:text-zinc-400">Generate a report for the team</p>
                          </button>
                          <button onClick={() => handleAction('summarize_tasks')} className="text-left p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all group">
                              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200 mb-1">
                                  <ListChecks className="w-4 h-4 text-emerald-400" />
                                  Summarize my tasks
                              </div>
                              <p className="text-xs text-zinc-500 group-hover:text-zinc-400">Get a quick overview of today</p>
                          </button>
                      </div>
                  )}

                  <form onSubmit={handleSubmit} className="relative">
                      <div className="relative rounded-xl bg-zinc-800/50 border border-zinc-700 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                          <Input 
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder="Ask, create, search, @ to mention..." 
                              className="border-none bg-transparent h-12 pl-4 pr-24 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <div className="h-5 w-px bg-zinc-700 mx-1"></div>
                              <button type="submit" className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                                  <ArrowRight className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                      <div className="flex justify-between items-center mt-2 px-1">
                          <div className="flex items-center gap-2">
                              <button type="button" className="p-1 rounded hover:bg-zinc-800 text-zinc-500">
                                  <Search className="w-4 h-4" />
                              </button>
                              <span className="text-xs text-zinc-600">All Sources</span>
                          </div>
                      </div>
                  </form>
              </div>
          </div>

          {/* Right Sidebar (Context/Apps) */}
          <div className="w-64 border-l border-zinc-800 bg-zinc-900 p-4 hidden lg:block">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Featured Capabilities</h4>
              
              <div className="space-y-2">
                  {[
                      { icon: Zap, label: "Create Autopilot Agent", new: true },
                      { icon: Sparkles, label: "Generate image", new: true },
                      { icon: Calendar, label: "Ask about Calendar", new: true },
                      { icon: Github, label: "Search Github Issues", new: false },
                  ].map((item, i) => (
                      <button key={i} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 text-left group">
                          <div className="w-8 h-8 rounded-md bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition-colors">
                              <item.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 truncate">{item.label}</div>
                          </div>
                          {item.new && <span className="px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-500 text-[10px] font-medium">New</span>}
                      </button>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
}