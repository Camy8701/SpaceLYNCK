// Mock Base44 client - app now works standalone without backend
// This stub prevents errors in components that still reference base44
// All methods return mock data or empty promises

const createMockEntity = (entityName) => ({
  create: async (data) => {
    console.log(`[Mock] ${entityName}.create called with:`, data);
    return { id: `mock-${Date.now()}`, ...data };
  },
  update: async (id, data) => {
    console.log(`[Mock] ${entityName}.update called:`, id, data);
    return { id, ...data };
  },
  delete: async (id) => {
    console.log(`[Mock] ${entityName}.delete called:`, id);
    return { success: true };
  },
  filter: async (filters, orderBy, limit) => {
    console.log(`[Mock] ${entityName}.filter called:`, filters, orderBy, limit);
    return [];
  },
  get: async (id) => {
    console.log(`[Mock] ${entityName}.get called:`, id);
    return null;
  },
  list: async (options) => {
    console.log(`[Mock] ${entityName}.list called:`, options);
    return [];
  }
});

export const base44 = {
  // Auth methods
  auth: {
    me: async () => {
      console.log('[Mock] auth.me called');
      return {
        id: 'mock-user-1',
        full_name: 'Guest User',
        email: 'guest@example.com'
      };
    },
    logout: async () => {
      console.log('[Mock] auth.logout called');
      return { success: true };
    },
    updateMe: async (data) => {
      console.log('[Mock] auth.updateMe called:', data);
      return { success: true };
    },
    login: async (credentials) => {
      console.log('[Mock] auth.login called:', credentials);
      return {
        id: 'mock-user-1',
        full_name: 'Guest User',
        email: credentials.email
      };
    },
    signup: async (userData) => {
      console.log('[Mock] auth.signup called:', userData);
      return {
        id: 'mock-user-1',
        full_name: userData.full_name,
        email: userData.email
      };
    }
  },

  // Entities - auto-generate mock entities for all possible tables
  entities: new Proxy({}, {
    get: (target, prop) => {
      if (!target[prop]) {
        target[prop] = createMockEntity(prop);
      }
      return target[prop];
    }
  }),

  // Realtime subscription stub
  realtime: {
    subscribe: (channel, callback) => {
      console.log('[Mock] realtime.subscribe called:', channel);
      return {
        unsubscribe: () => console.log('[Mock] realtime.unsubscribe called')
      };
    }
  },

  // Storage stub
  storage: {
    upload: async (bucket, path, file) => {
      console.log('[Mock] storage.upload called:', bucket, path, file);
      return {
        path: `mock-uploads/${path}`,
        url: URL.createObjectURL(file)
      };
    },
    download: async (bucket, path) => {
      console.log('[Mock] storage.download called:', bucket, path);
      return new Blob();
    },
    delete: async (bucket, path) => {
      console.log('[Mock] storage.delete called:', bucket, path);
      return { success: true };
    }
  },

  // App logs stub
  appLogs: {
    logUserInApp: async (pageName) => {
      console.log('[Mock] appLogs.logUserInApp called:', pageName);
      return { success: true };
    },
    log: async (event, data) => {
      console.log('[Mock] appLogs.log called:', event, data);
      return { success: true };
    }
  }
};

// Export as default as well for compatibility
export default base44;
