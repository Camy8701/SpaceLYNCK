import React from 'react';
import TimeTrackingCard from './TimeTrackingCard';
import SidebarNav from './SidebarNav';
import UserProfile from './UserProfile';
import { X, ChevronsLeft, ChevronsRight, Clock } from "lucide-react";

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

      {/* Full Sidebar - visible when expanded */}
      <aside className={`
        fixed top-4 left-4 bottom-4 z-50
        flex flex-col overflow-hidden
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-[calc(100%+16px)] lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none lg:-translate-x-full' : 'w-[260px] opacity-100'}
        bg-gradient-to-b from-sky-300/60 via-orange-200/60 to-rose-400/70 backdrop-blur-xl
        border border-white/40 rounded-2xl shadow-2xl shadow-black/20
      `}>
        {/* Desktop toggle button - inside sidebar at top right */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute top-3 right-3 z-10 w-8 h-8 items-center justify-center bg-white/30 hover:bg-white/50 rounded-lg text-slate-700 hover:text-slate-900 transition-all"
        >
          <ChevronsLeft className="w-5 h-5" />
        </button>

        {/* Mobile close button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-700 hover:text-slate-900 lg:hidden z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Time Tracking Card - moved to top */}
        <div className="pt-2">
          <TimeTrackingCard />
        </div>

        {/* Navigation */}
        <SidebarNav activeItem={activeItem} onItemClick={onItemClick} isCollapsed={false} />

        {/* User Profile & Logout */}
        <UserProfile isCollapsed={false} />
      </aside>

      {/* Mini Sidebar - visible when collapsed (Desktop only) */}
      {isCollapsed && (
        <aside className="hidden lg:flex fixed top-4 left-4 bottom-4 z-50 w-[68px] flex-col overflow-hidden bg-gradient-to-b from-sky-300/60 via-orange-200/60 to-rose-400/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl shadow-black/20">
          {/* Expand button at top */}
          <button
            onClick={onToggleCollapse}
            className="flex mx-auto mt-3 w-10 h-10 items-center justify-center bg-white/30 hover:bg-white/50 rounded-lg text-slate-700 hover:text-slate-900 transition-all"
          >
            <ChevronsRight className="w-5 h-5" />
          </button>

          {/* Mini Time indicator */}
          <div className="flex flex-col items-center mt-4 px-2">
            <div className="w-12 h-12 bg-white/30 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-700" />
            </div>
          </div>

          {/* Mini Navigation */}
          <SidebarNav activeItem={activeItem} onItemClick={onItemClick} isCollapsed={true} />

          {/* Mini User Profile */}
          <UserProfile isCollapsed={true} />
        </aside>
      )}
    </>
  );
}
