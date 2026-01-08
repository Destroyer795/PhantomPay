/**
 * Intent Parser - Advanced NLP for Voice Commands
 * 
 * Recognizes user intents from natural language input:
 * - Payment intents (debit)
 * - Receive intents (credit)
 * - Query intents (balance, transactions)
 * - Control intents (cancel, confirm)
 */

export type IntentType = 
    | 'payment'        // User wants to pay/spend money
    | 'receive'        // User received money
    | 'query_balance'  // Ask for current balance
    | 'query_transactions' // Ask for transaction history
    | 'confirm'        // Confirm action
    | 'cancel'         // Cancel action
    | 'help'           // Need help
    | 'unknown';       // Cannot determine intent

export interface ParsedIntent {
    type: IntentType;
    confidence: number; // 0-1
    originalText: string;
    normalizedText: string;
}

/**
 * Parse user input to determine intent
 */
export function parseIntent(text: string): ParsedIntent {
    const normalized = text.toLowerCase().trim();
    
    // Payment patterns (debit)
    const paymentPatterns = [
        /\b(pay|paid|send|sent|transfer|give|gave|spend|spent|debit)\b/i,
        /\b(payment|expense|cost|charge)\b/i,
    ];
    
    // Receive patterns (credit)
    const receivePatterns = [
        /\b(receive|received|got|get|earn|earned|collect|collected|credit|income)\b/i,
        /\b(salary|freelance|refund|cashback)\b/i,
    ];
    
    // Query balance patterns
    const balancePatterns = [
        /\b(balance|amount|total|money|funds|wallet)\b.*\b(what|how much|show|tell|check)\b/i,
        /\b(what|how much|show|tell|check)\b.*\b(balance|amount|total|money|funds)\b/i,
        /^(balance|my balance|show balance|check balance)/i,
    ];
    
    // Query transaction patterns
    const transactionPatterns = [
        /\b(transaction|transactions|history|statement|activity)\b/i,
        /\b(last|recent|previous)\b.*\b(payment|transaction|spend)\b/i,
        /\b(show|list|display)\b.*\b(transaction|payment|history)\b/i,
    ];
    
    // Confirm patterns
    const confirmPatterns = [
        /^(yes|yeah|yep|sure|ok|okay|correct|right|confirm|proceed|go ahead|do it)$/i,
        /^(y|ya|ys)$/i,
    ];
    
    // Cancel patterns
    const cancelPatterns = [
        /^(no|nope|nah|cancel|stop|nevermind|never mind|abort|back)$/i,
        /^(n|na)$/i,
        /\b(cancel|stop|abort|undo|back|forget it)\b/i,
    ];
    
    // Help patterns
    const helpPatterns = [
        /^(help|what can you do|commands|how to|guide)$/i,
    ];
    
    // Check patterns in priority order
    
    // 1. Control commands (highest priority)
    if (confirmPatterns.some(p => p.test(normalized))) {
        return {
            type: 'confirm',
            confidence: 0.95,
            originalText: text,
            normalizedText: normalized
        };
    }
    
    if (cancelPatterns.some(p => p.test(normalized))) {
        return {
            type: 'cancel',
            confidence: 0.95,
            originalText: text,
            normalizedText: normalized
        };
    }
    
    if (helpPatterns.some(p => p.test(normalized))) {
        return {
            type: 'help',
            confidence: 0.95,
            originalText: text,
            normalizedText: normalized
        };
    }
    
    // 2. Query intents
    if (balancePatterns.some(p => p.test(normalized))) {
        return {
            type: 'query_balance',
            confidence: 0.85,
            originalText: text,
            normalizedText: normalized
        };
    }
    
    if (transactionPatterns.some(p => p.test(normalized))) {
        return {
            type: 'query_transactions',
            confidence: 0.85,
            originalText: text,
            normalizedText: normalized
        };
    }
    
    // 3. Transaction intents (receive has priority over payment to fix the bug)
    const hasReceiveKeyword = receivePatterns.some(p => p.test(normalized));
    const hasPaymentKeyword = paymentPatterns.some(p => p.test(normalized));
    
    if (hasReceiveKeyword && !hasPaymentKeyword) {
        return {
            type: 'receive',
            confidence: 0.9,
            originalText: text,
            normalizedText: normalized
        };
    }
    
    if (hasPaymentKeyword && !hasReceiveKeyword) {
        return {
            type: 'payment',
            confidence: 0.9,
            originalText: text,
            normalizedText: normalized
        };
    }
    
    // If both keywords present, check which comes first
    if (hasReceiveKeyword && hasPaymentKeyword) {
        const receiveIndex = Math.min(...receivePatterns.map(p => {
            const match = normalized.match(p);
            return match ? normalized.indexOf(match[0]) : Infinity;
        }));
        
        const paymentIndex = Math.min(...paymentPatterns.map(p => {
            const match = normalized.match(p);
            return match ? normalized.indexOf(match[0]) : Infinity;
        }));
        
        if (receiveIndex < paymentIndex) {
            return {
                type: 'receive',
                confidence: 0.75,
                originalText: text,
                normalizedText: normalized
            };
        } else {
            return {
                type: 'payment',
                confidence: 0.75,
                originalText: text,
                normalizedText: normalized
            };
        }
    }
    
    // Default to unknown
    return {
        type: 'unknown',
        confidence: 0,
        originalText: text,
        normalizedText: normalized
    };
}

/**
 * Get a human-readable description of the intent
 */
export function getIntentDescription(intent: IntentType): string {
    switch (intent) {
        case 'payment':
            return 'Make a payment';
        case 'receive':
            return 'Record received money';
        case 'query_balance':
            return 'Check balance';
        case 'query_transactions':
            return 'View transactions';
        case 'confirm':
            return 'Confirm action';
        case 'cancel':
            return 'Cancel action';
        case 'help':
            return 'Get help';
        default:
            return 'Unknown command';
    }
}

/**
 * Get color coding for intent type
 */
export function getIntentColor(intent: IntentType): string {
    switch (intent) {
        case 'payment':
            return 'red'; // Debit
        case 'receive':
            return 'emerald'; // Credit
        case 'query_balance':
        case 'query_transactions':
            return 'blue'; // Query
        case 'confirm':
            return 'green'; // Success
        case 'cancel':
            return 'orange'; // Warning
        case 'help':
            return 'purple'; // Info
        default:
            return 'slate'; // Unknown
    }
}
