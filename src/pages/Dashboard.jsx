import React, { useState, lazy, Suspense } from 'react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import CustomizableDashboard from '@/components/dashboard/CustomizableDashboard';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

// Lazy load dashboard views for code splitting
const ProjectsView = lazy(() => import('./ProjectsView'));
const KnowledgeBaseView = lazy(() => import('./KnowledgeBaseView'));
const JarvisView = lazy(() => import('./JarvisView'));
const CalendarView = lazy(() => import('./CalendarView'));
const SelfStudyView = lazy(() => import('./SelfStudyView'));
const ChatView = lazy(() => import('./ChatView'));
const DiaryView = lazy(() => import('./DiaryView'));
const CharacterCounterView = lazy(() => import('./CharacterCounterView'));
const MindMapView = lazy(() => import('./MindMapView'));
const AnalyticsView = lazy(() => import('./AnalyticsView'));
const TodoView = lazy(() => import('./TodoView'));
const Settings = lazy(() => import('./Settings'));
const Leaderboard = lazy(() => import('./Leaderboard'));
const MarketingView = lazy(() => import('./MarketingView'));
const ProspectingView = lazy(() => import('./ProspectingView'));
const AuditReportView = lazy(() => import('./marketing/AuditReportView'));
const MarketingToolsView = lazy(() => import('./marketing/MarketingToolsView'));

// Accounting views
const AccountingView = lazy(() => import('./accounting/AccountingView'));
const BusinessOperationsView = lazy(() => import('./accounting/BusinessOperationsView'));
const PersonalBudgetingView = lazy(() => import('./accounting/PersonalBudgetingView'));

// Loading spinner for view transitions
const ViewLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
  </div>
);

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
      case 'marketing':
        return <MarketingView sidebarCollapsed={sidebarCollapsed} onNavigate={(toolId) => setActiveItem(toolId)} />;
      case 'audit-report':
        return <AuditReportView onBack={() => setActiveItem('marketing')} sidebarCollapsed={sidebarCollapsed} />;
      case 'prospecting':
        return <ProspectingView sidebarCollapsed={sidebarCollapsed} onBackToMarketing={() => setActiveItem('marketing')} />;
      case 'marketing-tools':
        return <MarketingToolsView onBack={() => setActiveItem('marketing')} sidebarCollapsed={sidebarCollapsed} />;
      case 'accounting':
        return <AccountingView sidebarCollapsed={sidebarCollapsed} onNavigate={(moduleId) => setActiveItem(moduleId)} />;
      case 'business-operations':
        return <BusinessOperationsView onBack={() => setActiveItem('accounting')} sidebarCollapsed={sidebarCollapsed} />;
      case 'personal-budgeting':
        return <PersonalBudgetingView onBack={() => setActiveItem('accounting')} sidebarCollapsed={sidebarCollapsed} />;
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
      case 'todo':
        return <TodoView sidebarCollapsed={sidebarCollapsed} />;
      case 'diary':
        return <DiaryView sidebarCollapsed={sidebarCollapsed} />;
      case 'counter':
        return <CharacterCounterView sidebarCollapsed={sidebarCollapsed} />;
      case 'mindmaps':
        return <MindMapView sidebarCollapsed={sidebarCollapsed} />;
      case 'analytics':
        return <AnalyticsView sidebarCollapsed={sidebarCollapsed} />;
      case 'settings':
        return <Settings sidebarCollapsed={sidebarCollapsed} />;
      case 'leaderboard':
        return <Leaderboard sidebarCollapsed={sidebarCollapsed} />;
      default:
        return <CustomizableDashboard onCreateProject={() => setShowCreateProject(true)} onNavigate={(itemId) => setActiveItem(itemId)} />;
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
      <main className={`pt-16 lg:pt-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[84px]' : 'lg:pl-[276px]'}`}>
        <Suspense fallback={<ViewLoader />}>
          {renderContent()}
        </Suspense>
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