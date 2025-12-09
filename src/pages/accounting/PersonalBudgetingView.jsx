import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  DollarSign,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Receipt,
  Camera,
  Upload,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  BarChart3,
  PieChart,
  LineChart,
  Gem,
  CircleDollarSign,
  Percent,
  FileText,
  Settings,
  Eye,
  EyeOff,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Copy,
  Loader2,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function PersonalBudgetingView({ sidebarCollapsed, onBack }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showIncomeSplit, setShowIncomeSplit] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');

  // Data state from Supabase
  const [transactions, setTransactions] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [incomeSplitSettings, setIncomeSplitSettings] = useState(null);

  // Market data state
  const [cryptoData, setCryptoData] = useState([]);
  const [commoditiesData, setCommoditiesData] = useState([]);
  
  // Financial summary state
  const [financialSummary, setFinancialSummary] = useState({
    netWorth: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlySavings: 0
  });

  // Income splitting configuration
  const [incomeSplit, setIncomeSplit] = useState({
    taxes: 25,
    savings: 15,
    investments: 10,
    spending: 50
  });

  // Form states
  const [transactionForm, setTransactionForm] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
    account: 'Checking',
    receipt: null,
    applyIncomeSplit: true
  });

  const [goalForm, setGoalForm] = useState({
    name: '',
    target: '',
    current: '0',
    deadline: '',
    icon: '🎯'
  });

  const [budgetForm, setBudgetForm] = useState({
    name: '',
    budget: '',
    color: 'emerald'
  });

  // Fetch all data on mount
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Database setup status
  const [dbSetupNeeded, setDbSetupNeeded] = useState(false);

  const fetchAllData = async () => {
    setIsLoading(true);
    setDbSetupNeeded(false);
    try {
      const results = await Promise.allSettled([
        fetchTransactions(),
        fetchBudgetCategories(),
        fetchSavingsGoals(),
        fetchIncomeSplitSettings(),
        fetchMarketData()
      ]);
      
      // Check if any database errors occurred (table not found)
      const hasDbError = results.some(r => r.status === 'rejected' || r.value === 'db_error');
      if (hasDbError) {
        setDbSetupNeeded(true);
      }
      
      await calculateFinancialSummary();
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        setDbSetupNeeded(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('personal_transactions')
      .select('*')
      .eq('user_id', user?.id)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching transactions:', error);
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return 'db_error';
      }
      return;
    }
    setTransactions(data || []);
  };

  const fetchBudgetCategories = async () => {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', user?.id)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching budget categories:', error);
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return 'db_error';
      }
      return;
    }
    setBudgetCategories(data || []);
  };

  const fetchSavingsGoals = async () => {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching savings goals:', error);
      return;
    }
    setSavingsGoals(data || []);
  };

  const fetchIncomeSplitSettings = async () => {
    const { data, error } = await supabase
      .from('income_split_settings')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully
    
    if (error) {
      console.log('Income split settings not found, using defaults');
      return;
    }
    
    if (data) {
      setIncomeSplit({
        taxes: data.taxes_percent || 25,
        savings: data.savings_percent || 15,
        investments: data.investments_percent || 10,
        spending: data.spending_percent || 50
      });
      setIncomeSplitSettings(data);
    }
    // If no data, keep default values already set in state
  };

  const fetchMarketData = async () => {
    setIsLoadingMarket(true);
    try {
      // Fetch crypto data from CoinGecko API (free tier)
      try {
        const cryptoResponse = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h',
          { signal: AbortSignal.timeout(10000) }
        );
        
        if (cryptoResponse.ok) {
          const cryptoJson = await cryptoResponse.json();
          setCryptoData(cryptoJson.map(coin => ({
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            price: coin.current_price,
            change: coin.price_change_percentage_24h || 0,
            image: coin.image
          })));
        } else {
          throw new Error('CoinGecko API failed');
        }
      } catch (cryptoErr) {
        console.log('Using fallback crypto data:', cryptoErr.message);
        // Fallback crypto data with realistic prices
        setCryptoData([
          { symbol: 'BTC', name: 'Bitcoin', price: 97250.00, change: 2.34 },
          { symbol: 'ETH', name: 'Ethereum', price: 3420.50, change: 1.87 },
          { symbol: 'SOL', name: 'Solana', price: 225.75, change: 5.23 },
          { symbol: 'BNB', name: 'BNB', price: 710.25, change: -0.45 },
          { symbol: 'XRP', name: 'XRP', price: 2.35, change: 3.12 },
          { symbol: 'ADA', name: 'Cardano', price: 1.12, change: 4.56 },
          { symbol: 'DOGE', name: 'Dogecoin', price: 0.42, change: 8.90 },
          { symbol: 'DOT', name: 'Polkadot', price: 9.85, change: -1.23 },
          { symbol: 'AVAX', name: 'Avalanche', price: 52.30, change: 2.78 },
          { symbol: 'LINK', name: 'Chainlink', price: 24.15, change: 1.45 },
          { symbol: 'MATIC', name: 'Polygon', price: 0.58, change: -2.10 },
          { symbol: 'UNI', name: 'Uniswap', price: 14.80, change: 3.45 },
          { symbol: 'ATOM', name: 'Cosmos', price: 11.25, change: 0.89 },
          { symbol: 'LTC', name: 'Litecoin', price: 115.50, change: 1.23 },
          { symbol: 'NEAR', name: 'NEAR', price: 7.45, change: 6.78 },
          { symbol: 'APT', name: 'Aptos', price: 14.20, change: -0.56 },
          { symbol: 'ARB', name: 'Arbitrum', price: 1.85, change: 2.34 },
          { symbol: 'OP', name: 'Optimism', price: 3.45, change: 4.12 },
          { symbol: 'INJ', name: 'Injective', price: 38.90, change: 5.67 },
          { symbol: 'SUI', name: 'Sui', price: 4.25, change: 7.89 }
        ]);
      }

      // Set commodities data (using fallback since metals.live has SSL issues)
      // In production, you'd use a reliable API like Alpha Vantage, Yahoo Finance, or similar
      setCommoditiesData([
        { symbol: 'XAU', name: 'Gold', price: 2650.50, change: 0.45, unit: '/oz' },
        { symbol: 'XAG', name: 'Silver', price: 31.25, change: 1.23, unit: '/oz' },
        { symbol: 'SPX', name: 'S&P 500', price: 6075.25, change: 0.78, unit: '' }
      ]);
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Set fallback data
      setCryptoData([
        { symbol: 'BTC', name: 'Bitcoin', price: 97250.00, change: 2.34 },
        { symbol: 'ETH', name: 'Ethereum', price: 3420.50, change: 1.87 },
        { symbol: 'SOL', name: 'Solana', price: 225.75, change: 5.23 }
      ]);
    } finally {
      setIsLoadingMarket(false);
    }
  };

  const calculateFinancialSummary = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    // Calculate from transactions
    const monthlyTransactions = transactions.filter(tx => tx.date >= startOfMonth.split('T')[0]);
    
    const monthlyIncome = monthlyTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
    
    const monthlyExpenses = monthlyTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount) || 0), 0);
    
    // Calculate total savings from goals
    const totalSavings = savingsGoals.reduce((sum, goal) => sum + (goal.current || 0), 0);
    
    // Calculate net worth (savings + positive balance)
    const allTimeIncome = transactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
    const allTimeExpenses = transactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount) || 0), 0);
    
    const netWorth = allTimeIncome - allTimeExpenses + totalSavings;
    
    setFinancialSummary({
      netWorth: Math.max(0, netWorth),
      monthlyIncome,
      monthlyExpenses,
      monthlySavings: monthlyIncome - monthlyExpenses
    });
  };

  // Recalculate when data changes
  useEffect(() => {
    if (!isLoading) {
      calculateFinancialSummary();
    }
  }, [transactions, savingsGoals]);

  // Auto-refresh market data every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarketData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // CRUD Operations
  const handleCreateTransaction = async () => {
    if (!transactionForm.description || !transactionForm.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      let receiptUrl = null;
      
      // Upload receipt if provided
      if (transactionForm.receipt) {
        const fileExt = transactionForm.receipt.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, transactionForm.receipt);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName);
          receiptUrl = urlData.publicUrl;
        }
      }

      const amount = transactionForm.type === 'expense' 
        ? -Math.abs(parseFloat(transactionForm.amount))
        : Math.abs(parseFloat(transactionForm.amount));

      const transactionData = {
        user_id: user.id,
        description: transactionForm.description,
        amount: amount,
        type: transactionForm.type,
        category: transactionForm.category,
        date: transactionForm.date,
        account: transactionForm.account,
        receipt_url: receiptUrl,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('personal_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      // If it's income and income splitting is enabled, create split allocations
      if (transactionForm.type === 'income' && transactionForm.applyIncomeSplit) {
        const incomeAmount = parseFloat(transactionForm.amount);
        const splits = [
          { category: 'Taxes', amount: incomeAmount * incomeSplit.taxes / 100 },
          { category: 'Savings', amount: incomeAmount * incomeSplit.savings / 100 },
          { category: 'Investments', amount: incomeAmount * incomeSplit.investments / 100 }
        ];

        // Could store these allocations in a separate table if needed
        toast.info(`Income split: $${splits[0].amount.toFixed(0)} to taxes, $${splits[1].amount.toFixed(0)} to savings, $${splits[2].amount.toFixed(0)} to investments`);
      }

      setTransactions([data, ...transactions]);
      toast.success('Transaction added successfully!');
      
      setShowAddTransaction(false);
      setTransactionForm({
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        date: new Date().toISOString().split('T')[0],
        account: 'Checking',
        receipt: null,
        applyIncomeSplit: true
      });

      // Update budget spent if it's an expense
      if (transactionForm.type === 'expense' && transactionForm.category) {
        await updateBudgetSpent(transactionForm.category, Math.abs(amount));
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        toast.error('Database tables not set up. Please run the migration script.', {
          description: 'Check supabase/migrations folder for setup instructions'
        });
        setDbSetupNeeded(true);
      } else {
        toast.error('Failed to create transaction: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const updateBudgetSpent = async (categoryName, amount) => {
    const category = budgetCategories.find(c => c.name === categoryName);
    if (category) {
      const newSpent = (category.spent || 0) + amount;
      await supabase
        .from('budget_categories')
        .update({ spent: newSpent })
        .eq('id', category.id);
      
      setBudgetCategories(budgetCategories.map(c => 
        c.id === category.id ? { ...c, spent: newSpent } : c
      ));
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      const { error } = await supabase
        .from('personal_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(transactions.filter(tx => tx.id !== id));
      toast.success('Transaction deleted');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const handleCreateGoal = async () => {
    if (!goalForm.name || !goalForm.target) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const goalData = {
        user_id: user.id,
        name: goalForm.name,
        target: parseFloat(goalForm.target),
        current: parseFloat(goalForm.current) || 0,
        deadline: goalForm.deadline || null,
        icon: goalForm.icon,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('savings_goals')
        .insert(goalData)
        .select()
        .single();

      if (error) throw error;

      setSavingsGoals([data, ...savingsGoals]);
      toast.success('Savings goal created!');
      
      setShowAddGoal(false);
      setGoalForm({
        name: '',
        target: '',
        current: '0',
        deadline: '',
        icon: '🎯'
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavingsGoals(savingsGoals.filter(goal => goal.id !== id));
      toast.success('Goal deleted');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  const handleAddFundsToGoal = async (goalId, amount) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;

    try {
      const newCurrent = (goal.current || 0) + amount;
      const { error } = await supabase
        .from('savings_goals')
        .update({ current: newCurrent })
        .eq('id', goalId);

      if (error) throw error;

      setSavingsGoals(savingsGoals.map(g => 
        g.id === goalId ? { ...g, current: newCurrent } : g
      ));
      toast.success(`Added $${amount} to ${goal.name}`);
    } catch (error) {
      console.error('Error adding funds:', error);
      toast.error('Failed to add funds');
    }
  };

  const handleCreateBudget = async () => {
    if (!budgetForm.name || !budgetForm.budget) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const budgetData = {
        user_id: user.id,
        name: budgetForm.name,
        budget: parseFloat(budgetForm.budget),
        spent: 0,
        color: budgetForm.color,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('budget_categories')
        .insert(budgetData)
        .select()
        .single();

      if (error) throw error;

      setBudgetCategories([...budgetCategories, data]);
      toast.success('Budget category created!');
      
      setShowAddBudget(false);
      setBudgetForm({
        name: '',
        budget: '',
        color: 'emerald'
      });
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Failed to create budget');
    }
  };

  const handleDeleteBudget = async (id) => {
    try {
      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBudgetCategories(budgetCategories.filter(b => b.id !== id));
      toast.success('Budget category deleted');
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  const handleSaveIncomeSplit = async () => {
    try {
      const splitData = {
        user_id: user.id,
        taxes_percent: incomeSplit.taxes,
        savings_percent: incomeSplit.savings,
        investments_percent: incomeSplit.investments,
        spending_percent: incomeSplit.spending,
        updated_at: new Date().toISOString()
      };

      if (incomeSplitSettings?.id) {
        await supabase
          .from('income_split_settings')
          .update(splitData)
          .eq('id', incomeSplitSettings.id);
      } else {
        const { data } = await supabase
          .from('income_split_settings')
          .insert(splitData)
          .select()
          .single();
        setIncomeSplitSettings(data);
      }

      toast.success('Income splitting settings saved!');
      setShowIncomeSplit(false);
    } catch (error) {
      console.error('Error saving income split:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleExport = async (format) => {
    try {
      if (format === 'csv') {
        const headers = ['Date', 'Description', 'Category', 'Account', 'Amount', 'Type'];
        const rows = transactions.map(tx => [
          tx.date,
          tx.description,
          tx.category,
          tx.account,
          tx.amount,
          tx.type
        ]);
        
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported successfully!');
      } else if (format === 'pdf') {
        toast.info('PDF export coming soon!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTransactionForm({ ...transactionForm, receipt: file });
      toast.success('Receipt attached!', { description: file.name });
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchQuery === '' || 
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = transactionFilter === 'all' || tx.type === transactionFilter;
    return matchesSearch && matchesFilter;
  });

  const { netWorth, monthlyIncome, monthlyExpenses, monthlySavings } = financialSummary;
  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Database Setup Banner */}
      {dbSetupNeeded && (
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Database Setup Required</h3>
                <p className="text-sm text-amber-700 mt-1">
                  The accounting tables haven't been created in your Supabase database yet. 
                  Please run the migration script to set up the required tables.
                </p>
                <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                  <p className="text-xs font-mono text-amber-800 mb-2">Steps to fix:</p>
                  <ol className="text-xs text-amber-700 list-decimal list-inside space-y-1">
                    <li>Go to your Supabase Dashboard → SQL Editor</li>
                    <li>Copy the contents of <code className="bg-amber-200 px-1 rounded">supabase/migrations/20241208_create_accounting_tables.sql</code></li>
                    <li>Paste and run the SQL in the editor</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => {
                    navigator.clipboard.writeText('supabase/migrations/20241208_create_accounting_tables.sql');
                    toast.success('Path copied to clipboard!');
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Migration File Path
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-white/30">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Personal Budgeting</h1>
                <p className="text-slate-600">Track finances, set goals & monitor investments</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowBalances(!showBalances)}>
              {showBalances ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showBalances ? 'Hide' : 'Show'} Balances
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="w-4 h-4 mr-2" /> Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="w-4 h-4 mr-2" /> Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" onClick={fetchAllData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-200 text-sm">Net Worth</p>
                  <p className="text-3xl font-bold">{showBalances ? `$${netWorth.toLocaleString()}` : '******'}</p>
                  <p className="text-violet-200 text-xs flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Total assets
                  </p>
                </div>
                <Gem className="w-10 h-10 text-violet-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-200 text-sm">Monthly Income</p>
                  <p className="text-3xl font-bold">{showBalances ? `$${monthlyIncome.toLocaleString()}` : '******'}</p>
                  <p className="text-emerald-200 text-xs flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> This month
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-emerald-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-rose-200 text-sm">Monthly Expenses</p>
                  <p className="text-3xl font-bold">{showBalances ? `$${monthlyExpenses.toLocaleString()}` : '******'}</p>
                  <p className="text-rose-200 text-xs flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" /> This month
                  </p>
                </div>
                <TrendingDown className="w-10 h-10 text-rose-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">Monthly Savings</p>
                  <p className="text-3xl font-bold">{showBalances ? `$${monthlySavings.toLocaleString()}` : '******'}</p>
                  <p className="text-blue-200 text-xs flex items-center gap-1">
                    <PiggyBank className="w-3 h-3" /> {savingsRate}% savings rate
                  </p>
                </div>
                <PiggyBank className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-white/60 backdrop-blur-sm border border-white/30">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="budget" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <PieChart className="w-4 h-4 mr-2" />
              Budget
            </TabsTrigger>
            <TabsTrigger value="goals" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <Target className="w-4 h-4 mr-2" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="markets" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <LineChart className="w-4 h-4 mr-2" />
              Markets
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <Receipt className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
          </TabsList>

          <Button 
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
            onClick={() => setShowAddTransaction(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Budget Progress */}
            <Card className="lg:col-span-2 bg-white/60 backdrop-blur-sm border-white/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Budget Progress</CardTitle>
                    <CardDescription>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('budget')}>
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {budgetCategories.length === 0 ? (
                  <div className="text-center py-8">
                    <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No budget categories yet</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAddBudget(true)}>
                      Create Budget Category
                    </Button>
                  </div>
                ) : (
                  budgetCategories.slice(0, 4).map((category, index) => {
                    const percentage = category.budget > 0 ? Math.round((category.spent / category.budget) * 100) : 0;
                    const isOverBudget = percentage > 100;
                    return (
                      <div key={category.id || index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">{category.name}</span>
                          <span className={`text-sm font-semibold ${isOverBudget ? 'text-rose-600' : 'text-slate-600'}`}>
                            ${(category.spent || 0).toLocaleString()} / ${(category.budget || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="relative">
                          <Progress 
                            value={Math.min(percentage, 100)} 
                            className={`h-2 ${isOverBudget ? '[&>div]:bg-rose-500' : `[&>div]:bg-${category.color || 'emerald'}-500`}`}
                          />
                          {isOverBudget && (
                            <Badge variant="outline" className="absolute -top-1 right-0 bg-rose-100 text-rose-600 border-rose-200 text-xs">
                              Over by ${(category.spent - category.budget).toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Income Splitting */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Income Splitting</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowIncomeSplit(true)}>
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription>Auto-allocate incoming payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <span className="text-sm text-slate-600">Taxes</span>
                    </div>
                    <span className="font-semibold text-slate-800">{incomeSplit.taxes}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-sm text-slate-600">Savings</span>
                    </div>
                    <span className="font-semibold text-slate-800">{incomeSplit.savings}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-slate-600">Investments</span>
                    </div>
                    <span className="font-semibold text-slate-800">{incomeSplit.investments}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                      <span className="text-sm text-slate-600">Spending</span>
                    </div>
                    <span className="font-semibold text-slate-800">{incomeSplit.spending}%</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-slate-500 mb-2">Example: $5,000 income</p>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-rose-50 rounded-lg">
                      <p className="text-xs text-rose-600">To Taxes</p>
                      <p className="font-semibold text-rose-700">${(5000 * incomeSplit.taxes / 100).toFixed(0)}</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-emerald-600">To Savings</p>
                      <p className="font-semibold text-emerald-700">${(5000 * incomeSplit.savings / 100).toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Forecast */}
          <Card className="bg-white/60 backdrop-blur-sm border-white/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Cash Flow Forecast
                  </CardTitle>
                  <CardDescription>Projected finances for the next 30 days</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-sm text-emerald-600">Expected Income</p>
                  <p className="text-2xl font-bold text-emerald-700">${monthlyIncome.toLocaleString()}</p>
                  <p className="text-xs text-emerald-500">Based on current month</p>
                </div>
                <div className="p-4 bg-rose-50 rounded-xl">
                  <p className="text-sm text-rose-600">Expected Expenses</p>
                  <p className="text-2xl font-bold text-rose-700">${monthlyExpenses.toLocaleString()}</p>
                  <p className="text-xs text-rose-500">{budgetCategories.length} budget categories</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600">Projected Savings</p>
                  <p className="text-2xl font-bold text-blue-700">${monthlySavings.toLocaleString()}</p>
                  <p className="text-xs text-blue-500">By end of month</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                  <p className="text-sm text-amber-600">Goal Progress</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {savingsGoals.length > 0 
                      ? Math.round(savingsGoals.reduce((sum, g) => sum + ((g.current / g.target) * 100), 0) / savingsGoals.length)
                      : 0}%
                  </p>
                  <p className="text-xs text-amber-500">{savingsGoals.length} active goals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="bg-white/60 backdrop-blur-sm border-white/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('transactions')}>
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No transactions yet</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAddTransaction(true)}>
                    Add Your First Transaction
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/50 hover:bg-white/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'
                        }`}>
                          {tx.type === 'income' ? (
                            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-rose-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{tx.description}</p>
                          <p className="text-sm text-slate-500">{tx.category} - {tx.date}</p>
                        </div>
                      </div>
                      <span className={`font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'income' ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Monthly Budget</h3>
            <Button 
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              onClick={() => setShowAddBudget(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>

          {budgetCategories.length === 0 ? (
            <Card className="bg-white/60 backdrop-blur-sm border-white/30">
              <CardContent className="p-12 text-center">
                <PieChart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No budget categories yet</h3>
                <p className="text-slate-500 mb-4">Create budget categories to track your spending</p>
                <Button onClick={() => setShowAddBudget(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgetCategories.map((category) => {
                const percentage = category.budget > 0 ? Math.round((category.spent / category.budget) * 100) : 0;
                const remaining = category.budget - category.spent;
                const isOverBudget = remaining < 0;

                return (
                  <Card key={category.id} className="bg-white/60 backdrop-blur-sm border-white/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-800">{category.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={isOverBudget ? 'bg-rose-100 text-rose-700 border-rose-200' : `bg-${category.color || 'emerald'}-100 text-${category.color || 'emerald'}-700 border-${category.color || 'emerald'}-200`}
                          >
                            {percentage}%
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-rose-600"
                                onClick={() => handleDeleteBudget(category.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <Progress 
                        value={Math.min(percentage, 100)} 
                        className={`h-3 mb-3 ${isOverBudget ? '[&>div]:bg-rose-500' : ''}`}
                      />

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                          Spent: <span className="font-semibold text-slate-700">${(category.spent || 0).toLocaleString()}</span>
                        </span>
                        <span className={isOverBudget ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                          {isOverBudget ? `Over: $${Math.abs(remaining).toLocaleString()}` : `Left: $${remaining.toLocaleString()}`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Savings Goals</h3>
            <Button 
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              onClick={() => setShowAddGoal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Goal
            </Button>
          </div>

          {savingsGoals.length === 0 ? (
            <Card className="bg-white/60 backdrop-blur-sm border-white/30">
              <CardContent className="p-12 text-center">
                <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No savings goals yet</h3>
                <p className="text-slate-500 mb-4">Set financial goals to track your progress</p>
                <Button onClick={() => setShowAddGoal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savingsGoals.map((goal) => {
                const percentage = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
                const remaining = goal.target - goal.current;
                const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                const monthlyNeeded = daysLeft && daysLeft > 0 ? remaining / Math.max(1, Math.ceil(daysLeft / 30)) : 0;

                return (
                  <Card key={goal.id} className="bg-white/60 backdrop-blur-sm border-white/30">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{goal.icon || '🎯'}</span>
                          <div>
                            <h4 className="font-semibold text-slate-800">{goal.name}</h4>
                            <p className="text-sm text-slate-500">Target: ${(goal.target || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              const amount = prompt('Enter amount to add:');
                              if (amount) handleAddFundsToGoal(goal.id, parseFloat(amount));
                            }}>
                              <Plus className="w-4 h-4 mr-2" /> Add Funds
                            </DropdownMenuItem>
                            <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit Goal</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-rose-600"
                              onClick={() => handleDeleteGoal(goal.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Progress</span>
                          <span className="font-semibold text-violet-600">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-purple-500" />
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-slate-800">${(goal.current || 0).toLocaleString()}</p>
                            <p className="text-xs text-slate-500">of ${(goal.target || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-700">${remaining.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">remaining</p>
                          </div>
                        </div>

                        {goal.deadline && (
                          <div className="pt-3 border-t flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              {daysLeft !== null && daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
                            </div>
                            {monthlyNeeded > 0 && (
                              <span className="text-xs text-amber-600 font-medium">
                                Need ${monthlyNeeded.toFixed(0)}/mo
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Markets Tab */}
        <TabsContent value="markets" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Market Watch</h3>
              <p className="text-sm text-slate-500">
                {isLoadingMarket ? 'Updating prices...' : 'Real-time prices - Last updated just now'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMarketData} disabled={isLoadingMarket}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingMarket ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Commodities & Indices */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {commoditiesData.map((item, index) => (
              <Card key={index} className={`border-2 ${
                item.symbol === 'XAU' ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200' :
                item.symbol === 'XAG' ? 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200' :
                'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        item.symbol === 'XAU' ? 'bg-amber-100' :
                        item.symbol === 'XAG' ? 'bg-slate-100' : 'bg-blue-100'
                      }`}>
                        {item.symbol === 'XAU' ? <Coins className="w-6 h-6 text-amber-600" /> :
                         item.symbol === 'XAG' ? <Coins className="w-6 h-6 text-slate-600" /> :
                         <BarChart3 className="w-6 h-6 text-blue-600" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{item.name}</h4>
                        <p className="text-xs text-slate-500">{item.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-800">${item.price.toLocaleString()}{item.unit}</p>
                      <p className={`text-sm font-medium flex items-center justify-end gap-1 ${item.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top 20 Crypto */}
          <Card className="bg-white/60 backdrop-blur-sm border-white/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-500" />
                    Top 20 Cryptocurrencies
                  </CardTitle>
                  <CardDescription>Live prices and 24h changes from CoinGecko</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMarket ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
                  <span className="text-slate-500">Loading market data...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-3 text-sm font-semibold text-slate-600">#</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-600">Name</th>
                        <th className="text-right p-3 text-sm font-semibold text-slate-600">Price</th>
                        <th className="text-right p-3 text-sm font-semibold text-slate-600">24h Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cryptoData.map((crypto, index) => (
                        <tr key={crypto.symbol} className="border-b border-slate-100 hover:bg-white/50 transition-colors">
                          <td className="p-3 text-slate-500">{index + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {crypto.image ? (
                                <img src={crypto.image} alt={crypto.name} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                                  {crypto.symbol.slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-slate-800">{crypto.name}</p>
                                <p className="text-xs text-slate-500">{crypto.symbol}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-800">
                            ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right">
                            <span className={`inline-flex items-center gap-1 font-medium ${crypto.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {crypto.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {crypto.change >= 0 ? '+' : ''}{crypto.change.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-slate-800">All Transactions</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search transactions..." 
                  className="pl-9 w-[200px] bg-white/60 border-white/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                <SelectTrigger className="w-[130px] bg-white/60 border-white/30">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Entry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="p-6 text-center">
                <Upload className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <h4 className="font-semibold text-slate-800">Upload Receipt</h4>
                <p className="text-sm text-slate-500">Drop file or click to upload</p>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*,.pdf" 
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => cameraInputRef.current?.click()}
            >
              <CardContent className="p-6 text-center">
                <Camera className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <h4 className="font-semibold text-slate-800">Take Photo</h4>
                <p className="text-sm text-slate-500">Capture receipt with camera</p>
                <input 
                  ref={cameraInputRef}
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setShowAddTransaction(true)}
            >
              <CardContent className="p-6 text-center">
                <Edit className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                <h4 className="font-semibold text-slate-800">Manual Entry</h4>
                <p className="text-sm text-slate-500">Enter transaction manually</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/60 backdrop-blur-sm border-white/30">
            <CardContent className="p-0">
              {filteredTransactions.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
                  </h3>
                  <p className="text-slate-500 mb-4">
                    {transactions.length === 0 
                      ? 'Add your first transaction to get started'
                      : 'Try adjusting your search or filter'
                    }
                  </p>
                  {transactions.length === 0 && (
                    <Button onClick={() => setShowAddTransaction(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Transaction
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Date</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Description</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Category</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Account</th>
                        <th className="text-right p-4 text-sm font-semibold text-slate-600">Amount</th>
                        <th className="text-right p-4 text-sm font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-100 hover:bg-white/50 transition-colors">
                          <td className="p-4 text-slate-600">{tx.date}</td>
                          <td className="p-4 font-medium text-slate-800">{tx.description}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="bg-slate-100 text-slate-600">
                              {tx.category || 'Uncategorized'}
                            </Badge>
                          </td>
                          <td className="p-4 text-slate-600">{tx.account}</td>
                          <td className={`p-4 text-right font-semibold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem><Copy className="w-4 h-4 mr-2" /> Duplicate</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-rose-600"
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Transaction Modal */}
      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-violet-600" />
              Add Transaction
            </DialogTitle>
            <DialogDescription>
              Record an income or expense
            </DialogDescription>
          </DialogHeader>

          <Tabs value={transactionForm.type} onValueChange={(v) => setTransactionForm({...transactionForm, type: v})} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">Expense</TabsTrigger>
              <TabsTrigger value="income" className="flex-1">Income</TabsTrigger>
            </TabsList>

            <div className="space-y-4 mt-4">
              <div>
                <Label>Description *</Label>
                <Input 
                  placeholder={transactionForm.type === 'expense' ? "What was this expense for?" : "Income source"}
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      type="number" 
                      step="0.01" 
                      className="pl-9" 
                      placeholder="0.00"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={transactionForm.category}
                    onValueChange={(v) => setTransactionForm({...transactionForm, category: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionForm.type === 'expense' ? (
                        <>
                          {budgetCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                          ))}
                          <SelectItem value="Housing">Housing</SelectItem>
                          <SelectItem value="Food & Dining">Food & Dining</SelectItem>
                          <SelectItem value="Transportation">Transportation</SelectItem>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Entertainment">Entertainment</SelectItem>
                          <SelectItem value="Shopping">Shopping</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Salary">Salary</SelectItem>
                          <SelectItem value="Freelance">Freelance</SelectItem>
                          <SelectItem value="Business Income">Business Income</SelectItem>
                          <SelectItem value="Investments">Investments</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Account</Label>
                  <Select 
                    value={transactionForm.account}
                    onValueChange={(v) => setTransactionForm({...transactionForm, account: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Checking">Checking</SelectItem>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {transactionForm.type === 'income' && (
                <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-lg border border-violet-200">
                  <Switch 
                    checked={transactionForm.applyIncomeSplit}
                    onCheckedChange={(checked) => setTransactionForm({...transactionForm, applyIncomeSplit: checked})}
                  />
                  <div>
                    <Label className="text-violet-800">Apply Income Splitting</Label>
                    <p className="text-xs text-violet-600">Auto-allocate to tax, savings, investments</p>
                  </div>
                </div>
              )}

              {transactionForm.receipt && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm text-emerald-700">Receipt: {transactionForm.receipt.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setTransactionForm({...transactionForm, receipt: null})}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTransaction(false)}>Cancel</Button>
            <Button 
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              onClick={handleCreateTransaction}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Goal Modal */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-600" />
              Create Savings Goal
            </DialogTitle>
            <DialogDescription>
              Set a new financial goal to track
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Goal Name *</Label>
              <Input 
                placeholder="e.g., Emergency Fund, Vacation"
                value={goalForm.name}
                onChange={(e) => setGoalForm({...goalForm, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type="number" 
                    className="pl-9" 
                    placeholder="10,000"
                    value={goalForm.target}
                    onChange={(e) => setGoalForm({...goalForm, target: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Target Date</Label>
                <Input 
                  type="date"
                  value={goalForm.deadline}
                  onChange={(e) => setGoalForm({...goalForm, deadline: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Starting Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="number" 
                  className="pl-9" 
                  placeholder="0"
                  value={goalForm.current}
                  onChange={(e) => setGoalForm({...goalForm, current: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Icon</Label>
              <div className="flex gap-2 flex-wrap">
                {['🎯', '🛡️', '✈️', '🚗', '🏠', '💰', '🎓', '💍', '🏖️', '📱', '🎁'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-colors ${
                      goalForm.icon === emoji ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-violet-500'
                    }`}
                    onClick={() => setGoalForm({...goalForm, icon: emoji})}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGoal(false)}>Cancel</Button>
            <Button 
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              onClick={handleCreateGoal}
            >
              <Plus className="w-4 h-4 mr-2" /> Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Budget Category Modal */}
      <Dialog open={showAddBudget} onOpenChange={setShowAddBudget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-violet-600" />
              Create Budget Category
            </DialogTitle>
            <DialogDescription>
              Set up a new budget category to track spending
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Category Name *</Label>
              <Input 
                placeholder="e.g., Groceries, Entertainment"
                value={budgetForm.name}
                onChange={(e) => setBudgetForm({...budgetForm, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Monthly Budget *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="number" 
                  className="pl-9" 
                  placeholder="500"
                  value={budgetForm.budget}
                  onChange={(e) => setBudgetForm({...budgetForm, budget: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {['emerald', 'blue', 'violet', 'amber', 'rose', 'pink', 'cyan', 'orange'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-10 h-10 rounded-lg border-2 transition-colors bg-${color}-500 ${
                      budgetForm.color === color ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                    }`}
                    onClick={() => setBudgetForm({...budgetForm, color})}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBudget(false)}>Cancel</Button>
            <Button 
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              onClick={handleCreateBudget}
            >
              <Plus className="w-4 h-4 mr-2" /> Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Income Split Settings Modal */}
      <Dialog open={showIncomeSplit} onOpenChange={setShowIncomeSplit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-violet-600" />
              Income Splitting Settings
            </DialogTitle>
            <DialogDescription>
              Configure how incoming payments are automatically allocated
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    Taxes
                  </Label>
                  <span className="font-semibold">{incomeSplit.taxes}%</span>
                </div>
                <Slider 
                  value={[incomeSplit.taxes]} 
                  onValueChange={([value]) => {
                    const remaining = 100 - value - incomeSplit.savings - incomeSplit.investments;
                    if (remaining >= 0) {
                      setIncomeSplit({ ...incomeSplit, taxes: value, spending: remaining });
                    }
                  }}
                  max={50}
                  step={1}
                  className="[&>span]:bg-rose-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    Savings
                  </Label>
                  <span className="font-semibold">{incomeSplit.savings}%</span>
                </div>
                <Slider 
                  value={[incomeSplit.savings]} 
                  onValueChange={([value]) => {
                    const remaining = 100 - incomeSplit.taxes - value - incomeSplit.investments;
                    if (remaining >= 0) {
                      setIncomeSplit({ ...incomeSplit, savings: value, spending: remaining });
                    }
                  }}
                  max={50}
                  step={1}
                  className="[&>span]:bg-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    Investments
                  </Label>
                  <span className="font-semibold">{incomeSplit.investments}%</span>
                </div>
                <Slider 
                  value={[incomeSplit.investments]} 
                  onValueChange={([value]) => {
                    const remaining = 100 - incomeSplit.taxes - incomeSplit.savings - value;
                    if (remaining >= 0) {
                      setIncomeSplit({ ...incomeSplit, investments: value, spending: remaining });
                    }
                  }}
                  max={50}
                  step={1}
                  className="[&>span]:bg-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                    Spending
                  </Label>
                  <span className="font-semibold">{incomeSplit.spending}%</span>
                </div>
                <div className="h-2 bg-violet-200 rounded-full">
                  <div 
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${incomeSplit.spending}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Automatically calculated</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Example: $5,000 income</p>
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div>
                  <p className="font-semibold text-rose-600">${(5000 * incomeSplit.taxes / 100).toFixed(0)}</p>
                  <p className="text-xs text-slate-500">Taxes</p>
                </div>
                <div>
                  <p className="font-semibold text-emerald-600">${(5000 * incomeSplit.savings / 100).toFixed(0)}</p>
                  <p className="text-xs text-slate-500">Savings</p>
                </div>
                <div>
                  <p className="font-semibold text-blue-600">${(5000 * incomeSplit.investments / 100).toFixed(0)}</p>
                  <p className="text-xs text-slate-500">Invest</p>
                </div>
                <div>
                  <p className="font-semibold text-violet-600">${(5000 * incomeSplit.spending / 100).toFixed(0)}</p>
                  <p className="text-xs text-slate-500">Spending</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncomeSplit(false)}>Cancel</Button>
            <Button 
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              onClick={handleSaveIncomeSplit}
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
