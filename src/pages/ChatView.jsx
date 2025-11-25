import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, Plus, Send, Users } from "lucide-react";
import { format } from 'date-fns';
import CreateChatModal from '@/components/chat/CreateChatModal';

export default function ChatView({ sidebarCollapsed }) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [message, setMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: chatRooms = [] } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const rooms = await base44.entities.ChatRoom.filter({});
      // Filter rooms where user is a member
      return rooms.filter(room => 
        room.member_emails?.includes(user.email) || room.created_by === user.email
      );
    }
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedRoom?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ 
      project_id: selectedRoom?.id 
    }, 'created_date'),
    enabled: !!selectedRoom,
    refetchInterval: 3000 // Poll for new messages
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ChatMessage.create({
        sender_id: user.id,
        project_id: selectedRoom.id,
        message_text: message
      });
      
      // Update last message in room
      await base44.entities.ChatRoom.update(selectedRoom.id, {
        last_message: message.substring(0, 50),
        last_message_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chatMessages', selectedRoom?.id]);
      queryClient.invalidateQueries(['chatRooms']);
      setMessage('');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate();
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10 h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <MessageSquare className="w-6 h-6" /> Team Chat
          </h1>
          <Button onClick={() => setShowCreateModal(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100%-4rem)]">
          {/* Chat List */}
          <Card className="p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl overflow-hidden">
            <h2 className="text-white font-semibold mb-4">Chats</h2>
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-16rem)]">
              {chatRooms.length === 0 ? (
                <p className="text-white/50 text-sm">No chats yet</p>
              ) : (
                chatRooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedRoom?.id === room.id 
                        ? 'bg-white/30' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <p className="font-medium text-white truncate">{room.name}</p>
                    <p className="text-white/50 text-xs truncate">{room.last_message || 'No messages'}</p>
                    <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {room.member_emails?.length || 1} members
                    </p>
                  </button>
                ))
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateModal(true)}
              className="w-full mt-4 bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Chat
            </Button>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-3 p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex flex-col">
            {selectedRoom ? (
              <>
                {/* Chat Header */}
                <div className="pb-4 border-b border-white/20">
                  <h3 className="text-lg font-semibold text-white">{selectedRoom.name}</h3>
                  <p className="text-white/50 text-sm">
                    {selectedRoom.member_emails?.length || 1} members
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[calc(100vh-22rem)]">
                  {messages.length === 0 ? (
                    <p className="text-center text-white/50">No messages yet. Start the conversation!</p>
                  ) : (
                    messages.map(msg => {
                      const isOwn = msg.sender_id === user?.id || msg.created_by === user?.email;
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] p-3 rounded-2xl ${
                            isOwn 
                              ? 'bg-blue-600 text-white rounded-br-sm' 
                              : 'bg-white/20 text-white rounded-bl-sm'
                          }`}>
                            {!isOwn && (
                              <p className="text-xs text-white/60 mb-1">{msg.created_by}</p>
                            )}
                            <p>{msg.message_text}</p>
                            <p className="text-xs opacity-60 mt-1">
                              {format(new Date(msg.created_date), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="pt-4 border-t border-white/20">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <Button type="submit" disabled={!message.trim()} className="bg-blue-600 hover:bg-blue-700">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto text-white/20 mb-4" />
                  <p className="text-white/50">Select a chat or create a new one</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <CreateChatModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}