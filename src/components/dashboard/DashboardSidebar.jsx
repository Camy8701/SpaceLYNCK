import React from 'react';
import TimeTrackingCard from './TimeTrackingCard';
import SidebarNav from './SidebarNav';
import UserProfile from './UserProfile';
import { X } from "lucide-react";

export default function DashboardSidebar({ activeItem, onItemClick, isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-[280px] bg-[#1a1f36] z-50
        flex flex-col
        transform transition-transform duration-300
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
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
            LYNCK <span className="text-white/80">SPACE</span>
          </h1>
        </div>

        {/* Time Tracking Card */}
        <TimeTrackingCard />

        {/* Navigation */}
        <SidebarNav activeItem={activeItem} onItemClick={onItemClick} />

        {/* User Profile & Logout */}
        <UserProfile />
      </aside>
    </>
  );
}