// ============================================================================
// CONTACT MANAGER - Manage email contacts (CSV/PDF import, manual, prospects)
// ============================================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  Globe,
  Trash2,
  Edit,
  Tag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  UserPlus,
  Target,
  X,
  Check,
  FolderOpen,
  List,
  FileText,
  File,
  Folder,
  ChevronRight,
  Eye,
  Pencil,
  UserMinus,
  UserCheck,
  Save,
  FolderPlus
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

import { emailService } from '@/services/emailService';
import toast from 'react-hot-toast';

// PDF.js import - we'll load dynamically
let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  
  const pdfjs = await import('pdfjs-dist');
  pdfjsLib = pdfjs;
  
  // Set worker source to use unpkg which is more reliable
  // Use the legacy build for better compatibility
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  
  return pdfjsLib;
}

// Extract contacts from PDF text using regex patterns
function extractContactsFromText(text) {
  const contacts = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Email regex
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/gi;
  // Phone regex (various formats)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  // Name patterns (looking for capitalized words near emails)
  const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  // Website/URL regex - matches various URL formats
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(?:\/[^\s]*)*/gi;
  
  // Find all emails in the text
  const emails = text.match(emailRegex) || [];
  const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase()))];
  
  // Find all websites in the text (excluding email domains)
  const allWebsites = text.match(websiteRegex) || [];
  const cleanWebsites = allWebsites
    .filter(url => !url.includes('@')) // Exclude email addresses
    .map(url => {
      // Normalize URL - add https:// if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
      }
      return url;
    });
  
  uniqueEmails.forEach(email => {
    // Try to find name near this email (within context)
    const emailIndex = text.toLowerCase().indexOf(email);
    const contextStart = Math.max(0, emailIndex - 200);
    const contextEnd = Math.min(text.length, emailIndex + email.length + 200);
    const context = text.substring(contextStart, contextEnd);
    
    let firstName = '';
    let lastName = '';
    let company = '';
    let phone = '';
    let website = '';
    
    // Try to extract name from context
    const nameMatches = context.match(nameRegex);
    if (nameMatches && nameMatches.length > 0) {
      const nameParts = nameMatches[0].split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    // Try to extract phone from context
    const phoneMatches = context.match(phoneRegex);
    if (phoneMatches && phoneMatches.length > 0) {
      phone = phoneMatches[0];
    }
    
    // Try to extract website from context
    const websiteMatches = context.match(websiteRegex);
    if (websiteMatches && websiteMatches.length > 0) {
      // Find the first URL that's not an email
      const validWebsite = websiteMatches.find(url => !url.includes('@'));
      if (validWebsite) {
        website = validWebsite.startsWith('http') ? validWebsite : 'https://' + validWebsite;
      }
    }
    
    // Try to extract company (often follows @ in email or is capitalized text)
    const emailDomain = email.split('@')[1]?.split('.')[0];
    if (emailDomain && emailDomain.length > 2 && !['gmail', 'yahoo', 'hotmail', 'outlook', 'aol', 'icloud', 'mail', 'gmx', 'web', 'live', 'msn', 'proton', 'protonmail'].includes(emailDomain.toLowerCase())) {
      company = emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1);
      // If we don't have a website yet, try to construct one from domain
      if (!website) {
        const fullDomain = email.split('@')[1];
        website = 'https://www.' + fullDomain;
      }
    }
    
    contacts.push({
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      company,
      phone,
      website
    });
  });
  
  return contacts;
}

export default function ContactManager({ onContactsUpdated, onNavigateToLists }) {
  const [contacts, setContacts] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContacts, setSelectedContacts] = useState([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProspectModal, setShowProspectModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showListManagerModal, setShowListManagerModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  
  // Import progress states
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState(''); // 'importing', 'completed', 'error'
  const [isImporting, setIsImporting] = useState(false);
  
  // Form states
  const [newContact, setNewContact] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company: '',
    phone: '',
    website: '',
    city: '',
    tags: []
  });
  
  // Edit contact state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  // CSV/PDF Import states
  const [importData, setImportData] = useState(null);
  const [csvMapping, setCsvMapping] = useState({});
  const [importStep, setImportStep] = useState(1);
  const [importType, setImportType] = useState('csv'); // 'csv' or 'pdf'
  const [isDragging, setIsDragging] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [importToNewList, setImportToNewList] = useState(true);
  const [selectedListId, setSelectedListId] = useState(null);
  const [processingFile, setProcessingFile] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  
  // List management states
  const [selectedList, setSelectedList] = useState(null);
  const [listContacts, setListContacts] = useState([]);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [editingList, setEditingList] = useState(null);
  
  // Prospects loaded from ProspectingView
  const [prospects, setProspects] = useState([]);

  useEffect(() => {
    loadContacts();
    loadLists();
  }, [searchQuery, statusFilter]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await emailService.contacts.getAll({
        search: searchQuery,
        status: statusFilter
      });
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadLists = async () => {
    try {
      const data = await emailService.lists.getAll();
      setLists(data || []);
    } catch (error) {
      console.error('Error loading lists:', error);
    }
  };

  // Load contacts for a specific list
  const loadListContacts = async (listId) => {
    try {
      const listData = await emailService.lists.getById(listId);
      setSelectedList(listData);
      // Extract contacts from the joined data
      const contactsData = listData?.email_list_contacts?.map(lc => lc.contact) || [];
      setListContacts(contactsData.filter(c => c !== null));
    } catch (error) {
      console.error('Error loading list contacts:', error);
      toast.error('Failed to load list contacts');
    }
  };

  // Add single contact
  const handleAddContact = async () => {
    if (!newContact.email) {
      toast.error('Email is required');
      return;
    }

    try {
      await emailService.contacts.create(newContact);
      toast.success('Contact added successfully');
      setShowAddModal(false);
      setNewContact({ email: '', first_name: '', last_name: '', company: '', phone: '', website: '', city: '', tags: [] });
      loadContacts();
      onContactsUpdated?.();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Failed to add contact');
    }
  };

  // Edit contact - open modal with contact data
  const handleEditContact = (contact) => {
    setEditingContact({ ...contact });
    setShowEditModal(true);
  };

  // Save edited contact
  const handleSaveContact = async () => {
    if (!editingContact?.email) {
      toast.error('Email is required');
      return;
    }

    try {
      await emailService.contacts.update(editingContact.id, {
        email: editingContact.email,
        first_name: editingContact.first_name,
        last_name: editingContact.last_name,
        company: editingContact.company,
        phone: editingContact.phone,
        website: editingContact.website,
        city: editingContact.city
      });
      toast.success('Contact updated successfully');
      setShowEditModal(false);
      setEditingContact(null);
      loadContacts();
      onContactsUpdated?.();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Failed to update contact');
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
    // Only set to false if we're leaving the drop zone entirely
    if (!dropZoneRef.current?.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
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
  }, []);

  // Process uploaded file (CSV or PDF)
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
    setNewListName(file.name.replace(/\.[^/.]+$/, '')); // Use filename as default list name

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
      toast.error(`Failed to process ${isCSV ? 'CSV' : 'PDF'} file`);
    } finally {
      setProcessingFile(false);
    }
  };

  // Smart column mapping patterns - matches common CSV header variations
  const COLUMN_PATTERNS = {
    email: [
      'email', 'e-mail', 'email address', 'e-mail address', 'emailaddress',
      'mail', 'email_address', 'contact email', 'work email', 'personal email'
    ],
    first_name: [
      'first name', 'firstname', 'first_name', 'fname', 'first', 
      'given name', 'givenname', 'forename', 'name first'
    ],
    last_name: [
      'last name', 'lastname', 'last_name', 'lname', 'last', 
      'surname', 'family name', 'familyname', 'name last'
    ],
    full_name: [
      'full name', 'fullname', 'full_name', 'name', 'contact name',
      'display name', 'displayname', 'contact', 'person name'
    ],
    company: [
      'company', 'company name', 'companyname', 'company_name', 'organization',
      'organisation', 'org', 'business', 'business name', 'employer',
      'workplace', 'firm', 'corporate', 'corp'
    ],
    phone: [
      'phone', 'phone number', 'phonenumber', 'phone_number', 'telephone',
      'tel', 'mobile', 'mobile phone', 'cell', 'cell phone', 'cellphone',
      'contact number', 'work phone', 'home phone', 'primary phone'
    ],
    website: [
      'website', 'web site', 'website url', 'web', 'url', 'site',
      'homepage', 'home page', 'web address', 'webaddress', 'link',
      'company website', 'business website', 'www', 'domain'
    ],
    city: [
      'city', 'town', 'municipality', 'locality', 'location', 'place',
      'city/town', 'city name', 'metro', 'urban area'
    ],
    state: [
      'state', 'province', 'region', 'state/province', 'county', 'territory'
    ],
    country: [
      'country', 'nation', 'country name', 'country/region'
    ],
    address: [
      'address', 'street address', 'street', 'mailing address', 'postal address',
      'full address', 'location address'
    ],
    zip: [
      'zip', 'zip code', 'zipcode', 'postal code', 'postalcode', 'post code', 'postcode'
    ],
    title: [
      'title', 'job title', 'jobtitle', 'job_title', 'position', 'role',
      'designation', 'occupation', 'profession'
    ],
    notes: [
      'notes', 'note', 'comments', 'comment', 'description', 'remarks', 'info'
    ]
  };

  // Smart matching function - finds best match for each field
  const findBestMatch = (headers, patterns) => {
    const headerLower = headers.map(h => h.toLowerCase().trim());
    
    for (const pattern of patterns) {
      // Exact match first
      const exactIdx = headerLower.findIndex(h => h === pattern);
      if (exactIdx !== -1) return headers[exactIdx];
    }
    
    for (const pattern of patterns) {
      // Contains match
      const containsIdx = headerLower.findIndex(h => h.includes(pattern) || pattern.includes(h));
      if (containsIdx !== -1) return headers[containsIdx];
    }
    
    return null;
  };

  // Process CSV file
  const processCSVFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csvText = event.target.result;
          const parsed = emailService.csvImport.parseCSV(csvText);
          setImportData(parsed);
          
          // Smart auto-detect mapping using pattern matching
          const autoMapping = {};
          
          // Map all supported fields
          Object.entries(COLUMN_PATTERNS).forEach(([field, patterns]) => {
            const match = findBestMatch(parsed.headers, patterns);
            if (match) {
              autoMapping[field] = match;
            }
          });
          
          // If we have full_name but not first/last, we'll handle splitting during import
          // If we have location/address fields, combine them for city
          if (!autoMapping.city && autoMapping.address) {
            // Use address as fallback for location display
            autoMapping.city = autoMapping.address;
          }
          
          setCsvMapping(autoMapping);
          
          // Show toast about what was auto-detected
          const mappedFields = Object.keys(autoMapping).filter(k => autoMapping[k]);
          if (mappedFields.length > 0) {
            toast.success(`Auto-mapped ${mappedFields.length} columns: ${mappedFields.join(', ')}`);
          }
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Process PDF file
  const processPDFFile = async (file) => {
    try {
      const pdfjs = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      // Extract contacts from the text
      const extractedContacts = extractContactsFromText(fullText);
      
      if (extractedContacts.length === 0) {
        toast.error('No contacts found in PDF. Please ensure the PDF contains email addresses.');
        return;
      }
      
      // Format as import data similar to CSV - include website
      setImportData({
        headers: ['email', 'first_name', 'last_name', 'company', 'phone', 'website'],
        rows: extractedContacts,
        isPDF: true
      });
      
      // Auto-set mapping for PDF - include website
      setCsvMapping({
        email: 'email',
        first_name: 'first_name',
        last_name: 'last_name',
        company: 'company',
        phone: 'phone',
        website: 'website'
      });
      
      toast.success(`Found ${extractedContacts.length} contacts in PDF`);
    } catch (error) {
      console.error('PDF processing error:', error);
      throw error;
    }
  };

  // File input handler
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
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
      loadLists();
      return list;
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error('Failed to create list');
      return null;
    }
  };

  // Import contacts from CSV/PDF
  const handleImportContacts = async () => {
    if (importType === 'csv' && !importData?.isPDF && !csvMapping.email) {
      toast.error('Please map the email field');
      return;
    }

    // Start progress tracking
    setIsImporting(true);
    setImportProgress(0);
    setImportStatus('importing');

    try {
      let targetListId = null;

      // Create new list if needed
      if (importToNewList && newListName.trim()) {
        setImportStatus('Creating list...');
        const newList = await emailService.lists.create({
          name: newListName.trim(),
          description: newListDescription.trim()
        });
        targetListId = newList.id;
      } else if (selectedListId && selectedListId !== 'none') {
        targetListId = selectedListId;
      }

      let importedCount = 0;
      let skippedCount = 0;
      let importedContacts = [];
      let totalToImport = 0;

      // Prepare contacts to import
      let contactsToImport = [];

      // For PDF imports, contacts are already extracted
      if (importType === 'pdf' || importData.isPDF) {
        contactsToImport = importData.rows
          .filter(c => c.email && c.email.includes('@'))
          .map(contact => ({
            ...contact,
            source: 'pdf_import'
          }));
      } else {
        // CSV import - handle duplicates and smart name splitting
        contactsToImport = importData.rows
          .map(row => {
            // Get mapped values
            const getValue = (field) => {
              if (!csvMapping[field] || csvMapping[field] === 'none') return null;
              return row[csvMapping[field]]?.trim() || null;
            };
            
            let firstName = getValue('first_name');
            let lastName = getValue('last_name');
            
            // If we have full_name but not first/last, split it
            const fullName = getValue('full_name');
            if (fullName && (!firstName || !lastName)) {
              const nameParts = fullName.split(/\s+/);
              if (!firstName) firstName = nameParts[0] || null;
              if (!lastName) lastName = nameParts.slice(1).join(' ') || null;
            }
            
            // Build location string from available fields
            let location = getValue('city');
            const state = getValue('state');
            const country = getValue('country');
            if (state && location) location = `${location}, ${state}`;
            else if (state) location = state;
            if (country && location) location = `${location}, ${country}`;
            else if (country) location = country;
            
            return {
              email: row[csvMapping.email],
              first_name: firstName,
              last_name: lastName,
              company: getValue('company'),
              phone: getValue('phone'),
              website: getValue('website'),
              city: location,
              source: 'csv_import'
            };
          })
          .filter(c => c.email && c.email.includes('@'));
      }

      totalToImport = contactsToImport.length;
      setImportStatus(`Importing 0 of ${totalToImport} contacts...`);

      // Import contacts one by one with progress tracking
      for (let i = 0; i < contactsToImport.length; i++) {
        const contact = contactsToImport[i];
        const progress = Math.round(((i + 1) / totalToImport) * 100);
        setImportProgress(progress);
        setImportStatus(`Importing ${i + 1} of ${totalToImport} contacts...`);
        
        try {
          const result = await emailService.contacts.create(contact);
          importedContacts.push(result);
          importedCount++;
        } catch (error) {
          if (error.code === '23505') {
            // Duplicate - skip but try to find existing for list
            skippedCount++;
            const existing = contacts.find(c => c.email?.toLowerCase() === contact.email?.toLowerCase());
            if (existing) importedContacts.push(existing);
          } else {
            console.error('Error importing contact:', error);
          }
        }
      }

      // Add to list if specified
      if (targetListId && importedContacts.length > 0) {
        setImportStatus('Adding contacts to list...');
        const contactIds = importedContacts.map(c => c.id).filter(Boolean);
        if (contactIds.length > 0) {
          try {
            await emailService.lists.addContacts(targetListId, contactIds);
          } catch (error) {
            console.error('Error adding to list:', error);
          }
        }
      }

      // Complete
      setImportProgress(100);
      setImportStatus('completed');

      // Show success message with details
      if (skippedCount > 0) {
        toast.success(`Imported ${importedCount} contacts (${skippedCount} duplicates skipped)`);
      } else {
        toast.success(`Imported ${importedCount} contacts`);
      }

      // Reset states after a short delay to show completion
      setTimeout(() => {
        setShowImportModal(false);
        setImportData(null);
        setCsvMapping({});
        setImportStep(1);
        setNewListName('');
        setNewListDescription('');
        setImportToNewList(true);
        setSelectedListId(null);
        setIsImporting(false);
        setImportProgress(0);
        setImportStatus('');
      }, 1000);
      
      loadContacts();
      loadLists();
      onContactsUpdated?.();
    } catch (error) {
      console.error('Error importing contacts:', error);
      setImportStatus('error');
      setIsImporting(false);
      if (error.code === '23505') {
        toast.error('Some contacts already exist. Try updating the import to skip duplicates.');
      } else {
        toast.error('Failed to import contacts');
      }
    }
  };

  // Import from prospects
  const handleImportProspects = async (selectedProspectIds) => {
    try {
      const selectedProspects = prospects.filter(p => selectedProspectIds.includes(p.id));
      await emailService.contacts.importFromProspects(selectedProspects);
      toast.success(`Imported ${selectedProspects.length} prospects`);
      setShowProspectModal(false);
      loadContacts();
      onContactsUpdated?.();
    } catch (error) {
      console.error('Error importing prospects:', error);
      toast.error('Failed to import prospects');
    }
  };

  // Delete contacts
  const handleDeleteContacts = async (ids) => {
    if (!confirm(`Delete ${ids.length} contact(s)?`)) return;

    try {
      await emailService.contacts.deleteMany(ids);
      toast.success(`Deleted ${ids.length} contact(s)`);
      setSelectedContacts([]);
      loadContacts();
      onContactsUpdated?.();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast.error('Failed to delete contacts');
    }
  };

  // Delete list
  const handleDeleteList = async (listId) => {
    if (!confirm('Delete this list? Contacts will not be deleted.')) return;

    try {
      await emailService.lists.delete(listId);
      toast.success('List deleted');
      loadLists();
      setSelectedList(null);
      setListContacts([]);
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Failed to delete list');
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
      loadLists();
      if (selectedList?.id === editingList.id) {
        loadListContacts(editingList.id);
      }
    } catch (error) {
      console.error('Error updating list:', error);
      toast.error('Failed to update list');
    }
  };

  // Remove contact from list
  const handleRemoveFromList = async (contactId) => {
    if (!selectedList) return;

    try {
      await emailService.lists.removeContacts(selectedList.id, [contactId]);
      toast.success('Contact removed from list');
      loadListContacts(selectedList.id);
      loadLists();
    } catch (error) {
      console.error('Error removing contact from list:', error);
      toast.error('Failed to remove contact');
    }
  };

  // Add selected contacts to list
  const handleAddToList = async (listId) => {
    if (selectedContacts.length === 0) {
      toast.error('Please select contacts first');
      return;
    }

    try {
      await emailService.lists.addContacts(listId, selectedContacts);
      toast.success(`Added ${selectedContacts.length} contact(s) to list`);
      setShowListModal(false);
      setSelectedContacts([]);
      loadLists();
    } catch (error) {
      console.error('Error adding contacts to list:', error);
      toast.error('Failed to add contacts to list');
    }
  };

  // Toggle contact selection
  const toggleContactSelection = (id) => {
    setSelectedContacts(prev =>
      prev.includes(id)
        ? prev.filter(cid => cid !== id)
        : [...prev, id]
    );
  };

  // Toggle all contacts selection
  const toggleAllContacts = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(c => c.id));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { label: 'Active', color: 'bg-green-500' },
      unsubscribed: { label: 'Unsubscribed', color: 'bg-orange-500' },
      bounced: { label: 'Bounced', color: 'bg-red-500' },
      complained: { label: 'Complained', color: 'bg-red-600' }
    };
    return badges[status] || badges.active;
  };

  // Group lists by category/theme
  const groupedLists = lists.reduce((acc, list) => {
    const category = list.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(list);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Global Drop Zone Overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="bg-white rounded-2xl p-12 shadow-2xl border-4 border-dashed border-blue-500 text-center">
            <Upload className="w-20 h-20 text-blue-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-white mb-2">Drop your file here</h3>
            <p className="text-white/90">CSV or PDF files supported</p>
          </div>
        </div>
      )}

      {/* Header & Actions */}
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        onDragEnter={handleDragEnter}
        ref={dropZoneRef}
      >
        <div>
          <h3 className="text-xl font-bold text-white">Contacts</h3>
          <p className="text-white/90">Manage your email subscribers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Vibrant Import CSV/PDF Button */}
          <Button 
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30"
            onClick={() => {
              setImportStep(1);
              setShowImportModal(true);
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV/PDF
          </Button>
          
          {/* Vibrant From Prospects Button */}
          <Button 
            className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg shadow-purple-500/30"
            onClick={() => setShowProspectModal(true)}
          >
            <Target className="w-4 h-4 mr-2" />
            From Prospects
          </Button>
          
          {/* Vibrant Select from List Button - navigates to Contact Lists page */}
          <Button 
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30"
            onClick={() => onNavigateToLists ? onNavigateToLists() : setShowListManagerModal(true)}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Contact Lists
          </Button>
          
          {/* Vibrant Add Contact Button */}
          <Button 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <Card 
        className={`bg-white/40 backdrop-blur-sm border-2 border-dashed transition-all duration-300 cursor-pointer ${
          isDragging 
            ? 'border-blue-500 bg-blue-50/50' 
            : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/20'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="py-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              {processingFile ? (
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-white">
                {processingFile ? 'Processing file...' : 'Drag & drop CSV or PDF files here'}
              </p>
              <p className="text-sm text-white/80 mt-1">
                or click to browse • Supports CSV and PDF files
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                CSV
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <FileText className="w-3 h-3 mr-1" />
                PDF
              </Badge>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-white/40 backdrop-blur-sm border-white/30">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/90" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/60"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white/60">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedContacts.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                {selectedContacts.length} contact(s) selected
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                  onClick={() => setShowListModal(true)}
                >
                  <Tag className="w-4 h-4 mr-1" />
                  Add to List
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteContacts(selectedContacts)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts Table */}
      <Card className="bg-white/40 backdrop-blur-sm border-white/30">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedContacts.length === contacts.length && contacts.length > 0}
                      onCheckedChange={toggleAllContacts}
                    />
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length > 0 ? (
                  contacts.map((contact) => {
                    const statusBadge = getStatusBadge(contact.status);
                    return (
                      <TableRow 
                        key={contact.id} 
                        className="hover:bg-white/40 cursor-pointer"
                        onClick={(e) => {
                          // Don't trigger edit if clicking checkbox or dropdown
                          if (e.target.closest('button') || e.target.closest('[role="checkbox"]')) return;
                          handleEditContact(contact);
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={() => toggleContactSelection(contact.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                              {(contact.first_name?.[0] || contact.email[0]).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-white">
                                {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-white/90">
                            <Mail className="w-4 h-4 mr-2" />
                            {contact.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.phone ? (
                            <div className="flex items-center text-white/90">
                              <Phone className="w-4 h-4 mr-2" />
                              {contact.phone}
                            </div>
                          ) : (
                            <span className="text-white/90">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.company ? (
                            <div className="flex items-center text-white/90">
                              <Building2 className="w-4 h-4 mr-2" />
                              {contact.company}
                            </div>
                          ) : (
                            <span className="text-white/90">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.website ? (
                            <a 
                              href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="w-4 h-4 mr-2" />
                              {contact.website.replace(/^https?:\/\//, '').substring(0, 20)}{contact.website.length > 20 ? '...' : ''}
                            </a>
                          ) : (
                            <span className="text-white/90">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.city ? (
                            <div className="flex items-center text-white/90">
                              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {contact.city}
                            </div>
                          ) : (
                            <span className="text-white/90">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusBadge.color} text-white`}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedContacts([contact.id]);
                                setShowListModal(true);
                              }}>
                                <Tag className="w-4 h-4 mr-2" />
                                Add to List
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteContacts([contact.id])}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Users className="w-12 h-12 text-white/90 mx-auto mb-4" />
                      <p className="text-white/90 mb-4">No contacts found</p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        <Button 
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                          onClick={() => setShowImportModal(true)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Import CSV/PDF
                        </Button>
                        <Button 
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                          onClick={() => setShowAddModal(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Contact
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Contact Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Add a new contact to your email list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@company.com"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name" className="text-white">First Name</Label>
                <Input
                  id="first_name"
                  placeholder="First Name"
                  value={newContact.first_name}
                  onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                  className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                />
              </div>
              <div>
                <Label htmlFor="last_name" className="text-white">Last Name</Label>
                <Input
                  id="last_name"
                  placeholder="Last Name"
                  value={newContact.last_name}
                  onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                  className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="company" className="text-white">Company</Label>
              <Input
                id="company"
                placeholder="Company Name"
                value={newContact.company}
                onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-white">Phone</Label>
              <Input
                id="phone"
                placeholder="+1 234 567 8900"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
              />
            </div>
            <div>
              <Label htmlFor="website" className="text-white">Website</Label>
              <Input
                id="website"
                placeholder="https://example.com"
                value={newContact.website}
                onChange={(e) => setNewContact({ ...newContact, website: e.target.value })}
                className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
              />
            </div>
            <div>
              <Label htmlFor="city" className="text-white">City / Location</Label>
              <Input
                id="city"
                placeholder="New York, NY"
                value={newContact.city}
                onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-slate-300 text-white hover:bg-white/50">Cancel</Button>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              onClick={handleAddContact}
            >
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open);
        if (!open) setEditingContact(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-500" />
              Edit Contact
            </DialogTitle>
            <DialogDescription>Update contact information</DialogDescription>
          </DialogHeader>
          {editingContact && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_email" className="text-white">Email *</Label>
                <Input
                  id="edit_email"
                  type="email"
                  placeholder="email@company.com"
                  value={editingContact.email || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_first_name" className="text-white">First Name</Label>
                  <Input
                    id="edit_first_name"
                    placeholder="First Name"
                    value={editingContact.first_name || ''}
                    onChange={(e) => setEditingContact({ ...editingContact, first_name: e.target.value })}
                    className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_last_name" className="text-white">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    placeholder="Last Name"
                    value={editingContact.last_name || ''}
                    onChange={(e) => setEditingContact({ ...editingContact, last_name: e.target.value })}
                    className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_company" className="text-white">Company</Label>
                <Input
                  id="edit_company"
                  placeholder="Company Name"
                  value={editingContact.company || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, company: e.target.value })}
                  className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                />
              </div>
              <div>
                <Label htmlFor="edit_phone" className="text-white">Phone</Label>
                <Input
                  id="edit_phone"
                  placeholder="+1 234 567 8900"
                  value={editingContact.phone || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                  className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                />
              </div>
              <div>
                <Label htmlFor="edit_website" className="text-white">Website</Label>
                <Input
                  id="edit_website"
                  placeholder="https://example.com"
                  value={editingContact.website || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, website: e.target.value })}
                  className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                />
              </div>
              <div>
                <Label htmlFor="edit_city" className="text-white">City / Location</Label>
                <Input
                  id="edit_city"
                  placeholder="New York, NY"
                  value={editingContact.city || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, city: e.target.value })}
                  className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditModal(false);
              setEditingContact(null);
            }} className="border-slate-300 text-white hover:bg-white/50">Cancel</Button>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              onClick={handleSaveContact}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV/PDF Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>
              Upload a CSV or PDF file to import contacts in bulk
            </DialogDescription>
          </DialogHeader>

          {importStep === 1 && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                  isDragging 
                    ? 'border-blue-400 bg-blue-100/50' 
                    : 'border-slate-300 hover:border-blue-400 hover:bg-white/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {processingFile ? (
                  <>
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white/90">Processing file...</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-white font-medium mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-white/80 mb-4">CSV or PDF file (max 10MB)</p>
                    <div className="flex gap-2 justify-center">
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        <FileSpreadsheet className="w-3 h-3 mr-1" />
                        CSV
                      </Badge>
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </Badge>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <div className="bg-white/50 border border-white/60 rounded-lg p-4">
                <p className="text-sm font-medium text-white mb-2">Supported Formats:</p>
                <ul className="text-sm text-white/90 space-y-1">
                  <li>• <strong className="text-white">CSV:</strong> First row should contain column headers (email required)</li>
                  <li>• <strong className="text-white">PDF:</strong> Any PDF with email addresses (extracted automatically)</li>
                </ul>
                <p className="text-sm font-medium text-white mt-3 mb-2">Smart Column Detection:</p>
                <p className="text-xs text-white/80">
                  We automatically detect: email, first name, last name, full name, company, phone, website, city, state, and more. 
                  Common variations like "E-mail", "Phone Number", "Business Name" are recognized.
                </p>
              </div>
            </div>
          )}

          {importStep === 2 && importData && (
            <div className="space-y-4">
              <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="text-green-700 font-medium">
                    Found {importData.rows.length} {importType === 'pdf' || importData.isPDF ? 'contacts' : 'rows'}
                  </p>
                </div>
              </div>

              {/* List Creation/Selection */}
              <div className="bg-white/50 border border-white/60 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-white" />
                  <p className="font-medium text-white">Save to List</p>
                </div>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={importToNewList}
                      onChange={() => setImportToNewList(true)}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-sm text-white">Create new list</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!importToNewList}
                      onChange={() => setImportToNewList(false)}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-sm text-white">Add to existing list</span>
                  </label>
                </div>

                {importToNewList ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="listName" className="text-white">List Name *</Label>
                      <Input
                        id="listName"
                        placeholder="e.g., Conference Attendees 2024"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                      />
                    </div>
                    <div>
                      <Label htmlFor="listDescription" className="text-white">Description (optional)</Label>
                      <Textarea
                        id="listDescription"
                        placeholder="Brief description of this list..."
                        value={newListDescription}
                        onChange={(e) => setNewListDescription(e.target.value)}
                        className="bg-white/50 border-white/40 text-white placeholder:text-white/90"
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-white">Select List</Label>
                    <Select value={selectedListId || ''} onValueChange={setSelectedListId}>
                      <SelectTrigger className="bg-white/50 border-white/40 text-white">
                        <SelectValue placeholder="Choose a list" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-white">
                        <SelectItem value="none" className="focus:bg-slate-100">No list (import only)</SelectItem>
                        {lists.map(list => (
                          <SelectItem key={list.id} value={list.id} className="focus:bg-slate-100">
                            {list.name} ({list.email_list_contacts?.[0]?.count || 0} contacts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* CSV Column Mapping (only for CSV) */}
              {importType === 'csv' && !importData.isPDF && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-white">Map your CSV columns:</p>
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      {Object.keys(csvMapping).filter(k => csvMapping[k] && csvMapping[k] !== 'none').length} columns mapped
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Email - Required */}
                    <div>
                      <Label className="text-xs text-white/90">Email *</Label>
                      <Select value={csvMapping.email || ''} onValueChange={(v) => setCsvMapping({ ...csvMapping, email: v })}>
                        <SelectTrigger className="h-9 bg-white/50 border-white/40 text-white">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-white">
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* First Name */}
                    <div>
                      <Label className="text-xs text-white/90">First Name</Label>
                      <Select value={csvMapping.first_name || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, first_name: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-9 bg-white/50 border-white/40 text-white">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-white">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Last Name */}
                    <div>
                      <Label className="text-xs text-white/90">Last Name</Label>
                      <Select value={csvMapping.last_name || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, last_name: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-9 bg-white/50 border-white/40 text-white">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-white">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Full Name (alternative) */}
                    <div>
                      <Label className="text-xs text-white/90">Full Name</Label>
                      <Select value={csvMapping.full_name || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, full_name: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-9 bg-white/50 border-white/40 text-white">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-white">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Company */}
                    <div>
                      <Label className="text-xs text-white/90">Company</Label>
                      <Select value={csvMapping.company || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, company: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-9 bg-white/50 border-white/40 text-white">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-white">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Phone */}
                    <div>
                      <Label className="text-xs text-white/90">Phone</Label>
                      <Select value={csvMapping.phone || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, phone: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-9 bg-white/50 border-white/40 text-white">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-white">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Website */}
                    <div>
                      <Label className="text-xs text-white/90">Website</Label>
                      <Select value={csvMapping.website || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, website: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-9 bg-white/50 border-white/40 text-white">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-white">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* City */}
                    <div>
                      <Label className="text-xs text-white/90">City/Location</Label>
                      <Select value={csvMapping.city || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, city: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-9 bg-white/50 border-white/40 text-white">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-white">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* State */}
                    <div>
                      <Label className="text-xs text-white/90">State/Province</Label>
                      <Select value={csvMapping.state || 'none'} onValueChange={(v) => setCsvMapping({ ...csvMapping, state: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-9 bg-white/50 border-white/40 text-white">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-white/40 text-white">
                          <SelectItem value="none" className="focus:bg-slate-100">None</SelectItem>
                          {importData.headers.map(header => (
                            <SelectItem key={header} value={header} className="focus:bg-slate-100">{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-white/80 mt-2">
                    Tip: Columns are auto-detected based on header names. You can adjust mappings manually if needed.
                  </p>
                </div>
              )}

              {/* Preview - Scrollable to view all contacts */}
              <div>
                <p className="text-sm font-medium text-white mb-2">Preview ({importData.rows.length} contacts - scroll to view all):</p>
                <div className="border border-white/40 rounded-lg overflow-hidden bg-white/30">
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                        <TableRow className="border-white/40">
                          <TableHead className="w-10 text-xs text-white/90">#</TableHead>
                          <TableHead className="text-xs text-white/90">Email</TableHead>
                          <TableHead className="text-xs text-white/90">Name</TableHead>
                          <TableHead className="text-xs text-white/90">Company</TableHead>
                          <TableHead className="text-xs text-white/90">Phone</TableHead>
                          <TableHead className="text-xs text-white/90">Website</TableHead>
                          <TableHead className="text-xs text-white/90">Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importData.rows.map((row, idx) => {
                          // Helper to get value from mapping
                          const getValue = (field) => {
                            if (importData.isPDF || importType === 'pdf') return row[field] || '-';
                            if (!csvMapping[field]) return '-';
                            return row[csvMapping[field]] || '-';
                          };
                          
                          // Combine name fields
                          let displayName = '-';
                          if (importData.isPDF || importType === 'pdf') {
                            displayName = [row.first_name, row.last_name].filter(Boolean).join(' ') || '-';
                          } else {
                            const firstName = csvMapping.first_name ? row[csvMapping.first_name] : '';
                            const lastName = csvMapping.last_name ? row[csvMapping.last_name] : '';
                            const fullName = csvMapping.full_name ? row[csvMapping.full_name] : '';
                            displayName = fullName || [firstName, lastName].filter(Boolean).join(' ') || '-';
                          }
                          
                          return (
                            <TableRow key={idx} className="hover:bg-white/50 border-white/30">
                              <TableCell className="text-white/80 text-xs">{idx + 1}</TableCell>
                              <TableCell className="font-medium text-xs max-w-[150px] truncate text-white">
                                {getValue('email')}
                              </TableCell>
                              <TableCell className="text-xs max-w-[100px] truncate text-white">{displayName}</TableCell>
                              <TableCell className="text-xs max-w-[100px] truncate text-white">{getValue('company')}</TableCell>
                              <TableCell className="text-xs max-w-[100px] truncate text-white">{getValue('phone')}</TableCell>
                              <TableCell className="text-xs max-w-[100px] truncate text-white">{getValue('website')}</TableCell>
                              <TableCell className="text-xs max-w-[100px] truncate text-white">{getValue('city')}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar during Import */}
          {isImporting && (
            <div className="space-y-3 pt-4 border-t border-white/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {importStatus === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : importStatus === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span className="text-sm font-medium text-white">{importStatus}</span>
                </div>
                <span className="text-sm font-bold text-white">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-3" />
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportModal(false);
                setImportData(null);
                setCsvMapping({});
                setImportStep(1);
                setNewListName('');
                setNewListDescription('');
                setIsImporting(false);
                setImportProgress(0);
                setImportStatus('');
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            {importStep === 2 && (
              <Button 
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                onClick={handleImportContacts}
                disabled={isImporting || (importType === 'csv' && !importData?.isPDF && !csvMapping.email) || (importToNewList && !newListName.trim())}
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {importData?.rows.length} Contacts
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* List Manager Modal */}
      <Dialog open={showListManagerModal} onOpenChange={setShowListManagerModal}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-500" />
              Contact Lists
            </DialogTitle>
            <DialogDescription>
              Manage your contact lists - view, edit, or select contacts for campaigns
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 h-[500px]">
            {/* Lists Panel */}
            <div className="col-span-1 border-r pr-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-white">Your Lists</h4>
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                  onClick={() => setShowCreateListModal(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <ScrollArea className="h-[440px]">
                <div className="space-y-2 pr-2">
                  {Object.entries(groupedLists).map(([category, categoryLists]) => (
                    <div key={category} className="mb-4">
                      <p className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Folder className="w-3 h-3" />
                        {category}
                      </p>
                      {categoryLists.map((list) => (
                        <div
                          key={list.id}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            selectedList?.id === list.id
                              ? 'bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300'
                              : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                          }`}
                          onClick={() => loadListContacts(list.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">{list.name}</p>
                              <p className="text-xs text-white/80">
                                {list.email_list_contacts?.[0]?.count || 0} contacts
                              </p>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-white/90 transition-transform ${
                              selectedList?.id === list.id ? 'rotate-90' : ''
                            }`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {lists.length === 0 && (
                    <div className="text-center py-8">
                      <FolderOpen className="w-12 h-12 text-white mx-auto mb-3" />
                      <p className="text-white/80 text-sm">No lists yet</p>
                      <Button 
                        size="sm" 
                        className="mt-3 bg-gradient-to-r from-amber-500 to-orange-600"
                        onClick={() => setShowCreateListModal(true)}
                      >
                        Create First List
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* List Details Panel */}
            <div className="col-span-2">
              {selectedList ? (
                <div className="h-full flex flex-col">
                  {/* List Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <div>
                      {editingList?.id === selectedList.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingList.name}
                            onChange={(e) => setEditingList({ ...editingList, name: e.target.value })}
                            className="font-bold text-lg"
                          />
                          <Input
                            value={editingList.description || ''}
                            onChange={(e) => setEditingList({ ...editingList, description: e.target.value })}
                            placeholder="Description"
                            className="text-sm"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="font-bold text-lg text-white">{selectedList.name}</h3>
                          <p className="text-sm text-white/80">{selectedList.description || 'No description'}</p>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editingList?.id === selectedList.id ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditingList(null)}>
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
                          <Button size="sm" variant="outline" onClick={() => setEditingList({ ...selectedList })}>
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteList(selectedList.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Search */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/90" />
                      <Input
                        placeholder="Search contacts in this list..."
                        value={listSearchQuery}
                        onChange={(e) => setListSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Contacts in List */}
                  <ScrollArea className="flex-1">
                    <div className="space-y-2">
                      {listContacts
                        .filter(c => 
                          !listSearchQuery || 
                          c.email?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
                          c.first_name?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
                          c.last_name?.toLowerCase().includes(listSearchQuery.toLowerCase())
                        )
                        .map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                                {(contact.first_name?.[0] || contact.email?.[0] || '?').toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
                                </p>
                                <p className="text-sm text-white/80">{contact.email}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveFromList(contact.id)}
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}

                      {listContacts.length === 0 && (
                        <div className="text-center py-12">
                          <Users className="w-12 h-12 text-white mx-auto mb-3" />
                          <p className="text-white/80">No contacts in this list</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <List className="w-16 h-16 text-white mx-auto mb-4" />
                    <p className="text-white/80 font-medium">Select a list to view contacts</p>
                    <p className="text-sm text-white/90 mt-1">Click on a list from the left panel</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowListManagerModal(false);
              setSelectedList(null);
              setListContacts([]);
              setListSearchQuery('');
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New List Modal */}
      <Dialog open={showCreateListModal} onOpenChange={setShowCreateListModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-500" />
              Create New List
            </DialogTitle>
            <DialogDescription>
              Create a new contact list to organize your contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newListName">List Name *</Label>
              <Input
                id="newListName"
                placeholder="e.g., VIP Clients, Newsletter Subscribers"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newListDesc">Description</Label>
              <Textarea
                id="newListDesc"
                placeholder="Brief description of this list..."
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateListModal(false);
              setNewListName('');
              setNewListDescription('');
            }}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              onClick={async () => {
                await handleCreateList();
                setShowCreateListModal(false);
              }}
              disabled={!newListName.trim()}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to List Modal */}
      <Dialog open={showListModal} onOpenChange={setShowListModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to List</DialogTitle>
            <DialogDescription>
              Select a list to add {selectedContacts.length} contact(s)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 p-1">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between p-4 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                  onClick={() => handleAddToList(list.id)}
                >
                  <div>
                    <p className="font-medium text-white">{list.name}</p>
                    <p className="text-sm text-white/80">
                      {list.email_list_contacts?.[0]?.count || 0} contacts
                    </p>
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {lists.length === 0 && (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-white mx-auto mb-3" />
                  <p className="text-white/80 mb-3">No lists available</p>
                  <Button 
                    className="bg-gradient-to-r from-amber-500 to-orange-600"
                    onClick={() => {
                      setShowListModal(false);
                      setShowCreateListModal(true);
                    }}
                  >
                    Create New List
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowListModal(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Prospects Modal */}
      <ProspectImportModal
        open={showProspectModal}
        onClose={() => setShowProspectModal(false)}
        prospects={prospects}
        onImport={handleImportProspects}
      />
    </div>
  );
}

// Sub-component for Prospect Import
function ProspectImportModal({ open, onClose, prospects, onImport }) {
  const [selected, setSelected] = useState([]);

  const toggleProspect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === prospects.length) {
      setSelected([]);
    } else {
      setSelected(prospects.map(p => p.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Import from Prospects
          </DialogTitle>
          <DialogDescription>
            Select prospects to add to your email contacts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/90">{prospects.length} prospects available</p>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selected.length === prospects.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-4 space-y-2">
              {prospects.length > 0 ? (
                prospects.map((prospect) => (
                  <div
                    key={prospect.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selected.includes(prospect.id)
                        ? 'bg-purple-50 border-purple-200 border-2'
                        : 'bg-white hover:bg-slate-50 border border-slate-200'
                    }`}
                    onClick={() => toggleProspect(prospect.id)}
                  >
                    <Checkbox checked={selected.includes(prospect.id)} />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white font-bold">
                      {prospect.name?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{prospect.name}</p>
                      <p className="text-sm text-white/90">{prospect.email}</p>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      <Target className="w-3 h-3 mr-1" />
                      Prospect
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-white mx-auto mb-3" />
                  <p className="text-white/80">No prospects available</p>
                  <p className="text-sm text-white/90 mt-1">Add prospects from the Prospecting section first</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white"
            onClick={() => onImport(selected)} 
            disabled={selected.length === 0}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Import {selected.length} Prospect(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
