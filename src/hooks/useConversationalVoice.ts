/**
 * useConversationalVoice Hook
 * 
 * Advanced conversational AI for voice interactions.
 * Supports multi-turn conversations, intent recognition, and TTS responses.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { parseIntent, type IntentType } from '@/lib/nlp/intentParser';
import { extractEntities, type ExtractedEntities } from '@/lib/nlp/entityExtractor';
import {
    createContext,
    addMessage,
    updateState,
    resetContext,
    hasCompleteTransactionData,
    getNextState,
    generateResponse,
    getSuggestions,
    isContextStale,
    mergeContext,
    type ConversationContext,
    type ConversationState
} from '@/lib/nlp/conversationState';
import { voiceSynthesis } from '@/lib/nlp/voiceSynthesis';

export interface VoiceCommand {
    amount: number;
    description: string;
    type: 'credit' | 'debit';
    confidence: number;
}

export interface ConversationalVoiceResult {
    isListening: boolean;
    isSupported: boolean;
    isSpeaking: boolean;
    transcript: string;
    context: ConversationContext;
    lastCommand: VoiceCommand | null;
    error: string | null;
    suggestions: string[];
    assistantMessage: string;
    startListening: () => void;
    stopListening: () => void;
    processText: (text: string) => void;
    confirmTransaction: () => void;
    cancelTransaction: () => void;
    resetConversation: () => void;
    queryBalance: () => Promise<string>;
    queryTransactions: () => Promise<string>;
}

export function useConversationalVoice(
    currentBalance?: number,
    onBalanceQuery?: () => Promise<number>,
    onTransactionsQuery?: () => Promise<string>
): ConversationalVoiceResult {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [context, setContext] = useState<ConversationContext>(createContext());
    const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);
    const [assistantMessage, setAssistantMessage] = useState('');
    const [isOffline, setIsOffline] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const processTextRef = useRef<(text: string) => void>(() => {});
    const queryBalanceRef = useRef<() => Promise<string>>(async () => '');
    const queryTransactionsRef = useRef<() => Promise<string>>(async () => '');
    
    // Check online status
    useEffect(() => {
        const updateOnlineStatus = () => {
            setIsOffline(!navigator.onLine);
        };
        
        updateOnlineStatus();
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

    /**
     * Speak assistant message
     */
    const speakMessage = useCallback(async (message: string, tone: 'success' | 'error' | 'question' | 'info' = 'info') => {
        if (!voiceSynthesis.isSupportedBrowser()) return;

        try {
            setIsSpeaking(true);
            await voiceSynthesis.speakWithTone(message, tone);
        } catch (err) {
            console.warn('Speech synthesis error:', err);
        } finally {
            setIsSpeaking(false);
        }
    }, []);

    /**
     * Update assistant message and optionally speak it
     */
    const updateAssistantMessage = useCallback((message: string, speak: boolean = true, tone: 'success' | 'error' | 'question' | 'info' = 'info') => {
        setAssistantMessage(message);
        setContext(prev => addMessage(prev, 'assistant', message));
        
        if (speak) {
            speakMessage(message, tone);
        }
    }, [speakMessage]);

    /**
     * Process user text input
     */
    const processText = useCallback((text: string): void => {
        console.log('[useConversationalVoice] processText called with:', text);
        if (!text.trim()) {
            console.log('[useConversationalVoice] Empty text, returning');
            return;
        }

        // Add user message to context
        setContext(prev => addMessage(prev, 'user', text));

        // Parse intent
        const intent = parseIntent(text);
        console.log('[useConversationalVoice] Parsed intent:', intent);

        // Extract entities
        const entities = extractEntities(text);
        console.log('[useConversationalVoice] Extracted entities:', entities);

        // Handle based on intent and current state
        if (intent.type === 'confirm') {
            console.log('[useConversationalVoice] Confirm intent');
            setContext(prev => {
                const currentState = prev.state;
                console.log('[useConversationalVoice] Current context state:', currentState);
                
                if (currentState === 'confirming' && hasCompleteTransactionData(prev)) {
                    // Ready to execute
                    const command: VoiceCommand = {
                        amount: prev.amount!,
                        description: prev.description!,
                        type: prev.transactionType!,
                        confidence: intent.confidence
                    };
                    console.log('[useConversationalVoice] Creating command:', command);
                    setLastCommand(command);
                    
                    const updatedContext = updateState(prev, 'executing');
                    setAssistantMessage('Processing your transaction...');
                    speakMessage('Processing your transaction...', 'info');
                    return updatedContext;
                }
                return prev;
            });
            return;
        }

        if (intent.type === 'cancel') {
            console.log('[useConversationalVoice] Cancel intent');
            setContext(resetContext);
            setLastCommand(null);
            setTranscript('');
            setAssistantMessage('Cancelled. What else can I help you with?');
            speakMessage('Cancelled. What else can I help you with?', 'info');
            voiceSynthesis.stop();
            return;
        }

        if (intent.type === 'help') {
            console.log('[useConversationalVoice] Help intent');
            const helpMessage = "I can help you track payments and receipts. Try saying 'Pay 500 for lunch' or 'Received 2000 from client'. You can also ask 'What's my balance?' or 'Show transactions'.";
            setAssistantMessage(helpMessage);
            speakMessage(helpMessage, 'info');
            return;
        }

        if (intent.type === 'query_balance') {
            console.log('[useConversationalVoice] Query balance intent');
            queryBalanceRef.current();
            return;
        }

        if (intent.type === 'query_transactions') {
            console.log('[useConversationalVoice] Query transactions intent');
            queryTransactionsRef.current();
            return;
        }

        // Determine transaction type from intent
        let transactionType: 'credit' | 'debit' | null = null;
        if (intent.type === 'payment') {
            transactionType = 'debit';
        } else if (intent.type === 'receive') {
            transactionType = 'credit';
        }

        // Update context with new information
        setContext(prev => {
            let updatedContext = prev;

            if (transactionType) {
                updatedContext = mergeContext(updatedContext, {
                    intent: intent.type,
                    transactionType
                });
            }

            // Handle amount based on state
            if (entities.hasAmount) {
                updatedContext = mergeContext(updatedContext, {
                    amount: entities.amount
                });
            } else if (prev.state === 'awaiting_amount') {
                // Try to parse just a number
                const justNumber = parseFloat(text.replace(/[^\d.]/g, ''));
                if (!isNaN(justNumber) && justNumber > 0) {
                    updatedContext = mergeContext(updatedContext, {
                        amount: justNumber
                    });
                }
            }

            // Handle description
            if (entities.description && entities.description !== 'Voice transaction') {
                updatedContext = mergeContext(updatedContext, {
                    description: entities.description
                });
            } else if (prev.state === 'awaiting_description') {
                // Use the text as description
                updatedContext = mergeContext(updatedContext, {
                    description: text.trim()
                });
            }

            // Determine next state
            const nextState = getNextState(updatedContext);
            updatedContext = updateState(updatedContext, nextState);

            // Generate response
            const response = generateResponse(updatedContext);
            const tone = nextState === 'confirming' ? 'question' : 'info';
            setAssistantMessage(response);
            speakMessage(response, tone);

            return updatedContext;
        });
    }, [speakMessage]);

    // Keep processText ref updated
    useEffect(() => {
        processTextRef.current = processText;
    }, [processText]);

    /**
     * Query balance
     */
    const queryBalance = useCallback(async (): Promise<string> => {
        try {
            const balance = onBalanceQuery ? await onBalanceQuery() : currentBalance || 0;
            const message = `Your current balance is ${balance.toLocaleString('en-IN')} rupees.`;
            updateAssistantMessage(message, true, 'info');
            return message;
        } catch (err) {
            const errorMsg = 'Sorry, I could not fetch your balance.';
            updateAssistantMessage(errorMsg, true, 'error');
            return errorMsg;
        }
    }, [currentBalance, onBalanceQuery, updateAssistantMessage]);

    // Keep queryBalance ref updated
    useEffect(() => {
        queryBalanceRef.current = queryBalance;
    }, [queryBalance]);

    /**
     * Query transactions
     */
    const queryTransactions = useCallback(async (): Promise<string> => {
        try {
            const message = onTransactionsQuery 
                ? await onTransactionsQuery() 
                : 'Transaction history is available in the dashboard.';
            updateAssistantMessage(message, true, 'info');
            return message;
        } catch (err) {
            const errorMsg = 'Sorry, I could not fetch your transactions.';
            updateAssistantMessage(errorMsg, true, 'error');
            return errorMsg;
        }
    }, [onTransactionsQuery, updateAssistantMessage]);

    // Keep queryTransactions ref updated
    useEffect(() => {
        queryTransactionsRef.current = queryTransactions;
    }, [queryTransactions]);

    /**
     * Confirm transaction
     */
    const confirmTransaction = useCallback(() => {
        processText('yes');
    }, [processText]);

    /**
     * Cancel transaction
     */
    const cancelTransaction = useCallback(() => {
        processText('no');
    }, [processText]);

    /**
     * Reset conversation
     */
    const resetConversation = useCallback(() => {
        setContext(resetContext(context));
        setLastCommand(null);
        setTranscript('');
        setAssistantMessage('');
        voiceSynthesis.stop();
    }, [context]);

    /**
     * Initialize speech recognition
     */
    useEffect(() => {
        console.log('[useConversationalVoice] Initializing...');
        if (typeof window === 'undefined') {
            console.log('[useConversationalVoice] Window is undefined (SSR)');
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        console.log('[useConversationalVoice] SpeechRecognitionAPI:', !!SpeechRecognitionAPI);
        setIsSupported(!!SpeechRecognitionAPI);

        if (SpeechRecognitionAPI) {
            console.log('[useConversationalVoice] Creating recognition instance');
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-IN'; // Indian English

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onresult = (event: any) => {
                const current = event.resultIndex;
                const result = event.results[current];
                const text = result[0].transcript;

                console.log('[useConversationalVoice] Transcript:', text, 'isFinal:', result.isFinal);
                setTranscript(text);

                if (result.isFinal) {
                    processTextRef.current(text);  // Use ref instead of direct function
                    setTranscript('');
                }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onerror = (event: any) => {
                console.error('[useConversationalVoice] Speech recognition error:', event.error);
                setError(`Speech recognition error: ${event.error}`);
                setIsListening(false);
            };

            recognition.onend = () => {
                console.log('[useConversationalVoice] Recognition ended');
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            console.log('[useConversationalVoice] Recognition setup complete');
        } else {
            console.warn('[useConversationalVoice] Speech recognition not supported in this browser');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            voiceSynthesis.stop();
        };
    }, []); // ✅ EMPTY DEPS - recognition only initializes once!

    /**
     * Start listening
     */
    const startListening = useCallback(() => {
        console.log('[useConversationalVoice] startListening called');
        console.log('[useConversationalVoice] recognitionRef.current:', !!recognitionRef.current);
        console.log('[useConversationalVoice] isSupported:', isSupported);
        console.log('[useConversationalVoice] isOffline:', isOffline);
        
        // Check if offline - show message instead of trying to use voice
        if (isOffline || !navigator.onLine) {
            const offlineMsg = 'Voice recognition requires internet connection. Please go online or use manual input.';
            console.warn('[useConversationalVoice]', offlineMsg);
            setError(offlineMsg);
            setAssistantMessage(offlineMsg);
            return;
        }
        
        if (!recognitionRef.current || !isSupported) {
            const errorMsg = 'Speech recognition not supported';
            console.error('[useConversationalVoice]', errorMsg);
            setError(errorMsg);
            return;
        }

        // Reset context if stale
        if (isContextStale(context)) {
            console.log('[useConversationalVoice] Context is stale, resetting');
            resetConversation();
        }

        setError(null);
        setTranscript('');
        setIsListening(true);

        // Stop any ongoing speech
        voiceSynthesis.stop();

        try {
            console.log('[useConversationalVoice] Starting recognition...');
            recognitionRef.current.start();
            setContext(prev => updateState(prev, 'listening'));
            console.log('[useConversationalVoice] Recognition started successfully');
        } catch (err) {
            console.error('[useConversationalVoice] Failed to start recognition:', err);
            setError('Failed to start speech recognition');
            setIsListening(false);
        }
    }, [isSupported, isOffline, context, resetConversation]);

    /**
     * Stop listening
     */
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);

    // Get suggestions based on context
    const suggestions = getSuggestions(context);

    return {
        isListening,
        isSupported,
        isSpeaking,
        transcript,
        context,
        lastCommand,
        error,
        suggestions,
        assistantMessage,
        startListening,
        stopListening,
        processText,
        confirmTransaction,
        cancelTransaction,
        resetConversation,
        queryBalance,
        queryTransactions
    };
}
