import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Folder, ArrowRight } from "lucide-react";
import { createPageUrl } from '@/utils';

export default function TopProjectsWidget() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['topProjects'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.Project.filter({ created_by: user.email }, '-updated_date', 5);
    }
  });

  if (isLoading) {
    return <div className="text-slate-500 text-sm">Loading...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-4">
        <Folder className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 text-sm">No projects yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.slice(0, 4).map(project => (
        <Link 
          key={project.id} 
          to={createPageUrl(`ProjectDetails?id=${project.id}`)}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/40 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-400/30 rounded-lg flex items-center justify-center">
              <Folder className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-800 text-sm font-medium">{project.name}</p>
              <p className="text-slate-500 text-xs">{project.type}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
    </div>
  );
}