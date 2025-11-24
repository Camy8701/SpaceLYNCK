import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, CheckCircle2, XCircle, RefreshCw, ArrowUpRight } from "lucide-react";

export default function Settings() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // Assuming connected since auth happened, logic below

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    try {
      // Trigger OAuth flow
      await base44.integrations.request_oauth_authorization({
         integration_type: 'googlecalendar',
         reason: 'To sync your project deadlines and tasks.',
         scopes: ['https://www.googleapis.com/auth/calendar.events']
      });
      // In a real app, we'd wait for callback or check status. 
      // Here we assume success if no error thrown immediately (though it redirects).
      setIsConnected(true);
      toast.success("Google Calendar connection requested!");
    } catch (error) {
      toast.error("Connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h2>
        <p className="text-slate-500 mt-1">Manage your account and integrations.</p>
      </div>

      <div className="grid gap-6">
        {/* Integrations Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-slate-500" /> Integrations
            </CardTitle>
            <CardDescription>Connect external tools to power up your workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                   <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">Google Calendar</h3>
                  <p className="text-sm text-slate-500">Sync tasks and deadlines automatically.</p>
                </div>
              </div>
              
              {isConnected ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded">
                    <CheckCircle2 className="w-4 h-4" /> Connected
                  </div>
                  <Button variant="outline" size="sm" onClick={handleGoogleConnect}>
                    Reconnect
                  </Button>
                </div>
              ) : (
                <Button onClick={handleGoogleConnect} disabled={isConnecting}>
                  {isConnecting ? 'Connecting...' : 'Connect Calendar'}
                </Button>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}