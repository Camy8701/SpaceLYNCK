import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function ClientForm({ open, onOpenChange, client, projectId, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(client || {
    name: "",
    company: "",
    email: "",
    phone: "",
    branches: [],
    notes: ""
  });

  // Fetch Branches
  const { data: branches } = useQuery({
    queryKey: ['branches', projectId],
    queryFn: async () => {
      return await base44.entities.Branch.filter({ project_id: projectId });
    },
    enabled: !!projectId
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = { ...formData, project_id: projectId };
      
      if (client?.id) {
        await base44.entities.Client.update(client.id, payload);
        toast.success("Client updated");
      } else {
        await base44.entities.Client.create(payload);
        toast.success("Client added");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Operation failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBranch = (branchId) => {
    setFormData(prev => {
      const current = prev.branches || [];
      if (current.includes(branchId)) {
        return { ...prev, branches: current.filter(id => id !== branchId) };
      } else {
        return { ...prev, branches: [...current, branchId] };
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input 
                id="name" 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input 
                id="company" 
                value={formData.company} 
                onChange={e => setFormData({...formData, company: e.target.value})}
                placeholder="Acme Corp" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="john@example.com" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 234 567 890" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Associated Branches</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-slate-50">
              {branches?.map(branch => (
                <div key={branch.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={branch.id} 
                    checked={(formData.branches || []).includes(branch.id)}
                    onCheckedChange={() => toggleBranch(branch.id)}
                  />
                  <Label htmlFor={branch.id} className="text-sm font-normal cursor-pointer">
                    {branch.name}
                  </Label>
                </div>
              ))}
              {(!branches || branches.length === 0) && <p className="text-xs text-slate-400">No branches found</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional info..." 
              className="h-20"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>Save Client</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}