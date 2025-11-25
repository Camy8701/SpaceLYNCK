import React, { useState } from 'react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import CustomizableDashboard from '@/components/dashboard/CustomizableDashboard';
import ProjectsView from './ProjectsView';
import KnowledgeBaseView from './KnowledgeBaseView';
import JarvisView from './JarvisView';
import CalendarView from './CalendarView';
import SelfStudyView from './SelfStudyView';
import ChatView from './ChatView';
import DiaryView from './DiaryView';
import CharacterCounterView from './CharacterCounterView';
import MindMapView from './MindMapView';
import AnalyticsView from './AnalyticsView';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function Dashboard() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
        return <ProjectsView sidebarCollapsed={sidebarCollapsed} />;
      case 'knowledge':
        return <KnowledgeBaseView sidebarCollapsed={sidebarCollapsed} />;
      case 'jarvis':
        return <JarvisView sidebarCollapsed={sidebarCollapsed} />;
      case 'calendar':
        return <CalendarView sidebarCollapsed={sidebarCollapsed} />;
      case 'study':
        return <SelfStudyView sidebarCollapsed={sidebarCollapsed} />;
      case 'chat':
        return <ChatView sidebarCollapsed={sidebarCollapsed} />;
      case 'diary':
        return <DiaryView sidebarCollapsed={sidebarCollapsed} />;
      case 'counter':
        return <CharacterCounterView sidebarCollapsed={sidebarCollapsed} />;
      case 'mindmaps':
        return <MindMapView sidebarCollapsed={sidebarCollapsed} />;
      case 'analytics':
        return <AnalyticsView sidebarCollapsed={sidebarCollapsed} />;
      default:
        return <CustomizableDashboard onCreateProject={() => setShowCreateProject(true)} />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/40 backdrop-blur-xl z-30 flex items-center px-4 border-b border-white/10">
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
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <main className={`pt-16 lg:pt-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-0' : ''}`}>
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