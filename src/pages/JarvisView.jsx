import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  MessageSquare, 
  FileText, 
  ListChecks, 
  Search,
  Bot,
  Send,
  Loader2,
  LayoutGrid,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import TaskSuggestionBlock from "@/components/ai/TaskSuggestionBlock";

export default function JarvisView({ sidebarCollapsed }) {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('id') || 'global';
  
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState('chat');
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Search Mutation
  const searchMutation = useMutation({
    mutationFn: async (query) => {
      const res = await base44.functions.invoke('jarvis', {
        action: 'search',
        project_id: projectId,
        query: query
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    },
    onError: (err) => {
      toast.error(err.message || "Search failed");
    }
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    searchMutation.mutate(searchQuery);
  };

  // Load Chat History
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['jarvis_chat', projectId],
    queryFn: async () => {
      const user = await base44.auth.me();
      const res = await base44.entities.AiConversation.filter({ project_id: projectId, user_id: user.id }, '', 1);
      return res[0] || { history: [] };
    }
  });

  const messages = conversation?.history || [];

  // Chat Mutation
  const chatMutation = useMutation({
    mutationFn: async (text) => {
      const res = await base44.functions.invoke('jarvis', {
        action: 'chat',
        project_id: projectId,
        message: text
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data.response;
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
    onSuccess: (response) => {
      queryClient.invalidateQueries(['jarvis_chat', projectId]);
    },
    onError: (err, text, context) => {
      if (context?.previousdata) {
        queryClient.setQueryData(['jarvis_chat', projectId], context.previousdata);
      }
      toast.error("Failed to send message");
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatMutation.isPending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate(input);
    setInput("");
  };

  const handleQuickAction = (action) => {
    let text = "";
    switch(action) {
      case 'draft_report': 
        text = "Draft a status update report based on recent activity and tasks."; 
        break;
      case 'summarize_tasks': 
        text = "Summarize my pending tasks and suggest what to focus on today."; 
        break;
      case 'analyze_risks':
        text = "Analyze current risks and potential blockers based on the available data.";
        break;
      default: return;
    }
    chatMutation.mutate(text);
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/50 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/40">
              <Bot className="w-7 h-7 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                Jarvis AI Assistant
              </h1>
              <p className="text-white/70 text-sm">
                Context: {projectId === 'global' ? 'Global Dashboard' : 'Project Active'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6">
          <Button 
            onClick={() => setActiveTab('chat')}
            className={activeTab === 'chat' 
              ? 'bg-white/40 text-slate-800 border border-white/40 hover:bg-white/50' 
              : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'}
          >
            <MessageSquare className="w-4 h-4 mr-2" /> Chat
          </Button>
          <Button 
            onClick={() => setActiveTab('search')}
            className={activeTab === 'search' 
              ? 'bg-white/40 text-slate-800 border border-white/40 hover:bg-white/50' 
              : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'}
          >
            <Search className="w-4 h-4 mr-2" /> Deep Search
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="xl:col-span-3">
            {activeTab === 'search' ? (
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 p-6">
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Deep Search</h2>
                  <p className="text-slate-600">Search across documents, tasks, knowledge base, and conversations</p>
                </div>

                <form onSubmit={handleSearch} className="relative mb-6">
                  <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for keywords, deadlines, or topics..." 
                    className="h-12 pl-12 bg-white/30 border-white/30 text-slate-800 placeholder:text-slate-400 rounded-xl"
                    autoFocus
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Button 
                    type="submit" 
                    disabled={searchMutation.isPending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600"
                  >
                    {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                  </Button>
                </form>

                {searchMutation.data && (
                  <div className="space-y-6">
                    {/* Synthesis */}
                    <div className="bg-white/40 rounded-xl p-5 border border-white/30">
                      <div className="flex items-center gap-2 mb-3 text-blue-600">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="font-semibold">AI Synthesis</h3>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {searchMutation.data.synthesis}
                      </p>
                    </div>

                    {/* Matches */}
                    {searchMutation.data.matches?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Relevant Sources</h3>
                        <div className="grid gap-3">
                          {searchMutation.data.matches.map((match, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="bg-white/40 rounded-xl p-4 border border-white/30 hover:bg-white/50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {match.type === 'document' && <FileText className="w-4 h-4 text-blue-500" />}
                                  {match.type === 'task' && <ListChecks className="w-4 h-4 text-green-500" />}
                                  {match.type === 'conversation' && <MessageSquare className="w-4 h-4 text-purple-500" />}
                                  {match.type === 'knowledge_base' && <BookOpen className="w-4 h-4 text-amber-500" />}
                                  <span className="font-medium text-slate-800">{match.title}</span>
                                </div>
                                <span className="text-xs text-slate-500 bg-white/50 px-2 py-1 rounded">
                                  {Math.round(match.relevance_score)}% match
                                </span>
                              </div>
                              <p className="text-sm text-slate-600">
                                "...{match.excerpt}..."
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 flex flex-col h-[70vh]">
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {/* Welcome State */}
                    {messages.length === 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-8"
                      >
                        <div className="w-16 h-16 bg-white/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/40">
                          <Sparkles className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">Welcome to Jarvis</h3>
                        <p className="text-slate-600 text-sm mb-6 max-w-md mx-auto">
                          I can help you draft reports, analyze tasks, search your documents, and manage your projects.
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button 
                            variant="outline" 
                            className="bg-white/30 border-white/40 text-slate-700 hover:bg-white/50" 
                            onClick={() => handleQuickAction('draft_report')}
                          >
                            <FileText className="w-4 h-4 mr-2" /> Draft Report
                          </Button>
                          <Button 
                            variant="outline" 
                            className="bg-white/30 border-white/40 text-slate-700 hover:bg-white/50" 
                            onClick={() => handleQuickAction('summarize_tasks')}
                          >
                            <ListChecks className="w-4 h-4 mr-2" /> Summarize Tasks
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* Messages */}
                    {messages.map((msg, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={idx} 
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role !== 'user' && (
                          <div className="w-8 h-8 bg-white/50 rounded-full flex items-center justify-center flex-shrink-0 border border-white/40">
                            <Sparkles className="w-4 h-4 text-rose-500" />
                          </div>
                        )}
                        <div className={`p-4 rounded-2xl max-w-[80%] ${
                          msg.role === 'user' 
                            ? 'bg-blue-500/80 text-white rounded-tr-none' 
                            : 'bg-white/50 border border-white/40 text-slate-800 rounded-tl-none'
                        }`}>
                          {msg.role === 'user' ? (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <>
                              <div className="prose prose-sm max-w-none text-slate-700">
                                <ReactMarkdown 
                                  components={{
                                    ul: ({children}) => <ul className="list-disc ml-4 my-2">{children}</ul>,
                                    ol: ({children}) => <ol className="list-decimal ml-4 my-2">{children}</ol>,
                                    li: ({children}) => <li className="my-1">{children}</li>,
                                    a: ({href, children}) => <a href={href} target="_blank" className="text-blue-600 hover:underline">{children}</a>
                                  }}
                                >
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
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-400/30">
                            <span className="text-xs font-bold text-white">You</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                    
                    {chatMutation.isPending && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-white/50 rounded-full flex items-center justify-center border border-white/40">
                          <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
                        </div>
                        <div className="bg-white/50 border border-white/40 rounded-2xl rounded-tl-none px-4 py-3">
                          <span className="text-sm text-slate-500 animate-pulse">Thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t border-white/30">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Jarvis anything..." 
                      className="flex-1 bg-white/30 border-white/30 text-slate-800 placeholder:text-slate-400 focus:ring-white/50"
                      disabled={chatMutation.isPending}
                    />
                    <Button 
                      type="submit" 
                      disabled={!input.trim() || chatMutation.isPending}
                      className="bg-rose-500/80 hover:bg-rose-500 text-white border border-rose-400/30"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Capabilities */}
          <div className="hidden xl:block">
            <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 p-5">
              <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Capabilities</h4>
              
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/40 border border-white/30">
                  <div className="flex items-center gap-2 mb-2 text-blue-600">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Document Analysis</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Read and summarize documents in your project.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/40 border border-white/30">
                  <div className="flex items-center gap-2 mb-2 text-green-600">
                    <ListChecks className="w-4 h-4" />
                    <span className="text-sm font-medium">Task Management</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Summarize tasks, check deadlines, prioritize work.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/40 border border-white/30">
                  <div className="flex items-center gap-2 mb-2 text-amber-600">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">Knowledge Base</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Search and answer from your knowledge files.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/40 border border-white/30">
                  <div className="flex items-center gap-2 mb-2 text-purple-600">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-sm font-medium">Project Context</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Knows your branches, team, and structure.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Quick Prompts</h4>
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-slate-600 hover:text-slate-800 text-xs h-auto py-2 px-2" 
                    onClick={() => handleQuickAction('draft_report')}
                  >
                    → Draft a weekly report
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-slate-600 hover:text-slate-800 text-xs h-auto py-2 px-2" 
                    onClick={() => handleQuickAction('summarize_tasks')}
                  >
                    → What should I work on?
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-slate-600 hover:text-slate-800 text-xs h-auto py-2 px-2" 
                    onClick={() => handleQuickAction('analyze_risks')}
                  >
                    → Identify project risks
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}