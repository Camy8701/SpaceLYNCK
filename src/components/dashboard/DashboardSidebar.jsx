import React from 'react';
import TimeTrackingCard from './TimeTrackingCard';
import SidebarNav from './SidebarNav';
import UserProfile from './UserProfile';
import { X, ChevronLeft, ChevronRight } from "lucide-react";

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
        fixed top-0 left-0 h-full z-50
        flex flex-col
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-0 lg:-translate-x-full' : 'w-[280px]'}
        bg-gradient-to-b from-sky-400/20 via-orange-300/20 to-rose-400/20 backdrop-blur-2xl border-r border-white/20
      `}>
        {/* Mobile close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white lg:hidden"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Logo */}
        <div className="p-4 pt-6">
          <h1 className="text-2xl font-black tracking-tight text-white">
            LYNCK <span className="text-white/70">SPACE</span>
          </h1>
        </div>

        {/* Time Tracking Card */}
        <TimeTrackingCard />

        {/* Navigation */}
        <SidebarNav activeItem={activeItem} onItemClick={onItemClick} />

        {/* User Profile & Logout */}
        <UserProfile />
      </aside>

      {/* Desktop toggle button */}
      <button
        onClick={onToggleCollapse}
        className={`
          hidden lg:flex fixed top-1/2 -translate-y-1/2 z-50
          w-6 h-12 items-center justify-center
          bg-white/20 backdrop-blur-sm hover:bg-white/30
          border border-white/20 rounded-r-lg
          text-white transition-all duration-300
          ${isCollapsed ? 'left-0' : 'left-[280px]'}
        `}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </>
  );
}