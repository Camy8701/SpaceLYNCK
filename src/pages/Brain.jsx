import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Bot,
    Send,
    Loader2,
    LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import TaskSuggestionBlock from "@/components/ai/TaskSuggestionBlock";

export default function Brain() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('id') || 'global';
  
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'search'
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Search Mutation
  const searchMutation = useMutation({
    mutationFn: async (query) => {
      const res = await base44.functions.invoke('searchDocuments', {
        project_id: projectId,
        query: query
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    }
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    searchMutation.mutate(searchQuery);
  };

  // Load History from AiConversation (Shared with AiAssistant)
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['ai_chat', projectId],
    queryFn: async () => {
      const user = await base44.auth.me();
      const res = await base44.entities.AiConversation.filter({ project_id: projectId, user_id: user.id }, '', 1);
      return res[0] || { history: [] };
    }
  });

  const messages = conversation?.history || [];

  // Send Message Mutation (Same as AiAssistant)
  const chatMutation = useMutation({
    mutationFn: async (text) => {
      const res = await base44.functions.invoke('aiAssistant', {
        project_id: projectId,
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
           history: [...(previousdata.history || []), { role: 'user', content: text }]
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
            text = "Draft a status update report for this project/dashboard based on recent activity."; 
            break;
          case 'summarize_tasks': 
            text = "Summarize my pending tasks and suggest what to focus on today."; 
            break;
          case 'analyze_risks':
            text = "Analyze current risks and potential blockers based on the project data.";
            break;
          default: return;
      }
      chatMutation.mutate(text);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-zinc-900 text-zinc-100 overflow-hidden rounded-xl border border-zinc-800 shadow-2xl">
      {/* Header Area */}
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-sm">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-violet-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="font-semibold text-lg bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                    ProjectFlow Brain
                </h1>
                <p className="text-[10px] text-zinc-400">
                    Context: {projectId === 'global' ? 'Global Dashboard' : 'Project Active'}
                </p>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700">Beta v2.0</span>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation (Desktop) */}
          <div className="w-16 border-r border-zinc-800 bg-zinc-900 flex flex-col items-center py-6 gap-4">
             <Button 
                variant="ghost" 
                size="icon" 
                className={`rounded-xl w-10 h-10 ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                onClick={() => setActiveTab('chat')}
                title="Chat"
             >
                <MessageSquare className="w-5 h-5" />
             </Button>
             <Button 
                variant="ghost" 
                size="icon" 
                className={`rounded-xl w-10 h-10 ${activeTab === 'search' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                onClick={() => setActiveTab('search')}
                title="Deep Search"
             >
                <Search className="w-5 h-5" />
             </Button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col relative bg-zinc-950/50">
            
            {activeTab === 'search' ? (
                <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold mb-2">Deep Search</h2>
                        <p className="text-zinc-400">Search across documents, tasks, and conversations</p>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative mb-8">
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for keywords, deadlines, or topics..." 
                            className="h-14 pl-12 bg-zinc-900 border-zinc-700 rounded-xl text-lg"
                            autoFocus
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <Button 
                            type="submit" 
                            disabled={searchMutation.isPending}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500"
                        >
                            {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                        </Button>
                    </form>

                    {/* Search Results */}
                    <ScrollArea className="flex-1 -mr-4 pr-4">
                        {searchMutation.data && (
                            <div className="space-y-8 pb-10">
                                {/* Synthesis */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                    <div className="flex items-center gap-2 mb-4 text-indigo-400">
                                        <Sparkles className="w-5 h-5" />
                                        <h3 className="font-semibold">AI Synthesis</h3>
                                    </div>
                                    <p className="text-zinc-300 leading-relaxed">
                                        {searchMutation.data.synthesis}
                                    </p>
                                </div>

                                {/* Matches */}
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Relevant Sources</h3>
                                    <div className="grid gap-4">
                                        {searchMutation.data.matches?.map((match, idx) => (
                                            <motion.div 
                                                key={idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-indigo-500/50 transition-colors group"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {match.type === 'document' && <FileText className="w-4 h-4 text-blue-400" />}
                                                        {match.type === 'task' && <ListChecks className="w-4 h-4 text-emerald-400" />}
                                                        {match.type === 'conversation' && <MessageSquare className="w-4 h-4 text-purple-400" />}
                                                        <span className="font-medium text-zinc-200">{match.title}</span>
                                                    </div>
                                                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                                                        {Math.round(match.relevance_score)}% match
                                                    </span>
                                                </div>
                                                <p className="text-sm text-zinc-400 line-clamp-2 group-hover:line-clamp-none transition-all">
                                                    "...{match.excerpt}..."
                                                </p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            ) : (
              <>
              <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6 max-w-3xl mx-auto pb-10">
                      
                      {/* Empty State / Welcome */}
                      {messages.length === 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 p-8 rounded-2xl bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-zinc-900 border border-indigo-500/20 relative overflow-hidden group text-center"
                          >
                              <Sparkles className="w-12 h-12 text-pink-500 mx-auto mb-4" />
                              <h3 className="text-xl font-semibold text-white mb-2">Welcome to your AI Workspace</h3>
                              <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
                                  I can help you draft reports, analyze tasks, and manage your projects. 
                                  I have access to your tasks, documents, and project structure.
                              </p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                                  <Button variant="outline" className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-zinc-200 justify-start" onClick={() => handleQuickAction('draft_report')}>
                                      <FileText className="w-4 h-4 mr-2 text-indigo-400" /> Draft Report
                                  </Button>
                                  <Button variant="outline" className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-zinc-200 justify-start" onClick={() => handleQuickAction('summarize_tasks')}>
                                      <ListChecks className="w-4 h-4 mr-2 text-emerald-400" /> Summarize Tasks
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
                            className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                              {msg.role !== 'user' && (
                                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-1">
                                      <Sparkles className="w-4 h-4 text-pink-500" />
                                  </div>
                              )}
                              <div className={`p-4 rounded-2xl max-w-[85%] ${
                                  msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-zinc-800/50 border border-zinc-700 text-zinc-200 prose prose-invert prose-sm max-w-none'
                              }`}>
                                  {msg.role === 'user' ? (
                                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                  ) : (
                                      <ReactMarkdown 
                                        components={{
                                            ul: ({children}) => <ul className="list-disc ml-4 my-2">{children}</ul>,
                                            ol: ({children}) => <ol className="list-decimal ml-4 my-2">{children}</ol>,
                                            li: ({children}) => <li className="my-1">{children}</li>,
                                            a: ({href, children}) => <a href={href} target="_blank" className="text-indigo-400 hover:underline">{children}</a>
                                        }}
                                      >
                                          {msg.content}
                                      </ReactMarkdown>
                                      {(() => {
                                        // Try to find JSON blocks for suggested tasks
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
                                  )}
                              </div>
                              {msg.role === 'user' && (
                                  <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-1">
                                      <div className="font-bold text-xs">You</div>
                                  </div>
                              )}
                          </motion.div>
                      ))}
                      
                      {chatMutation.isPending && (
                          <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
                              </div>
                              <div className="flex items-center gap-1 h-8 px-2">
                                  <span className="text-xs text-zinc-500 animate-pulse">Thinking...</span>
                              </div>
                          </div>
                      )}
                      <div ref={scrollRef} />
                  </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 max-w-3xl mx-auto w-full bg-gradient-to-t from-zinc-900 to-transparent pt-10">
                  <form onSubmit={handleSubmit} className="relative">
                      <div className="relative rounded-xl bg-zinc-800 border border-zinc-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-lg">
                          <Input 
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder="Ask anything about your project..." 
                              className="border-none bg-transparent h-14 pl-4 pr-14 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0 text-base"
                              disabled={chatMutation.isPending}
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <Button 
                                type="submit" 
                                size="icon"
                                disabled={!input.trim() || chatMutation.isPending}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 w-10 rounded-lg"
                              >
                                  <Send className="w-4 h-4" />
                              </Button>
                          </div>
                      </div>
                      <div className="flex justify-center mt-2">
                          <p className="text-[10px] text-zinc-600">
                              AI can make mistakes. Check important info.
                          </p>
                      </div>
                  </form>
              </div>
              </>
            )}
          </div>

          {/* Right Sidebar (Features) */}
          <div className="w-72 border-l border-zinc-800 bg-zinc-900 p-6 hidden xl:block">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-6">Capabilities</h4>
              
              <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                      <div className="flex items-center gap-2 mb-2 text-indigo-400">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm font-medium">Document Analysis</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                          I can read and summarize documents uploaded to your project.
                      </p>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                      <div className="flex items-center gap-2 mb-2 text-emerald-400">
                          <ListChecks className="w-4 h-4" />
                          <span className="text-sm font-medium">Task Management</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                          Ask me to summarize tasks, check deadlines, or prioritize work.
                      </p>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                      <div className="flex items-center gap-2 mb-2 text-pink-400">
                          <LayoutGrid className="w-4 h-4" />
                          <span className="text-sm font-medium">Project Context</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                          I know about your project branches, team, and structure.
                      </p>
                  </div>
              </div>

              <div className="mt-8">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Quick Prompts</h4>
                  <div className="space-y-2">
                      <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-zinc-200 text-xs h-auto py-2 px-2 whitespace-normal text-left" onClick={() => handleQuickAction('draft_report')}>
                          → Draft a weekly report
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-zinc-200 text-xs h-auto py-2 px-2 whitespace-normal text-left" onClick={() => handleQuickAction('summarize_tasks')}>
                          → What should I work on?
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-zinc-200 text-xs h-auto py-2 px-2 whitespace-normal text-left" onClick={() => handleQuickAction('analyze_risks')}>
                          → Identify project risks
                      </Button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}