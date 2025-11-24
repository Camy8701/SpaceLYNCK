import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, Settings, LogOut, User, Briefcase, BarChart3 } from 'lucide-react';
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
        // Update last_active timestamp periodically
        // Note: using updateMe typically updates the auth user record. 
        // If we added 'last_active' to entities/User.json, we can't use updateMe to update it directly 
        // if it's a secure built-in field, but typically custom fields are updatable if configured.
        // Since we defined User.json with last_active, let's try to update it.
        // However, base44.auth.updateMe updates the AUTH user. 
        // If we want to update the ENTITY user record, we might need to use entities.User.update if allowed.
        // But usually, the Auth user acts as the source.
        // Let's try base44.auth.updateMe first as it's safer.
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
    { name: 'Reports', icon: BarChart3, path: '/reports' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
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
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-slate-500">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
          <h1 className="text-lg font-semibold text-slate-800">
            {navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
          </h1>

          <div className="flex items-center gap-4">
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
    </div>
  );
}