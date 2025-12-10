'use client'

import { useState, useEffect } from 'react'
import { Plus, Target, Clock, Globe, BookOpen, Trash2, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStrategies, deleteStrategy } from './actions'
import { cn } from '@/lib/utils'
import { CreateStrategyModal } from '@/components/strategies/CreateStrategyModal'
import Link from 'next/link'

export default function StrategiesPage() {
    const [strategies, setStrategies] = useState<any[]>([])
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadStrategies()
    }, [])

    const loadStrategies = async () => {
        const res = await getStrategies()
        if (res.success) {
            setStrategies(res.data || [])
        }
        setIsLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this strategy?')) {
            const res = await deleteStrategy(id)
            if (res.success) {
                loadStrategies()
            }
        }
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tight">Trading Strategies</h1>
                    <p className="text-zinc-400 mt-1 text-sm sm:text-base">Define your edge. Track your rules. Master your craft.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg sm:rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 text-sm sm:text-base w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>New Strategy</span>
                </button>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                </div>
            ) : strategies.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="h-8 w-8 text-zinc-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Strategies Yet</h3>
                    <p className="text-zinc-500 max-w-md mx-auto mb-6">Create your first strategy to start tracking your performance by setup.</p>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                        Create Strategy &rarr;
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {strategies.map((strategy) => {
                        // Handle both legacy array rules and new object rules
                        const ruleCount = Array.isArray(strategy.rules)
                            ? strategy.rules.length
                            : strategy.rules?.checklist?.length || 0

                        return (
                            <motion.div
                                key={strategy.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-emerald-500/5"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 group-hover:border-emerald-500/30 transition-colors">
                                        <Target className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    <button
                                        onClick={() => handleDelete(strategy.id)}
                                        className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{strategy.name}</h3>
                                <p className="text-zinc-400 text-sm line-clamp-2 mb-6 h-10">{strategy.description || "No description provided."}</p>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/50">
                                        <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">Win Rate</div>
                                        <div className="text-lg font-black text-white">
                                            {strategy.stats?.winRate || 0}%
                                        </div>
                                    </div>
                                    <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/50">
                                        <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">Net P&L</div>
                                        <div className={cn(
                                            "text-lg font-black",
                                            (strategy.stats?.netPnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                                        )}>
                                            ${(strategy.stats?.netPnl || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                                        <Clock className="h-4 w-4" />
                                        <span>{strategy.timeframes?.length ? strategy.timeframes.join(', ') : 'All Timeframes'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                                        <Globe className="h-4 w-4" />
                                        <span>{strategy.sessions?.length ? strategy.sessions.join(', ') : 'All Sessions'}</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Rules</span>
                                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300 font-mono">{ruleCount}</span>
                                    </div>
                                    <Link href={`/strategies/${strategy.id}`} className="text-sm font-bold text-zinc-400 group-hover:text-white flex items-center gap-1 transition-colors">
                                        Details <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <CreateStrategyModal onClose={() => setIsCreateOpen(false)} onSuccess={loadStrategies} />
                )}
            </AnimatePresence>
        </div>
    )
}
