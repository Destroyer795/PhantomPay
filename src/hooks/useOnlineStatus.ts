'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncOfflineTransactions } from '@/lib/syncEngine';

/**
 * useOnlineStatus Hook - Enhanced with Hysteresis
 * 
 * Implements the "Superhuman Bar" pattern with hysteresis logic.
 * Key improvements:
 * - Application-layer health checks (not just navigator.onLine)
 * - Delayed offline notification (5-10s) to avoid alert fatigue
 * - Immediate online confirmation for reassurance
 * - Lie-Fi detection via ping attempts
 * 
 * Research: Mobile networks are volatile. The UI should be slow to warn,
 * fast to reassure. This asymmetry creates perceived stability.
 */

interface UseOnlineStatusResult {
    isOnline: boolean;
    isReallyOnline: boolean; // True online (not Lie-Fi)
    lastOnlineAt: number | null;
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    showOfflineIndicator: boolean; // Only true after hysteresis delay
    connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
    triggerSync: (userId: string) => Promise<void>;
}

const OFFLINE_DELAY = 7000; // 7 seconds delay before showing offline
const PING_INTERVAL = 30000; // Check connection health every 30s
const PING_TIMEOUT = 5000; // 5s timeout for health check

export function useOnlineStatus(): UseOnlineStatusResult {
    const [isOnline, setIsOnline] = useState(true);
    const [isReallyOnline, setIsReallyOnline] = useState(true);
    const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(Date.now());
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('excellent');
    
    const offlineTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Application-layer health check (detects Lie-Fi)
    const checkRealConnection = useCallback(async (): Promise<boolean> => {
        if (!navigator.onLine) return false;

        try {
            const startTime = Date.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

            // Ping a small endpoint (you can replace with your backend health endpoint)
            const response = await fetch('/api/health', {
                method: 'HEAD',
                cache: 'no-store',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const latency = Date.now() - startTime;

            // Determine connection quality based on latency
            if (response.ok) {
                if (latency < 200) setConnectionQuality('excellent');
                else if (latency < 500) setConnectionQuality('good');
                else setConnectionQuality('poor');
                return true;
            }
            return false;
        } catch (error) {
            setConnectionQuality('offline');
            return false;
        }
    }, []);

    const triggerSync = useCallback(async (userId: string) => {
        if (!isReallyOnline) return;

        setSyncStatus('syncing');
        try {
            await syncOfflineTransactions(userId);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch {
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    }, [isReallyOnline]);

    // Handle offline state with hysteresis
    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setIsReallyOnline(false);
        setConnectionQuality('offline');

        // Hysteresis: Wait before showing offline indicator
        offlineTimeoutRef.current = setTimeout(() => {
            setShowOfflineIndicator(true);
        }, OFFLINE_DELAY);
    }, []);

    // Handle online state - immediate feedback
    const handleOnline = useCallback(async () => {
        setIsOnline(true);
        
        // Clear the offline timeout if reconnection happens quickly
        if (offlineTimeoutRef.current) {
            clearTimeout(offlineTimeoutRef.current);
            offlineTimeoutRef.current = null;
        }

        // Immediately hide offline indicator (fast to reassure)
        setShowOfflineIndicator(false);

        // Verify it's a real connection
        const reallyOnline = await checkRealConnection();
        setIsReallyOnline(reallyOnline);
        
        if (reallyOnline) {
            setLastOnlineAt(Date.now());
        }
    }, [checkRealConnection]);

    useEffect(() => {
        // Initial state
        setIsOnline(navigator.onLine);
        if (navigator.onLine) {
            checkRealConnection().then(setIsReallyOnline);
        }

        // Set up event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodic health check
        pingIntervalRef.current = setInterval(async () => {
            if (navigator.onLine) {
                const reallyOnline = await checkRealConnection();
                setIsReallyOnline(reallyOnline);
                
                // If we detect Lie-Fi, trigger offline state
                if (!reallyOnline && isOnline) {
                    handleOffline();
                }
            }
        }, PING_INTERVAL);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            
            if (offlineTimeoutRef.current) {
                clearTimeout(offlineTimeoutRef.current);
            }
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        };
    }, [handleOnline, handleOffline, checkRealConnection, isOnline]);

    return {
        isOnline,
        isReallyOnline,
        lastOnlineAt,
        syncStatus,
        showOfflineIndicator,
        connectionQuality,
        triggerSync
    };
}
