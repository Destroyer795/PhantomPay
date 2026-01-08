'use client';

import React, { useState } from 'react';
import { X, RefreshCw, Clock, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SyncQueueItem } from '@/lib/types';

/**
 * SyncDrawer Component
 * 
 * Provides transparency into the sync queue.
 * Opens when clicking the SyncStatusPill in the header.
 * 
 * Key features:
 * - Lists all items in sync queue
 * - Shows retry count and error messages
 * - Per-item retry capability
 * - Clear failed items
 * - Reassures user that data is safe in queue
 */

interface SyncDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    queueItems: SyncQueueItem[];
    onRetryItem?: (id: string) => Promise<void>;
    onClearFailed?: () => Promise<void>;
}

export function SyncDrawer({
    isOpen,
    onClose,
    queueItems,
    onRetryItem,
    onClearFailed
}: SyncDrawerProps) {
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const handleRetryItem = async (id: string) => {
        if (!onRetryItem) return;
        setRetryingId(id);
        try {
            await onRetryItem(id);
        } finally {
            setRetryingId(null);
        }
    };

    const failedCount = queueItems.filter(item => item.status === 'failed').length;
    const pendingCount = queueItems.filter(item => item.status === 'pending' || item.status === 'syncing').length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-white/10 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div>
                                <h2 className="text-xl font-bold text-white">Sync Queue</h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    {queueItems.length} item{queueItems.length !== 1 ? 's' : ''} in queue
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-3 p-6 border-b border-white/10">
                            <div className="bg-orange-500/10 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock size={16} className="text-orange-400" />
                                    <span className="text-xs text-orange-400 uppercase font-bold">Pending</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{pendingCount}</div>
                            </div>
                            <div className="bg-red-500/10 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle size={16} className="text-red-400" />
                                    <span className="text-xs text-red-400 uppercase font-bold">Failed</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{failedCount}</div>
                            </div>
                        </div>

                        {/* Queue Items List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {queueItems.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500/50" />
                                    <p className="font-medium">All caught up!</p>
                                    <p className="text-sm mt-1">No items pending sync</p>
                                </div>
                            ) : (
                                queueItems.map((item) => (
                                    <SyncQueueItemCard
                                        key={item.id}
                                        item={item}
                                        isRetrying={retryingId === item.id}
                                        onRetry={() => handleRetryItem(item.id)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Footer Actions */}
                        {failedCount > 0 && onClearFailed && (
                            <div className="p-6 border-t border-white/10">
                                <button
                                    onClick={onClearFailed}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors font-medium"
                                >
                                    <Trash2 size={16} />
                                    Clear {failedCount} Failed Item{failedCount > 1 ? 's' : ''}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/**
 * Individual Queue Item Card
 */

interface SyncQueueItemCardProps {
    item: SyncQueueItem;
    isRetrying: boolean;
    onRetry: () => void;
}

function SyncQueueItemCard({ item, isRetrying, onRetry }: SyncQueueItemCardProps) {
    const statusConfig = {
        pending: {
            icon: <Clock size={16} />,
            label: 'Queued',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/30',
            text: 'text-orange-400'
        },
        syncing: {
            icon: <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw size={16} /></motion.div>,
            label: 'Syncing',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            text: 'text-blue-400'
        },
        failed: {
            icon: <AlertTriangle size={16} />,
            label: 'Failed',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            text: 'text-red-400'
        },
        conflict: {
            icon: <AlertTriangle size={16} />,
            label: 'Conflict',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/30',
            text: 'text-yellow-400'
        },
        synced: {
            icon: <CheckCircle size={16} />,
            label: 'Synced',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-400'
        }
    };

    const config = statusConfig[item.status];
    const showRetry = item.status === 'failed' && item.retry_count < item.max_retries;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg ${config.bg} border ${config.border}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={config.text}>
                            {config.icon}
                        </div>
                        <span className={`text-xs uppercase font-bold ${config.text}`}>
                            {config.label}
                        </span>
                        {item.retry_count > 0 && (
                            <span className="text-xs text-slate-500">
                                (Retry {item.retry_count}/{item.max_retries})
                            </span>
                        )}
                    </div>
                    
                    <p className="text-sm font-medium text-white mb-1">
                        {item.description}
                    </p>
                    
                    <p className="text-xs text-slate-500">
                        {new Date(item.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>

                    {item.error_message && (
                        <p className="text-xs text-red-400 mt-2 italic">
                            {item.error_message}
                        </p>
                    )}
                </div>

                {showRetry && (
                    <button
                        onClick={onRetry}
                        disabled={isRetrying}
                        className="flex-shrink-0 p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                        title="Retry sync"
                    >
                        <RefreshCw size={16} className={`text-emerald-400 ${isRetrying ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}
