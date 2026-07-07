// Offline queue manager - stores pending operations when offline
// and replays them when connection is restored

import { supabase } from './supabase';

const QUEUE_KEY = 'arborpro-offline-queue';

interface QueuedOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export const isOnline = (): boolean => navigator.onLine;

export const getQueue = (): QueuedOperation[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveQueue = (queue: QueuedOperation[]) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const queueOperation = (table: string, operation: 'insert' | 'update' | 'delete', data: any) => {
  const queue = getQueue();
  queue.push({
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    table,
    operation,
    data,
    timestamp: Date.now(),
  });
  saveQueue(queue);
};

export const getPendingCount = (): number => getQueue().length;

export const syncQueue = async (): Promise<{ synced: number; failed: number }> => {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedOperation[] = [];

  for (const op of queue) {
    try {
      if (op.operation === 'insert') {
        const { error } = await supabase.from(op.table).upsert(op.data);
        if (error) throw error;
      } else if (op.operation === 'update') {
        const { error } = await supabase.from(op.table).upsert(op.data);
        if (error) throw error;
      } else if (op.operation === 'delete') {
        const { error } = await supabase.from(op.table).update({ deleted_at: new Date().toISOString() }).eq('id', op.data.id);
        if (error) throw error;
      }
      synced++;
    } catch (err) {
      console.error(`Failed to sync ${op.table} ${op.operation}:`, err);
      failed++;
      remaining.push(op);
    }
  }

  saveQueue(remaining);
  return { synced, failed };
};

// Listen for online event to auto-sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const result = await syncQueue();
    if (result.synced > 0) {
      console.log(`Auto-synced ${result.synced} offline operations`);
      window.dispatchEvent(new CustomEvent('arborpro-synced', { detail: result }));
    }
  });
}

// Generic data access layer that works online and offline
export const db = {
  async select(table: string, query?: { eq?: Record<string, any>; is_null?: string; order?: string }) {
    if (!isOnline()) {
      // Return from local cache
      const cached = localStorage.getItem(`cache-${table}`);
      return cached ? JSON.parse(cached) : [];
    }

    let q = supabase.from(table).select('*');
    if (query?.eq) {
      for (const [key, value] of Object.entries(query.eq)) {
        q = q.eq(key, value);
      }
    }
    if (query?.is_null) {
      q = q.is(query.is_null, null);
    }
    if (query?.order) {
      q = q.order(query.order, { ascending: false });
    }

    const { data, error } = await q;
    if (error) throw error;

    // Cache the result
    localStorage.setItem(`cache-${table}`, JSON.stringify(data));
    return data || [];
  },

  async upsert(table: string, data: any) {
    if (!isOnline()) {
      queueOperation(table, 'update', data);
      // Optimistically update cache
      const cached = JSON.parse(localStorage.getItem(`cache-${table}`) || '[]');
      const idx = cached.findIndex((item: any) => item.id === data.id);
      if (idx >= 0) cached[idx] = { ...cached[idx], ...data };
      else cached.unshift(data);
      localStorage.setItem(`cache-${table}`, JSON.stringify(cached));
      return data;
    }

    const { data: result, error } = await supabase.from(table).upsert(data).select().single();
    if (error) throw error;
    return result;
  },

  async softDelete(table: string, id: string) {
    if (!isOnline()) {
      queueOperation(table, 'delete', { id });
      const cached = JSON.parse(localStorage.getItem(`cache-${table}`) || '[]');
      const updated = cached.map((item: any) =>
        item.id === id ? { ...item, deleted_at: new Date().toISOString() } : item
      );
      localStorage.setItem(`cache-${table}`, JSON.stringify(updated));
      return;
    }

    const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
};
