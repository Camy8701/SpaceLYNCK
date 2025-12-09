// ============================================================================
// BASE44 CLIENT - Supabase-based client for LynckSpace
// This client provides real data operations via Supabase
// ============================================================================

import { supabase } from '@/lib/supabase';

// Create entity operations that use Supabase
const createSupabaseEntity = (tableName) => ({
  create: async (data) => {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  filter: async (filters, orderBy, limit) => {
    let query = supabase.from(tableName).select('*');
    
    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }
    
    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  get: async (id) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },
  list: async (options = {}) => {
    let query = supabase.from(tableName).select('*');
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
});

export const base44 = {
  // Auth methods - use Supabase auth
  auth: {
    me: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email
      };
    },
    logout: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    },
    updateMe: async (data) => {
      const { error } = await supabase.auth.updateUser({
        data: data
      });
      if (error) throw error;
      return { success: true };
    },
    login: async (credentials) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });
      if (error) throw error;
      return {
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
        email: data.user.email
      };
    },
    signup: async (userData) => {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name
          }
        }
      });
      if (error) throw error;
      return {
        id: data.user?.id,
        full_name: userData.full_name,
        email: userData.email
      };
    }
  },

  // Entities - auto-generate Supabase entities for all tables
  entities: new Proxy({}, {
    get: (target, prop) => {
      if (!target[prop]) {
        // Convert PascalCase to snake_case for table names
        const tableName = prop.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        target[prop] = createSupabaseEntity(tableName);
      }
      return target[prop];
    }
  }),

  // Realtime subscription using Supabase
  realtime: {
    subscribe: (channel, callback) => {
      const subscription = supabase
        .channel(channel)
        .on('postgres_changes', { event: '*', schema: 'public' }, callback)
        .subscribe();
      
      return {
        unsubscribe: () => {
          supabase.removeChannel(subscription);
        }
      };
    }
  },

  // Storage using Supabase Storage
  storage: {
    upload: async (bucket, path, file) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file);
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      
      return {
        path: data.path,
        url: urlData.publicUrl
      };
    },
    download: async (bucket, path) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);
      if (error) throw error;
      return data;
    },
    delete: async (bucket, path) => {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      if (error) throw error;
      return { success: true };
    }
  },

  // App logs - store in Supabase
  appLogs: {
    logUserInApp: async (pageName) => {
      // Log to console for now, can be extended to store in Supabase
      console.log('[AppLog] Page visit:', pageName);
      return { success: true };
    },
    log: async (event, data) => {
      console.log('[AppLog]', event, data);
      return { success: true };
    }
  },

  // Functions - Supabase Edge Functions
  functions: {
    invoke: async (functionName, params) => {
      console.log(`[Functions] Invoking: ${functionName}`, params);

      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: params
        });

        if (error) {
          console.error(`[Functions] Error from ${functionName}:`, error);
          return { data: null, error };
        }

        console.log(`[Functions] Success from ${functionName}:`, data);
        return { data, error: null };
      } catch (err) {
        console.error(`[Functions] Exception calling ${functionName}:`, err);
        return { data: null, error: err };
      }
    }
  }
};

// Export as default for compatibility
export default base44;
