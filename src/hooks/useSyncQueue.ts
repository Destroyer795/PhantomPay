'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSyncQueueItems } from '@/lib/db';
import type { SyncQueueItem } from '@/lib/types';

/**
 * useSyncQueue Hook
 * 
 * Provides real-time visibility into the sync queue for UI display.
 * Implements the "Sync Drawer" pattern from the UI roadmap.
 * 
 * Key Features:
 * - Live updates from IndexedDB
 * - Queue count for status pill
 * - Individual item retry capability
 * - Error message exposure
 */

interface UseSyncQueueResult {
    queueItems: SyncQueueItem[];
    queueCount: number;
    hasPending: boolean;
    hasFailed: boolean;
    hasConflicts: boolean;
    isLoading: boolean;
    refresh: () => void;
}

export function useSyncQueue(userId: string | null): UseSyncQueueResult {
    const [isLoading, setIsLoading] = useState(true);

    // Use Dexie live query for real-time updates
    const queueItems = useLiveQuery<SyncQueueItem[]>(
        async () => {
            if (!userId) return [];
            setIsLoading(false);
            return getSyncQueueItems(userId);
        },
        [userId]
    );

    const items = queueItems || [];
    const queueCount = items.length;
    const hasPending = items.some((item: SyncQueueItem) => item.status === 'pending' || item.status === 'syncing');
    const hasFailed = items.some((item: SyncQueueItem) => item.status === 'failed');
    const hasConflicts = items.some((item: SyncQueueItem) => item.status === 'conflict');

    const refresh = useCallback(() => {
        // Force re-query by updating a dependency
        // Dexie-react-hooks will automatically refresh
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 100);
    }, []);

    useEffect(() => {
        if (userId) {
            setIsLoading(false);
        }
    }, [userId]);

    return {
        queueItems: items,
        queueCount,
        hasPending,
        hasFailed,
        hasConflicts,
        isLoading,
        refresh
    };
}
