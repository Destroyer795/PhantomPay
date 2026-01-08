import Dexie, { type Table } from 'dexie';
import type { OfflineTransaction, WalletState } from './types';

/**
 * ResilientPay Local Database
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
        super('ResilientPayDB');

        // Schema definition
        // Format: 'keyPath, index1, index2, ...'
        // ++id = auto-increment primary key
        this.version(1).stores({
            transactions: '++id, offline_id, user_id, sync_status, timestamp, type',
            wallet: 'id, last_updated'
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
export async function cleanupOldTransactions(userId: string, daysOld: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    return db.transactions
        .where('user_id')
        .equals(userId)
        .and(tx => tx.sync_status === 'synced' && tx.timestamp < cutoffTime)
        .delete();
}
