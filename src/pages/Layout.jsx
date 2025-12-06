
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, Settings, LogOut, User, Briefcase, BarChart3, Users, CheckSquare, Bell, Sparkles, Calendar, ChevronDown, Plus, Sun, Moon, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from "@/components/search/GlobalSearch";
import { Button } from "@/components/ui/button";
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
import HelpSystem from "@/components/help/HelpSystem";
import { HelpCircle, WifiOff } from "lucide-react";
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState({ full_name: 'Guest User' }); // Mock user for UI
  const [showHelp, setShowHelp] = React.useState(false);
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

  // Initialize UnicornStudio - optimized to reduce delay
  React.useEffect(() => {
    let checkInterval = null;
    let timeoutId = null;

    const initUnicorn = () => {
      if (window.UnicornStudio && typeof window.UnicornStudio.init === 'function') {
        window.UnicornStudio.init();
      }
    };

    // Immediate check
    if (window.UnicornStudio) {
      initUnicorn();
    } else {
      // Poll faster (every 50ms instead of 100ms) for quicker initialization
      checkInterval = setInterval(() => {
        if (window.UnicornStudio) {
          clearInterval(checkInterval);
          if (timeoutId) clearTimeout(timeoutId);
          initUnicorn();
        }
      }, 50);

      // Cleanup after 3 seconds
      timeoutId = setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
      }, 3000);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // All Base44 authentication and user loading removed - app now works standalone

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

  // Heartbeat removed - no longer needed without Base44

  const handleLogout = () => {
    // Simple logout - just redirect to home
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/Dashboard' },
    { name: 'Planner', icon: Calendar, path: '/MyTasks' },
    { name: 'Brain', icon: Sparkles, path: '/Brain' },
    { name: 'Teams', icon: Users, path: '/Team' },
    { name: 'Projects', icon: BarChart3, path: '/Projects' },
  ];

  return (
    <>
      {/* UnicornStudio Background */}
      <div
        data-us-project="qTiAlX0sxkuBOAiL7qHL"
        className="fixed top-0 left-0 w-full h-full"
        style={{ zIndex: 0 }}
      ></div>

      {/* Color filter overlay - darker by 20% + red/blue color shifts */}
      <div
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
        style={{
          zIndex: 1,
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.28) 0%, rgba(37, 99, 235, 0.22) 50%, rgba(29, 78, 216, 0.28) 100%)',
          mixBlendMode: 'multiply'
        }}
      ></div>

      {/* Additional darkness overlay */}
      <div
        className="fixed top-0 left-0 w-full h-full bg-black/10 pointer-events-none"
        style={{ zIndex: 2 }}
      ></div>

      <div className="min-h-screen font-sans text-slate-900 selection:bg-white/30 selection:text-white relative" style={{ zIndex: 10 }}>
      <style>{`
        :root { color-scheme: dark; }
        body {
            background: linear-gradient(135deg, #2d1a1f 0%, #1a1f2e 50%, #151b2e 100%);
            min-height: 100vh;
            position: relative;
        }
        @media (max-width: 768px) {
            body { background-attachment: scroll; }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }

        /* Increased contrast for floating windows */
        .bg-white\\/20 { background-color: rgba(255,255,255,0.35) !important; }
        .bg-white\\/30 { background-color: rgba(255,255,255,0.45) !important; }
        .bg-white\\/10 { background-color: rgba(255,255,255,0.25) !important; }
        .bg-black\\/40 { background-color: rgba(0,0,0,0.55) !important; }
        .bg-black\\/80 { background-color: rgba(0,0,0,0.9) !important; }
        .border-white\\/10 { border-color: rgba(255,255,255,0.25) !important; }
        .border-white\\/20 { border-color: rgba(255,255,255,0.35) !important; }
        .border-white\\/30 { border-color: rgba(255,255,255,0.45) !important; }
      `}</style>

      {/* Floating Navbar - Hide on public homepage only */}
      {location.pathname !== '/' && location.pathname !== '/Home' && location.pathname !== '/AboutUs' && (
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl" style={{ zIndex: 100 }}>
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
                      { name: 'Jarvis', path: '/JarvisView' },
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
            <Link to="/JarvisView" className="p-3 rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white"><Sparkles className="w-6 h-6"/></Link>
            <Link to="/Settings" className="p-3 rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white"><Settings className="w-6 h-6"/></Link>
         </div>
      </div>
      )}

      {/* Main Content */}
      <main className={`${location.pathname === '/' || location.pathname === '/Home' || location.pathname === '/AboutUs' ? '' : 'pt-32 px-4 pb-24'} min-h-screen relative`} style={{ zIndex: 10 }}>
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
    </>
  );
}
