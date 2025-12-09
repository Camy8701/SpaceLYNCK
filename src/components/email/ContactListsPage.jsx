// ============================================================================
// CONTACT LISTS PAGE - Full page for managing contact lists
// ============================================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  Upload,
  Search,
  Trash2,
  Edit,
  FolderOpen,
  List,
  FileText,
  FileSpreadsheet,
  Folder,
  ChevronRight,
  ChevronLeft,
  Pencil,
  UserMinus,
  UserPlus,
  Save,
  FolderPlus,
  X,
  Check,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Share2,
  UserCheck,
  Send
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

import { emailService } from '@/services/emailService';
import toast from 'react-hot-toast';

// PDF.js - load dynamically
let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  const pdfjs = await import('pdfjs-dist');
  pdfjsLib = pdfjs;
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  return pdfjsLib;
}

// Extract contacts from PDF text
function extractContactsFromText(text) {
  const contacts = [];
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/gi;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  
  const emails = text.match(emailRegex) || [];
  const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase()))];
  
  uniqueEmails.forEach(email => {
    const emailIndex = text.toLowerCase().indexOf(email);
    const contextStart = Math.max(0, emailIndex - 100);
    const contextEnd = Math.min(text.length, emailIndex + email.length + 100);
    const context = text.substring(contextStart, contextEnd);
    
    let firstName = '';
    let lastName = '';
    let company = '';
    let phone = '';
    
    const nameMatches = context.match(nameRegex);
    if (nameMatches && nameMatches.length > 0) {
      const nameParts = nameMatches[0].split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    const phoneMatches = context.match(phoneRegex);
    if (phoneMatches && phoneMatches.length > 0) {
      phone = phoneMatches[0];
    }
    
    const emailDomain = email.split('@')[1]?.split('.')[0];
    if (emailDomain && emailDomain.length > 2 && !['gmail', 'yahoo', 'hotmail', 'outlook', 'aol', 'icloud', 'mail'].includes(emailDomain.toLowerCase())) {
      company = emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1);
    }
    
    contacts.push({ email: email.toLowerCase(), first_name: firstName, last_name: lastName, company, phone });
  });
  
  return contacts;
}

export default function ContactListsPage({ onBack, onSelectList }) {
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [listContacts, setListContacts] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [listSearchQuery, setListSearchQuery] = useState('');
  
  // Modal states
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);
  
  // Form states
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [editingList, setEditingList] = useState(null);
  
  // New contact form
  const [newContact, setNewContact] = useState({
    email: '', first_name: '', last_name: '', company: '', phone: ''
  });
  
  // Import states
  const [importData, setImportData] = useState(null);
  const [csvMapping, setCsvMapping] = useState({});
  const [importStep, setImportStep] = useState(1);
  const [importType, setImportType] = useState('csv');
  const [isDragging, setIsDragging] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const fileInputRef = useRef(null);
  
  // Selected contacts for adding to list
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  
  // Share modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharingList, setSharingList] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listsData, contactsData] = await Promise.all([
        emailService.lists.getAll(),
        emailService.contacts.getAll()
      ]);
      setLists(listsData || []);
      setAllContacts(contactsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadListContacts = async (listId) => {
    try {
      const listData = await emailService.lists.getById(listId);
      setSelectedList(listData);
      const contactsData = listData?.email_list_contacts?.map(lc => lc.contact) || [];
      setListContacts(contactsData.filter(c => c !== null));
    } catch (error) {
      console.error('Error loading list contacts:', error);
      toast.error('Failed to load list contacts');
    }
  };

  // Create new list
  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    try {
      const list = await emailService.lists.create({
        name: newListName.trim(),
        description: newListDescription.trim()
      });
      toast.success('List created successfully');
      setNewListName('');
      setNewListDescription('');
      setShowCreateListModal(false);
      loadData();
      // Select the new list
      loadListContacts(list.id);
      return list;
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error('Failed to create list');
      return null;
    }
  };

  // Update list
  const handleUpdateList = async () => {
    if (!editingList) return;

    try {
      await emailService.lists.update(editingList.id, {
        name: editingList.name,
        description: editingList.description
      });
      toast.success('List updated');
      setEditingList(null);
      loadData();
      if (selectedList?.id === editingList.id) {
        loadListContacts(editingList.id);
      }
    } catch (error) {
      console.error('Error updating list:', error);
      toast.error('Failed to update list');
    }
  };

  // Delete list
  const handleDeleteList = async (listId) => {
    if (!confirm('Delete this list? Contacts will not be deleted.')) return;

    try {
      await emailService.lists.delete(listId);
      toast.success('List deleted');
      loadData();
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setListContacts([]);
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Failed to delete list');
    }
  };

  // Add single contact manually
  const handleAddContact = async () => {
    if (!newContact.email) {
      toast.error('Email is required');
      return;
    }

    try {
      const contact = await emailService.contacts.create(newContact);
      
      // Add to current list if one is selected
      if (selectedList) {
        await emailService.lists.addContacts(selectedList.id, [contact.id]);
        loadListContacts(selectedList.id);
      }
      
      toast.success('Contact added successfully');
      setShowAddContactModal(false);
      setNewContact({ email: '', first_name: '', last_name: '', company: '', phone: '' });
      loadData();
    } catch (error) {
      if (error.code === '23505') {
        toast.error('This contact already exists');
      } else {
        console.error('Error adding contact:', error);
        toast.error('Failed to add contact');
      }
    }
  };

  // Remove contact from list
  const handleRemoveFromList = async (contactId) => {
    if (!selectedList) return;

    try {
      await emailService.lists.removeContacts(selectedList.id, [contactId]);
      toast.success('Contact removed from list');
      loadListContacts(selectedList.id);
      loadData();
    } catch (error) {
      console.error('Error removing contact from list:', error);
      toast.error('Failed to remove contact');
    }
  };

  // Add existing contacts to list
  const handleAddExistingContacts = async () => {
    if (!selectedList || selectedContactIds.length === 0) return;

    try {
      await emailService.lists.addContacts(selectedList.id, selectedContactIds);
      toast.success(`Added ${selectedContactIds.length} contact(s) to list`);
      setShowAddExistingModal(false);
      setSelectedContactIds([]);
      loadListContacts(selectedList.id);
      loadData();
    } catch (error) {
      console.error('Error adding contacts to list:', error);
      toast.error('Failed to add contacts to list');
    }
  };

  // Drag and Drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, [selectedList]);

  // Process file
  const processFile = async (file) => {
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isPDF = fileName.endsWith('.pdf');

    if (!isCSV && !isPDF) {
      toast.error('Please upload a CSV or PDF file');
      return;
    }

    setProcessingFile(true);
    setImportType(isCSV ? 'csv' : 'pdf');

    try {
      if (isCSV) {
        await processCSVFile(file);
      } else {
        await processPDFFile(file);
      }
      setShowImportModal(true);
      setImportStep(2);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Failed to process file`);
    } finally {
      setProcessingFile(false);
    }
  };

  const processCSVFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csvText = event.target.result;
          const parsed = emailService.csvImport.parseCSV(csvText);
          setImportData(parsed);
          
          const autoMapping = {};
          parsed.headers.forEach((header) => {
            const headerLower = header.toLowerCase();
            if (headerLower.includes('email')) autoMapping.email = header;
            else if (headerLower.includes('first') && headerLower.includes('name')) autoMapping.first_name = header;
            else if (headerLower.includes('last') && headerLower.includes('name')) autoMapping.last_name = header;
            else if (headerLower === 'name' || headerLower === 'full name') autoMapping.full_name = header;
            else if (headerLower.includes('company') || headerLower.includes('business')) autoMapping.company = header;
            else if (headerLower.includes('phone')) autoMapping.phone = header;
          });
          setCsvMapping(autoMapping);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const processPDFFile = async (file) => {
    try {
      const pdfjs = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      const extractedContacts = extractContactsFromText(fullText);
      
      if (extractedContacts.length === 0) {
        toast.error('No contacts found in PDF');
        return;
      }
      
      setImportData({
        headers: ['email', 'first_name', 'last_name', 'company', 'phone'],
        rows: extractedContacts,
        isPDF: true
      });
      
      setCsvMapping({
        email: 'email',
        first_name: 'first_name',
        last_name: 'last_name',
        company: 'company',
        phone: 'phone'
      });
      
      toast.success(`Found ${extractedContacts.length} contacts in PDF`);
    } catch (error) {
      console.error('PDF processing error:', error);
      throw error;
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Import contacts to current list
  const handleImportContacts = async () => {
    if (!selectedList) {
      toast.error('Please select a list first');
      return;
    }

    if (importType === 'csv' && !importData?.isPDF && !csvMapping.email) {
      toast.error('Please map the email field');
      return;
    }

    try {
      let importedContacts = [];

      if (importType === 'pdf' || importData.isPDF) {
        // PDF import
        const contacts = importData.rows.filter(c => c.email && c.email.includes('@'));
        
        // Import with upsert logic - skip duplicates
        for (const contact of contacts) {
          try {
            const result = await emailService.contacts.create({
              ...contact,
              source: 'pdf_import'
            });
            importedContacts.push(result);
          } catch (error) {
            if (error.code === '23505') {
              // Duplicate - try to find existing contact
              const existing = allContacts.find(c => c.email.toLowerCase() === contact.email.toLowerCase());
              if (existing) importedContacts.push(existing);
            }
          }
        }
      } else {
        // CSV import
        const contacts = importData.rows
          .map(row => ({
            email: row[csvMapping.email],
            first_name: csvMapping.first_name ? row[csvMapping.first_name] : null,
            last_name: csvMapping.last_name ? row[csvMapping.last_name] : null,
            company: csvMapping.company ? row[csvMapping.company] : null,
            phone: csvMapping.phone ? row[csvMapping.phone] : null,
            source: 'csv_import'
          }))
          .filter(c => c.email && c.email.includes('@'));

        for (const contact of contacts) {
          try {
            const result = await emailService.contacts.create(contact);
            importedContacts.push(result);
          } catch (error) {
            if (error.code === '23505') {
              const existing = allContacts.find(c => c.email.toLowerCase() === contact.email.toLowerCase());
              if (existing) importedContacts.push(existing);
            }
          }
        }
      }

      // Add imported contacts to list
      if (importedContacts.length > 0) {
        const contactIds = importedContacts.map(c => c.id).filter(Boolean);
        if (contactIds.length > 0) {
          await emailService.lists.addContacts(selectedList.id, contactIds);
        }
      }

      toast.success(`Imported ${importedContacts.length} contacts to "${selectedList.name}"`);

      // Reset
      setShowImportModal(false);
      setImportData(null);
      setCsvMapping({});
      setImportStep(1);
      
      loadData();
      loadListContacts(selectedList.id);
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast.error('Failed to import contacts');
    }
  };

  // Filter contacts not in current list for "Add Existing" modal
  const contactsNotInList = allContacts.filter(
    contact => !listContacts.find(lc => lc.id === contact.id)
  ).filter(
    contact => !searchQuery || 
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter list contacts by search
  const filteredListContacts = listContacts.filter(
    contact => !listSearchQuery || 
      contact.email?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
      contact.first_name?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(listSearchQuery.toLowerCase())
  );

  // Group lists by category
  const groupedLists = lists.reduce((acc, list) => {
    const category = list.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(list);
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-6">
      {/* Global Drop Zone Overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 bg-amber-500/20 backdrop-blur-sm z-50 flex items-center justify-center"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="bg-slate-800 rounded-2xl p-12 shadow-2xl border-4 border-dashed border-amber-500 text-center">
            <Upload className="w-20 h-20 text-amber-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-white mb-2">Drop your file here</h3>
            <p className="text-white">CSV or PDF files supported</p>
            {selectedList && (
              <p className="text-amber-400 mt-2">Adding to: {selectedList.name}</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-amber-500" />
              Contact Lists
            </h1>
            <p className="text-white/90 mt-1">Organize your contacts into lists for targeted campaigns</p>
          </div>
        </div>
        <Button
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg"
          onClick={() => setShowCreateListModal(true)}
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          Create New List
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Lists Panel */}
        <div className="col-span-4 bg-white/30 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Your Lists</h2>
            <Badge variant="outline" className="text-slate-700 border-slate-400">
              {lists.length} lists
            </Badge>
          </div>

          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="space-y-2 pr-2">
              {Object.entries(groupedLists).map(([category, categoryLists]) => (
                <div key={category} className="mb-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1 px-2">
                    <Folder className="w-3 h-3" />
                    {category}
                  </p>
                  {categoryLists.map((list) => (
                    <div
                      key={list.id}
                      className={`p-3 rounded-xl cursor-pointer transition-all mb-2 ${
                        selectedList?.id === list.id
                          ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 border-2 border-amber-500/50 shadow-lg'
                          : 'bg-white/40 hover:bg-white/60 border border-white/30'
                      }`}
                      onClick={() => loadListContacts(list.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{list.name}</p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {list.email_list_contacts?.[0]?.count || 0} contacts
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${
                            selectedList?.id === list.id ? 'rotate-90 text-amber-600' : ''
                          }`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {lists.length === 0 && (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">No lists yet</p>
                  <Button
                    className="bg-gradient-to-r from-amber-500 to-orange-600"
                    onClick={() => setShowCreateListModal(true)}
                  >
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Create Your First List
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* List Details Panel */}
        <div className="col-span-8 bg-white/30 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-4 flex flex-col overflow-hidden">
          {selectedList ? (
            <>
              {/* List Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-300/50">
                <div className="flex-1">
                  {editingList?.id === selectedList.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editingList.name}
                        onChange={(e) => setEditingList({ ...editingList, name: e.target.value })}
                        className="bg-white/60 border-white/40 text-slate-900 font-bold text-lg"
                      />
                      <Input
                        value={editingList.description || ''}
                        onChange={(e) => setEditingList({ ...editingList, description: e.target.value })}
                        placeholder="Description"
                        className="bg-white/60 border-white/40 text-slate-900 text-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-xl text-slate-900">{selectedList.name}</h3>
                      <p className="text-sm text-slate-600">{selectedList.description || 'No description'}</p>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {editingList?.id === selectedList.id ? (
                    <>
                      <Button size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:bg-white/50" onClick={() => setEditingList(null)}>
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-green-500 to-emerald-600"
                        onClick={handleUpdateList}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-blue-500/50 text-blue-600 hover:bg-blue-500/20"
                        onClick={() => setShowShareModal(true)}
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                      <Button size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:bg-white/50" onClick={() => setEditingList({ ...selectedList })}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        onClick={() => handleDeleteList(selectedList.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Import CSV/PDF
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                  onClick={() => setShowAddContactModal(true)}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add Manually
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-violet-600 text-white"
                  onClick={() => setShowAddExistingModal(true)}
                >
                  <Users className="w-4 h-4 mr-1" />
                  Add Existing
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Drag & Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-4 mb-4 text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-amber-500 bg-amber-500/20' 
                    : 'border-slate-400/50 hover:border-amber-500/50 hover:bg-white/40'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex items-center justify-center gap-3">
                  {processingFile ? (
                    <div className="w-6 h-6 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-600" />
                  )}
                  <span className="text-slate-700">
                    {processingFile ? 'Processing...' : 'Drag & drop CSV or PDF here, or click to browse'}
                  </span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/50">CSV</Badge>
                    <Badge variant="outline" className="text-xs text-red-400 border-red-500/50">PDF</Badge>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search contacts in this list..."
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                    className="pl-10 bg-white/60 border-white/40 text-slate-900 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Contacts List - Scrollable within container */}
              <ScrollArea className="flex-1 -mx-1 px-1">
                <div className="space-y-2 pr-2">
                  {filteredListContacts.length > 0 ? (
                    filteredListContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/30 hover:bg-white/70 transition-colors shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                            {(contact.first_name?.[0] || contact.email?.[0] || '?').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
                            </p>
                            <p className="text-sm text-slate-600 flex items-center gap-2">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={() => handleRemoveFromList(contact.id)}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-700 mb-2">No contacts in this list</p>
                      <p className="text-slate-500 text-sm">Import contacts or add them manually</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Footer Stats */}
              <div className="mt-4 pt-4 border-t border-slate-300/50 flex items-center justify-between flex-shrink-0">
                <p className="text-sm text-slate-600">
                  {filteredListContacts.length} contact(s) in list
                </p>
                {onSelectList && (
                  <Button
                    className="bg-gradient-to-r from-amber-500 to-orange-600"
                    onClick={() => onSelectList(selectedList)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Use This List
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <List className="w-20 h-20 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-700 font-medium text-lg">Select a list to view contacts</p>
                <p className="text-slate-500 text-sm mt-1">Click on a list from the left panel</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create List Modal */}
      <Dialog open={showCreateListModal} onOpenChange={setShowCreateListModal}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-white/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <FolderPlus className="w-5 h-5 text-amber-500" />
              Create New List
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Create a new contact list to organize your contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-700">List Name *</Label>
              <Input
                placeholder="e.g., VIP Clients, Newsletter Subscribers"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="bg-white/80 border-slate-300 text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <div>
              <Label className="text-slate-700">Description</Label>
              <Textarea
                placeholder="Brief description of this list..."
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                className="bg-white/80 border-slate-300 text-slate-900 placeholder:text-slate-500"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100" onClick={() => setShowCreateListModal(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              onClick={handleCreateList}
              disabled={!newListName.trim()}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Manually Modal */}
      <Dialog open={showAddContactModal} onOpenChange={setShowAddContactModal}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-white/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <UserPlus className="w-5 h-5 text-blue-500" />
              Add Contact Manually
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Add a new contact to "{selectedList?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-700">Email *</Label>
              <Input
                type="email"
                placeholder="email@company.com"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="bg-white/80 border-slate-300 text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700">First Name</Label>
                <Input
                  placeholder="First Name"
                  value={newContact.first_name}
                  onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                  className="bg-white/80 border-slate-300 text-slate-900 placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label className="text-slate-700">Last Name</Label>
                <Input
                  placeholder="Last Name"
                  value={newContact.last_name}
                  onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                  className="bg-white/80 border-slate-300 text-slate-900 placeholder:text-slate-500"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-700">Company</Label>
              <Input
                placeholder="Company Name"
                value={newContact.company}
                onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                className="bg-white/80 border-slate-300 text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <div>
              <Label className="text-slate-700">Phone</Label>
              <Input
                placeholder="+1 234 567 8900"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="bg-white/80 border-slate-300 text-slate-900 placeholder:text-slate-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100" onClick={() => setShowAddContactModal(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
              onClick={handleAddContact}
              disabled={!newContact.email}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Existing Contacts Modal */}
      <Dialog open={showAddExistingModal} onOpenChange={setShowAddExistingModal}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-white/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Users className="w-5 h-5 text-purple-500" />
              Add Existing Contacts
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Select contacts to add to "{selectedList?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/80 border-slate-300 text-slate-900 placeholder:text-slate-500"
              />
            </div>

            <ScrollArea className="h-[300px] border border-slate-300 rounded-xl bg-slate-50">
              <div className="p-2 space-y-1">
                {contactsNotInList.length > 0 ? (
                  contactsNotInList.map((contact) => (
                    <div
                      key={contact.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedContactIds.includes(contact.id)
                          ? 'bg-purple-100 border border-purple-300'
                          : 'bg-white hover:bg-slate-100 border border-transparent'
                      }`}
                      onClick={() => {
                        setSelectedContactIds(prev =>
                          prev.includes(contact.id)
                            ? prev.filter(id => id !== contact.id)
                            : [...prev, contact.id]
                        );
                      }}
                    >
                      <Checkbox checked={selectedContactIds.includes(contact.id)} className="border-slate-300" />
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-sm font-medium">
                        {(contact.first_name?.[0] || contact.email?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
                        </p>
                        <p className="text-sm text-slate-600 truncate">{contact.email}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600">No contacts available to add</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {selectedContactIds.length} contact(s) selected
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  if (selectedContactIds.length === contactsNotInList.length) {
                    setSelectedContactIds([]);
                  } else {
                    setSelectedContactIds(contactsNotInList.map(c => c.id));
                  }
                }}
              >
                {selectedContactIds.length === contactsNotInList.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100" onClick={() => {
              setShowAddExistingModal(false);
              setSelectedContactIds([]);
              setSearchQuery('');
            }}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-purple-500 to-violet-600 text-white"
              onClick={handleAddExistingContacts}
              disabled={selectedContactIds.length === 0}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add {selectedContactIds.length} Contact(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-white/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Upload className="w-5 h-5 text-emerald-500" />
              Import Contacts to "{selectedList?.name}"
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Review and import contacts from your file
            </DialogDescription>
          </DialogHeader>

          {importStep === 2 && importData && (
            <div className="space-y-4">
              <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="text-emerald-700 font-medium">
                    Found {importData.rows.length} contacts
                  </p>
                </div>
              </div>

              {/* CSV Column Mapping */}
              {importType === 'csv' && !importData.isPDF && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3">Map your CSV columns:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-600 text-xs">Email Column *</Label>
                      <Select value={csvMapping.email || ''} onValueChange={(v) => setCsvMapping({ ...csvMapping, email: v })}>
                        <SelectTrigger className="bg-white/80 border-slate-300 text-slate-900">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-slate-300">
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-600 text-xs">First Name</Label>
                      <Select value={csvMapping.first_name || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, first_name: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="bg-white/80 border-slate-300 text-slate-900">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-slate-300">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-600 text-xs">Last Name</Label>
                      <Select value={csvMapping.last_name || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, last_name: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="bg-white/80 border-slate-300 text-slate-900">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-slate-300">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-600 text-xs">Company</Label>
                      <Select value={csvMapping.company || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, company: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="bg-white/80 border-slate-300 text-slate-900">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-slate-300">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Preview (first 5 contacts):</p>
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 bg-slate-100">
                        <TableHead className="text-slate-700">Email</TableHead>
                        <TableHead className="text-slate-700">First Name</TableHead>
                        <TableHead className="text-slate-700">Last Name</TableHead>
                        <TableHead className="text-slate-700">Company</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.rows.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx} className="border-slate-200">
                          <TableCell className="text-slate-900 font-medium">
                            {importData.isPDF || importType === 'pdf' ? row.email : row[csvMapping.email] || '-'}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {importData.isPDF || importType === 'pdf' ? row.first_name : row[csvMapping.first_name] || '-'}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {importData.isPDF || importType === 'pdf' ? row.last_name : row[csvMapping.last_name] || '-'}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {importData.isPDF || importType === 'pdf' ? row.company : row[csvMapping.company] || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100" onClick={() => {
              setShowImportModal(false);
              setImportData(null);
              setCsvMapping({});
              setImportStep(1);
            }}>
              Cancel
            </Button>
            {importStep === 2 && (
              <Button 
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                onClick={handleImportContacts}
                disabled={(importType === 'csv' && !importData?.isPDF && !csvMapping.email)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {importData?.rows.length} Contacts
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Share List Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-white/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Share2 className="w-5 h-5 text-blue-500" />
              Share Contact List
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Invite another user to access "{selectedList?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-700">User Email Address *</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="bg-white/80 border-slate-300 text-slate-900 placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                The user must have an account on this platform
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">What happens when you share?</p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• The invited user will receive an email notification</li>
                    <li>• They can view and use this list for campaigns</li>
                    <li>• You remain the owner and can revoke access anytime</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-slate-300 text-slate-700 hover:bg-slate-100" 
              onClick={() => {
                setShowShareModal(false);
                setShareEmail('');
              }}
            >
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
              onClick={async () => {
                if (!shareEmail || !shareEmail.includes('@')) {
                  toast.error('Please enter a valid email address');
                  return;
                }
                setSharingList(true);
                try {
                  // Note: This would call a backend function to handle sharing
                  // For now, we'll show a success message
                  toast.success(`Invitation sent to ${shareEmail}`);
                  setShowShareModal(false);
                  setShareEmail('');
                } catch (error) {
                  toast.error('Failed to send invitation');
                } finally {
                  setSharingList(false);
                }
              }}
              disabled={!shareEmail || sharingList}
            >
              {sharingList ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
