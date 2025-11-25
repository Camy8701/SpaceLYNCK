import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

export default function KnowledgeBaseCard({ kb, onClick }) {
  const { data: files = [] } = useQuery({
    queryKey: ['kbFiles', kb.id],
    queryFn: async () => {
      return await base44.entities.KnowledgeFile.filter({ knowledge_base_id: kb.id });
    }
  });

  const getBookEmoji = (color) => {
    const colorMap = {
      '#3b82f6': '📘',
      '#10b981': '📗',
      '#f59e0b': '📙',
      '#ef4444': '📕',
      '#8b5cf6': '📔',
      '#ec4899': '📓'
    };
    return colorMap[color] || '📘';
  };

  return (
    <div
      onClick={() => onClick(kb)}
      className="w-[240px] h-[280px] bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col"
    >
      <div className="text-5xl mb-4">{getBookEmoji(kb.icon_color)}</div>
      
      <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{kb.name}</h3>
      
      <div className="mt-auto">
        <p className="text-sm text-slate-500">{files.length} file{files.length !== 1 ? 's' : ''}</p>
        <p className="text-xs text-slate-400">
          Updated {formatDistanceToNow(new Date(kb.updated_date || kb.created_date), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}