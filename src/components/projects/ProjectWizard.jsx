import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Plus, Trash2, ChevronRight, ChevronLeft, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectWizard({ onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [projectData, setProjectData] = useState({
    name: "",
    type: "",
    start_date: new Date().toISOString().split('T')[0],
    description: ""
  });

  const [branches, setBranches] = useState([
    { name: "General", id: Date.now() }
  ]);

  // --- Step Navigation ---

  const nextStep = () => {
    if (step === 1) {
      if (!projectData.name || !projectData.type || !projectData.start_date) {
        toast.error("Please fill in all required fields");
        return;
      }
    }
    if (step === 2) {
      if (branches.length === 0 || branches.some(b => !b.name.trim())) {
        toast.error("Please ensure at least one branch has a name");
        return;
      }
    }
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  // --- Branch Management ---

  const addBranch = () => {
    setBranches([...branches, { name: "", id: Date.now() }]);
  };

  const removeBranch = (id) => {
    if (branches.length <= 1) {
      toast.error("Projects must have at least one branch");
      return;
    }
    setBranches(branches.filter(b => b.id !== id));
  };

  const updateBranch = (id, value) => {
    setBranches(branches.map(b => b.id === id ? { ...b, name: value } : b));
  };

  // --- Submission ---

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create Project
      const project = await base44.entities.Project.create(projectData);
      
      // 2. Create Branches
      if (branches.length > 0) {
        const branchRecords = branches.map((b, index) => ({
          project_id: project.id,
          name: b.name,
          order_index: index
        }));
        
        // Note: Using create for each if bulkCreate isn't strictly reliable in all contexts, 
        // but assuming bulkCreate is available per instructions.
        await base44.entities.Branch.bulkCreate(branchRecords);
      }

      toast.success("Project created successfully!");
      onComplete();
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Steps ---

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {['Basic Info', 'Departments', 'Review'].map((label, i) => (
            <div key={i} className={`text-sm font-medium ${step > i + 1 ? 'text-indigo-600' : step === i + 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
              Step {i + 1}: {label}
            </div>
          ))}
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-600"
            initial={{ width: "0%" }}
            animate={{ width: `${((step - 1) / 2) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>
            {step === 1 && "Let's start with the basics"}
            {step === 2 && "Structure your project"}
            {step === 3 && "Review and Launch"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Tell us a bit about what you're working on."}
            {step === 2 && "Add branches or departments to organize tasks (e.g., Design, Development)."}
            {step === 3 && "Check everything looks good before we create your project."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="min-h-[300px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Website Redesign" 
                    value={projectData.name}
                    onChange={e => setProjectData({...projectData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Project Type <span className="text-red-500">*</span></Label>
                  <Select 
                    value={projectData.type} 
                    onValueChange={v => setProjectData({...projectData, type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Marketing Agency">Marketing Agency</SelectItem>
                      <SelectItem value="E-commerce">E-commerce</SelectItem>
                      <SelectItem value="Consulting">Consulting</SelectItem>
                      <SelectItem value="Freelance">Freelance</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input 
                    id="start_date" 
                    type="date" 
                    value={projectData.start_date}
                    onChange={e => setProjectData({...projectData, start_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Briefly describe the project goals..." 
                    className="h-24"
                    value={projectData.description}
                    onChange={e => setProjectData({...projectData, description: e.target.value})}
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 2: Branches */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="space-y-4">
                  {branches.map((branch, index) => (
                    <div key={branch.id} className="flex gap-2 items-center">
                      <div className="bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium text-slate-600">
                        {index + 1}
                      </div>
                      <Input 
                        placeholder={`Branch Name (e.g. ${index === 0 ? 'Planning' : 'Execution'})`}
                        value={branch.name}
                        onChange={e => updateBranch(branch.id, e.target.value)}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-slate-400 hover:text-red-500"
                        onClick={() => removeBranch(branch.id)}
                        disabled={branches.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Button variant="outline" onClick={addBranch} className="w-full border-dashed">
                  <Plus className="w-4 h-4 mr-2" /> Add Another Branch
                </Button>
              </motion.div>
            )}

            {/* STEP 3: Review */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-slate-900">{projectData.name}</h3>
                      <p className="text-sm text-slate-500">{projectData.type} • Starts {projectData.start_date}</p>
                      {projectData.description && (
                        <p className="text-sm text-slate-600 mt-2 italic">"{projectData.description}"</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Departments ({branches.length})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {branches.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-white border rounded-md text-sm">
                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                        {b.name || "Untitled"}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        <CardFooter className="flex justify-between border-t bg-slate-50/50 p-6">
          {step === 1 ? (
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          ) : (
            <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}

          {step < 3 ? (
            <Button onClick={nextStep} className="bg-indigo-600 hover:bg-indigo-700">
              Next Step <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 px-8">
              {isSubmitting ? "Creating..." : (
                <>Create Project <CheckCircle2 className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}