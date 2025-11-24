import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { format } from 'date-fns';
import { Mail, Phone, Users, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ClientCommunications({ clientId }) {
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    type: "email",
    subject: "",
    notes: "",
    date: new Date().toISOString().split('T')[0] + "T12:00"
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['clientLogs', clientId],
    queryFn: async () => {
        return await base44.entities.ClientCommunication.filter({ client_id: clientId }, '-date');
    }
  });

  const addMutation = useMutation({
    mutationFn: async () => {
        await base44.entities.ClientCommunication.create({
            ...formData,
            client_id: clientId,
            created_by: (await base44.auth.me()).email
        });
    },
    onSuccess: () => {
        queryClient.invalidateQueries(['clientLogs', clientId]);
        setIsAdding(false);
        setFormData({
            type: "email",
            subject: "",
            notes: "",
            date: new Date().toISOString().split('T')[0] + "T12:00"
        });
        toast.success("Log added");
    }
  });

  const getIcon = (type) => {
      switch(type) {
          case 'email': return <Mail className="w-4 h-4" />;
          case 'call': return <Phone className="w-4 h-4" />;
          case 'meeting': return <Users className="w-4 h-4" />;
          default: return <MoreHorizontal className="w-4 h-4" />;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Communication Log</h3>
        <Button variant={isAdding ? "secondary" : "default"} onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? "Cancel" : "Log Activity"}
        </Button>
      </div>

      {isAdding && (
          <Card className="bg-slate-50">
              <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="call">Call</SelectItem>
                              <SelectItem value="meeting">Meeting</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                      </Select>
                      <Input 
                        type="datetime-local" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                      />
                  </div>
                  <Input 
                    placeholder="Subject / Summary" 
                    value={formData.subject} 
                    onChange={e => setFormData({...formData, subject: e.target.value})} 
                  />
                  <Textarea 
                    placeholder="Notes..." 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                  />
                  <div className="flex justify-end">
                      <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
                          Save Log
                      </Button>
                  </div>
              </CardContent>
          </Card>
      )}

      <div className="space-y-4">
          {isLoading ? <div>Loading...</div> : logs?.length === 0 ? (
              <div className="text-center text-slate-400 py-8">No communications logged yet</div>
          ) : (
              logs.map(log => (
                  <div key={log.id} className="flex gap-4 p-4 bg-white border rounded-lg shadow-sm">
                      <div className={`mt-1 p-2 rounded-full h-fit ${
                          log.type === 'email' ? 'bg-blue-100 text-blue-600' :
                          log.type === 'call' ? 'bg-green-100 text-green-600' :
                          log.type === 'meeting' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100'
                      }`}>
                          {getIcon(log.type)}
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between items-start">
                              <h4 className="font-medium text-slate-900">{log.subject}</h4>
                              <span className="text-xs text-slate-400">{format(new Date(log.date), 'MMM d, p')}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{log.notes}</p>
                          <div className="mt-2 text-xs text-slate-400">Logged by {log.created_by}</div>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
}