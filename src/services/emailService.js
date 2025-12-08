// ============================================================================
// EMAIL SERVICE - Supabase Integration for Bulk Email Marketing
// ============================================================================
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Default email sender configuration
export const EMAIL_DEFAULTS = {
  fromEmail: import.meta.env.VITE_DEFAULT_FROM_EMAIL || 'info@lynckstudio.pro',
  fromName: import.meta.env.VITE_DEFAULT_FROM_NAME || 'LynckStudio Pro'
};

// ============================================================================
// CONTACTS SERVICE
// ============================================================================
export const contactsService = {
  /**
   * Get all contacts for the current user
   */
  async getAll(options = {}) {
    const { limit = 100, offset = 0, search = '', status = 'all', tags = [] } = options;
    
    let query = supabase
      .from('email_contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (limit) query = query.limit(limit);
    if (offset) query = query.range(offset, offset + limit - 1);
    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`);
    if (tags.length > 0) query = query.contains('tags', tags);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get a single contact by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('email_contacts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Create a new contact
   */
  async create(contact) {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('email_contacts')
      .insert({
        ...contact,
        user_id: user?.user?.id,
        full_name: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Create multiple contacts (bulk import)
   */
  async createMany(contacts) {
    const { data: user } = await supabase.auth.getUser();
    
    const contactsWithUser = contacts.map(contact => ({
      ...contact,
      user_id: user?.user?.id,
      full_name: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
    }));
    
    const { data, error } = await supabase
      .from('email_contacts')
      .insert(contactsWithUser)
      .select();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update a contact
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('email_contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a contact
   */
  async delete(id) {
    const { error } = await supabase
      .from('email_contacts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  /**
   * Delete multiple contacts
   */
  async deleteMany(ids) {
    const { error } = await supabase
      .from('email_contacts')
      .delete()
      .in('id', ids);
    
    if (error) throw error;
    return true;
  },

  /**
   * Import contacts from prospects
   */
  async importFromProspects(prospects) {
    const contacts = prospects.map(prospect => ({
      email: prospect.email,
      first_name: prospect.name?.split(' ')[0],
      last_name: prospect.name?.split(' ').slice(1).join(' '),
      full_name: prospect.name,
      company: prospect.businessName,
      phone: prospect.phone,
      website: prospect.website,
      location: prospect.location,
      source: 'prospect',
      source_id: prospect.id?.toString(),
      tags: ['prospect']
    }));
    
    return this.createMany(contacts);
  },

  /**
   * Get contact count
   */
  async getCount(filters = {}) {
    let query = supabase
      .from('email_contacts')
      .select('id', { count: 'exact', head: true });
    
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    
    const { count, error } = await query;
    if (error) throw error;
    return count;
  }
};

// ============================================================================
// LISTS SERVICE
// ============================================================================
export const listsService = {
  /**
   * Get all lists
   */
  async getAll() {
    const { data, error } = await supabase
      .from('email_lists')
      .select('*, email_list_contacts(count)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Get a single list with contacts
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('email_lists')
      .select(`
        *,
        email_list_contacts(
          contact:email_contacts(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Create a new list
   */
  async create(list) {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('email_lists')
      .insert({
        ...list,
        user_id: user?.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update a list
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('email_lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a list
   */
  async delete(id) {
    const { error } = await supabase
      .from('email_lists')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  /**
   * Add contacts to a list
   */
  async addContacts(listId, contactIds) {
    const entries = contactIds.map(contactId => ({
      list_id: listId,
      contact_id: contactId
    }));
    
    const { data, error } = await supabase
      .from('email_list_contacts')
      .insert(entries)
      .select();
    
    if (error) throw error;
    return data;
  },

  /**
   * Remove contacts from a list
   */
  async removeContacts(listId, contactIds) {
    const { error } = await supabase
      .from('email_list_contacts')
      .delete()
      .eq('list_id', listId)
      .in('contact_id', contactIds);
    
    if (error) throw error;
    return true;
  }
};

// ============================================================================
// TEMPLATES SERVICE
// ============================================================================
export const templatesService = {
  /**
   * Get all templates
   */
  async getAll(category = null) {
    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (category) query = query.eq('category', category);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get a single template
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Create a new template
   */
  async create(template) {
    const { data: user } = await supabase.auth.getUser();
    
    // Extract variables from HTML content
    const variables = extractVariables(template.html_content);
    
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        ...template,
        user_id: user?.user?.id,
        variables
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update a template
   */
  async update(id, updates) {
    // Re-extract variables if HTML content changed
    if (updates.html_content) {
      updates.variables = extractVariables(updates.html_content);
    }
    
    const { data, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a template (soft delete)
   */
  async delete(id) {
    const { error } = await supabase
      .from('email_templates')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  /**
   * Upload template thumbnail
   */
  async uploadThumbnail(templateId, file) {
    const fileName = `templates/${templateId}/${Date.now()}-thumbnail.${file.name.split('.').pop()}`;
    
    const { data, error } = await supabase.storage
      .from('email-assets')
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('email-assets')
      .getPublicUrl(fileName);
    
    // Update template with thumbnail URL
    await this.update(templateId, { thumbnail_url: publicUrl });
    
    return publicUrl;
  }
};

// ============================================================================
// CAMPAIGNS SERVICE
// ============================================================================
export const campaignsService = {
  /**
   * Get all campaigns
   */
  async getAll(status = null) {
    let query = supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get a single campaign with details
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        template:email_templates(*),
        list:email_lists(*),
        segment:email_segments(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Create a new campaign
   */
  async create(campaign) {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert({
        ...campaign,
        user_id: user?.user?.id,
        from_email: campaign.from_email || EMAIL_DEFAULTS.fromEmail,
        from_name: campaign.from_name || EMAIL_DEFAULTS.fromName,
        status: 'draft'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update a campaign
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a campaign
   */
  async delete(id) {
    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  /**
   * Schedule a campaign
   */
  async schedule(id, scheduledAt) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .update({
        status: 'scheduled',
        scheduled_at: scheduledAt
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Send campaign immediately
   */
  async sendNow(id) {
    // Call Edge Function to process the campaign
    // Note: Function slug is 'smart-action' (deployed name is 'send-campaign')
    const { data, error } = await supabase.functions.invoke('smart-action', {
      body: { campaignId: id }
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Pause a scheduled campaign
   */
  async pause(id) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .update({ status: 'paused' })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Resume a paused campaign
   */
  async resume(id) {
    const campaign = await this.getById(id);
    const newStatus = campaign.scheduled_at ? 'scheduled' : 'draft';
    
    const { data, error } = await supabase
      .from('email_campaigns')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Cancel a campaign
   */
  async cancel(id) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Duplicate a campaign
   */
  async duplicate(id) {
    const campaign = await this.getById(id);
    
    const newCampaign = {
      name: `${campaign.name} (Copy)`,
      description: campaign.description,
      subject: campaign.subject,
      from_name: campaign.from_name,
      from_email: campaign.from_email,
      reply_to: campaign.reply_to,
      template_id: campaign.template_id,
      html_content: campaign.html_content,
      text_content: campaign.text_content,
      preview_text: campaign.preview_text,
      recipient_type: campaign.recipient_type,
      recipient_list_id: campaign.recipient_list_id,
      recipient_segment_id: campaign.recipient_segment_id,
      track_opens: campaign.track_opens,
      track_clicks: campaign.track_clicks,
      tags: campaign.tags
    };
    
    return this.create(newCampaign);
  },

  /**
   * Get campaign analytics
   */
  async getAnalytics(id) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select(`
        id,
        name,
        total_sent,
        total_delivered,
        total_opened,
        total_clicked,
        total_bounced,
        total_complained,
        total_unsubscribed,
        open_rate,
        click_rate,
        bounce_rate,
        started_at,
        completed_at
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Get campaign sends (individual email records)
   */
  async getSends(campaignId, options = {}) {
    const { limit = 50, offset = 0, status = null } = options;
    
    let query = supabase
      .from('email_sends')
      .select('*, contact:email_contacts(email, first_name, last_name)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================
export const analyticsService = {
  /**
   * Get overall email marketing stats
   */
  async getOverallStats() {
    const { data: user } = await supabase.auth.getUser();
    
    // Get campaign stats
    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('total_sent, total_delivered, total_opened, total_clicked, total_bounced')
      .eq('user_id', user?.user?.id);
    
    // Get contact count
    const { count: contactCount } = await supabase
      .from('email_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user?.user?.id)
      .eq('status', 'active');
    
    // Aggregate stats
    const stats = campaigns?.reduce((acc, campaign) => ({
      totalSent: acc.totalSent + (campaign.total_sent || 0),
      totalDelivered: acc.totalDelivered + (campaign.total_delivered || 0),
      totalOpened: acc.totalOpened + (campaign.total_opened || 0),
      totalClicked: acc.totalClicked + (campaign.total_clicked || 0),
      totalBounced: acc.totalBounced + (campaign.total_bounced || 0)
    }), { totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, totalBounced: 0 }) || {};
    
    return {
      ...stats,
      contactCount: contactCount || 0,
      campaignCount: campaigns?.length || 0,
      openRate: stats.totalDelivered > 0 ? ((stats.totalOpened / stats.totalDelivered) * 100).toFixed(1) : 0,
      clickRate: stats.totalDelivered > 0 ? ((stats.totalClicked / stats.totalDelivered) * 100).toFixed(1) : 0
    };
  },

  /**
   * Get analytics events for a campaign
   */
  async getCampaignEvents(campaignId, eventType = null) {
    let query = supabase
      .from('email_analytics_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    
    if (eventType) query = query.eq('event_type', eventType);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get time-series data for charts
   */
  async getTimeSeriesData(campaignId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('email_analytics_events')
      .select('event_type, created_at')
      .eq('campaign_id', campaignId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Group by date and event type
    const grouped = data?.reduce((acc, event) => {
      const date = event.created_at.split('T')[0];
      if (!acc[date]) acc[date] = { opens: 0, clicks: 0 };
      if (event.event_type === 'opened') acc[date].opens++;
      if (event.event_type === 'clicked') acc[date].clicks++;
      return acc;
    }, {}) || {};
    
    return Object.entries(grouped).map(([date, stats]) => ({
      date,
      ...stats
    }));
  }
};

// ============================================================================
// CSV IMPORT SERVICE
// ============================================================================
export const csvImportService = {
  /**
   * Parse CSV file
   */
  parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {});
    });
    
    return { headers, rows };
  },

  /**
   * Import contacts from CSV
   */
  async importContacts(csvData, mapping, listId = null) {
    const { data: user } = await supabase.auth.getUser();
    
    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('csv_imports')
      .insert({
        user_id: user?.user?.id,
        file_name: 'csv_import',
        column_mapping: mapping,
        list_id: listId,
        total_rows: csvData.rows.length,
        status: 'processing'
      })
      .select()
      .single();
    
    if (importError) throw importError;
    
    // Map CSV data to contacts
    const contacts = csvData.rows.map(row => ({
      email: row[mapping.email],
      first_name: mapping.first_name ? row[mapping.first_name] : null,
      last_name: mapping.last_name ? row[mapping.last_name] : null,
      company: mapping.company ? row[mapping.company] : null,
      phone: mapping.phone ? row[mapping.phone] : null,
      source: 'csv_import',
      source_id: importRecord.id
    })).filter(c => c.email && c.email.includes('@')); // Basic email validation
    
    // Import contacts
    const { data: importedContacts, error: contactsError } = await contactsService.createMany(contacts);
    
    // Update import record
    await supabase
      .from('csv_imports')
      .update({
        status: contactsError ? 'failed' : 'completed',
        imported_count: importedContacts?.length || 0,
        skipped_count: csvData.rows.length - (importedContacts?.length || 0),
        completed_at: new Date().toISOString()
      })
      .eq('id', importRecord.id);
    
    // Add to list if specified
    if (listId && importedContacts?.length > 0) {
      await listsService.addContacts(listId, importedContacts.map(c => c.id));
    }
    
    return {
      imported: importedContacts?.length || 0,
      skipped: csvData.rows.length - (importedContacts?.length || 0),
      total: csvData.rows.length
    };
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract template variables from HTML content
 * Looks for patterns like {{variable_name}} or {variable_name}
 */
function extractVariables(htmlContent) {
  const regex = /\{\{?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}?\}/g;
  const variables = new Set();
  let match;
  
  while ((match = regex.exec(htmlContent)) !== null) {
    variables.add(match[1]);
  }
  
  return Array.from(variables);
}

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(template, contact, customData = {}) {
  let content = template;
  
  const data = {
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    full_name: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
    email: contact.email || '',
    company: contact.company || '',
    ...contact.custom_fields,
    ...customData
  };
  
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{?\\s*${key}\\s*\\}?\\}`, 'gi');
    content = content.replace(regex, value || '');
  });
  
  return content;
}

// ============================================================================
// EXPORT ALL SERVICES
// ============================================================================
export const emailService = {
  contacts: contactsService,
  lists: listsService,
  templates: templatesService,
  campaigns: campaignsService,
  analytics: analyticsService,
  csvImport: csvImportService,
  replaceTemplateVariables,
  isConfigured: isSupabaseConfigured,
  defaults: EMAIL_DEFAULTS
};

export default emailService;
