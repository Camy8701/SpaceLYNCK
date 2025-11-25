import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Folder, 
  Sparkles, 
  BookOpen, 
  Calendar, 
  GraduationCap, 
  MessageSquare, 
  Lock, 
  Type, 
  Share2, 
  BarChart3,
  ChevronDown,
  ChevronRight,
  Plus,
  FolderOpen
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { 
    id: 'projects', 
    label: 'Projects', 
    icon: Folder,
    expandable: true,
    subItems: [
      { id: 'my-projects', label: 'My Projects', icon: FolderOpen },
      { id: 'new-project', label: 'Create New Project', icon: Plus }
    ]
  },
  { id: 'jarvis', label: 'Jarvis AI Assistant', icon: Sparkles },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'study', label: 'Self-Study', icon: GraduationCap },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'diary', label: 'Diary & Notes', icon: Lock },
  { id: 'counter', label: 'Character Counter', icon: Type },
  { id: 'mindmaps', label: 'Mind Maps', icon: Share2 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

// Items that are implemented
const implementedItems = ['dashboard', 'my-projects', 'new-project', 'jarvis', 'knowledge', 'calendar', 'study', 'chat', 'diary', 'counter', 'mindmaps', 'analytics'];

export default function SidebarNav({ activeItem, onItemClick }) {
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpanded = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleItemClick = (item, isSubItem = false) => {
    if (item.expandable && !isSubItem) {
      toggleExpanded(item.id);
      return;
    }

    if (implementedItems.includes(item.id)) {
      onItemClick(item.id);
    } else {
      toast.info(`${item.label} - Coming soon!`, {
        description: "This feature will be available in a future update."
      });
    }
  };

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          const isExpanded = expandedItems[item.id];

          return (
            <li key={item.id}>
              <button
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                  isActive 
                    ? 'bg-white/40 backdrop-blur-sm text-slate-900 border border-white/30 font-semibold' 
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/30'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {item.expandable && (
                  isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Sub-items */}
              {item.expandable && isExpanded && item.subItems && (
                <ul className="ml-8 mt-1 space-y-1">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    return (
                      <li key={subItem.id}>
                        <button
                          onClick={() => handleItemClick(subItem, true)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-slate-600 hover:text-slate-900 hover:bg-white/30 transition-all"
                        >
                          <SubIcon className="w-4 h-4" />
                          <span className="text-sm">{subItem.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}