'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Clock, ChevronRight, LogOut, Shield, RefreshCw, ArrowUpRight, ArrowDownLeft, QrCode, Wallet, Scan
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useShadowTransaction } from '@/hooks/useShadowTransaction';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { PaymentForm } from '@/components/PaymentForm';
import { NetworkStatus } from '@/components/NetworkStatus';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { QRRequestModal } from '@/components/QRCodeGenerator';
import { QRPaymentModal } from '@/components/QRCodeScanner';
import { fetchServerTransactions } from '@/lib/syncEngine';
import type { ServerTransaction } from '@/lib/types';

/**
 * Main Dashboard Page
 * 
 * This is the primary view showing:
 * - Balance (shadow balance for offline safety)
 * - Quick actions (Pay/Receive)
 * - Recent transactions
 * - Network status
 */

// Demo user ID removed. Using Supabase Auth.

export default function Dashboard() {
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showQRReceive, setShowQRReceive] = useState(false);
    const [showQRScan, setShowQRScan] = useState(false);
    const [serverTransactions, setServerTransactions] = useState<ServerTransaction[]>([]);
    const router = useRouter();

    // Check Authentication
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/');
            } else {
                setUserId(user.id);
                setUserName(user.email?.split('@')[0] || 'User');
                setIsAuthChecking(false);
            }
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                router.push('/');
            } else {
                setUserId(session.user.id);
                setUserName(session.user.email?.split('@')[0] || 'User');
                setIsAuthChecking(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    // Handle Sign Out
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    // Shadow transaction hook for offline-first logic
    const {
        shadowBalance,
        cachedBalance,
        pendingCount,
        isLoading,
        isOnline,
        addTransaction,
        syncNow
    } = useShadowTransaction(userId);

    // Fetch server transactions (including received payments from others)
    const loadServerTransactions = useCallback(async () => {
        if (!userId || !isOnline) return;
        console.log('📥 Fetching server transactions...');
        const txns = await fetchServerTransactions(userId);
        setServerTransactions(txns);
    }, [userId, isOnline]);

    // Load server transactions on mount and when userId/online status changes
    useEffect(() => {
        loadServerTransactions();
    }, [loadServerTransactions]);

    // Live query for LOCAL pending transactions from Dexie (for immediate UI feedback)
    const localPendingTransactions = useLiveQuery(
        () => {
            if (!userId) return [];
            return db.transactions
                .where('user_id')
                .equals(userId)
                .and(tx => tx.sync_status === 'pending')
                .reverse()
                .sortBy('timestamp');
        },
        [userId]
    );

    // Combine local pending with server transactions for display
    // Local pending show immediately, server shows synced + received payments
    const allTransactions = [
        ...(localPendingTransactions || []).map(tx => ({
            ...tx,
            id: tx.id || 0,
            status: 'pending' as const,
            created_at: tx.created_at
        })),
        ...serverTransactions.filter(stx =>
            !(localPendingTransactions || []).some(ltx => ltx.offline_id === stx.offline_id)
        )
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Handle payment submission
    const handlePayment = async (amount: number, description: string) => {
        const success = await addTransaction(amount, description, 'debit');
        if (success) {
            setShowPaymentForm(false);
        }
        return success;
    };

    // Handle receiving money
    const handleReceive = async (amount: number, description: string) => {
        return await addTransaction(amount, description, 'credit');
    };

    // Handle QR payment (from scanner) - P2P transfer
    const handleQRPayment = async (amount: number, recipientId: string, description: string) => {
        console.log('🎯 handleQRPayment called:', { amount, recipientId, description });
        // Pass recipientId for P2P transfer - server will credit recipient
        const success = await addTransaction(amount, description, 'debit', recipientId);
        console.log('🎯 addTransaction result:', success);
        if (success) {
            setShowQRScan(false);
        }
        return success;
    };

    // Show loading screen while checking auth
    if (isAuthChecking) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-slate-400 text-sm">Loading...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0b]/90 backdrop-blur-xl border-b border-white/5">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold">
                            Phantom<span className="text-indigo-500">Pay</span>
                        </h1>
                    </div>

                    {/* Sync Button */}
                    {pendingCount > 0 && isOnline && (
                        <button
                            onClick={syncNow}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-indigo-400 text-sm font-medium transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Sync {pendingCount}
                        </button>
                    )}

                    <button
                        onClick={handleSignOut}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5 text-slate-400 hover:text-red-400" />
                    </button>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Network Status Banner */}
                <NetworkStatus
                    isOnline={isOnline}
                    pendingCount={pendingCount}
                    onSyncClick={syncNow}
                />

                {/* Balance Card */}
                <BalanceCard
                    shadowBalance={shadowBalance}
                    cachedBalance={cachedBalance}
                    pendingCount={pendingCount}
                    isOnline={isOnline}
                    isLoading={isLoading}
                />

                {/* Quick Actions */}
                <section className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setShowPaymentForm(true)}
                        className="glass-card p-5 flex flex-col items-center gap-3 hover:border-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <ArrowUpRight className="w-7 h-7 text-indigo-400" />
                        </div>
                        <span className="font-semibold text-white">Pay</span>
                    </button>

                    <button
                        onClick={() => {
                            const amount = prompt('Enter amount to receive:');
                            if (amount) {
                                const numAmount = parseFloat(amount);
                                if (!isNaN(numAmount) && numAmount > 0) {
                                    handleReceive(numAmount, 'Received payment');
                                }
                            }
                        }}
                        className="glass-card p-5 flex flex-col items-center gap-3 hover:border-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <ArrowDownLeft className="w-7 h-7 text-emerald-400" />
                        </div>
                        <span className="font-semibold text-white">Receive</span>
                    </button>
                </section>

                {/* QR Actions */}
                <section className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setShowQRScan(true)}
                        className="glass-card p-4 flex items-center gap-3 hover:border-purple-500/30 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Scan className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-left">
                            <span className="font-medium text-white text-sm">Scan QR</span>
                            <p className="text-xs text-slate-500">Pay someone</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                    </button>

                    <button
                        onClick={() => setShowQRReceive(true)}
                        className="glass-card p-4 flex items-center gap-3 hover:border-emerald-500/30 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-left">
                            <span className="font-medium text-white text-sm">My QR</span>
                            <p className="text-xs text-slate-500">Receive payment</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                    </button>
                </section>

                {/* Transaction List */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
                        {allTransactions.length > 0 && (
                            <button
                                onClick={loadServerTransactions}
                                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Refresh
                            </button>
                        )}
                    </div>
                    <TransactionList
                        transactions={allTransactions as any}
                        isLoading={isLoading}
                    />
                </section>
            </div>

            {/* Payment Modal */}
            {showPaymentForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowPaymentForm(false)}
                    />
                    <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-fade-in">
                        <PaymentForm
                            onSubmit={handlePayment}
                            maxAmount={shadowBalance}
                            disabled={false}
                        />
                        <button
                            onClick={() => setShowPaymentForm(false)}
                            className="mt-3 w-full secondary-button"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* QR Scanner Modal (Pay Mode) */}
            {showQRScan && userId && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowQRScan(false)}
                    />
                    <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-fade-in">
                        <QRPaymentModal
                            userId={userId}
                            maxAmount={shadowBalance}
                            onPayment={handleQRPayment}
                            onClose={() => setShowQRScan(false)}
                        />
                    </div>
                </div>
            )}

            {/* QR Receive Modal */}
            {showQRReceive && userId && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowQRReceive(false)}
                    />
                    <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-fade-in">
                        <QRRequestModal
                            userId={userId}
                            userName={userName}
                            onClose={() => setShowQRReceive(false)}
                        />
                    </div>
                </div>
            )}

            {/* Voice Input FAB */}
            <VoiceInputButton
                onTransaction={addTransaction}
                disabled={isLoading}
            />

            {/* Bottom Navigation (for mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0b]/95 backdrop-blur-xl border-t border-white/5 py-2 px-4 sm:hidden">
                <div className="flex items-center justify-around">
                    <button className="flex flex-col items-center gap-1 px-4 py-2 text-indigo-400">
                        <Wallet className="w-5 h-5" />
                        <span className="text-xs font-medium">Wallet</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 px-4 py-2 text-slate-500">
                        <Clock className="w-5 h-5" />
                        <span className="text-xs font-medium">History</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 px-4 py-2 text-slate-500">
                        <QrCode className="w-5 h-5" />
                        <span className="text-xs font-medium">QR</span>
                    </button>
                </div>
            </nav>
        </main>
    );
}
