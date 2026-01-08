'use client';

import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OfflineTransaction } from '@/lib/types';

/**
 * ConflictCard Component
 * 
 * Implements the "Merge Interface" pattern from UI roadmap.
 * Appears as a task card in the transaction feed when conflicts are detected.
 * 
 * Key features:
 * - Side-by-side comparison of local vs server versions
 * - Clear action buttons: Keep Mine, Accept Server, Cancel
 * - Non-intrusive (doesn't block the app)
 * - Appears in feed as a prioritized item
 */

interface ConflictCardProps {
    transaction: OfflineTransaction;
    onResolve: (resolution: 'keep_local' | 'accept_server' | 'cancel') => Promise<void>;
    onDismiss?: () => void;
}

export function ConflictCard({ transaction, onResolve, onDismiss }: ConflictCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isResolving, setIsResolving] = useState(false);

    if (!transaction.conflict_data) return null;

    const localVersion = transaction;
    const serverVersion = {
        ...transaction,
        ...transaction.conflict_data.server_version
    };

    const handleResolve = async (resolution: 'keep_local' | 'accept_server' | 'cancel') => {
        setIsResolving(true);
        try {
            await onResolve(resolution);
        } finally {
            setIsResolving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -100 }}
            className="glass-card p-4 bg-yellow-500/5 border-2 border-yellow-400/30 relative overflow-hidden"
        >
            {/* Background warning pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(251,191,36,0.05)_25%,rgba(251,191,36,0.05)_50%,transparent_50%,transparent_75%,rgba(251,191,36,0.05)_75%)] bg-[length:20px_20px]"></div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={20} className="text-yellow-400" />
                        <div>
                            <h3 className="text-white font-bold">Conflict Detected</h3>
                            <p className="text-sm text-yellow-400">
                                This transaction differs from the server version
                            </p>
                        </div>
                    </div>
                    {onDismiss && !isExpanded && (
                        <button
                            onClick={onDismiss}
                            className="p-1 hover:bg-white/5 rounded transition-colors"
                        >
                            <X size={16} className="text-slate-400" />
                        </button>
                    )}
                </div>

                {/* Quick Info */}
                <div className="bg-black/20 rounded-lg p-3 mb-3">
                    <p className="text-sm text-slate-300">
                        <span className="font-semibold">{transaction.description}</span>
                        <span className="text-slate-500 mx-2">•</span>
                        <span className={transaction.type === 'debit' ? 'text-red-400' : 'text-emerald-400'}>
                            {transaction.type === 'debit' ? '-' : '+'}{transaction.amount.toLocaleString()} сом
                        </span>
                    </p>
                </div>

                {/* Expand/Collapse Toggle */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full text-center text-sm text-yellow-400 hover:text-yellow-300 transition-colors mb-3 font-medium"
                >
                    {isExpanded ? '▼ Hide details' : '▶ Show details'}
                </button>

                {/* Detailed Comparison */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                {/* Your Version */}
                                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                                    <h4 className="text-xs uppercase font-bold text-indigo-400 mb-2">
                                        Your Version (Device)
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-slate-500">Amount:</span>
                                            <span className="text-white font-mono ml-2">
                                                {localVersion.amount.toLocaleString()} сом
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Description:</span>
                                            <p className="text-white mt-1 text-xs">
                                                {localVersion.description}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Type:</span>
                                            <span className={`ml-2 ${localVersion.type === 'debit' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {localVersion.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Server Version */}
                                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                                    <h4 className="text-xs uppercase font-bold text-orange-400 mb-2">
                                        Server Version (Cloud)
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-slate-500">Amount:</span>
                                            <span className="text-white font-mono ml-2">
                                                {(serverVersion.amount || localVersion.amount).toLocaleString()} сом
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Description:</span>
                                            <p className="text-white mt-1 text-xs">
                                                {serverVersion.description || localVersion.description}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Type:</span>
                                            <span className={`ml-2 ${(serverVersion.type || localVersion.type) === 'debit' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {serverVersion.type || localVersion.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 p-2 bg-yellow-500/10 rounded text-xs text-yellow-300 italic">
                                ℹ️ The transaction was modified on both your device and the server. Choose which version to keep.
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Resolution Actions */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleResolve('keep_local')}
                        disabled={isResolving}
                        className="flex flex-col items-center gap-1 px-3 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check size={18} />
                        <span className="text-xs font-medium">Keep Mine</span>
                    </button>

                    <button
                        onClick={() => handleResolve('accept_server')}
                        disabled={isResolving}
                        className="flex flex-col items-center gap-1 px-3 py-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowRight size={18} />
                        <span className="text-xs font-medium">Use Server</span>
                    </button>

                    <button
                        onClick={() => handleResolve('cancel')}
                        disabled={isResolving}
                        className="flex flex-col items-center gap-1 px-3 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X size={18} />
                        <span className="text-xs font-medium">Cancel Both</span>
                    </button>
                </div>

                {isResolving && (
                    <div className="mt-3 text-center text-sm text-slate-400 italic">
                        Resolving conflict...
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/**
 * Conflict List Component
 * 
 * Groups all conflicts at the top of the transaction feed.
 * Makes them highly visible and actionable.
 */

interface ConflictListProps {
    conflicts: OfflineTransaction[];
    onResolve: (offlineId: string, resolution: 'keep_local' | 'accept_server' | 'cancel') => Promise<void>;
}

export function ConflictList({ conflicts, onResolve }: ConflictListProps) {
    if (conflicts.length === 0) return null;

    return (
        <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 px-1">
                <AlertTriangle size={18} className="text-yellow-400" />
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
                    {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} Need Resolution
                </h3>
            </div>
            {conflicts.map((conflict) => (
                <ConflictCard
                    key={conflict.offline_id}
                    transaction={conflict}
                    onResolve={(resolution) => onResolve(conflict.offline_id, resolution)}
                />
            ))}
        </div>
    );
}
