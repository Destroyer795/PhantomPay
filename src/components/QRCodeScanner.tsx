'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Check, AlertCircle } from 'lucide-react';
import type { QRPaymentData } from '@/lib/types';

/**
 * QR Code Scanner Component
 * 
 * Uses html5-qrcode with proper DOM isolation.
 * Fixed callback closure issues with refs.
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
    const hasScannedRef = useRef(false); // Use ref to track if already scanned

    // Initialize and cleanup scanner
    useEffect(() => {
        isMountedRef.current = true;
        hasScannedRef.current = false;

        const initScanner = async () => {
            if (!containerRef.current || !isMountedRef.current) return;

            try {
                // Create dedicated div for scanner
                const scannerId = scannerContainerId.current;
                const scannerDiv = document.createElement('div');
                scannerDiv.id = scannerId;
                scannerDiv.style.width = '100%';
                scannerDiv.style.height = '100%';
                containerRef.current.appendChild(scannerDiv);

                // Dynamic import
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
                    // Success callback
                    (decodedText: string) => {
                        // Use ref to prevent multiple scans
                        if (!isMountedRef.current || hasScannedRef.current) return;

                        console.log('QR Scanned:', decodedText);

                        try {
                            const data = JSON.parse(decodedText) as QRPaymentData;

                            // Validate
                            if (!data.recipient_id) {
                                console.error('Missing recipient_id');
                                return;
                            }

                            // Mark as scanned BEFORE stopping to prevent re-entry
                            hasScannedRef.current = true;

                            // Stop scanner
                            html5QrCode.stop().then(() => {
                                console.log('Scanner stopped');
                            }).catch((e) => {
                                console.log('Stop error (ignored):', e);
                            });

                            // Update state
                            setScannedData(data);
                            if (data.amount) {
                                setAmount(data.amount.toString());
                            }
                        } catch (e) {
                            console.error('QR Parse error:', e);
                            setError('Invalid QR code format');
                        }
                    },
                    // Error callback - called on every frame without QR
                    (errorMessage: string) => {
                        // Only log occasionally to avoid spam
                        // console.log('Scan frame:', errorMessage);
                    }
                );

                if (isMountedRef.current) {
                    setIsInitializing(false);
                    console.log('Scanner ready');
                }
            } catch (err: any) {
                console.error('Scanner init error:', err);
                if (isMountedRef.current) {
                    if (err.name === 'NotAllowedError') {
                        setError('Camera permission denied');
                    } else if (err.name === 'NotFoundError') {
                        setError('No camera found');
                    } else {
                        setError(`Camera error: ${err.message || 'Unknown'}`);
                    }
                    setIsInitializing(false);
                }
            }
        };

        // Delay to ensure DOM ready
        const timeoutId = setTimeout(initScanner, 200);

        // Cleanup
        return () => {
            isMountedRef.current = false;
            clearTimeout(timeoutId);

            // Cleanup scanner
            if (scannerRef.current) {
                try {
                    scannerRef.current.stop().catch(() => { });
                    scannerRef.current.clear?.();
                } catch (e) {
                    // Ignore
                }
                scannerRef.current = null;
            }

            // Clear container
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, []);

    const handleConfirmPayment = () => {
        console.log('💳 handleConfirmPayment called', { scannedData, amount });
        if (!scannedData) return;

        const paymentAmount = scannedData.amount || parseFloat(amount);
        console.log('💳 Payment amount:', paymentAmount, 'Max:', maxAmount);

        if (!paymentAmount || paymentAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (maxAmount !== undefined && paymentAmount > maxAmount) {
            setError(`Insufficient balance. Max: ${maxAmount.toLocaleString()} сом`);
            return;
        }

        console.log('💳 Calling onScan with:', { ...scannedData, amount: paymentAmount });
        onScan({
            ...scannedData,
            amount: paymentAmount
        });
    };

    const handleClose = () => {
        isMountedRef.current = false;

        // Stop and cleanup
        if (scannerRef.current) {
            try {
                scannerRef.current.stop().catch(() => { });
            } catch (e) {
                // Ignore
            }
        }

        onClose();
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Scan to Pay</h3>
                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    type="button"
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

                    <p className="text-slate-400 text-sm text-center mb-2">
                        Point camera at a PhantomPay QR code
                    </p>

                    {/* Debug info */}
                    <p className="text-slate-600 text-xs text-center">
                        Camera active: {!isInitializing ? 'Yes' : 'Starting...'}
                    </p>
                </>
            )}

            {/* Scanned Confirmation */}
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

                    {/* Amount Input */}
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
                            type="button"
                        >
                            Pay Now
                        </button>
                        <button
                            onClick={handleClose}
                            className="secondary-button px-4"
                            type="button"
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
 * QR Payment Modal
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
        console.log('🔔 handleScan called with:', data);
        if (!data.amount) {
            console.error('❌ No amount in data!');
            return;
        }

        setIsProcessing(true);
        try {
            const description = `Payment to ${data.recipient_name || data.recipient_id.slice(0, 8)}`;
            console.log('🔔 Calling onPayment:', { amount: data.amount, recipientId: data.recipient_id, description });
            const success = await onPayment(data.amount, data.recipient_id, description);
            console.log('🔔 onPayment result:', success);
            setResult(success ? 'success' : 'error');

            if (success) {
                setTimeout(() => onClose(), 1500);
            }
        } catch (err) {
            console.error('❌ handleScan error:', err);
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
                        <button onClick={onClose} className="mt-4 secondary-button" type="button">
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
