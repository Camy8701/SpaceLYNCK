import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Mail, Phone, Building, Calendar, Edit, Trash2 } from "lucide-react";
import { createPageUrl } from '@/utils';
import ClientCommunications from '@/components/clients/ClientCommunications';
import ClientForm from '@/components/clients/ClientForm';
import TaskItem from '@/components/tasks/TaskItem'; // Assuming we can reuse or need a list
import { toast } from "sonner";

export default function ClientDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('id');
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  const { data: client, refetch } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
        if (!clientId) return null;
        const res = await base44.entities.Client.filter({ id: clientId }, '', 1);
        return res[0];
    },
    enabled: !!clientId
  });

  const { data: tasks } = useQuery({
      queryKey: ['clientTasks', clientId],
      queryFn: async () => {
          if (!clientId) return [];
          return await base44.entities.Task.filter({ client_id: clientId });
      },
      enabled: !!clientId
  });

  if (!clientId) return <div>Invalid Client ID</div>;
  if (!client) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="w-fit text-slate-500">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                    {client.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{client.name}</h1>
                    <div className="flex items-center gap-4 text-slate-500 mt-1">
                        {client.company && <span className="flex items-center gap-1"><Building className="w-4 h-4" /> {client.company}</span>}
                        {client.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {client.email}</span>}
                        {client.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {client.phone}</span>}
                    </div>
                </div>
            </div>
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                <Edit className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
          <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks?.length || 0})</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
              <Card>
                  <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase">Notes</label>
                              <p className="mt-1 text-slate-700 whitespace-pre-wrap">{client.notes || "No notes."}</p>
                          </div>
                      </div>
                      <div className="space-y-4">
                           {/* Stats or other info could go here */}
                      </div>
                  </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="tasks">
              <div className="space-y-4">
                  <div className="flex justify-end">
                      {/* Task creation usually needs project/branch context. Could link to generic create or just show list */}
                      <p className="text-xs text-slate-500">To add a task for this client, go to the Project page.</p>
                  </div>
                  {tasks?.map(task => (
                      <div key={task.id} className="bg-white p-4 border rounded-lg shadow-sm flex justify-between">
                          <div>
                             <div className="font-medium">{task.title}</div>
                             <div className="text-xs text-slate-500">Due: {task.due_date || 'No date'} • {task.status}</div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl(`ProjectDetails?id=${task.project_id}`))}>
                              View Project
                          </Button>
                      </div>
                  ))}
                  {tasks?.length === 0 && <div className="text-center py-8 text-slate-400">No tasks linked to this client</div>}
              </div>
          </TabsContent>

          <TabsContent value="communications">
              <ClientCommunications clientId={clientId} />
          </TabsContent>

          <TabsContent value="documents">
              <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
                  Documents module coming soon.
              </div>
          </TabsContent>
      </Tabs>

      <ClientForm 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        client={client} 
        projectId={client.project_id}
        onSuccess={refetch}
      />
    </div>
  );
}