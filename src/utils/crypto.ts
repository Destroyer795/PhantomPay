/**
 * Cryptographic Utilities for PhantomPay
 * 
 * These functions handle transaction signing to prevent:
 * - Replay attacks
 * - Parameter tampering during sync
 */

// Signing salt - in production this should be more secure
const SIGNING_SALT = process.env.NEXT_PUBLIC_SIGNING_SALT || 'phantom-pay-hackathon-salt-2026';

/**
 * Generate a SHA-256 signature for an offline transaction
 * 
 * @param userId - User's Supabase ID
 * @param offlineId - Unique transaction ID (UUID v4)
 * @param amount - Transaction amount
 * @param timestamp - Unix timestamp when transaction was created
 * @returns Hex-encoded SHA-256 hash
 */
export async function generateSignature(
    userId: string,
    offlineId: string,
    amount: number,
    timestamp: number
): Promise<string> {
    // Create the message to sign
    const message = `${userId}:${offlineId}:${amount}:${timestamp}:${SIGNING_SALT}`;

    // Encode message as UTF-8
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Generate SHA-256 hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

/**
 * Verify a transaction signature
 * 
 * @param userId - User's Supabase ID
 * @param offlineId - Unique transaction ID
 * @param amount - Transaction amount
 * @param timestamp - Unix timestamp
 * @param signature - Signature to verify
 * @returns True if signature is valid
 */
export async function verifySignature(
    userId: string,
    offlineId: string,
    amount: number,
    timestamp: number,
    signature: string
): Promise<boolean> {
    const expectedSignature = await generateSignature(userId, offlineId, amount, timestamp);
    return signature === expectedSignature;
}

/**
 * Generate a UUID v4 for offline transaction IDs
 * Uses the crypto API for better randomness
 */
export function generateOfflineId(): string {
    // Use crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
