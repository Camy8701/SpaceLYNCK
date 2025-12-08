import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Reply, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";

// This component uses local state since comment/project/task tables don't exist in Supabase
export default function CommentSection({ entityType, entityId, projectId }) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock current user
  const currentUser = {
    id: 'local-user',
    full_name: 'Current User'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const newCommentObj = {
      id: `comment-${Date.now()}`,
      entity_type: entityType,
      entity_id: entityId,
      project_id: projectId,
      content: newComment,
      author_id: currentUser.id,
      author_name: currentUser.full_name,
      parent_id: replyingTo || null,
      created_date: new Date().toISOString()
    };
    
    setComments(prev => [...prev, newCommentObj]);
    setNewComment('');
    setReplyingTo(null);
    toast.success('Comment added');
  };

  const handleDelete = (commentId) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    toast.success('Comment deleted');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  const renderComment = (comment, isReply = false) => (
    <div key={comment.id} className={`flex gap-3 ${isReply ? 'ml-10 mt-3' : ''}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
          {getInitials(comment.author_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-slate-900">{comment.author_name}</span>
            <span className="text-xs text-slate-400">
              {format(new Date(comment.created_date), 'MMM d, h:mm a')}
            </span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {!isReply && (
            <button 
              onClick={() => setReplyingTo(comment.id)}
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"
            >
              <Reply className="w-3 h-3" /> Reply
            </button>
          )}
          {comment.author_id === currentUser?.id && (
            <button 
              onClick={() => handleDelete(comment.id)}
              className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
        {getReplies(comment.id).map(reply => renderComment(reply, true))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <MessageSquare className="w-4 h-4" />
        Comments ({comments.length})
      </div>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {replyingTo && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            <Reply className="w-3 h-3" />
            Replying to comment
            <button 
              type="button"
              onClick={() => setReplyingTo(null)}
              className="ml-auto text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... Use @name to mention someone"
            className="min-h-[60px] text-sm resize-none"
          />
          <Button 
            type="submit" 
            size="sm"
            disabled={!newComment.trim()}
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-slate-400">Loading comments...</div>
        ) : topLevelComments.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-sm">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          topLevelComments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
}
