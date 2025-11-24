import React, { useState } from 'react';
import { Search, Command } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if(query.trim()) {
        // Navigate to a search results page or just show a toast for now as we don't have a dedicated search page yet
        // or better, navigate to projects with a query param
        // For now, let's assume a basic search alert
        console.log("Searching for:", query);
        // navigate(createPageUrl(`SearchResults?q=${query}`));
        navigate(createPageUrl(`Projects`)); // Redirect to projects for now as a fallback 
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input 
          placeholder="Search..." 
          className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500 h-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
           <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400 opacity-100">
             <span className="text-xs">⌘</span>K
           </kbd>
        </div>
      </div>
    </div>
  );
}