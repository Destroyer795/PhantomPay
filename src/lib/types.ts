// ============================================
// PHANTOM PAY - SHARED TYPES
// These types are shared across the application
// ============================================

/**
 * Transaction types
 */
export type TransactionType = 'credit' | 'debit';

/**
 * Sync status for offline transactions
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

/**
 * Offline Transaction stored in Dexie (IndexedDB)
 */
export interface OfflineTransaction {
    id?: number; // Auto-increment for local indexing
    offline_id: string; // UUID v4 generated on client - IDEMPOTENCY KEY
    user_id: string; // User's Supabase ID
    amount: number;
    type: TransactionType;
    description: string;
    timestamp: number; // Unix timestamp
    signature: string; // SHA256(offline_id + user_id + amount + timestamp + salt)
    sync_status: SyncStatus;
    created_at: string; // ISO string
    retry_count?: number; // Number of sync retry attempts
    last_sync_attempt?: number; // Unix timestamp of last sync attempt
    conflict_data?: {
        server_version: Partial<OfflineTransaction>;
        resolved?: boolean;
    };
    is_editable?: boolean; // Can user edit this pending transaction?
}

/**
 * Local wallet state stored in Dexie
 */
export interface WalletState {
    id: string; // User ID
    cached_balance: number; // Last known balance from server
    shadow_balance: number; // Real effective balance (cached - pending debits)
    last_updated: number; // Unix timestamp
    last_sync_success?: number; // Unix timestamp of last successful sync
    pending_debits?: number; // Sum of pending outgoing transactions
    pending_credits?: number; // Sum of pending incoming transactions
    is_stale?: boolean; // True if last sync > 24 hours ago
}

/**
 * Transaction from Supabase (server)
 */
export interface ServerTransaction {
    id: string; // UUID
    user_id: string;
    amount: number;
    type: TransactionType;
    description: string;
    status: SyncStatus;
    offline_id: string;
    signature: string;
    created_at: string;
}

/**
 * User profile from Supabase
 */
export interface UserProfile {
    id: string;
    username: string | null;
    balance: number;
    last_synced_at: string | null;
    created_at: string;
}

/**
 * Payload for batch sync RPC
 */
export interface SyncPayload {
    transactions: OfflineTransaction[];
}

/**
 * Response from batch sync RPC
 */
export interface SyncResponse {
    processed_ids: string[];
    failed_ids: { offline_id: string; reason: string }[];
    new_balance: number;
}

/**
 * QR Payment data structure
 */
export interface QRPaymentData {
    recipient_id: string;
    recipient_name?: string;
    amount?: number;
    timestamp: number;
    signature: string;
}

/**
 * Sync queue item for UI visibility
 */
export interface SyncQueueItem {
    id: string;
    type: 'transaction' | 'profile' | 'voice_command' | 'qr_scan';
    description: string;
    status: SyncStatus;
    retry_count: number;
    max_retries: number;
    created_at: number;
    last_attempt?: number;
    error_message?: string;
}

/**
 * Voice command payload for offline queuing
 */
export interface VoiceCommandPayload {
    audio_blob?: Blob;
    transcript?: string;
    timestamp: number;
    processed: boolean;
    sync_status: SyncStatus;
}
