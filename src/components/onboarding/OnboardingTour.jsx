import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, LayoutDashboard, Clock, Briefcase, Bot, ArrowRight } from "lucide-react";

const STEPS = [
  {
    title: "Welcome to ProjectFlow! 👋",
    description: "Let's take a quick tour to help you get the most out of your workspace.",
    icon: LayoutDashboard,
    color: "text-indigo-600 bg-indigo-100"
  },
  {
    title: "Track Your Time ⏱️",
    description: "Use the dashboard or Time Tracker tab to check in, take breaks, and log your hours effortlessly.",
    icon: Clock,
    color: "text-rose-600 bg-rose-100"
  },
  {
    title: "Manage Projects 🚀",
    description: "Create projects, organize tasks into branches, and collaborate with your team in one place.",
    icon: Briefcase,
    color: "text-blue-600 bg-blue-100"
  },
  {
    title: "AI Assistant 🤖",
    description: "Need help? The AI assistant (bottom right) can analyze your projects, summarize docs, and answer questions.",
    icon: Bot,
    color: "text-purple-600 bg-purple-100"
  },
  {
    title: "You're All Set! 🎉",
    description: "Start by creating your first project or checking in for the day.",
    icon: CheckCircle2,
    color: "text-green-600 bg-green-100"
  }
];

export default function OnboardingTour({ open, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleSkip()}>
      <DialogContent className="sm:max-w-[400px] text-center">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${step.color} mb-2 transition-all duration-300 transform scale-110`}>
            <Icon className="w-8 h-8" />
          </div>
          
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">{step.title}</DialogTitle>
            <DialogDescription className="text-center text-base mt-2">
              {step.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6">
           <div className="flex justify-center gap-1">
              {STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200'}`} 
                />
              ))}
           </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button size="lg" onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {currentStep === STEPS.length - 1 ? "Get Started" : "Next"}
              {currentStep !== STEPS.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
            <Button variant="ghost" onClick={handleSkip} className="w-full text-slate-400">
              Skip Tour
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}