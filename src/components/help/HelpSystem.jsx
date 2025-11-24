import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet"; // Assuming Sheet is available, if not I'll simulate it or use Dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Keyboard, HelpCircle, FileText, MessageSquare, PlayCircle } from "lucide-react";

export default function HelpSystem({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            Help & Documentation
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            
            {/* Keyboard Shortcuts */}
            <section>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Keyboard className="w-4 h-4" /> Keyboard Shortcuts
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">Open Help</span>
                  <kbd className="px-2 py-0.5 bg-white border rounded text-xs shadow-sm">Shift + ?</kbd>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">New Task</span>
                  <kbd className="px-2 py-0.5 bg-white border rounded text-xs shadow-sm">N</kbd>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">Search</span>
                  <kbd className="px-2 py-0.5 bg-white border rounded text-xs shadow-sm">Cmd + K</kbd>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">Quick Check-in</span>
                  <kbd className="px-2 py-0.5 bg-white border rounded text-xs shadow-sm">C</kbd>
                </div>
              </div>
            </section>

            {/* Quick Tips */}
            <section>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" /> Quick Tips
              </h3>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg bg-indigo-50 border-indigo-100">
                  <h4 className="font-medium text-indigo-900 text-sm">AI Assistant</h4>
                  <p className="text-xs text-indigo-700 mt-1">
                    You can ask the AI assistant to summarize documents or find tasks. Click the robot icon in the bottom right.
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-slate-900 text-sm">Time Tracking</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Forgot to check out? You can edit your session times in the "Reports" tab.
                  </p>
                </div>
              </div>
            </section>

            {/* Video Tutorials (Placeholder) */}
            <section>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <PlayCircle className="w-4 h-4" /> Video Tutorials
              </h3>
              <div className="grid gap-2">
                <Button variant="outline" className="justify-start h-auto py-3" disabled>
                  <span className="text-slate-400 mr-2">01.</span> Getting Started (Coming Soon)
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" disabled>
                  <span className="text-slate-400 mr-2">02.</span> Managing Projects (Coming Soon)
                </Button>
              </div>
            </section>
            
             {/* Support */}
            <section>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4" /> Support
              </h3>
              <p className="text-sm text-slate-500">
                Need help? Contact support at <a href="mailto:support@base44.com" className="text-indigo-600 underline">support@base44.com</a>
              </p>
            </section>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}