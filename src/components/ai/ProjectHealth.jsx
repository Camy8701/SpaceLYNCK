import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    AlertTriangle, 
    CheckCircle2, 
    TrendingUp, 
    Lightbulb, 
    RefreshCw, 
    ArrowRight,
    Activity
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion } from "framer-motion";

// This component uses placeholder data since project_insight table doesn't exist in Supabase
export default function ProjectHealth({ projectId }) {
    // Placeholder insight data - no API calls to prevent 404 errors
    const insight = null;
    const isLoading = false;

    const handleAnalyze = () => {
        toast.info('Project analysis feature requires additional setup.', {
            description: 'Please configure the project_insight table in Supabase.'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'On Track': return 'text-green-600 bg-green-50 border-green-200';
            case 'Needs Attention': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'At Risk': return 'text-red-600 bg-red-50 border-red-200';
            case 'Critical': return 'text-red-700 bg-red-100 border-red-300';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return "bg-green-500";
        if (score >= 60) return "bg-orange-500";
        return "bg-red-500";
    };

    // Show placeholder since no insight data is available
    return (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Activity className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Project Health Analysis</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                AI-powered health checks will identify risks and provide actionable insights when configured.
            </p>
            <Button onClick={handleAnalyze} className="bg-indigo-600 hover:bg-indigo-700">
                Configure Analysis
            </Button>
        </div>
    );
}
