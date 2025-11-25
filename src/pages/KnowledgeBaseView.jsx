import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import KnowledgeBaseCard from '@/components/knowledge/KnowledgeBaseCard';
import KnowledgeBaseDetail from '@/components/knowledge/KnowledgeBaseDetail';
import CreateKnowledgeBaseModal from '@/components/knowledge/CreateKnowledgeBaseModal';

export default function KnowledgeBaseView({ sidebarCollapsed }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKB, setSelectedKB] = useState(null);

  const { data: knowledgeBases = [], isLoading } = useQuery({
    queryKey: ['knowledgeBases'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.KnowledgeBase.filter({ created_by: user.email }, '-created_date');
    }
  });

  // Show detail view if KB selected
  if (selectedKB) {
    return (
      <KnowledgeBaseDetail 
        kb={selectedKB} 
        onBack={() => setSelectedKB(null)} 
      />
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>Knowledge Base</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>

        {/* Knowledge Base Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-white/70">Loading...</div>
        ) : knowledgeBases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70 mb-4">No knowledge bases yet. Create your first one!</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Knowledge Base
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {knowledgeBases.map((kb) => (
              <KnowledgeBaseCard
                key={kb.id}
                kb={kb}
                onClick={setSelectedKB}
              />
            ))}
          </div>
        )}
      </div>

      <CreateKnowledgeBaseModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}