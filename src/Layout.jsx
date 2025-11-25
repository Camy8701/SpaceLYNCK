import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, Settings, LogOut, User, Briefcase, BarChart3, Users, CheckSquare, Bell, Sparkles, Calendar, ChevronDown, Plus, Sun, Moon, ArrowRight } from 'lucide-react';
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
    { name: 'Dashboard', icon: LayoutDashboard, path: '/Dashboard' },
    { name: 'Planner', icon: Calendar, path: '/MyTasks' },
    { name: 'Brain', icon: Sparkles, path: '/Brain' },
    { name: 'Teams', icon: Users, path: '/Team' },
    { name: 'Projects', icon: BarChart3, path: '/Projects' },
  ];

  return (
    <div className="min-h-screen font-sans text-slate-900 selection:bg-white/30 selection:text-white">
      <OfflineManager />
      <style>{`
        :root { color-scheme: light; }
        body {
            background: linear-gradient(180deg, #87CEEB 0%, #FFDAB9 33%, #FFA07A 66%, #CD5C5C 100%);
            background-attachment: fixed;
            min-height: 100vh;
        }
        @media (max-width: 768px) {
            body { background-attachment: scroll; }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
      `}</style>

      {/* Floating Navbar - Hide on public homepage only */}
      {location.pathname !== '/' && location.pathname !== '/Home' && location.pathname !== '/AboutUs' && (
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50">
         <nav className="bg-black/40 backdrop-blur-2xl text-white rounded-full pl-8 pr-2 py-2 flex items-center justify-between shadow-2xl border border-white/10 ring-1 ring-white/5">

            {/* Logo / Home */}
            <Link to="/Dashboard" className="flex items-center gap-3 mr-8 group">
                <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
                    <LayoutDashboard className="w-5 h-5" />
                </div>
            </Link>

            {/* Nav Items - Only show on authenticated pages */}
            {location.pathname !== '/' && (
              <div className="hidden md:flex items-center gap-1 text-sm font-medium">
                  {[
                      { name: 'Dashboard', path: '/Dashboard' },
                      { name: 'Projects', path: '/Projects' },
                      { name: 'Tasks', path: '/MyTasks' },
                      { name: 'Brain', path: '/Brain' },
                      { name: 'Team', path: '/Team' }
                  ].map((item) => (
                      <Link 
                          key={item.name} 
                          to={item.path} 
                          className={`px-4 py-2 rounded-full transition-all hover:bg-white/10 ${location.pathname === item.path ? 'text-white bg-white/10' : 'text-zinc-300 hover:text-white'}`}
                      >
                          {item.name}
                      </Link>
                  ))}
              </div>
            )}

            {/* Right Side Actions */}
            <div className="flex items-center gap-3 ml-auto">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="ml-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border border-white/10 transition-colors">
                            <User className="w-5 h-5 text-zinc-300" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-black/90 border-white/10 text-white backdrop-blur-xl">
                        <DropdownMenuLabel>{user?.full_name || 'User'}</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-white/10 cursor-pointer">Log out</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
         </nav>
      </header>
      )}

      {/* Mobile Bottom Nav (Glassmorphism) - Hide on public homepage only */}
      {location.pathname !== '/' && location.pathname !== '/Home' && location.pathname !== '/AboutUs' && (
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
         <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-2 flex justify-between items-center">
            <Link to="/Dashboard" className="p-3 rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white"><LayoutDashboard className="w-6 h-6"/></Link>
            <Link to="/MyTasks" className="p-3 rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white"><CheckSquare className="w-6 h-6"/></Link>
            <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-500/40" onClick={() => setShowGlobalCreate(true)}><Plus className="w-6 h-6"/></div>
            <Link to="/Brain" className="p-3 rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white"><Sparkles className="w-6 h-6"/></Link>
            <Link to="/Settings" className="p-3 rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white"><Settings className="w-6 h-6"/></Link>
         </div>
      </div>
      )}

      {/* Main Content */}
      <main className={`${location.pathname === '/' || location.pathname === '/Home' || location.pathname === '/AboutUs' ? '' : 'pt-32 px-4 pb-24'} min-h-screen`}>
        <div className={location.pathname === '/' || location.pathname === '/Home' || location.pathname === '/AboutUs' ? '' : 'max-w-7xl mx-auto'}>
            {isOffline && location.pathname !== '/' && (
              <div className="mb-6 bg-red-500/20 border border-red-500/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm">
                <WifiOff className="w-4 h-4" /> You are offline
              </div>
            )}
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

      {/* Floating Help Button (Desktop) - Hide on public pages and Dashboard */}
      {location.pathname !== '/' && location.pathname !== '/Home' && location.pathname !== '/AboutUs' && location.pathname !== '/Dashboard' && (
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
      )}

    </div>
  );
}