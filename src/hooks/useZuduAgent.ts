'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { parseIntent } from '@/lib/nlp/intentParser';
import { extractEntities } from '@/lib/nlp/entityExtractor';

/**
 * useZuduAgent Hook
 * 
 * Voice-based transaction input using Web Speech API.
 * Listens for commands like "Pay 500 for lunch" and extracts transaction data.
 * 
 * LEGACY: This hook is now superseded by useConversationalVoice.
 * Kept for backward compatibility. Uses new NLP engine internally.
 */

interface VoiceCommand {
    amount: number;
    description: string;
    type: 'credit' | 'debit';
    confidence: number;
}

interface UseZuduAgentResult {
    isListening: boolean;
    isSupported: boolean;
    transcript: string;
    lastCommand: VoiceCommand | null;
    error: string | null;
    startListening: () => void;
    stopListening: () => void;
    processText: (text: string) => VoiceCommand | null;
}

// Type for the SpeechRecognition API
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : unknown;

export function useZuduAgent(): UseZuduAgentResult {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    /**
     * Parse voice input to extract transaction data
     * Updated to use new NLP engine with better intent recognition
     */
    const processText = useCallback((text: string): VoiceCommand | null => {
        const normalizedText = text.toLowerCase().trim();

        // Use new NLP engine
        const intent = parseIntent(text);
        const entities = extractEntities(text);

        // Check if we have enough information
        if (!entities.hasAmount || entities.amount === null) {
            return null;
        }

        // Determine transaction type from intent
        let type: 'credit' | 'debit' = 'debit'; // Default to debit
        
        if (intent.type === 'receive') {
            type = 'credit';
        } else if (intent.type === 'payment') {
            type = 'debit';
        }

        // Calculate overall confidence
        const confidence = Math.min(
            (intent.confidence + entities.confidence) / 2,
            1.0
        );

        return {
            amount: entities.amount,
            description: entities.description,
            type,
            confidence
        };
    }, []);

    // Check for speech recognition support
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        setIsSupported(!!SpeechRecognitionAPI);

        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onresult = (event: any) => {
                const current = event.resultIndex;
                const result = event.results[current];
                const text = result[0].transcript;

                setTranscript(text);

                if (result.isFinal) {
                    const command = processText(text);
                    if (command) {
                        setLastCommand(command);
                    }
                }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onerror = (event: any) => {
                setError(`Speech recognition error: ${event.error}`);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [processText]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || !isSupported) {
            setError('Speech recognition not supported');
            return;
        }

        setError(null);
        setTranscript('');
        setLastCommand(null);
        setIsListening(true);

        try {
            recognitionRef.current.start();
        } catch {
            setError('Failed to start speech recognition');
            setIsListening(false);
        }
    }, [isSupported]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);

    return {
        isListening,
        isSupported,
        transcript,
        lastCommand,
        error,
        startListening,
        stopListening,
        processText
    };
}
