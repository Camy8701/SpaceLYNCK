import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';

export default function JarvisView() {
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Get or create conversation
  const { data: conversation } = useQuery({
    queryKey: ['jarvisConversation'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const conversations = await base44.entities.JarvisConversation.filter(
        { created_by: user.email }, 
        '-created_date', 
        1
      );
      if (conversations.length > 0) {
        setConversationId(conversations[0].id);
        return conversations[0];
      }
      // Create new conversation
      const newConv = await base44.entities.JarvisConversation.create({ title: 'New Conversation' });
      setConversationId(newConv.id);
      return newConv;
    }
  });

  // Get messages
  const { data: messages = [] } = useQuery({
    queryKey: ['jarvisMessages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return await base44.entities.JarvisMessage.filter(
        { conversation_id: conversationId }, 
        'created_date'
      );
    },
    enabled: !!conversationId
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (userMessage) => {
      // Save user message
      await base44.entities.JarvisMessage.create({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage
      });

      // Get context
      const user = await base44.auth.me();
      const projects = await base44.entities.Project.filter({ created_by: user.email });
      const knowledgeBases = await base44.entities.KnowledgeBase.filter({ created_by: user.email });
      const timeEntries = await base44.entities.TimeEntry.filter({ created_by: user.email }, '-created_date', 10);

      // Get KB files content
      let kbContent = '';
      for (const kb of knowledgeBases) {
        const files = await base44.entities.KnowledgeFile.filter({ knowledge_base_id: kb.id });
        kbContent += `\n\nKnowledge Base: ${kb.name}\nFiles: ${files.map(f => f.filename).join(', ')}\nContent: ${files.map(f => f.content_text || '').join('\n')}`;
      }

      // Build context
      const context = `
User: ${user.full_name} (${user.email})
Projects: ${projects.map(p => p.name).join(', ') || 'None'}
Knowledge Bases: ${knowledgeBases.map(kb => kb.name).join(', ') || 'None'}
Recent Time Entries: ${timeEntries.length} entries
${kbContent}
      `;

      // Call AI
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Jarvis, a helpful AI assistant for a productivity app called Lynck Space. You help users with their projects, documents, and tasks.

Context about this user:
${context}

User's question: ${userMessage}

Provide a helpful, concise response. If the user asks about their documents or projects, use the context provided. If they ask something you don't know about their data, be honest about it.`,
        add_context_from_internet: userMessage.toLowerCase().includes('research') || userMessage.toLowerCase().includes('search') || userMessage.toLowerCase().includes('find out')
      });

      // Save assistant message
      await base44.entities.JarvisMessage.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: response
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jarvisMessages', conversationId]);
      setInput('');
    }
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sendMutation.isPending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate(input);
  };

  return (
    <div className="min-h-screen lg:ml-[280px] flex flex-col">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Jarvis AI Assistant</h1>
            <p className="text-white/70 text-sm">Your personal productivity companion</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-gradient-to-br from-sky-400/10 via-orange-300/10 to-rose-400/10 backdrop-blur-2xl rounded-2xl border border-white/20 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {/* Welcome message if no messages */}
              {messages.length === 0 && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0 border border-white/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl rounded-tl-none p-4 max-w-[80%] border border-white/20">
                    <p className="text-white">
                      Hi! I'm Jarvis, your AI assistant. I can help you with:
                    </p>
                    <ul className="mt-2 space-y-1 text-white/80 text-sm">
                      <li>• Answer questions about your documents</li>
                      <li>• Search your knowledge bases</li>
                      <li>• Research topics on the web</li>
                      <li>• Help with your projects</li>
                    </ul>
                    <p className="mt-3 text-white">What can I help you with today?</p>
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0 border border-white/20">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  <div 
                    className={`rounded-2xl p-4 max-w-[80%] ${
                      msg.role === 'user' 
                        ? 'bg-blue-500/80 backdrop-blur-sm text-white rounded-tr-none border border-blue-400/30' 
                        : 'bg-white/20 backdrop-blur-sm text-white rounded-tl-none border border-white/20'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-blue-500/30 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0 border border-blue-400/30">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {sendMutation.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0 border border-white/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl rounded-tl-none p-4 border border-white/20">
                    <div className="flex items-center gap-2 text-white/70">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-white/20">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Jarvis anything..."
                className="flex-1 bg-white/20 border-white/20 text-white placeholder:text-white/50 focus:ring-white/30"
                disabled={sendMutation.isPending}
              />
              <Button 
                type="submit" 
                disabled={!input.trim() || sendMutation.isPending}
                className="bg-rose-500/80 hover:bg-rose-500 text-white border border-rose-400/30"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}