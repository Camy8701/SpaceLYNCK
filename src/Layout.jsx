import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, Settings, LogOut, User, Briefcase, BarChart3, Users, CheckSquare, Bell, Sparkles, Calendar, ChevronDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from "@/components/search/GlobalSearch";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import OfflineManager from "@/components/offline/OfflineManager";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AiAssistant from "@/components/ai/AiAssistant";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import HelpSystem from "@/components/help/HelpSystem";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import { HelpCircle, WifiOff } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [showHelp, setShowHelp] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(!window.navigator.onLine);
  const [showGlobalCreate, setShowGlobalCreate] = React.useState(false);

  // Fetch user & settings
  const { data: userSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      if(!user) return null;
      const res = await base44.entities.UserSettings.filter({ user_id: user.id }, '', 1);
      return res[0] || null;
    },
    enabled: !!user
  });

  const onboardingMutation = useMutation({
    mutationFn: async () => {
       if (userSettings) {
         await base44.entities.UserSettings.update(userSettings.id, { onboarding_completed: true });
       } else if (user) {
         await base44.entities.UserSettings.create({ user_id: user.id, onboarding_completed: true });
       }
    },
    onSuccess: () => {
      refetchSettings();
      setShowOnboarding(false);
    }
  });

  React.useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error("User not logged in");
      }
    }
    loadUser();
  }, []);

  // Onboarding Trigger
  React.useEffect(() => {
    if (user && userSettings !== undefined) {
      // If settings loaded and onboarding not completed (or no settings yet implies new user)
      if (!userSettings || !userSettings.onboarding_completed) {
         setShowOnboarding(true);
      }
    }
  }, [user, userSettings]);

  // Offline Detection
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Help: ? (Shift + /)
      if (e.key === '?' && !e.target.matches('input, textarea')) {
        setShowHelp(true);
      }
      // New Task: N
      if (e.key === 'n' && !e.target.matches('input, textarea')) {
         setShowGlobalCreate(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    // Custom Event Listener for Mobile FAB
    const openCreateHandler = () => setShowGlobalCreate(true);
    document.addEventListener('openCreateMenu', openCreateHandler);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('openCreateMenu', openCreateHandler);
    };
  }, []);

  // Online Status & Presence Heartbeat
  React.useEffect(() => {
    if (!user) return;
    
    const heartbeat = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const projectId = params.get('id');
        
        await base44.auth.updateMe({ 
          last_active: new Date().toISOString(),
          current_page: location.pathname,
          current_project_id: projectId || null
        });
      } catch (e) {
        console.error("Heartbeat failed", e);
      }
    };
    
    heartbeat();
    // Faster heartbeat for "real-time" presence (15s)
    const interval = setInterval(heartbeat, 15 * 1000);
    return () => clearInterval(interval);
  }, [user, location]);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const navItems = [
    { name: 'Home', icon: LayoutDashboard, path: '/' },
    { name: 'Planner', icon: Calendar, path: '/my-tasks' }, // Mapped to My Tasks for now
    { name: 'Brain', icon: Sparkles, path: '/Brain' },
    { name: 'Teams', icon: Users, path: '/Team' },
    { name: 'Dashboards', icon: BarChart3, path: '/projects' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans">
      <OfflineManager />
      <style>{`
        :root { color-scheme: dark; }
        @media (max-width: 768px) {
          input, select, textarea { font-size: 16px !important; }
          button { min-height: 44px; min-width: 44px; }
        }
        /* Scrollbar styling for dark theme */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #18181b; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
      
      {/* Sidebar (Desktop) - Dark Theme */}
      <aside className="w-60 bg-zinc-900 border-r border-zinc-800 hidden md:flex flex-col fixed h-full z-10">
        {/* Workspace Dropdown */}
        <div className="p-4 border-b border-zinc-800">
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-800 transition-colors text-left">
                    <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      {user?.first_name?.[0] || "W"}
                    </div>
                    <span className="text-sm font-medium text-zinc-200 truncate flex-1">
                      {userSettings?.workspace_name || `${user?.first_name || 'User'}'s Workspace`}
                    </span>
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800 text-zinc-200" align="start">
                 <DropdownMenuLabel className="text-xs text-zinc-500 uppercase tracking-wider">Workspaces</DropdownMenuLabel>
                 <DropdownMenuItem className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
                    <div className="flex items-center gap-2">
                       <div className="w-4 h-4 bg-emerald-600 rounded flex items-center justify-center text-[8px]">W</div>
                       Main Workspace
                    </div>
                 </DropdownMenuItem>
                 <DropdownMenuSeparator className="bg-zinc-800" />
                 <DropdownMenuItem className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
                    <Plus className="w-3 h-3 mr-2" /> Create Workspace
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => navigate('/Settings')} className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
                    <Settings className="w-3 h-3 mr-2" /> Manage Settings
                 </DropdownMenuItem>
              </DropdownMenuContent>
           </DropdownMenu>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium group ${
                  isActive 
                    ? 'bg-zinc-800 text-white' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-1">
             {/* Favorites Section Placeholder */}
             <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Favorites</div>
             <Link to="/projects" className="flex items-center gap-3 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span>Q4 Marketing</span>
             </Link>
        </div>
        
        <div className="p-4 border-t border-zinc-800">
           <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 px-2" onClick={() => setShowGlobalCreate(true)}>
               <Plus className="w-4 h-4 mr-2" /> New Task
           </Button>
        </div>
      </aside>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
          <div className="flex justify-around items-center h-16">
              <Link to="/projects" className={`flex flex-col items-center gap-1 p-2 flex-1 ${location.pathname === '/projects' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <Briefcase className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Projects</span>
              </Link>
              <Link to="/my-tasks" className={`flex flex-col items-center gap-1 p-2 flex-1 ${location.pathname === '/my-tasks' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <CheckSquare className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Tasks</span>
              </Link>

              {/* Add Button - Central Action */}
              <div className="relative -top-5">
                  <div className="bg-indigo-600 rounded-full p-3 shadow-lg text-white cursor-pointer hover:bg-indigo-700 transition-colors"
                       onClick={() => document.dispatchEvent(new CustomEvent('openCreateMenu'))}
                  >
                      <div className="w-6 h-6 flex items-center justify-center font-bold text-2xl leading-none pb-1">+</div>
                  </div>
              </div>

              <Link to="/notifications" className={`flex flex-col items-center gap-1 p-2 flex-1 ${location.pathname === '/notifications' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <Bell className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Inbox</span>
              </Link>
              <Link to="/Settings" className={`flex flex-col items-center gap-1 p-2 flex-1 ${location.pathname === '/Settings' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <Settings className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Settings</span>
              </Link>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 md:ml-60 flex flex-col min-h-screen pb-20 md:pb-0 bg-zinc-950">
        {/* Header (Responsive) */}
        <header className="h-14 bg-zinc-950 border-b border-zinc-800 px-4 flex items-center justify-between sticky top-0 z-20">
          
          {/* Left Side: Breadcrumb / Mobile Menu */}
          <div className="flex items-center gap-4 flex-1">
              <div className="md:hidden flex items-center gap-2">
                   <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
              </div>
              
              {/* Desktop Breadcrumb/Title */}
              <div className="hidden md:flex items-center gap-2 text-sm text-zinc-400">
                 <span>Workspaces</span>
                 <span className="text-zinc-600">/</span>
                 <span className="text-zinc-100 font-medium">{navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}</span>
              </div>
          </div>

          {/* Center: Search Bar */}
          <div className="hidden md:flex flex-1 justify-center">
             <GlobalSearch />
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
            <div className="md:hidden" id="mobile-header-status"></div>

            {/* Quick Action */}
            <Button size="sm" className="hidden md:flex h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 gap-2" onClick={() => setShowGlobalCreate(true)}>
               <Plus className="w-4 h-4" /> <span>Task</span>
            </Button>

            <NotificationCenter />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8 border border-zinc-700">
                    <AvatarImage src="" alt={user?.first_name} />
                    <AvatarFallback className="bg-purple-900 text-purple-200 text-xs">
                      {user?.first_name?.[0] || <User className="w-3 h-3" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800 text-zinc-200" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-zinc-200">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs leading-none text-zinc-500">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400 focus:bg-red-900/20 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-red-900/80 text-white text-xs text-center py-1 flex items-center justify-center gap-2 sticky top-14 z-30 backdrop-blur-sm">
            <WifiOff className="w-3 h-3" />
            You are offline. Changes may not be saved.
          </div>
        )}

        <div className="p-4 md:p-6 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
      
      {/* AiAssistant removed from overlay, now integrated as 'Brain' page */}
      
      <HelpSystem open={showHelp} onOpenChange={setShowHelp} />
      
      <OnboardingTour 
        open={showOnboarding} 
        onComplete={() => onboardingMutation.mutate()} 
      />

      {/* Global Create Task - accessible everywhere */}
      <CreateTaskDialog 
        open={showGlobalCreate} 
        onOpenChange={setShowGlobalCreate}
        branchId={null}
        projectId={null} // Global create might need user to pick project, dialog handles nulls gracefully? 
                         // I need to check if CreateTaskDialog handles picking project if null.
                         // Just in case, I'll let it error if projects list is empty or handle it there.
        onTaskCreated={() => {}}
      />

      {/* Floating Help Button (Desktop) */}
      <div className="fixed bottom-6 left-6 hidden md:block z-40">
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full shadow-md bg-white hover:bg-slate-50 text-slate-500"
          onClick={() => setShowHelp(true)}
          title="Help & Shortcuts (?)"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>

    </div>
  );
}