import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Mail, Phone, Building, MoreHorizontal, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ClientForm from './ClientForm';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ClientList({ projectId }) {
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const navigate = useNavigate();

  const { data: clients, refetch, isLoading } = useQuery({
    queryKey: ['clients', projectId],
    queryFn: async () => {
      return await base44.entities.Client.filter({ project_id: projectId });
    }
  });

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleEdit = (client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search clients..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => { setEditingClient(null); setIsFormOpen(true); }} className="bg-indigo-600">
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
           <div className="col-span-3 text-center py-12 text-slate-400">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
           <div className="col-span-3 text-center py-12 bg-slate-50 rounded-xl border border-dashed">
             <p className="text-slate-500 mb-2">No clients found</p>
             <Button variant="outline" onClick={() => setIsFormOpen(true)}>Add your first client</Button>
           </div>
        ) : (
          filteredClients.map(client => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-indigo-100 text-indigo-600 font-medium">
                        {client.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-slate-900">{client.name}</h3>
                      {client.company && (
                        <div className="flex items-center text-xs text-slate-500">
                          <Building className="w-3 h-3 mr-1" />
                          {client.company}
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(client)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(createPageUrl(`ClientDetails?id=${client.id}`))}>
                          View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${client.email}`} className="hover:text-indigo-600">{client.email}</a>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t mt-4">
                   <div className="flex gap-1">
                     {client.branches?.length > 0 && (
                       <Badge variant="secondary" className="text-[10px]">
                         {client.branches.length} Services
                       </Badge>
                     )}
                   </div>
                   <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 p-0" onClick={() => navigate(createPageUrl(`ClientDetails?id=${client.id}`))}>
                     View Profile <ArrowRight className="w-3 h-3 ml-1" />
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {isFormOpen && (
        <ClientForm 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          projectId={projectId} 
          client={editingClient}
          onSuccess={() => {
            refetch();
            setEditingClient(null);
          }} 
        />
      )}
    </div>
  );
}