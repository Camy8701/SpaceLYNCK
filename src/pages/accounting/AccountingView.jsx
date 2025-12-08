import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Building2, 
  Wallet, 
  ArrowRight, 
  TrendingUp,
  FileText,
  CreditCard,
  Receipt,
  PiggyBank,
  BarChart3,
  Target,
  Download,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from "sonner";

export default function AccountingView({ sidebarCollapsed, onNavigate }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingInvoices: 0,
    thisMonthExpenses: 0,
    savingsProgress: 0,
    activeGoals: 0,
    thisMonthRevenue: 0,
    netWorth: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (user) {
      fetchAllStats();
    }
  }, [user]);

  const fetchAllStats = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchBusinessStats(),
        fetchPersonalStats(),
        fetchRecentActivity()
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load accounting stats');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBusinessStats = async () => {
    // Fetch pending invoices
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user?.id);

    if (!invoiceError && invoices) {
      const pendingInvoices = invoices.filter(inv => 
        ['pending', 'sent', 'draft'].includes(inv.status)
      ).length;
      
      // Calculate this month's revenue
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const paidInvoices = invoices.filter(inv => 
        inv.status === 'paid' && inv.paid_at >= startOfMonth
      );
      const thisMonthRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

      setStats(prev => ({
        ...prev,
        pendingInvoices,
        thisMonthRevenue
      }));
    }

    // Fetch business expenses
    const { data: expenses, error: expenseError } = await supabase
      .from('business_expenses')
      .select('*')
      .eq('user_id', user?.id);

    if (!expenseError && expenses) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const thisMonthExpenses = expenses
        .filter(exp => exp.date >= startOfMonth)
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);

      setStats(prev => ({
        ...prev,
        thisMonthExpenses
      }));
    }
  };

  const fetchPersonalStats = async () => {
    // Fetch savings goals
    const { data: goals, error: goalsError } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user?.id);

    if (!goalsError && goals) {
      const activeGoals = goals.length;
      const totalTarget = goals.reduce((sum, g) => sum + (g.target || 0), 0);
      const totalCurrent = goals.reduce((sum, g) => sum + (g.current || 0), 0);
      const savingsProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

      setStats(prev => ({
        ...prev,
        activeGoals,
        savingsProgress
      }));
    }

    // Fetch personal transactions to calculate net worth
    const { data: transactions, error: txError } = await supabase
      .from('personal_transactions')
      .select('*')
      .eq('user_id', user?.id);

    if (!txError && transactions) {
      const income = transactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
      const expenses = transactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount) || 0), 0);
      
      const netWorth = income - expenses;
      
      setStats(prev => ({
        ...prev,
        netWorth: Math.max(0, netWorth)
      }));
    }
  };

  const fetchRecentActivity = async () => {
    // Combine recent invoices, expenses, and transactions
    const activities = [];

    // Fetch recent invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (invoices) {
      invoices.forEach(inv => {
        activities.push({
          type: 'invoice',
          desc: inv.status === 'paid' 
            ? `Invoice ${inv.invoice_number} paid` 
            : `Invoice ${inv.invoice_number} ${inv.status}`,
          amount: inv.status === 'paid' ? `+$${(inv.amount || 0).toLocaleString()}` : `$${(inv.amount || 0).toLocaleString()}`,
          time: getRelativeTime(inv.created_at),
          color: inv.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
        });
      });
    }

    // Fetch recent business expenses
    const { data: expenses } = await supabase
      .from('business_expenses')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(2);

    if (expenses) {
      expenses.forEach(exp => {
        activities.push({
          type: 'expense',
          desc: exp.description || 'Business expense',
          amount: `-$${(exp.amount || 0).toLocaleString()}`,
          time: getRelativeTime(exp.created_at),
          color: 'text-rose-600'
        });
      });
    }

    // Fetch recent personal transactions
    const { data: transactions } = await supabase
      .from('personal_transactions')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(2);

    if (transactions) {
      transactions.forEach(tx => {
        activities.push({
          type: tx.type === 'income' ? 'income' : 'expense',
          desc: tx.description || (tx.type === 'income' ? 'Income' : 'Expense'),
          amount: tx.type === 'income' 
            ? `+$${Math.abs(tx.amount || 0).toLocaleString()}`
            : `-$${Math.abs(tx.amount || 0).toLocaleString()}`,
          time: getRelativeTime(tx.created_at),
          color: tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
        });
      });
    }

    // Sort by most recent and take top 4
    activities.sort((a, b) => {
      const timeOrder = ['just now', 'seconds ago', 'minute ago', 'minutes ago', 'hour ago', 'hours ago', 'day ago', 'days ago'];
      const getTimeIndex = (time) => {
        for (let i = 0; i < timeOrder.length; i++) {
          if (time.includes(timeOrder[i])) return i;
        }
        return timeOrder.length;
      };
      return getTimeIndex(a.time) - getTimeIndex(b.time);
    });

    setRecentActivity(activities.slice(0, 4));
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return date.toLocaleDateString();
  };

  const handleExport = async () => {
    toast.info('Export feature coming soon!');
  };

  const accountingModules = [
    {
      id: 'business-operations',
      title: 'Business Operations',
      description: 'Professional invoicing, estimates, payments & expense tracking for your business',
      icon: Building2,
      color: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-300',
      hoverBorder: 'hover:border-emerald-500',
      features: [
        'Professional Invoicing & Estimates',
        'Recurring Invoices for Retainers',
        'Multiple Payment Gateways',
        'Automated Payment Reminders',
        'Receipt & Expense Tracking',
        'Client Billing Management'
      ],
      stats: {
        label: 'This Month Revenue',
        value: `$${stats.thisMonthRevenue.toLocaleString()}`,
        trend: stats.thisMonthRevenue > 0 ? '+' : ''
      }
    },
    {
      id: 'personal-budgeting',
      title: 'Personal Budgeting',
      description: 'Track personal finances, set goals, monitor investments & manage your wealth',
      icon: Wallet,
      color: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-50 to-purple-50',
      borderColor: 'border-violet-300',
      hoverBorder: 'hover:border-violet-500',
      features: [
        'Real-Time Financial Dashboard',
        'Budget & Savings Goals',
        'Crypto, Gold, S&P 500 Tracking',
        'Income Splitting & Tax Set-Aside',
        'Receipt Upload & Categorization',
        'Cash Flow Forecasting'
      ],
      stats: {
        label: 'Net Worth',
        value: `$${stats.netWorth.toLocaleString()}`,
        trend: ''
      }
    }
  ];

  const quickStats = [
    { 
      label: 'Pending Invoices', 
      value: stats.pendingInvoices.toString(), 
      icon: FileText, 
      color: 'text-amber-600', 
      bg: 'bg-amber-100' 
    },
    { 
      label: 'This Month Expenses', 
      value: `$${stats.thisMonthExpenses.toLocaleString()}`, 
      icon: Receipt, 
      color: 'text-rose-600', 
      bg: 'bg-rose-100' 
    },
    { 
      label: 'Savings Progress', 
      value: `${stats.savingsProgress}%`, 
      icon: PiggyBank, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-100' 
    },
    { 
      label: 'Active Goals', 
      value: stats.activeGoals.toString(), 
      icon: Target, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100' 
    }
  ];

  const handleModuleClick = (moduleId) => {
    if (onNavigate) {
      onNavigate(moduleId);
    }
  };

  const handleDropdownSelect = (value) => {
    if (value && value !== 'hub') {
      handleModuleClick(value);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading accounting data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${sidebarCollapsed ? '' : ''}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Accounting Hub</h1>
              <p className="text-slate-600">Manage business operations and personal finances</p>
            </div>
          </div>

          {/* Quick Access Dropdown */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchAllStats}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 hidden sm:inline">Quick Access:</span>
            <Select onValueChange={handleDropdownSelect}>
              <SelectTrigger className="w-[220px] bg-white/60 backdrop-blur-sm border-white/30">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-white/30">
                <SelectItem value="business-operations">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Business Operations</span>
                  </div>
                </SelectItem>
                <SelectItem value="personal-budgeting">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-violet-600" />
                    <span>Personal Budgeting</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index}
                className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 hover:bg-white/80 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {accountingModules.map((module) => {
          const Icon = module.icon;
          return (
            <Card
              key={module.id}
              className={`
                relative overflow-hidden cursor-pointer
                transition-all duration-300 hover:shadow-2xl hover:-translate-y-1
                bg-gradient-to-br ${module.bgGradient}
                border-2 ${module.borderColor}
                ${module.hoverBorder}
              `}
              onClick={() => handleModuleClick(module.id)}
            >
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${module.color} blur-3xl`}></div>
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{module.stats.label}</p>
                    <p className="text-xl font-bold text-slate-800">{module.stats.value}</p>
                    {module.stats.trend && (
                      <span className="text-xs text-emerald-600 font-medium">{module.stats.trend}</span>
                    )}
                  </div>
                </div>
                <CardTitle className="text-xl mt-3">{module.title}</CardTitle>
                <CardDescription className="text-slate-600">
                  {module.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-2 mb-4">
                  {module.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-slate-700">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${module.color}`}></div>
                      {feature}
                    </div>
                  ))}
                </div>

                <Button 
                  className={`w-full bg-gradient-to-r ${module.color} hover:opacity-90 text-white shadow-lg`}
                >
                  Open {module.title}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest transactions and updates</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No recent activity</p>
              <p className="text-sm text-slate-400">Your transactions will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      item.type === 'invoice' ? 'bg-emerald-500' : 
                      item.type === 'expense' ? 'bg-rose-500' : 
                      item.type === 'income' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.desc}</p>
                      <p className="text-xs text-slate-500">{item.time}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${item.color}`}>{item.amount}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
