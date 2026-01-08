'use client';

import { useState, useEffect, useCallback } from 'react';
import { db, addOfflineTransaction, getWalletState, updateWalletState, getPendingTransactions } from '@/lib/db';
import { generateSignature, generateOfflineId } from '@/utils/crypto';
import { syncOfflineTransactions } from '@/lib/syncEngine';
import { supabase } from '@/lib/supabase';
import type { OfflineTransaction, WalletState, TransactionType } from '@/lib/types';

/**
 * useShadowTransaction Hook
 * 
 * This hook manages the "Shadow Ledger" - the offline-first transaction system.
 * It provides:
 * - Real-time shadow balance calculation
 * - Offline transaction creation with signing
 * - Automatic sync when online
 * 
 * Member B should enhance this hook with:
 * - Conflict resolution
 * - Retry logic
 * - Server balance reconciliation
 */

interface UseShadowTransactionResult {
    shadowBalance: number;
    cachedBalance: number;
    pendingCount: number;
    isLoading: boolean;
    isOnline: boolean;
    addTransaction: (amount: number, description: string, type: TransactionType, recipientId?: string) => Promise<boolean>;
    refreshBalance: () => Promise<void>;
    syncNow: () => Promise<void>;
}

export function useShadowTransaction(userId: string | null): UseShadowTransactionResult {
    const [walletState, setWalletState] = useState<WalletState | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);

    // Load initial wallet state
    const loadWalletState = useCallback(async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        try {
            let state = await getWalletState(userId);

            // Initialize if doesn't exist - fetch from Supabase profile
            if (!state) {
                // Fetch user's actual balance from Supabase
                let initialBalance = 10000; // Fallback default

                try {
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('balance')
                        .eq('id', userId)
                        .single();

                    if (!error && profile) {
                        initialBalance = parseFloat(profile.balance) || 10000;
                    }
                } catch (err) {
                    console.warn('Could not fetch profile balance, using default:', err);
                }

                state = {
                    id: userId,
                    cached_balance: initialBalance,
                    shadow_balance: initialBalance,
                    last_updated: Date.now()
                };
                await updateWalletState(state);
            }

            // Recalculate shadow balance based on pending transactions
            const pending = await getPendingTransactions(userId);
            let pendingDebits = 0;
            let pendingCredits = 0;

            pending.forEach(tx => {
                if (tx.type === 'debit') {
                    pendingDebits += tx.amount;
                } else {
                    pendingCredits += tx.amount;
                }
            });

            const calculatedShadow = state.cached_balance - pendingDebits + pendingCredits;

            setWalletState({
                ...state,
                shadow_balance: calculatedShadow
            });
            setPendingCount(pending.length);
        } catch (err) {
            console.error('Error loading wallet state:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Handle online/offline status
    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            // Trigger sync when coming back online
            if (userId) {
                syncNow();
            }
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [userId]);

    // Load wallet state on mount
    useEffect(() => {
        loadWalletState();
    }, [loadWalletState]);

    /**
     * Add a new offline transaction
     * @param recipientId - Optional recipient ID for P2P transfers
     */
    const addTransaction = async (
        amount: number,
        description: string,
        type: TransactionType,
        recipientId?: string
    ): Promise<boolean> => {
        if (!userId || !walletState) {
            console.error('Cannot add transaction: No user or wallet state');
            return false;
        }

        // SEC-08 Fix: Prevent self-payment
        if (recipientId && recipientId === userId) {
            console.error('Cannot pay yourself');
            return false;
        }

        // SEC-04 Fix: Validate amount is positive and finite
        if (!Number.isFinite(amount) || amount <= 0) {
            console.error('Invalid amount: must be a positive number');
            return false;
        }

        // SEC-06 Fix: Sanitize description
        const safeDescription = description
            .replace(/[<>]/g, '') // Remove angle brackets (XSS prevention)
            .replace(/javascript:/gi, '') // Remove JS protocol
            .slice(0, 100) // Limit length
            || 'Transaction';

        // SEC-05 Fix: Round amount to 2 decimal places
        const safeAmount = Math.round(amount * 100) / 100;

        // Double-check safeAmount is still valid after rounding
        if (safeAmount <= 0) {
            console.error('Amount too small');
            return false;
        }

        // Check sufficient balance for debits
        if (type === 'debit' && walletState.shadow_balance < safeAmount) {
            console.error('Insufficient shadow balance');
            return false;
        }

        try {
            const timestamp = Date.now();
            const offlineId = generateOfflineId();
            const signature = await generateSignature(userId, offlineId, safeAmount, timestamp);

            const transaction: OfflineTransaction = {
                offline_id: offlineId,
                user_id: userId,
                recipient_id: recipientId, // For P2P transfers
                amount: safeAmount,
                type,
                description: safeDescription,
                timestamp,
                signature,
                sync_status: 'pending',
                created_at: new Date(timestamp).toISOString()
            };

            // Add to local database
            await addOfflineTransaction(transaction);

            // Update shadow balance immediately
            const newShadow = type === 'debit'
                ? walletState.shadow_balance - safeAmount
                : walletState.shadow_balance + safeAmount;

            const updatedState: WalletState = {
                ...walletState,
                shadow_balance: newShadow,
                last_updated: timestamp
            };

            await updateWalletState(updatedState);
            setWalletState(updatedState);
            setPendingCount(prev => prev + 1);

            console.log(`✅ Transaction recorded offline: ${type} ${amount}`);

            // Try to sync if online
            if (isOnline) {
                syncNow();
            }

            return true;
        } catch (err) {
            console.error('Error adding transaction:', err);
            return false;
        }
    };

    /**
     * Sync pending transactions to server
     */
    const syncNow = async () => {
        if (!userId) return;

        try {
            const result = await syncOfflineTransactions(userId);
            if (result) {
                // Refresh local state after sync
                await loadWalletState();
            }
        } catch (err) {
            console.error('Sync error:', err);
        }
    };

    /**
     * Refresh balance from server
     */
    const refreshBalance = async () => {
        await loadWalletState();
    };

    return {
        shadowBalance: walletState?.shadow_balance ?? 0,
        cachedBalance: walletState?.cached_balance ?? 0,
        pendingCount,
        isLoading,
        isOnline,
        addTransaction,
        refreshBalance,
        syncNow
    };
}
