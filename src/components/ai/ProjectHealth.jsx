import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
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
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ProjectHealth({ projectId }) {
    const queryClient = useQueryClient();

    const { data: insight, isLoading } = useQuery({
        queryKey: ['projectInsight', projectId],
        queryFn: async () => {
            const res = await base44.entities.ProjectInsight.filter({ project_id: projectId }, '-last_analyzed', 1);
            return res[0];
        },
        enabled: !!projectId
    });

    const analyzeMutation = useMutation({
        mutationFn: async () => {
            const res = await base44.functions.invoke('analyzeProject', { project_id: projectId });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['projectInsight', projectId]);
            toast.success("Project analysis updated");
        },
        onError: (err) => {
            toast.error("Analysis failed: " + err.message);
        }
    });

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

    if (isLoading) return <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
        </div>
    </div>;

    if (!insight && !analyzeMutation.isPending) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Activity className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No Analysis Yet</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">Generate an AI-powered health check to identify risks and get actionable insights.</p>
                <Button onClick={() => analyzeMutation.mutate()} className="bg-indigo-600 hover:bg-indigo-700">
                    Generate First Report
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Health Score Card */}
                <Card className="md:w-1/3 border-slate-200 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${getScoreColor(insight?.health_score || 0)}`} />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Health Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-slate-900">{insight?.health_score || 0}</span>
                            <span className="text-sm text-slate-400">/ 100</span>
                        </div>
                        <Progress value={insight?.health_score || 0} className="h-2 mt-4" indicatorClassName={getScoreColor(insight?.health_score || 0)} />
                        <div className="mt-4">
                            <Badge variant="outline" className={getStatusColor(insight?.health_status)}>
                                {insight?.health_status || "Unknown"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Card */}
                <Card className="md:w-2/3 border-slate-200 shadow-sm flex flex-col">
                    <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                        <div>
                            <CardTitle className="text-lg font-semibold text-slate-900">Executive Summary</CardTitle>
                            <CardDescription>
                                Generated {insight?.last_analyzed ? format(new Date(insight.last_analyzed), "PPP 'at' p") : ''}
                            </CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => analyzeMutation.mutate()} 
                            disabled={analyzeMutation.isPending}
                            className="gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
                            {analyzeMutation.isPending ? 'Analyzing...' : 'Refresh'}
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-slate-700 leading-relaxed">
                            {insight?.summary || "Analysis in progress..."}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Risks */}
                <Card className="border-red-100 bg-red-50/30 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-red-700 text-base">
                            <AlertTriangle className="w-5 h-5" />
                            Identified Risks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {insight?.risks?.map((risk, i) => (
                                <motion.li 
                                    key={i} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-start gap-2 text-sm text-slate-700"
                                >
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                    {risk}
                                </motion.li>
                            ))}
                            {(!insight?.risks || insight.risks.length === 0) && (
                                <li className="text-sm text-slate-500 italic">No major risks detected.</li>
                            )}
                        </ul>
                    </CardContent>
                </Card>

                {/* Key Insights */}
                <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-indigo-700 text-base">
                            <Lightbulb className="w-5 h-5" />
                            Key Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {insight?.key_insights?.map((item, i) => (
                                <motion.li 
                                    key={i} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-start gap-2 text-sm text-slate-700"
                                >
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                    {item}
                                </motion.li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Next Steps */}
                <Card className="border-green-100 bg-green-50/30 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-green-700 text-base">
                            <TrendingUp className="w-5 h-5" />
                            Recommended Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ul className="space-y-3">
                            {insight?.next_steps?.map((step, i) => (
                                <motion.li 
                                    key={i} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-start gap-2 text-sm text-slate-700"
                                >
                                    <ArrowRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    {step}
                                </motion.li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}