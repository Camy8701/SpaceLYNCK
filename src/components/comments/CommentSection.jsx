import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Loader2, Reply, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";

export default function CommentSection({ entityType, entityId, projectId }) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: () => base44.entities.Comment.filter({ 
      entity_type: entityType, 
      entity_id: entityId 
    }, 'created_date')
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const project = await base44.entities.Project.filter({ id: projectId }, '', 1);
      if (!project[0]?.team_members?.length) return [];
      const users = await base44.entities.User.list();
      return users.filter(u => project[0].team_members.includes(u.id));
    },
    enabled: !!projectId
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }) => {
      // Extract mentions
      const mentionMatches = content.match(/@(\w+)/g) || [];
      const mentionedUsers = projectMembers.filter(m => 
        mentionMatches.some(mention => 
          m.full_name?.toLowerCase().includes(mention.slice(1).toLowerCase())
        )
      );

      const comment = await base44.entities.Comment.create({
        entity_type: entityType,
        entity_id: entityId,
        project_id: projectId,
        content,
        author_id: currentUser.id,
        author_name: currentUser.full_name,
        mentions: mentionedUsers.map(u => u.id),
        parent_id: parentId || null
      });

      // Update comment count on task if applicable
      if (entityType === 'task') {
        const tasks = await base44.entities.Task.filter({ id: entityId }, '', 1);
        if (tasks[0]) {
          await base44.entities.Task.update(entityId, {
            comment_count: (tasks[0].comment_count || 0) + 1
          });
        }
      }

      // Create notifications for mentions
      for (const user of mentionedUsers) {
        if (user.id !== currentUser.id) {
          await base44.entities.Notification.create({
            user_id: user.id,
            type: 'comment_mention',
            title: 'You were mentioned',
            message: `${currentUser.full_name} mentioned you in a comment`,
            action_url: `/ProjectDetails?id=${projectId}`,
            project_id: projectId,
            related_entity_id: entityId,
            actor_name: currentUser.full_name
          });
        }
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', entityType, entityId]);
      queryClient.invalidateQueries(['tasks']);
      setNewComment('');
      setReplyingTo(null);
      toast.success('Comment added');
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      await base44.entities.Comment.delete(commentId);
      if (entityType === 'task') {
        const tasks = await base44.entities.Task.filter({ id: entityId }, '', 1);
        if (tasks[0] && tasks[0].comment_count > 0) {
          await base44.entities.Task.update(entityId, {
            comment_count: tasks[0].comment_count - 1
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', entityType, entityId]);
      queryClient.invalidateQueries(['tasks']);
      toast.success('Comment deleted');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment, parentId: replyingTo });
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
              onClick={() => deleteCommentMutation.mutate(comment.id)}
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
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="self-end"
          >
            {addCommentMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
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