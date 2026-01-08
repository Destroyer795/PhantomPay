import Dexie, { type Table } from 'dexie';
import type { OfflineTransaction, WalletState } from './types';

/**
 * PhantomPay Local Database
 * 
 * This is the "Shadow Ledger" - the client-side database that enables
 * offline-first functionality. All transactions are first recorded here,
 * then synced to Supabase when online.
 */
export class ResilientDB extends Dexie {
    /**
     * Offline transactions table
     * Stores all transactions created offline until synced
     */
    transactions!: Table<OfflineTransaction>;

    /**
     * Wallet state table
     * Stores cached balance and shadow balance for each user
     */
    wallet!: Table<WalletState>;

    constructor() {
        super('PhantomPayDB');

        // Schema definition - Version 2 adds recipient_id for P2P transfers
        // Format: 'keyPath, index1, index2, ...'
        // ++id = auto-increment primary key
        this.version(2).stores({
            transactions: '++id, offline_id, user_id, recipient_id, amount, type, description, timestamp, sync_status, signature, retry_count, last_sync_attempt',
            wallet: 'id, cached_balance, shadow_balance, last_updated, last_sync_success'
        });
    }
}

/**
 * Singleton database instance
 */
export const db = new ResilientDB();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all pending (unsynced) transactions for a user
 */
export async function getPendingTransactions(userId: string): Promise<OfflineTransaction[]> {
    return db.transactions
        .where('user_id')
        .equals(userId)
        .and(tx => tx.sync_status === 'pending')
        .toArray();
}

/**
 * Get the wallet state for a user
 */
export async function getWalletState(userId: string): Promise<WalletState | undefined> {
    return db.wallet.get(userId);
}

/**
 * Update wallet state
 */
export async function updateWalletState(state: WalletState): Promise<void> {
    await db.wallet.put(state);
}

/**
 * Add a new offline transaction
 */
export async function addOfflineTransaction(tx: OfflineTransaction): Promise<number> {
    return db.transactions.add(tx);
}

/**
 * Mark transactions as synced
 */
export async function markTransactionsSynced(offlineIds: string[]): Promise<void> {
    await db.transactions
        .where('offline_id')
        .anyOf(offlineIds)
        .modify({ sync_status: 'synced' });
}

/**
 * Get all transactions for a user (for display)
 */
export async function getAllTransactions(userId: string): Promise<OfflineTransaction[]> {
    return db.transactions
        .where('user_id')
        .equals(userId)
        .reverse()
        .sortBy('timestamp');
}

/**
 * Clear all synced transactions older than specified days
 */
export async function clearOldSyncedTransactions(userId: string, daysOld: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    await db.transactions
        .where('user_id')
        .equals(userId)
        .and(tx => tx.sync_status === 'synced' && tx.timestamp < cutoffTime)
        .delete();
}

/**
 * Get sync queue items for display in UI
 */
export async function getSyncQueueItems(userId: string): Promise<import('./types').SyncQueueItem[]> {
    const pendingTxs = await db.transactions
        .where('user_id')
        .equals(userId)
        .and(tx => ['pending', 'syncing', 'failed'].includes(tx.sync_status))
        .toArray();

    return pendingTxs.map(tx => ({
        id: tx.offline_id,
        type: 'transaction' as const,
        description: `${tx.type === 'debit' ? 'Payment' : 'Incoming'}: ${tx.description}`,
        status: tx.sync_status,
        retry_count: tx.retry_count || 0,
        max_retries: 5,
        created_at: tx.timestamp,
        last_attempt: tx.last_sync_attempt,
        error_message: tx.sync_status === 'failed' ? 'Network error - will retry' : undefined
    }));
}

/**
 * Update transaction sync status and retry count
 */
export async function updateTransactionStatus(
    offlineId: string,
    status: import('./types').SyncStatus,
    incrementRetry: boolean = false
): Promise<void> {
    const updates: Partial<import('./types').OfflineTransaction> = {
        sync_status: status,
        last_sync_attempt: Date.now()
    };

    if (incrementRetry) {
        const tx = await db.transactions.where('offline_id').equals(offlineId).first();
        if (tx) {
            updates.retry_count = (tx.retry_count || 0) + 1;
        }
    }

    await db.transactions
        .where('offline_id')
        .equals(offlineId)
        .modify(updates);
}

/**
 * Get transactions with conflicts that need resolution
 */
export async function getConflictTransactions(userId: string): Promise<import('./types').OfflineTransaction[]> {
    return db.transactions
        .where('user_id')
        .equals(userId)
        .and(tx => tx.sync_status === 'conflict')
        .toArray();
}

/**
 * Calculate wallet staleness
 */
export async function checkWalletStaleness(userId: string): Promise<boolean> {
    const wallet = await getWalletState(userId);
    if (!wallet || !wallet.last_sync_success) return true;

    const hoursSinceSync = (Date.now() - wallet.last_sync_success) / (1000 * 60 * 60);
    return hoursSinceSync > 24;
}

/**
 * Update pending transaction amounts in wallet
 */
export async function updateWalletPendingAmounts(userId: string): Promise<void> {
    const pendingTxs = await getPendingTransactions(userId);

    const pending_debits = pendingTxs
        .filter(tx => tx.type === 'debit')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const pending_credits = pendingTxs
        .filter(tx => tx.type === 'credit')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const wallet = await getWalletState(userId);
    if (wallet) {
        await updateWalletState({
            ...wallet,
            pending_debits,
            pending_credits,
            shadow_balance: wallet.cached_balance - pending_debits + pending_credits
        });
    }
}
export async function cleanupOldTransactions(userId: string, daysOld: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    return db.transactions
        .where('user_id')
        .equals(userId)
        .and(tx => tx.sync_status === 'synced' && tx.timestamp < cutoffTime)
        .delete();
}
