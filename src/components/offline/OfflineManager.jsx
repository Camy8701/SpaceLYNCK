import React, { useEffect } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function OfflineManager() {
  const queryClient = useQueryClient();

  // 1. Persist Critical Data to LocalStorage on change
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action?.type === 'success') {
        const key = event.query.queryKey;
        // Cache critical entities: projects, tasks, user, my-tasks
        if (key[0] === 'projects' || key[0] === 'tasks' || key[0] === 'user' || key[0] === 'my-tasks') {
           try {
             localStorage.setItem(`cache_${JSON.stringify(key)}`, JSON.stringify(event.action.data));
           } catch (e) {
             // Quota exceeded or error
           }
        }
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // 2. Hydrate from LocalStorage on Load (or when offline)
  useEffect(() => {
    // Function to restore specific keys if query is empty/stale and we are offline
    const restore = (queryKey) => {
        const cached = localStorage.getItem(`cache_${JSON.stringify(queryKey)}`);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                queryClient.setQueryData(queryKey, data);
            } catch(e) {}
        }
    };
    
    // Attempt to restore basics
    restore(['projects']);
    restore(['users']);
    // Note: Dynamic keys like ['tasks', projectId] are harder to predict to restore proactively,
    // but we can restore them if the user navigates to them and the component mounts with initialData logic,
    // or we relies on the fact that we setQueryData here.
  }, [queryClient]);

  // 3. Background Sync (Refetch on reconnect)
  useEffect(() => {
    const handleOnline = () => {
      toast.success("Back online! Syncing data...");
      queryClient.invalidateQueries(); // Refetch everything
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);

  return null; // Headless component
}