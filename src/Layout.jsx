import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, Settings, LogOut, User, Briefcase, BarChart3, Users, CheckSquare, Bell, Sparkles, Calendar, ChevronDown, Plus, Sun, Moon } from 'lucide-react';
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
  const [theme, setTheme] = React.useState('dark'); // 'light' or 'dark'

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(newTheme);
  };

  // Initialize theme
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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
    { name: 'Planner', icon: Calendar, path: '/MyTasks' },
    { name: 'Brain', icon: Sparkles, path: '/Brain' },
    { name: 'Teams', icon: Users, path: '/Team' },
    { name: 'Dashboards', icon: BarChart3, path: '/Projects' },
  ];

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-300 ${isDark ? 'bg-[#0f172a] text-slate-200 selection:bg-indigo-500/30' : 'bg-slate-50 text-slate-900'}`}>
      <OfflineManager />
      <style>{`
        :root { color-scheme: ${theme}; }
        @media (max-width: 768px) {
          input, select, textarea { font-size: 16px !important; }
          button { min-height: 44px; min-width: 44px; }
        }
        /* Scrollbar styling */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: ${isDark ? '#1e293b' : '#f1f5f9'}; }
        ::-webkit-scrollbar-thumb { background: ${isDark ? '#475569' : '#cbd5e1'}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${isDark ? '#64748b' : '#94a3b8'}; }
      `}</style>
      
      {/* Sidebar (Desktop) */}
      <aside className={`w-60 border-r hidden md:flex flex-col fixed h-full z-10 transition-colors duration-300 ${
          isDark 
            ? 'bg-[#1e293b]/95 border-slate-700/50 backdrop-blur-xl' 
            : 'bg-white border-slate-200'
      }`}>
        {/* Workspace Dropdown */}
        <div className={`p-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <button className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'}`}>
                    <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/30">
                      {user?.first_name?.[0] || "W"}
                    </div>
                    <span className={`text-sm font-medium truncate flex-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {userSettings?.workspace_name || `${user?.first_name || 'User'}'s Workspace`}
                    </span>
                    <ChevronDown className={`w-3 h-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={`w-56 ${isDark ? 'bg-[#1e293b] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`} align="start">
                 <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">Workspaces</DropdownMenuLabel>
                 <DropdownMenuItem className={`cursor-pointer ${isDark ? 'focus:bg-slate-700 focus:text-slate-100' : 'focus:bg-slate-100'}`}>
                    <div className="flex items-center gap-2">
                       <div className="w-4 h-4 bg-indigo-600 rounded flex items-center justify-center text-[8px] text-white">W</div>
                       Main Workspace
                    </div>
                 </DropdownMenuItem>
                 <DropdownMenuSeparator className={isDark ? 'bg-slate-700' : 'bg-slate-100'} />
                 <DropdownMenuItem className={`cursor-pointer ${isDark ? 'focus:bg-slate-700 focus:text-slate-100' : 'focus:bg-slate-100'}`}>
                    <Plus className="w-3 h-3 mr-2" /> Create Workspace
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => navigate('/Settings')} className={`cursor-pointer ${isDark ? 'focus:bg-slate-700 focus:text-slate-100' : 'focus:bg-slate-100'}`}>
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
                    ? (isDark ? 'bg-indigo-600/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') 
                    : (isDark ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : (isDark ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-slate-600')}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t space-y-1 ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
             {/* Favorites Section */}
             <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Favorites</div>
             <Link to="/Projects" className={`flex items-center gap-3 px-3 py-1.5 text-sm rounded-md ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 hover:bg-slate-50'}`}>
                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                <span>Q4 Marketing</span>
             </Link>
        </div>
        
        <div className={`p-4 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
           <Button variant="ghost" className={`w-full justify-start px-2 ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => setShowGlobalCreate(true)}>
               <Plus className="w-4 h-4 mr-2" /> New Task
           </Button>
        </div>
      </aside>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
          <div className="flex justify-around items-center h-16">
              <Link to="/Projects" className={`flex flex-col items-center gap-1 p-2 flex-1 ${location.pathname === '/Projects' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <Briefcase className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Projects</span>
              </Link>
              <Link to="/MyTasks" className={`flex flex-col items-center gap-1 p-2 flex-1 ${location.pathname === '/MyTasks' ? 'text-indigo-600' : 'text-slate-400'}`}>
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

              <Link to="/Notifications" className={`flex flex-col items-center gap-1 p-2 flex-1 ${location.pathname === '/Notifications' ? 'text-indigo-600' : 'text-slate-400'}`}>
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
        <main className={`flex-1 md:ml-60 flex flex-col min-h-screen pb-20 md:pb-0 transition-colors duration-300 ${
            isDark 
              ? 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]' 
              : 'bg-slate-50'
        }`}>
        {/* Header (Responsive) */}
        <header className={`h-14 border-b px-4 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300 ${
            isDark 
              ? 'bg-[#0f172a]/80 border-slate-700/50 backdrop-blur-md' 
              : 'bg-white/80 border-slate-200 backdrop-blur-md'
        }`}>
          
          {/* Left Side: Breadcrumb / Mobile Menu */}
          <div className="flex items-center gap-4 flex-1">
              <div className="md:hidden flex items-center gap-2">
                   <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">P</div>
              </div>
              
              {/* Desktop Breadcrumb/Title */}
              <div className={`hidden md:flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                 <span>Workspaces</span>
                 <span className="text-slate-600">/</span>
                 <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
                 </span>
              </div>
          </div>

          {/* Center: Search Bar */}
          <div className="hidden md:flex flex-1 justify-center">
             <GlobalSearch isDark={isDark} />
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
            <div className="md:hidden" id="mobile-header-status"></div>

            {/* Quick Action */}
            <Button size="sm" className={`hidden md:flex h-8 gap-2 transition-colors ${
                isDark 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`} onClick={() => setShowGlobalCreate(true)}>
               <Plus className="w-4 h-4" /> <span>Task</span>
            </Button>

            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggleTheme}>
               {isDark ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </Button>

            <NotificationCenter isDark={isDark} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className={`h-8 w-8 border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <AvatarImage src="" alt={user?.first_name} />
                    <AvatarFallback className={`${isDark ? 'bg-indigo-900/50 text-indigo-200' : 'bg-indigo-50 text-indigo-600'} text-xs`}>
                      {user?.first_name?.[0] || <User className="w-3 h-3" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={`w-56 ${isDark ? 'bg-[#1e293b] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`} align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className={`text-sm font-medium leading-none ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs leading-none text-slate-500">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className={isDark ? 'bg-slate-700' : 'bg-slate-100'} />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer">
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
      
      <AiAssistant />
      
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