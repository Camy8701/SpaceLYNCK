import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, Settings, LogOut, User, Briefcase, BarChart3, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
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
import NotificationCenter from "@/components/notifications/NotificationCenter";

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);

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

  // Online Status Heartbeat (Prompt 8)
  React.useEffect(() => {
    if (!user) return;

    const heartbeat = async () => {
      try {
        await base44.auth.updateMe({ last_active: new Date().toISOString() });
      } catch (e) {
        // silent fail
      }
    };

    heartbeat();
    const interval = setInterval(heartbeat, 60 * 1000); // Every minute
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Time Tracker', icon: Clock, path: '/' }, 
    { name: 'Projects', icon: Briefcase, path: '/projects' },
    { name: 'Team', icon: Users, path: '/Team' },
    { name: 'Reports', icon: BarChart3, path: '/reports' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-xl text-indigo-600">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              P
            </div>
            ProjectFlow
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-600 font-medium shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <Link to="/Settings" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
        </aside>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
          <div className="flex justify-around items-center h-16">
              <Link to="/" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Home</span>
              </Link>
              <Link to="/projects" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/projects' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <Briefcase className="w-5 h-5" />
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

              <Link to="/Team" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/Team' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <Users className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Chat</span>
              </Link>
              <Link to="/Settings" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/Settings' ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <Settings className="w-5 h-5" />
                  <span className="text-[10px] font-medium">More</span>
              </Link>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 flex flex-col min-h-screen pb-20 md:pb-0">
        {/* Header (Responsive) */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">

          {/* Mobile Left: Hamburger (Menu) */}
          <div className="md:hidden flex items-center gap-2">
               {/* Could add a slide-out menu here if needed, for now strictly following "Hamburger menu (left)" request but simple logo instead */}
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
          </div>

          {/* Desktop Title / Mobile Center Logo */}
          <h1 className="text-lg font-semibold text-slate-800 hidden md:block">
            {navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
          </h1>

          {/* Mobile Center Title (if needed) or just keep header clean */}
          <span className="md:hidden font-bold text-indigo-900">ProjectFlow</span>

          {/* Right Side */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Check-in status could go here for mobile as requested "Check-in status (right)" */}
            <div className="md:hidden" id="mobile-header-status"></div>

            <NotificationCenter />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                    <AvatarImage src="" alt={user?.first_name} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600">
                      {user?.first_name?.[0] || <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
      <AiAssistant />
    </div>
  );
}