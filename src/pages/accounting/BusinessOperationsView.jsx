import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  CreditCard,
  Receipt,
  Camera,
  Upload,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Eye,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Bell,
  Banknote,
  PiggyBank,
  X,
  Loader2
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function BusinessOperationsView({ sidebarCollapsed, onBack }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('invoices');
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  // Data state
  const [invoices, setInvoices] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dbSetupNeeded, setDbSetupNeeded] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstanding: 0,
    thisMonth: 0,
    totalExpenses: 0,
    outstandingCount: 0
  });

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    items: [{ description: '', quantity: 1, rate: 0 }],
    dueDate: '',
    notes: '',
    isRecurring: false,
    recurringInterval: 'monthly',
    paymentMethods: ['stripe', 'paypal', 'bank']
  });

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    receipt: null,
    isBillable: false,
    clientId: ''
  });

  // Fetch data from Supabase
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setIsLoading(true);
    setDbSetupNeeded(false);
    try {
      const results = await Promise.allSettled([
        fetchInvoices(),
        fetchEstimates(),
        fetchExpenses(),
        fetchPayments()
      ]);
      
      // Check if any database errors occurred
      const hasDbError = results.some(r => r.status === 'rejected' || r.value === 'db_error');
      if (hasDbError) {
        setDbSetupNeeded(true);
      }
      
      await calculateStats();
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setDbSetupNeeded(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching invoices:', error);
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return 'db_error';
      }
      return;
    }
    setInvoices(data || []);
  };

  const fetchEstimates = async () => {
    const { data, error } = await supabase
      .from('estimates')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching estimates:', error);
      return;
    }
    setEstimates(data || []);
  };

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('business_expenses')
      .select('*')
      .eq('user_id', user?.id)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching expenses:', error);
      return;
    }
    setExpenses(data || []);
  };

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching payments:', error);
      return;
    }
    setPayments(data || []);
  };

  const calculateStats = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    // Calculate total revenue from paid invoices
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    // Calculate outstanding
    const pendingInvoices = invoices.filter(inv => ['pending', 'sent', 'overdue'].includes(inv.status));
    const outstanding = pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    // Calculate this month
    const thisMonthInvoices = paidInvoices.filter(inv => inv.paid_at >= startOfMonth);
    const thisMonth = thisMonthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    setStats({
      totalRevenue,
      outstanding,
      thisMonth,
      totalExpenses,
      outstandingCount: pendingInvoices.length
    });
  };

  // Recalculate stats when invoices or expenses change
  useEffect(() => {
    if (!isLoading) {
      calculateStats();
    }
  }, [invoices, expenses]);

  const getStatusBadge = (status) => {
    const styles = {
      paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      overdue: 'bg-rose-100 text-rose-700 border-rose-200',
      draft: 'bg-slate-100 text-slate-700 border-slate-200',
      sent: 'bg-blue-100 text-blue-700 border-blue-200',
      accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      declined: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return styles[status] || styles.draft;
  };

  const addInvoiceItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { description: '', quantity: 1, rate: 0 }]
    });
  };

  const updateInvoiceItem = (index, field, value) => {
    const newItems = [...invoiceForm.items];
    newItems[index][field] = value;
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  const removeInvoiceItem = (index) => {
    if (invoiceForm.items.length > 1) {
      const newItems = invoiceForm.items.filter((_, i) => i !== index);
      setInvoiceForm({ ...invoiceForm, items: newItems });
    }
  };

  const calculateInvoiceTotal = () => {
    return invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const count = invoices.length + 1;
    return `INV-${year}-${String(count).padStart(3, '0')}`;
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.clientName || !invoiceForm.clientEmail) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const invoiceData = {
        user_id: user.id,
        invoice_number: generateInvoiceNumber(),
        client_name: invoiceForm.clientName,
        client_email: invoiceForm.clientEmail,
        client_phone: invoiceForm.clientPhone,
        items: invoiceForm.items,
        amount: calculateInvoiceTotal(),
        due_date: invoiceForm.dueDate,
        notes: invoiceForm.notes,
        is_recurring: invoiceForm.isRecurring,
        recurring_interval: invoiceForm.recurringInterval,
        payment_methods: invoiceForm.paymentMethods,
        status: 'draft',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (error) throw error;

      setInvoices([data, ...invoices]);
      toast.success('Invoice created successfully!', {
        description: `Invoice for ${invoiceForm.clientName} - $${calculateInvoiceTotal().toFixed(2)}`
      });
      
      setShowCreateInvoice(false);
      setInvoiceForm({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        items: [{ description: '', quantity: 1, rate: 0 }],
        dueDate: '',
        notes: '',
        isRecurring: false,
        recurringInterval: 'monthly',
        paymentMethods: ['stripe', 'paypal', 'bank']
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  const handleDeleteInvoice = async (id) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInvoices(invoices.filter(inv => inv.id !== id));
      toast.success('Invoice deleted');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleSendInvoice = async (invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', invoice.id);

      if (error) throw error;

      setInvoices(invoices.map(inv => 
        inv.id === invoice.id ? { ...inv, status: 'sent' } : inv
      ));
      toast.success('Invoice sent!');
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setExpenseForm({ ...expenseForm, receipt: file });
      toast.success('Receipt uploaded!', { description: file.name });
    }
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setExpenseForm({ ...expenseForm, receipt: file });
      toast.success('Receipt captured!', { description: 'Photo saved' });
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      let receiptUrl = null;
      
      // Upload receipt if provided
      if (expenseForm.receipt) {
        const fileExt = expenseForm.receipt.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, expenseForm.receipt);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName);
          receiptUrl = urlData.publicUrl;
        }
      }

      const expenseData = {
        user_id: user.id,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        date: expenseForm.date,
        receipt_url: receiptUrl,
        is_billable: expenseForm.isBillable,
        client_id: expenseForm.clientId || null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('business_expenses')
        .insert(expenseData)
        .select()
        .single();

      if (error) throw error;

      setExpenses([data, ...expenses]);
      toast.success('Expense recorded!', {
        description: `${expenseForm.description} - $${expenseForm.amount}`
      });
      
      setShowCreateExpense(false);
      setExpenseForm({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        receipt: null,
        isBillable: false,
        clientId: ''
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Failed to create expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      const { error } = await supabase
        .from('business_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExpenses(expenses.filter(exp => exp.id !== id));
      toast.success('Expense deleted');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchQuery === '' || 
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredEstimates = estimates.filter(estimate => {
    const matchesSearch = searchQuery === '' || 
      estimate.estimate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      estimate.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = searchQuery === '' || 
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const statsDisplay = [
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, change: '', icon: DollarSign, color: 'emerald', trend: 'up' },
    { label: 'Outstanding', value: `$${stats.outstanding.toLocaleString()}`, change: `${stats.outstandingCount} invoices`, icon: Clock, color: 'amber', trend: 'neutral' },
    { label: 'This Month', value: `$${stats.thisMonth.toLocaleString()}`, change: '', icon: TrendingUp, color: 'blue', trend: 'up' },
    { label: 'Expenses', value: `$${stats.totalExpenses.toLocaleString()}`, change: '', icon: Receipt, color: 'rose', trend: 'down' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading business data...</p>
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
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
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
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-white/30">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Business Operations</h1>
              <p className="text-slate-600">Manage invoices, estimates, payments & expenses</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statsDisplay.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-white/60 backdrop-blur-sm border-white/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                      {stat.change && (
                        <p className={`text-xs font-medium ${
                          stat.trend === 'up' ? 'text-emerald-600' : 
                          stat.trend === 'down' ? 'text-rose-600' : 'text-slate-500'
                        }`}>
                          {stat.change}
                        </p>
                      )}
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-white/60 backdrop-blur-sm border border-white/30">
            <TabsTrigger value="invoices" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="estimates" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Send className="w-4 h-4 mr-2" />
              Estimates ({estimates.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Receipt className="w-4 h-4 mr-2" />
              Expenses ({expenses.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <CreditCard className="w-4 h-4 mr-2" />
              Payments ({payments.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search..." 
                className="pl-9 w-[200px] bg-white/60 border-white/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] bg-white/60 border-white/30">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchAllData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">All Invoices</h3>
            <Button 
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              onClick={() => setShowCreateInvoice(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>

          <Card className="bg-white/60 backdrop-blur-sm border-white/30">
            <CardContent className="p-0">
              {filteredInvoices.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No invoices yet</h3>
                  <p className="text-slate-500 mb-4">Create your first invoice to get started</p>
                  <Button onClick={() => setShowCreateInvoice(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Invoice #</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Client</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Amount</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Status</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Date</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Due Date</th>
                        <th className="text-right p-4 text-sm font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-slate-100 hover:bg-white/50 transition-colors">
                          <td className="p-4 font-medium text-slate-800">{invoice.invoice_number}</td>
                          <td className="p-4 text-slate-700">{invoice.client_name}</td>
                          <td className="p-4 font-semibold text-slate-800">${(invoice.amount || 0).toLocaleString()}</td>
                          <td className="p-4">
                            <Badge variant="outline" className={getStatusBadge(invoice.status)}>
                              {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4 text-slate-600">{new Date(invoice.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-slate-600">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                                <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
                                  <Send className="w-4 h-4 mr-2" /> Send
                                </DropdownMenuItem>
                                <DropdownMenuItem><Copy className="w-4 h-4 mr-2" /> Duplicate</DropdownMenuItem>
                                <DropdownMenuItem><Download className="w-4 h-4 mr-2" /> Download PDF</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-rose-600"
                                  onClick={() => handleDeleteInvoice(invoice.id)}
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

        {/* Estimates Tab */}
        <TabsContent value="estimates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">All Estimates</h3>
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Estimate
            </Button>
          </div>

          <Card className="bg-white/60 backdrop-blur-sm border-white/30">
            <CardContent className="p-0">
              {filteredEstimates.length === 0 ? (
                <div className="p-12 text-center">
                  <Send className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No estimates yet</h3>
                  <p className="text-slate-500 mb-4">Create your first estimate to get started</p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Estimate
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Estimate #</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Client</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Amount</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Status</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Date</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Valid Until</th>
                        <th className="text-right p-4 text-sm font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEstimates.map((estimate) => (
                        <tr key={estimate.id} className="border-b border-slate-100 hover:bg-white/50 transition-colors">
                          <td className="p-4 font-medium text-slate-800">{estimate.estimate_number}</td>
                          <td className="p-4 text-slate-700">{estimate.client_name}</td>
                          <td className="p-4 font-semibold text-slate-800">${(estimate.amount || 0).toLocaleString()}</td>
                          <td className="p-4">
                            <Badge variant="outline" className={getStatusBadge(estimate.status)}>
                              {estimate.status?.charAt(0).toUpperCase() + estimate.status?.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4 text-slate-600">{new Date(estimate.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-slate-600">{estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : '-'}</td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                                <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem><FileText className="w-4 h-4 mr-2" /> Convert to Invoice</DropdownMenuItem>
                                <DropdownMenuItem><Send className="w-4 h-4 mr-2" /> Send to Client</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-rose-600"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
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

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">All Expenses</h3>
            <Button 
              className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
              onClick={() => setShowCreateExpense(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>

          {/* Quick Expense Entry Cards */}
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
                  onChange={handleCameraCapture}
                />
              </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setShowCreateExpense(true)}
            >
              <CardContent className="p-6 text-center">
                <Edit className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                <h4 className="font-semibold text-slate-800">Manual Entry</h4>
                <p className="text-sm text-slate-500">Enter expense details manually</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/60 backdrop-blur-sm border-white/30">
            <CardContent className="p-0">
              {filteredExpenses.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No expenses yet</h3>
                  <p className="text-slate-500 mb-4">Add your first expense to track spending</p>
                  <Button onClick={() => setShowCreateExpense(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Description</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Amount</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Category</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Date</th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">Billable</th>
                        <th className="text-right p-4 text-sm font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="border-b border-slate-100 hover:bg-white/50 transition-colors">
                          <td className="p-4 font-medium text-slate-800">{expense.description}</td>
                          <td className="p-4 font-semibold text-rose-600">-${(expense.amount || 0).toFixed(2)}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="bg-slate-100 text-slate-600">
                              {expense.category || 'Uncategorized'}
                            </Badge>
                          </td>
                          <td className="p-4 text-slate-600">{new Date(expense.date).toLocaleDateString()}</td>
                          <td className="p-4">
                            {expense.is_billable ? (
                              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                Billable
                              </Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {expense.receipt_url && (
                                  <DropdownMenuItem onClick={() => window.open(expense.receipt_url, '_blank')}>
                                    <Eye className="w-4 h-4 mr-2" /> View Receipt
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-rose-600"
                                  onClick={() => handleDeleteExpense(expense.id)}
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

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                      <path d="M22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12Z" fill="#635BFF"/>
                      <path d="M12.75 8.25V10.5H15.75V13.5H12.75V15.75H9.75V13.5H6.75V10.5H9.75V8.25H12.75Z" fill="white"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Stripe</h4>
                    <p className="text-sm text-slate-500">Not connected</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                      <path d="M20 4H4C2.897 4 2 4.897 2 6V18C2 19.103 2.897 20 4 20H20C21.103 20 22 19.103 22 18V6C22 4.897 21.103 4 20 4Z" fill="#003087"/>
                      <path d="M8.5 15L9.2 11H10.8L9.7 15H8.5ZM15.5 11C16.3 11 16.8 11.5 16.8 12.2C16.8 13.5 15.5 14 14.5 14H13.8L14.1 15H12.5L13.6 11H15.5Z" fill="white"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">PayPal</h4>
                    <p className="text-sm text-slate-500">Not connected</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Banknote className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Bank Transfer</h4>
                    <p className="text-sm text-emerald-600">Enabled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/60 backdrop-blur-sm border-white/30">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Track all incoming payments</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="p-8 text-center">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No payments yet</h3>
                  <p className="text-slate-500">Payments will appear here when clients pay invoices</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg bg-white/50 hover:bg-white/80 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{payment.client_name}</p>
                          <p className="text-sm text-slate-500">{payment.invoice_number} • {payment.method}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-600">+${(payment.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">{new Date(payment.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invoice Modal */}
      <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Create New Invoice
            </DialogTitle>
            <DialogDescription>
              Create a professional invoice for your client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Client Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800">Client Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Client Name *</Label>
                  <Input 
                    placeholder="Enter client name"
                    value={invoiceForm.clientName}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, clientName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    placeholder="client@example.com"
                    value={invoiceForm.clientEmail}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, clientEmail: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-800">Line Items</h4>
                <Button variant="outline" size="sm" onClick={addInvoiceItem}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              
              {invoiceForm.items.map((item, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label>Description</Label>
                    <Input 
                      placeholder="Service description"
                      value={item.description}
                      onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-20">
                    <Label>Qty</Label>
                    <Input 
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="w-28">
                    <Label>Rate ($)</Label>
                    <Input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateInvoiceItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-24 text-right">
                    <Label>Amount</Label>
                    <p className="h-10 flex items-center justify-end font-semibold">
                      ${(item.quantity * item.rate).toFixed(2)}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => removeInvoiceItem(index)}
                    disabled={invoiceForm.items.length === 1}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <div className="flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-emerald-600">${calculateInvoiceTotal().toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Invoice Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Input 
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <Switch 
                  checked={invoiceForm.isRecurring}
                  onCheckedChange={(checked) => setInvoiceForm({ ...invoiceForm, isRecurring: checked })}
                />
                <Label>Recurring Invoice</Label>
                {invoiceForm.isRecurring && (
                  <Select 
                    value={invoiceForm.recurringInterval}
                    onValueChange={(value) => setInvoiceForm({ ...invoiceForm, recurringInterval: value })}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes (optional)</Label>
              <Textarea 
                placeholder="Payment terms, thank you message, etc."
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateInvoice(false)}>Cancel</Button>
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" /> Preview
            </Button>
            <Button 
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              onClick={handleCreateInvoice}
            >
              <Send className="w-4 h-4 mr-2" /> Create & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Expense Modal */}
      <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-600" />
              Add Expense
            </DialogTitle>
            <DialogDescription>
              Record a business expense
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Description *</Label>
              <Input 
                placeholder="What was this expense for?"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
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
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Date</Label>
                <Input 
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Category</Label>
              <Select 
                value={expenseForm.category}
                onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="software">Software & Subscriptions</SelectItem>
                  <SelectItem value="office">Office Supplies</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="meals">Meals & Entertainment</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="professional">Professional Services</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <Switch 
                checked={expenseForm.isBillable}
                onCheckedChange={(checked) => setExpenseForm({ ...expenseForm, isBillable: checked })}
              />
              <div>
                <Label className="text-slate-800">Billable to Client</Label>
                <p className="text-xs text-slate-500">This expense will be added to client's invoice</p>
              </div>
            </div>

            {expenseForm.receipt && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-emerald-700">Receipt attached: {expenseForm.receipt.name}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateExpense(false)}>Cancel</Button>
            <Button 
              className="bg-gradient-to-r from-rose-500 to-pink-600 text-white"
              onClick={handleCreateExpense}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
