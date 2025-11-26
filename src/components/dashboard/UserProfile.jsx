import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

export default function UserProfile() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="p-4 border-t border-slate-300/30">
      {/* User Info */}
      <div className="flex items-center gap-3 mb-4 bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-white/30">
        <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white/30">
          <AvatarFallback className="bg-transparent text-white font-semibold">
            {getInitials(user?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-slate-800 font-medium text-sm truncate">
            {user?.full_name || 'User'}
          </p>
          <p className="text-slate-500 text-xs truncate">
            {user?.email || ''}
          </p>
        </div>
      </div>

      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        variant="ghost"
        className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-white/30 rounded-xl"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Log Out
      </Button>
    </div>
  );
}