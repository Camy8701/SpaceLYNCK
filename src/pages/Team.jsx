import React from 'react';
import TeamList from "@/components/chat/TeamList";
import { Users } from "lucide-react";

export default function Team() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <Users className="w-8 h-8 text-indigo-600" />
             Team Chat
           </h2>
           <p className="text-slate-500 mt-1">
             Chat with your team members directly.
           </p>
        </div>
      </div>

      <div className="max-w-3xl">
        {/* Passing no projectId implies global chat */}
        <TeamList projectId={null} />
      </div>
    </div>
  );
}