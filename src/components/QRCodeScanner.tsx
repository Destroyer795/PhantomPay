'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Check, AlertCircle } from 'lucide-react';
import type { QRPaymentData } from '@/lib/types';

/**
 * QR Code Scanner Component
 * 
 * Uses html5-qrcode with proper DOM isolation to prevent React conflicts.
 * The scanner container is managed outside of React's reconciliation.
 */

interface QRCodeScannerProps {
    onScan: (data: QRPaymentData) => void;
    onClose: () => void;
    maxAmount?: number;
}

export function QRCodeScanner({ onScan, onClose, maxAmount }: QRCodeScannerProps) {
    const [error, setError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [scannedData, setScannedData] = useState<QRPaymentData | null>(null);
    const [amount, setAmount] = useState('');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scannerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scannerContainerId = useRef(`qr-scanner-${Date.now()}`);
    const isMountedRef = useRef(true);
    const isCleaningUpRef = useRef(false);

    // Safe cleanup function
    const cleanupScanner = useCallback(async () => {
        if (isCleaningUpRef.current) return;
        isCleaningUpRef.current = true;

        try {
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                } catch (e) {
                    // Ignore stop errors
                }
                try {
                    scannerRef.current.clear();
                } catch (e) {
                    // Ignore clear errors
                }
                scannerRef.current = null;
            }
        } catch (e) {
            console.log('Cleanup handled:', e);
        }

        // Manually clear the container to prevent React conflicts
        if (containerRef.current) {
            try {
                containerRef.current.innerHTML = '';
            } catch (e) {
                // Ignore
            }
        }

        isCleaningUpRef.current = false;
    }, []);

    // Initialize scanner
    useEffect(() => {
        isMountedRef.current = true;
        isCleaningUpRef.current = false;

        const initScanner = async () => {
            if (!containerRef.current || !isMountedRef.current) return;

            try {
                // Create a dedicated div for the scanner that won't be managed by React
                const scannerId = scannerContainerId.current;
                const scannerDiv = document.createElement('div');
                scannerDiv.id = scannerId;
                scannerDiv.style.width = '100%';
                scannerDiv.style.height = '100%';
                containerRef.current.appendChild(scannerDiv);

                // Dynamic import to avoid SSR issues
                const { Html5Qrcode } = await import('html5-qrcode');

                if (!isMountedRef.current) {
                    scannerDiv.remove();
                    return;
                }

                const html5QrCode = new Html5Qrcode(scannerId, { verbose: false });
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText: string) => {
                        if (!isMountedRef.current || scannedData) return;

                        try {
                            const data = JSON.parse(decodedText) as QRPaymentData;

                            if (!data.recipient_id || !data.timestamp || !data.signature) {
                                setError('Invalid QR code format');
                                return;
                            }

                            // Stop scanner first
                            html5QrCode.stop().catch(() => { });

                            setScannedData(data);
                            if (data.amount) {
                                setAmount(data.amount.toString());
                            }
                        } catch {
                            setError('Not a valid PhantomPay QR code');
                        }
                    },
                    () => { } // Ignore frame errors
                );

                if (isMountedRef.current) {
                    setIsInitializing(false);
                }
            } catch (err: any) {
                console.error('Scanner init error:', err);
                if (isMountedRef.current) {
                    if (err.name === 'NotAllowedError') {
                        setError('Camera permission denied. Please allow camera access.');
                    } else if (err.name === 'NotFoundError') {
                        setError('No camera found on this device.');
                    } else {
                        setError('Could not start camera. Please check permissions.');
                    }
                    setIsInitializing(false);
                }
            }
        };

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(initScanner, 100);

        return () => {
            isMountedRef.current = false;
            clearTimeout(timeoutId);
            cleanupScanner();
        };
    }, []); // Empty deps - only run on mount

    const handleConfirmPayment = () => {
        if (!scannedData) return;

        const paymentAmount = scannedData.amount || parseFloat(amount);

        if (!paymentAmount || paymentAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (maxAmount !== undefined && paymentAmount > maxAmount) {
            setError(`Insufficient balance. Max: ${maxAmount.toLocaleString()} сом`);
            return;
        }

        onScan({
            ...scannedData,
            amount: paymentAmount
        });
    };

    const handleClose = async () => {
        isMountedRef.current = false;
        await cleanupScanner();
        onClose();
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Scan to Pay</h3>
                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            {/* Scanner View */}
            {!scannedData && (
                <>
                    <div
                        ref={containerRef}
                        className="relative w-full aspect-square rounded-xl overflow-hidden bg-black mb-4"
                        style={{ minHeight: '280px' }}
                    >
                        {isInitializing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
                                    <p className="text-slate-400 text-sm">Starting camera...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-slate-400 text-sm text-center">
                        Point camera at a PhantomPay QR code
                    </p>
                </>
            )}

            {/* Scanned Data Confirmation */}
            {scannedData && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Check className="w-6 h-6 text-emerald-400" />
                        <div>
                            <p className="text-white font-medium">QR Scanned!</p>
                            <p className="text-slate-400 text-sm">
                                To: {scannedData.recipient_name || scannedData.recipient_id.slice(0, 8) + '...'}
                            </p>
                        </div>
                    </div>

                    {/* Amount Input (if not pre-filled) */}
                    {!scannedData.amount && (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Amount to Pay
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError(null);
                                }}
                                placeholder="Enter amount"
                                className="input-field text-xl font-bold"
                                min="0"
                                max={maxAmount}
                                autoFocus
                            />
                            {maxAmount !== undefined && (
                                <p className="text-slate-500 text-xs mt-1">
                                    Balance: {maxAmount.toLocaleString()} сом
                                </p>
                            )}
                        </div>
                    )}

                    {/* Pre-filled Amount */}
                    {scannedData.amount && (
                        <div className="p-4 bg-slate-800/50 rounded-xl">
                            <p className="text-slate-400 text-sm">Amount</p>
                            <p className="text-2xl font-bold text-white">
                                {scannedData.amount.toLocaleString()} сом
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleConfirmPayment}
                            className="flex-1 primary-button"
                        >
                            Pay Now
                        </button>
                        <button
                            onClick={handleClose}
                            className="secondary-button px-4"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}
        </div>
    );
}

/**
 * QR Payment Modal - Complete payment flow
 */
interface QRPaymentModalProps {
    userId: string;
    maxAmount: number;
    onPayment: (amount: number, recipientId: string, description: string) => Promise<boolean>;
    onClose: () => void;
}

export function QRPaymentModal({ userId, maxAmount, onPayment, onClose }: QRPaymentModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<'success' | 'error' | null>(null);

    const handleScan = async (data: QRPaymentData) => {
        if (!data.amount) return;

        setIsProcessing(true);
        try {
            const description = `Payment to ${data.recipient_name || data.recipient_id.slice(0, 8)}`;
            const success = await onPayment(data.amount, data.recipient_id, description);
            setResult(success ? 'success' : 'error');

            if (success) {
                setTimeout(() => onClose(), 1500);
            }
        } catch {
            setResult('error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <div className="glass-card p-8 text-center">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Processing...</p>
            </div>
        );
    }

    if (result) {
        return (
            <div className="glass-card p-8 text-center">
                {result === 'success' ? (
                    <>
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-emerald-400" />
                        </div>
                        <p className="text-white font-medium text-lg">Payment Sent!</p>
                        <p className="text-slate-400 text-sm mt-1">Saved to Shadow Ledger</p>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <X className="w-8 h-8 text-red-400" />
                        </div>
                        <p className="text-white font-medium text-lg">Payment Failed</p>
                        <button onClick={onClose} className="mt-4 secondary-button">
                            Close
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <QRCodeScanner
            onScan={handleScan}
            onClose={onClose}
            maxAmount={maxAmount}
        />
    );
}
