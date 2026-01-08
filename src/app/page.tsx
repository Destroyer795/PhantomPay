'use client';

import { useState, useEffect } from 'react';
import {
    Shield, Wallet, ArrowUpRight, ArrowDownLeft,
    Wifi, WifiOff, RefreshCw, QrCode, Mic, LogOut,
    Clock, ChevronRight
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useShadowTransaction } from '@/hooks/useShadowTransaction';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { PaymentForm } from '@/components/PaymentForm';
import { NetworkStatus } from '@/components/NetworkStatus';
import { VoiceInputButton } from '@/components/VoiceInputButton';

/**
 * Main Dashboard Page
 * 
 * This is the primary view showing:
 * - Balance (shadow balance for offline safety)
 * - Quick actions (Pay/Receive)
 * - Recent transactions
 * - Network status
 */

// Demo user ID (in production, this comes from Supabase Auth)
const DEMO_USER_ID = 'demo-user-001';

export default function Dashboard() {
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'transactions' | 'actions'>('transactions');

    // Shadow transaction hook for offline-first logic
    const {
        shadowBalance,
        cachedBalance,
        pendingCount,
        isLoading,
        isOnline,
        addTransaction,
        syncNow
    } = useShadowTransaction(DEMO_USER_ID);

    // Live query for transactions from Dexie
    const transactions = useLiveQuery(
        () => db.transactions
            .where('user_id')
            .equals(DEMO_USER_ID)
            .reverse()
            .sortBy('timestamp'),
        []
    );

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
                            Resilient<span className="text-indigo-500">Pay</span>
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

                {/* Additional Actions */}
                <section className="grid grid-cols-2 gap-4">
                    <button className="glass-card p-4 flex items-center gap-3 hover:border-purple-500/30 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-left">
                            <span className="font-medium text-white text-sm">QR Code</span>
                            <p className="text-xs text-slate-500">Scan to pay</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                    </button>

                    <button className="glass-card p-4 flex items-center gap-3 hover:border-amber-500/30 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Mic className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="text-left">
                            <span className="font-medium text-white text-sm">Voice</span>
                            <p className="text-xs text-slate-500">Zudu AI</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                    </button>
                </section>

                {/* Transaction List */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
                        {transactions && transactions.length > 0 && (
                            <span className="text-sm text-slate-500">
                                {transactions.length} total
                            </span>
                        )}
                    </div>
                    <TransactionList
                        transactions={transactions || []}
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
