import React from 'react';
import TimeTrackingCard from './TimeTrackingCard';
import SidebarNav from './SidebarNav';
import UserProfile from './UserProfile';
import { X, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function DashboardSidebar({ activeItem, onItemClick, isOpen, onClose, isCollapsed, onToggleCollapse }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-4 left-4 bottom-4 z-50
        flex flex-col overflow-hidden
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-[calc(100%+16px)] lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none lg:-translate-x-full' : 'w-[260px] opacity-100'}
        bg-gradient-to-b from-sky-300/40 via-orange-200/40 to-rose-400/50 backdrop-blur-xl
        border border-white/30 rounded-2xl shadow-2xl shadow-black/20
      `}>
        {/* Desktop toggle button - inside sidebar at top right */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute top-3 right-3 z-10 w-8 h-8 items-center justify-center bg-white/20 hover:bg-white/40 rounded-lg text-white/80 hover:text-white transition-all"
        >
          <ChevronsLeft className="w-5 h-5" />
        </button>

        {/* Mobile close button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-white/70 hover:text-white lg:hidden z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Time Tracking Card - moved to top */}
        <div className="pt-2">
          <TimeTrackingCard />
        </div>

        {/* Navigation */}
        <SidebarNav activeItem={activeItem} onItemClick={onItemClick} />

        {/* User Profile & Logout */}
        <UserProfile />
      </aside>

      {/* Desktop expand button - visible when collapsed */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex fixed top-6 left-4 z-50 w-10 h-10 items-center justify-center bg-gradient-to-br from-sky-300/60 via-orange-200/60 to-rose-400/60 backdrop-blur-xl hover:from-sky-300/80 hover:via-orange-200/80 hover:to-rose-400/80 rounded-xl border border-white/30 text-white shadow-lg transition-all"
        >
          <ChevronsRight className="w-5 h-5" />
        </button>
      )}
    </>
  );
}