/**
 * Voice Synthesis - Text-to-Speech for voice responses
 * 
 * Provides natural voice feedback for the assistant.
 * Includes offline mode support with graceful degradation.
 */

export interface VoiceSynthesisOptions {
    rate?: number;      // 0.1 to 10, default 1
    pitch?: number;     // 0 to 2, default 1
    volume?: number;    // 0 to 1, default 1
    lang?: string;      // Language code, default 'en-US'
    skipIfOffline?: boolean; // Skip TTS if offline, default true
}

class VoiceSynthesisManager {
    private synthesis: SpeechSynthesis | null = null;
    private isSupported: boolean = false;
    private offlineMode: boolean = false;
    private defaultOptions: VoiceSynthesisOptions = {
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8,
        lang: 'en-IN', // Indian English
        skipIfOffline: true
    };

    constructor() {
        if (typeof window !== 'undefined') {
            this.synthesis = window.speechSynthesis;
            this.isSupported = 'speechSynthesis' in window;
            
            // Monitor online/offline status
            window.addEventListener('online', () => this.setOfflineMode(false));
            window.addEventListener('offline', () => this.setOfflineMode(true));
            this.offlineMode = !navigator.onLine;
        }
    }

    /**
     * Set offline mode manually
     */
    public setOfflineMode(offline: boolean): void {
        this.offlineMode = offline;
        console.log(`[VoiceSynthesis] Offline mode: ${offline ? 'ON' : 'OFF'}`);
    }

    /**
     * Check if currently in offline mode
     */
    public isOffline(): boolean {
        return this.offlineMode;
    }

    /**
     * Check if text-to-speech is supported
     */
    public isSupportedBrowser(): boolean {
        return this.isSupported;
    }

    /**
     * Speak text with voice synthesis
     * Gracefully handles offline mode
     */
    public speak(text: string, options: VoiceSynthesisOptions = {}): Promise<void> {
        return new Promise((resolve, reject) => {
            // Apply options
            const opts = { ...this.defaultOptions, ...options };
            
            // If offline and skipIfOffline is true, silently resolve
            if (this.offlineMode && opts.skipIfOffline) {
                console.log('[VoiceSynthesis] Offline mode - skipping TTS');
                resolve();
                return;
            }
            
            if (!this.synthesis || !this.isSupported) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            // Cancel any ongoing speech
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            
            // Apply voice options
            utterance.rate = opts.rate!;
            utterance.pitch = opts.pitch!;
            utterance.volume = opts.volume!;
            utterance.lang = opts.lang!;

            // Try to find an Indian English voice
            const voices = this.synthesis.getVoices();
            const indianVoice = voices.find(v => 
                v.lang === 'en-IN' || 
                v.lang.startsWith('en-') && v.name.toLowerCase().includes('india')
            );
            
            if (indianVoice) {
                utterance.voice = indianVoice;
            } else {
                // Fallback to any English voice
                const englishVoice = voices.find(v => v.lang.startsWith('en'));
                if (englishVoice) {
                    utterance.voice = englishVoice;
                }
            }

            utterance.onend = () => resolve();
            utterance.onerror = (event) => reject(event);

            this.synthesis.speak(utterance);
        });
    }

    /**
     * Stop any ongoing speech
     */
    public stop(): void {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    }

    /**
     * Check if currently speaking
     */
    public isSpeaking(): boolean {
        return this.synthesis?.speaking || false;
    }

    /**
     * Get available voices
     */
    public getVoices(): SpeechSynthesisVoice[] {
        if (!this.synthesis) return [];
        return this.synthesis.getVoices();
    }

    /**
     * Speak with emotion/tone variations
     */
    public speakWithTone(text: string, tone: 'success' | 'error' | 'question' | 'info'): Promise<void> {
        let options: VoiceSynthesisOptions = { ...this.defaultOptions };

        switch (tone) {
            case 'success':
                options.pitch = 1.2;
                options.rate = 1.0;
                break;
            case 'error':
                options.pitch = 0.8;
                options.rate = 0.9;
                break;
            case 'question':
                options.pitch = 1.1;
                options.rate = 0.95;
                break;
            case 'info':
                options.pitch = 1.0;
                options.rate = 1.0;
                break;
        }

        return this.speak(text, options);
    }
}

// Singleton instance
export const voiceSynthesis = new VoiceSynthesisManager();

/**
 * Quick helper to speak text
 */
export function speakText(text: string, options?: VoiceSynthesisOptions): Promise<void> {
    return voiceSynthesis.speak(text, options);
}

/**
 * Quick helper to stop speaking
 */
export function stopSpeaking(): void {
    voiceSynthesis.stop();
}
