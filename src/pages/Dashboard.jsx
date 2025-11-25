import React, { useState } from 'react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardMain from '@/components/dashboard/DashboardMain';
import ProjectsView from './ProjectsView';
import KnowledgeBaseView from './KnowledgeBaseView';
import JarvisView from './JarvisView';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function Dashboard() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);

  const handleItemClick = (itemId) => {
    if (itemId === 'new-project') {
      setShowCreateProject(true);
    } else {
      setActiveItem(itemId);
    }
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeItem) {
      case 'my-projects':
        return <ProjectsView />;
      case 'knowledge':
        return <KnowledgeBaseView />;
      case 'jarvis':
        return <JarvisView />;
      default:
        return <DashboardMain />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#1a1f36] z-30 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="text-white hover:bg-white/10"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-black tracking-tight text-white ml-4">
          LYNCK <span className="text-white/80">SPACE</span>
        </h1>
      </header>

      {/* Sidebar */}
      <DashboardSidebar 
        activeItem={activeItem}
        onItemClick={handleItemClick}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="pt-16 lg:pt-0">
        {renderContent()}
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSuccess={() => setActiveItem('my-projects')}
      />
    </div>
  );
}