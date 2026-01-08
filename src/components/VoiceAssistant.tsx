/**
 * Voice Assistant Component
 * 
 * Advanced conversational voice interface with:
 * - Multi-turn conversations
 * - Visual feedback
 * - Intent indicators
 * - Query support
 * - TTS responses
 */

'use client';

import React, { useEffect } from 'react';
import { 
    Mic, MicOff, Volume2, MessageCircle, X, Check, 
    Loader2, ArrowUpRight, ArrowDownLeft, HelpCircle,
    Sparkles, TrendingUp, TrendingDown, WifiOff, Send, Keyboard
} from 'lucide-react';
import { useConversationalVoice } from '@/hooks/useConversationalVoice';
import { getIntentColor } from '@/lib/nlp/intentParser';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { voiceSynthesis } from '@/lib/nlp/voiceSynthesis';

interface VoiceAssistantProps {
    onTransaction: (amount: number, description: string, type: 'credit' | 'debit') => Promise<boolean>;
    currentBalance?: number;
    onBalanceQuery?: () => Promise<number>;
    onTransactionsQuery?: () => Promise<string>;
    disabled?: boolean;
}

export function VoiceAssistant({ 
    onTransaction, 
    currentBalance,
    onBalanceQuery,
    onTransactionsQuery,
    disabled 
}: VoiceAssistantProps) {
    const {
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
        resetConversation
    } = useConversationalVoice(currentBalance, onBalanceQuery, onTransactionsQuery);

    const [isProcessing, setIsProcessing] = React.useState(false);
    const [showFeedback, setShowFeedback] = React.useState<'success' | 'error' | null>(null);
    const [showConversation, setShowConversation] = React.useState(false);
    
    // Text input fallback for offline mode
    const [textInput, setTextInput] = React.useState('');
    const [showTextInput, setShowTextInput] = React.useState(false);
    
    // Track if we're currently executing to prevent duplicates
    const isExecutingRef = React.useRef(false);
    
    // Get online status for offline mode indicator
    const { isOnline, isReallyOnline } = useOnlineStatus();
    
    // Sync offline mode with voice synthesis
    useEffect(() => {
        voiceSynthesis.setOfflineMode(!isReallyOnline);
    }, [isReallyOnline]);

    // Handle transaction execution
    const executeTransaction = React.useCallback(async () => {
        if (!lastCommand) return;
        
        // Prevent duplicate execution
        if (isExecutingRef.current) {
            console.log('[VoiceAssistant] Already executing, skipping duplicate');
            return;
        }
        
        isExecutingRef.current = true;

        setIsProcessing(true);
        try {
            const success = await onTransaction(
                lastCommand.amount,
                lastCommand.description,
                lastCommand.type
            );

            setShowFeedback(success ? 'success' : 'error');
            
            // Reset after showing feedback
            setTimeout(() => {
                setShowFeedback(null);
                resetConversation();
                setShowConversation(false);
                isExecutingRef.current = false; // Reset execution flag
            }, 2500);
        } catch (err) {
            console.error('Transaction execution error:', err);
            setShowFeedback('error');
            setTimeout(() => {
                setShowFeedback(null);
                isExecutingRef.current = false; // Reset execution flag on error too
            }, 2500);
        } finally {
            setIsProcessing(false);
        }
    }, [lastCommand, onTransaction, resetConversation]);

    useEffect(() => {
        if (lastCommand && context.state === 'executing') {
            executeTransaction();
        }
    }, [lastCommand, context.state, executeTransaction]);

    const handleMicClick = () => {
        console.log('[VoiceAssistant] Mic clicked, isListening:', isListening);
        console.log('[VoiceAssistant] isSupported:', isSupported);
        console.log('[VoiceAssistant] isReallyOnline:', isReallyOnline);
        
        // If offline, show text input instead of voice
        if (!isReallyOnline) {
            console.log('[VoiceAssistant] Offline - showing text input');
            setShowTextInput(true);
            setShowConversation(true);
            return;
        }
        
        if (isListening) {
            console.log('[VoiceAssistant] Stopping listening');
            stopListening();
        } else {
            console.log('[VoiceAssistant] Starting listening');
            startListening();
            setShowConversation(true);
        }
    };

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInput.trim()) return;
        
        console.log('[VoiceAssistant] Processing text input:', textInput);
        processText(textInput);
        setTextInput('');
    };

    const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTextInput(e.target.value);
    };

    const handleSuggestionClick = (suggestion: string) => {
        processText(suggestion);
    };

    const handleClose = () => {
        stopListening();
        resetConversation();
        setShowConversation(false);
        setShowTextInput(false);
        setTextInput('');
    };

    if (!isSupported) {
        return null;
    }

    // Get intent-based styling - using direct classes instead of template literals
    const getIntentIconBg = () => {
        switch (context.intent) {
            case 'payment': return 'bg-red-500/20';
            case 'receive': return 'bg-emerald-500/20';
            case 'query_balance':
            case 'query_transactions': return 'bg-blue-500/20';
            case 'help': return 'bg-purple-500/20';
            default: return 'bg-purple-500/20';
        }
    };

    const getIntentIconColor = () => {
        switch (context.intent) {
            case 'payment': return 'text-red-500';
            case 'receive': return 'text-emerald-500';
            case 'query_balance':
            case 'query_transactions': return 'text-blue-500';
            case 'help': return 'text-purple-500';
            default: return 'text-purple-400';
        }
    };

    const getIntentBadgeBg = () => {
        switch (context.intent) {
            case 'payment': return 'bg-red-500/20 border-red-500/30';
            case 'receive': return 'bg-emerald-500/20 border-emerald-500/30';
            case 'query_balance':
            case 'query_transactions': return 'bg-blue-500/20 border-blue-500/30';
            default: return 'bg-purple-500/20 border-purple-500/30';
        }
    };

    const getIntentBadgeText = () => {
        switch (context.intent) {
            case 'payment': return 'text-red-500';
            case 'receive': return 'text-emerald-500';
            case 'query_balance':
            case 'query_transactions': return 'text-blue-500';
            default: return 'text-purple-500';
        }
    };

    return (
        <>
            {/* Floating Mic Button */}
            <button
                onClick={handleMicClick}
                disabled={disabled || isProcessing}
                className={`fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all z-40 ${
                    isListening
                        ? 'bg-red-500 animate-pulse-glow'
                        : !isReallyOnline
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 hover:scale-110'
                        : 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:scale-110'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!isReallyOnline ? "Voice Assistant (Offline - Text Mode)" : "Voice Assistant (AI)"}
            >
                {isListening ? (
                    <MicOff className="w-6 h-6 text-white" />
                ) : !isReallyOnline ? (
                    <Keyboard className="w-6 h-6 text-white" />
                ) : (
                    <Mic className="w-6 h-6 text-white" />
                )}
                
                {/* Speaking indicator */}
                {isSpeaking && (
                    <div className="absolute -top-1 -right-1">
                        <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    </div>
                )}
                
                {/* Offline indicator badge */}
                {!isReallyOnline && !isListening && (
                    <div className="absolute -top-1 -left-1">
                        <WifiOff className="w-3 h-3 text-orange-300" />
                    </div>
                )}
            </button>

            {/* Conversation Panel */}
            {(showConversation || isListening || context.state !== 'idle') && (
                <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-24 pointer-events-none">
                    <div className="w-full max-w-md pointer-events-auto animate-fade-in">
                        <div className="glass-card p-4 mb-2 relative">
                            {/* Close button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>

                            {/* Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIntentIconBg()}`}>
                                    {context.intent === 'payment' && <ArrowUpRight className={`w-5 h-5 ${getIntentIconColor()}`} />}
                                    {context.intent === 'receive' && <ArrowDownLeft className={`w-5 h-5 ${getIntentIconColor()}`} />}
                                    {(!context.intent || context.intent === 'unknown') && <Sparkles className="w-5 h-5 text-purple-400" />}
                                    {(context.intent === 'query_balance' || context.intent === 'query_transactions') && <MessageCircle className="w-5 h-5 text-blue-400" />}
                                    {context.intent === 'help' && <HelpCircle className="w-5 h-5 text-purple-400" />}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        Voice Assistant
                                        {!isReallyOnline && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded-full">
                                                <WifiOff className="w-3 h-3 text-orange-400" />
                                                <span className="text-[10px] text-orange-400 font-medium">Offline</span>
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : !isReallyOnline ? 'Offline mode (no audio)' : 'Ready'}
                                    </p>
                                </div>
                                {context.intent && (
                                    <div className={`px-2 py-1 rounded-full border ${getIntentBadgeBg()}`}>
                                        <span className={`text-xs font-medium ${getIntentBadgeText()}`}>
                                            {context.intent === 'payment' && '💸 Pay'}
                                            {context.intent === 'receive' && '💰 Receive'}
                                            {context.intent === 'query_balance' && '💳 Balance'}
                                            {context.intent === 'query_transactions' && '📊 History'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Text Input Fallback (Offline Mode) */}
                            {showTextInput && !isReallyOnline && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Keyboard className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm text-slate-300">Type your command</span>
                                        <span className="text-xs text-orange-400">(Voice unavailable offline)</span>
                                    </div>
                                    <form onSubmit={handleTextSubmit} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={textInput}
                                            onChange={handleTextInputChange}
                                            placeholder='Try: "pay 500 for lunch" or "receive 2000 from client"'
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            disabled={!textInput.trim()}
                                            className="bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 flex items-center gap-2 transition-all"
                                        >
                                            <Send className="w-4 h-4 text-white" />
                                        </button>
                                    </form>
                                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                        <WifiOff className="w-3 h-3" />
                                        Offline mode - Using text input. All NLP features still work!
                                    </p>
                                </div>
                            )}

                            {/* Listening Indicator */}
                            {isListening && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Volume2 className="w-4 h-4 text-red-400 animate-pulse" />
                                        <span className="text-sm text-slate-300">Listening...</span>
                                        {!isReallyOnline && (
                                            <span className="text-xs text-orange-400">(Visual only)</span>
                                        )}
                                    </div>
                                    <div className="min-h-[40px] text-white text-sm bg-white/5 rounded-lg p-3 border border-white/10">
                                        {transcript || 'Try: "Pay 500 for lunch" or "Received 2000 from client"'}
                                    </div>
                                    {!isReallyOnline && transcript && (
                                        <p className="text-xs text-orange-400/80 mt-1 flex items-center gap-1">
                                            <WifiOff className="w-3 h-3" />
                                            Offline mode - Voice feedback disabled
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Assistant Message */}
                            {assistantMessage && !isListening && (
                                <div className="mb-4">
                                    <div className="flex items-start gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-3 h-3 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="bg-gradient-to-br from-purple-500/10 to-indigo-600/10 border border-purple-500/20 rounded-lg p-3">
                                                <p className="text-sm text-white">{assistantMessage}</p>
                                            </div>
                                            {!isReallyOnline && (
                                                <p className="text-xs text-slate-400 mt-1 italic">
                                                    (Text only - audio offline)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Transaction Preview */}
                            {context.state === 'confirming' && context.amount && (
                                <div className="mb-4 bg-white/5 rounded-lg p-4 border border-white/10">
                                    <div className="flex items-center gap-2 mb-3">
                                        {context.transactionType === 'debit' ? (
                                            <TrendingDown className="w-5 h-5 text-red-400" />
                                        ) : (
                                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                                        )}
                                        <span className="text-sm font-medium text-slate-300">
                                            {context.transactionType === 'debit' ? 'Payment' : 'Received'}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Amount</span>
                                            <span className="text-white font-bold">
                                                ₹{context.amount.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        {context.description && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">For</span>
                                                <span className="text-white">{context.description}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Quick Suggestions */}
                            {suggestions.length > 0 && !isListening && context.state !== 'executing' && (
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            disabled={isProcessing}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Action Buttons for Confirmation */}
                            {context.state === 'confirming' && !isProcessing && (
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={confirmTransaction}
                                        className="flex-1 primary-button flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Confirm
                                    </button>
                                    <button
                                        onClick={cancelTransaction}
                                        className="secondary-button px-6"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {/* Processing State */}
                            {isProcessing && (
                                <div className="flex items-center justify-center gap-2 py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                                    <span className="text-sm text-slate-300">Processing...</span>
                                </div>
                            )}

                            {/* Success/Error Feedback */}
                            {showFeedback && (
                                <div className="mt-4 text-center">
                                    {showFeedback === 'success' ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <Check className="w-6 h-6 text-emerald-400" />
                                            </div>
                                            <p className="text-emerald-400 font-medium">Transaction Recorded!</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                                <X className="w-6 h-6 text-red-400" />
                                            </div>
                                            <p className="text-red-400 font-medium">Transaction Failed</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Error Display */}
                            {error && (
                                <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
