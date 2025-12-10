'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { TradesTable } from '@/components/trades/TradesTable'
import { TradesFilterBar } from '@/components/trades/TradesFilterBar'
import { TradeDialog } from '@/components/trades/TradeDialog'
import { ImportTradesDialog } from '@/components/trades/ImportTradesDialog'
import { useSearchParams } from 'next/navigation'

export default function TradesPage() {
    const [trades, setTrades] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [mode, setMode] = useState<'Live' | 'Backtest' | 'Paper'>('Live')
    const [filters, setFilters] = useState({
        search: '',
        pair: '',
        direction: '',
        status: ''
    })
    const searchParams = useSearchParams()
    const accountId = searchParams.get('accountId')

    useEffect(() => {
        const fetchTrades = async () => {
            setLoading(true)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                let query = supabase
                    .from('trades')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('mode', mode)
                    .order('open_time', { ascending: false })

                if (accountId) {
                    query = query.eq('account_id', accountId)
                }

                const { data } = await query

                if (data) setTrades(data)
            }
            setLoading(false)
        }

        fetchTrades()
    }, [accountId, mode])

    const filteredTrades = trades.filter(trade => {
        const matchesSearch =
            trade.pair.toLowerCase().includes(filters.search.toLowerCase()) ||
            (trade.notes && trade.notes.toLowerCase().includes(filters.search.toLowerCase()))

        const matchesPair = !filters.pair || trade.pair === filters.pair
        const matchesDirection = !filters.direction || trade.direction === filters.direction
        const matchesStatus = !filters.status || trade.status === filters.status

        return matchesSearch && matchesPair && matchesDirection && matchesStatus
    })

    const uniquePairs = Array.from(new Set(trades.map(t => t.pair))).sort()

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div className="flex flex-col gap-2 md:gap-4 md:flex-row md:items-center md:justify-between">
                <div className="text-center md:text-left">
                    <h2 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tight">Trades</h2>
                    <p className="text-zinc-400 mt-1 text-sm sm:text-base">Manage and analyze your trading history</p>
                </div>
                <div className="flex items-center justify-center gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 shrink-0">
                        {['Live', 'Backtest', 'Paper'].map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m as any)}
                                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${mode === m
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                    }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <ImportTradesDialog />
                        <TradeDialog />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col space-y-6 min-h-0">
                <TradesFilterBar
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    pairs={uniquePairs}
                />

                <div className="flex-1 rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                        </div>
                    ) : (
                        <TradesTable trades={filteredTrades} />
                    )}
                </div>
            </div>
        </div>
    )
}
