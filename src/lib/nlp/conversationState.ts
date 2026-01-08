/**
 * Conversation State Manager
 * 
 * Manages multi-turn conversations with the voice assistant.
 * Handles state transitions and context preservation.
 */

import type { IntentType } from './intentParser';

export type ConversationState = 
    | 'idle'           // No active conversation
    | 'listening'      // Listening for input
    | 'processing'     // Processing the input
    | 'awaiting_amount' // Need amount for transaction
    | 'awaiting_description' // Need description for transaction
    | 'confirming'     // Awaiting user confirmation
    | 'executing'      // Executing the transaction
    | 'completed'      // Transaction completed
    | 'error';         // Error state

export interface ConversationContext {
    state: ConversationState;
    intent: IntentType | null;
    amount: number | null;
    description: string | null;
    transactionType: 'credit' | 'debit' | null;
    timestamp: number;
    messageHistory: ConversationMessage[];
    retryCount: number;
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

/**
 * Create a new conversation context
 */
export function createContext(): ConversationContext {
    return {
        state: 'idle',
        intent: null,
        amount: null,
        description: null,
        transactionType: null,
        timestamp: Date.now(),
        messageHistory: [],
        retryCount: 0
    };
}

/**
 * Add message to conversation history
 */
export function addMessage(
    context: ConversationContext,
    role: 'user' | 'assistant',
    content: string
): ConversationContext {
    return {
        ...context,
        messageHistory: [
            ...context.messageHistory,
            {
                role,
                content,
                timestamp: Date.now()
            }
        ]
    };
}

/**
 * Update conversation state
 */
export function updateState(
    context: ConversationContext,
    state: ConversationState
): ConversationContext {
    return {
        ...context,
        state,
        timestamp: Date.now()
    };
}

/**
 * Reset conversation context
 */
export function resetContext(context: ConversationContext): ConversationContext {
    return {
        ...createContext(),
        messageHistory: context.messageHistory.slice(-5) // Keep last 5 messages for context
    };
}

/**
 * Check if context has all required data for transaction
 */
export function hasCompleteTransactionData(context: ConversationContext): boolean {
    return (
        context.amount !== null &&
        context.amount > 0 &&
        context.description !== null &&
        context.transactionType !== null
    );
}

/**
 * Get next state based on current context
 */
export function getNextState(context: ConversationContext): ConversationState {
    // If we have complete data, move to confirmation
    if (hasCompleteTransactionData(context)) {
        return 'confirming';
    }
    
    // If we have intent but missing amount
    if ((context.intent === 'payment' || context.intent === 'receive') && !context.amount) {
        return 'awaiting_amount';
    }
    
    // If we have amount but missing description
    if (context.amount && !context.description) {
        return 'awaiting_description';
    }
    
    return context.state;
}

/**
 * Generate assistant response based on conversation state
 */
export function generateResponse(context: ConversationContext): string {
    switch (context.state) {
        case 'awaiting_amount':
            if (context.intent === 'payment') {
                return "How much would you like to pay?";
            } else if (context.intent === 'receive') {
                return "How much did you receive?";
            }
            return "What amount are we talking about?";
            
        case 'awaiting_description':
            if (context.intent === 'payment') {
                return `Recording a payment of ${context.amount} Rs. What's this for?`;
            } else if (context.intent === 'receive') {
                return `Recording received ${context.amount} Rs. What's this for?`;
            }
            return `Got ${context.amount} Rs. What's the description?`;
            
        case 'confirming':
            const type = context.transactionType === 'debit' ? 'payment' : 'received';
            const emoji = context.transactionType === 'debit' ? '💸' : '💰';
            return `${emoji} ${context.transactionType === 'debit' ? 'Pay' : 'Receive'} ${context.amount?.toLocaleString('en-IN')} Rs for "${context.description}". Confirm?`;
            
        case 'completed':
            const successEmoji = context.transactionType === 'debit' ? '✅' : '🎉';
            return `${successEmoji} Transaction recorded successfully!`;
            
        case 'error':
            return "Sorry, something went wrong. Please try again.";
            
        default:
            return "I'm listening. Try saying 'Pay 500 for lunch' or 'Received 2000 from client'.";
    }
}

/**
 * Get suggestions for current state
 */
export function getSuggestions(context: ConversationContext): string[] {
    switch (context.state) {
        case 'idle':
            return [
                'Pay 500 for lunch',
                'Received 2000 from client',
                'What\'s my balance?',
                'Show last transactions'
            ];
            
        case 'awaiting_amount':
            return ['500', '1000', '2000', 'Cancel'];
            
        case 'awaiting_description':
            return ['Lunch', 'Transport', 'Freelance work', 'Skip'];
            
        case 'confirming':
            return ['Yes', 'No', 'Cancel'];
            
        default:
            return [];
    }
}

/**
 * Check if context is stale (older than 2 minutes)
 */
export function isContextStale(context: ConversationContext): boolean {
    const TWO_MINUTES = 2 * 60 * 1000;
    return Date.now() - context.timestamp > TWO_MINUTES;
}

/**
 * Merge new data into context
 */
export function mergeContext(
    context: ConversationContext,
    updates: Partial<ConversationContext>
): ConversationContext {
    return {
        ...context,
        ...updates,
        timestamp: Date.now()
    };
}
