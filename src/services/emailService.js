// ============================================================================
// EMAIL SERVICE - Supabase Integration for Bulk Email Marketing
// ============================================================================
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Default email sender configuration
export const EMAIL_DEFAULTS = {
  fromEmail: import.meta.env.VITE_DEFAULT_FROM_EMAIL || 'info@lynckstudio.pro',
  fromName: import.meta.env.VITE_DEFAULT_FROM_NAME || 'LynckStudio Pro'
};

// Database error codes and messages for better debugging
const DB_ERROR_MESSAGES = {
  '42P01': 'The email_campaigns table does not exist. Please run the database schema setup.',
  '42501': 'Permission denied. Row Level Security (RLS) policy may be blocking this action.',
  '23502': 'Missing required field value. Some database columns require values.',
  '23505': 'A campaign with this identifier already exists.',
  'PGRST116': 'The requested resource was not found.',
  '': 'Unknown database error. Please check your Supabase configuration.'
};

/**
 * Parse Supabase error and return user-friendly message
 */
function parseSupabaseError(error) {
  if (!error) return 'Unknown error';
  
  // Check for common error codes
  const code = error.code || '';
  if (DB_ERROR_MESSAGES[code]) {
    return DB_ERROR_MESSAGES[code];
  }
  
  // Check for specific error messages
  if (error.message?.includes('does not exist')) {
    return 'The database table does not exist. Please run the schema setup in your Supabase project.';
  }
  if (error.message?.includes('violates row-level security')) {
    return 'Access denied by Row Level Security. Please ensure you are logged in.';
  }
  if (error.message?.includes('violates not-null constraint')) {
    const match = error.message.match(/column "([^"]+)"/);
    return `Missing required field: ${match ? match[1] : 'unknown'}`;
  }
  if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
    return 'Database table not found. Please set up the email marketing schema in Supabase.';
  }
  
  return error.message || 'An unexpected error occurred';
}

/**
 * Check if user is authenticated
 */
async function requireAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('You must be logged in to perform this action');
  }
  return user;
}

/**
 * Check if Supabase is configured
 */
function requireSupabaseConfig() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
  }
}

/**
 * Check if a database table exists
 */
export async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    // If we get data or a specific "no rows" response, table exists
    if (!error || error.code === 'PGRST116') {
      return { exists: true, error: null };
    }
    
    // Table doesn't exist
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return { exists: false, error: 'Table does not exist' };
    }
    
    return { exists: false, error: error.message };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

/**
 * Run database diagnostics
 */
export async function runDatabaseDiagnostics() {
  const results = {
    supabaseConfigured: isSupabaseConfigured,
    authenticated: false,
    userId: null,
    tables: {}
  };
  
  // Check authentication
  try {
    const { data: { user } } = await supabase.auth.getUser();
    results.authenticated = !!user;
    results.userId = user?.id || null;
  } catch (err) {
    results.authenticated = false;
  }
  
  // Check required tables
  const requiredTables = [
    'email_campaigns',
    'email_contacts',
    'email_lists',
    'email_templates',
    'email_sends'
  ];
  
  for (const table of requiredTables) {
    const check = await checkTableExists(table);
    results.tables[table] = check.exists;
  }
  
  return results;
}

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
   * Get all lists for the current user only
   */
  async getAll() {
    const { data: user } = await supabase.auth.getUser();
    
    let query = supabase
      .from('email_lists')
      .select('*, email_list_contacts(count)')
      .order('created_at', { ascending: false });
    
    // Filter to only show user's own lists
    if (user?.user?.id) {
      query = query.eq('user_id', user.user.id);
    }
    
    const { data, error } = await query;
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
   * Get all campaigns for current user
   */
  async getAll(status = null) {
    requireSupabaseConfig();
    
    const { data: userSession } = await supabase.auth.getUser();
    const user = userSession?.user;
    
    let query = supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter by user_id to only show user's own campaigns
    if (user?.id) {
      query = query.eq('user_id', user.id);
    }
    
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[EmailService] Get campaigns error:', error);
      const errorMsg = parseSupabaseError(error);
      
      // If table doesn't exist, return empty array with warning
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('[EmailService] email_campaigns table not found. Please set up the database schema.');
        return [];
      }
      
      // Return empty array instead of throwing for better UX
      return [];
    }
    
    return data || [];
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
   * Note: Database requires subject, from_name, from_email, and html_content as NOT NULL
   * For drafts, we provide default placeholder values
   */
  async create(campaign) {
    requireSupabaseConfig();
    
    // Check authentication first
    let userId;
    try {
      const user = await requireAuth();
      userId = user.id;
    } catch (authError) {
      console.error('[EmailService] Auth error:', authError);
      throw new Error('You must be logged in to create a campaign. Please sign in and try again.');
    }

    // Prepare campaign data with required fields having defaults for drafts
    // CRITICAL: These defaults prevent NOT NULL constraint violations
    const campaignData = {
      name: campaign.name?.trim() || 'Untitled Campaign',
      description: campaign.description || null,
      subject: campaign.subject?.trim() || '(Draft - No Subject)',
      from_name: campaign.from_name?.trim() || EMAIL_DEFAULTS.fromName,
      from_email: campaign.from_email?.trim() || EMAIL_DEFAULTS.fromEmail,
      reply_to: campaign.reply_to || null,
      template_id: campaign.template_id || null,
      html_content: campaign.html_content || '<p>Draft content - edit before sending</p>',
      text_content: campaign.text_content || null,
      preview_text: campaign.preview_text || null,
      recipient_type: campaign.recipient_type || 'all',
      recipient_list_id: campaign.recipient_list_id || null,
      recipient_segment_id: campaign.recipient_segment_id || null,
      track_opens: campaign.track_opens ?? true,
      track_clicks: campaign.track_clicks ?? true,
      scheduled_at: campaign.scheduled_at || null,
      user_id: userId,
      status: campaign.status || 'draft'
    };

    console.log('[EmailService] Creating campaign:', { 
      name: campaignData.name, 
      status: campaignData.status,
      user_id: userId,
      hasContent: !!campaignData.html_content
    });
    
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert(campaignData)
      .select()
      .single();
    
    if (error) {
      console.error('[EmailService] Create campaign error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      const friendlyMessage = parseSupabaseError(error);
      throw new Error(friendlyMessage);
    }
    
    console.log('[EmailService] Campaign created successfully:', data?.id);
    return data;
  },

  /**
   * Update a campaign
   */
  async update(id, updates) {
    requireSupabaseConfig();
    
    // Verify user is authenticated
    try {
      await requireAuth();
    } catch (authError) {
      throw new Error('You must be logged in to update a campaign.');
    }
    
    // Clean up updates - remove undefined values and ensure required fields aren't nulled
    const cleanUpdates = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        // Trim string values
        cleanUpdates[key] = typeof updates[key] === 'string' ? updates[key].trim() : updates[key];
      }
    });

    // Don't allow nulling required fields - use defaults
    if (cleanUpdates.subject === '' || cleanUpdates.subject === null) {
      cleanUpdates.subject = '(Draft - No Subject)';
    }
    if (cleanUpdates.from_name === '' || cleanUpdates.from_name === null) {
      cleanUpdates.from_name = EMAIL_DEFAULTS.fromName;
    }
    if (cleanUpdates.from_email === '' || cleanUpdates.from_email === null) {
      cleanUpdates.from_email = EMAIL_DEFAULTS.fromEmail;
    }
    if (cleanUpdates.html_content === '' || cleanUpdates.html_content === null) {
      cleanUpdates.html_content = '<p>Draft content</p>';
    }
    if (cleanUpdates.name === '' || cleanUpdates.name === null) {
      cleanUpdates.name = 'Untitled Campaign';
    }

    console.log('[EmailService] Updating campaign:', id, Object.keys(cleanUpdates));
    
    const { data, error } = await supabase
      .from('email_campaigns')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[EmailService] Update campaign error:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      
      const friendlyMessage = parseSupabaseError(error);
      throw new Error(friendlyMessage);
    }
    
    console.log('[EmailService] Campaign updated successfully:', id);
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
    requireSupabaseConfig();
    
    // Verify authentication
    try {
      await requireAuth();
    } catch (authError) {
      throw new Error('You must be logged in to send a campaign.');
    }
    
    console.log('[EmailService] Preparing to send campaign:', id);
    
    // First, verify the campaign exists and has required content
    let campaign;
    try {
      campaign = await this.getById(id);
    } catch (err) {
      console.error('[EmailService] Error fetching campaign:', err);
      throw new Error('Could not fetch campaign. ' + parseSupabaseError(err));
    }
    
    if (!campaign) {
      throw new Error('Campaign not found. It may have been deleted.');
    }
    
    // Validate required content
    if (!campaign.html_content || campaign.html_content === '<p>Draft content - edit before sending</p>') {
      throw new Error('Please add email content before sending.');
    }
    
    if (!campaign.subject || campaign.subject === '(Draft - No Subject)') {
      throw new Error('Please add an email subject before sending.');
    }
    
    if (!campaign.from_email) {
      throw new Error('Please specify a "from" email address.');
    }
    
    console.log('[EmailService] Campaign validation passed, invoking Edge Function...');
    
    // Call Edge Function to process the campaign
    // Note: Function slug in Supabase is 'smart-action' (not 'send-campaign')
    const { data, error } = await supabase.functions.invoke('smart-action', {
      body: { campaignId: id }
    });

    if (error) {
      console.error('[EmailService] Send campaign Edge Function error:', {
        message: error.message,
        name: error.name,
        context: error.context
      });

      // Provide specific guidance based on error type
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        throw new Error('The send-campaign Edge Function is not deployed. Please deploy it to your Supabase project.');
      }
      if (error.message?.includes('RESEND_API_KEY')) {
        throw new Error('RESEND_API_KEY is not configured in Supabase Edge Function secrets.');
      }

      throw new Error('Failed to send campaign: ' + (error.message || 'Edge Function error'));
    }

    console.log('[EmailService] Campaign send initiated successfully:', data);
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
