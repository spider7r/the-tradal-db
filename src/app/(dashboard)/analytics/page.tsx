'use client'

import { useState, useEffect } from 'react'
import { getAnalyticsData } from './actions'
import { EquityCurveChart } from '@/components/analytics/EquityCurveChart'
import { SessionSplitChart } from '@/components/analytics/SessionSplitChart'
import { WinRateByDayChart } from '@/components/analytics/WinRateByDayChart'
import { DirectionalPerformanceChart } from '@/components/analytics/DirectionalPerformanceChart'
import { DurationScatterChart } from '@/components/analytics/DurationScatterChart'
import { TimePerformanceChart } from '@/components/analytics/TimePerformanceChart'
import { PairPerformanceChart } from '@/components/analytics/PairPerformanceChart'
import { StatsWidget } from '@/components/dashboard/StatsWidget'
import {
    Trophy, Wallet, BarChart3, TrendingUp, TrendingDown,
    Activity, Calendar, Clock, ScatterChart as ScatterIcon,
    ArrowUpDown, Target, Timer, Coins, Scale
} from 'lucide-react'

import Link from 'next/link'
import { Lock } from 'lucide-react'

function LockedFeature({ title }: { title: string }) {
    return (
        <div className="relative h-full w-full min-h-[350px] flex flex-col items-center justify-center bg-zinc-900/50 rounded-[2rem] border border-zinc-800 overflow-hidden group">
            {/* Fake Content Background */}
            <div className="absolute inset-0 opacity-20 blur-sm pointer-events-none">
                <div className="h-full w-full bg-gradient-to-br from-zinc-800/10 to-zinc-900/10" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-emerald-500/5" />
            </div>

            <div className="relative z-20 flex flex-col items-center text-center p-6 animate-in fade-in zoom-in duration-500">
                <div className="h-14 w-14 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800 shadow-xl shadow-black/50 group-hover:scale-110 transition-transform duration-300">
                    <Lock className="h-7 w-7 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Detailed Analytics Locked</h3>
                <p className="text-zinc-500 text-sm max-w-[260px] mb-6 leading-relaxed">
                    Upgrade to <span className="text-emerald-400 font-bold">Growth</span> or <span className="text-cyan-400 font-bold">Enterprise</span> to unlock {title.toLowerCase()} insights.
                </p>
                <Link href="/checkout?plan=growth" className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-900/20 transition-all hover:translate-y-[-2px]">
                    Unlock Now
                </Link>
            </div>
        </div>
    )
}

export default function AnalyticsPage() {
    const [mode, setMode] = useState<'Live' | 'Backtest' | 'Combined'>('Live')
    const [data, setData] = useState<{
        equityCurve: any[]
        sessionData: any[]
        dayData: any[]
        directionData: any[]
        advancedStats: any
        trades: any[]
        userPlan?: string
    } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            const res = await getAnalyticsData(mode as any)
            if (res.success && res.data) {
                setData(res.data)
            }
            setIsLoading(false)
        }
        loadData()
    }, [mode])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[600px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
        )
    }

    // Use empty array fallback for charts
    const trades = data?.trades || []
    const stats = data?.advancedStats || {}
    const isFree = data?.userPlan === 'FREE'

    return (
        <div className="pb-10 space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tight">Performance Analytics</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-zinc-400 text-sm sm:text-base">Advanced metrics for <span className="text-emerald-400 font-bold">{mode} Trading</span></p>
                        {isFree && <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">Free Plan</span>}
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    {['Live', 'Backtest', 'Combined'].map((m) => (
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
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatsWidget
                    title="Net P&L"
                    value={`$${(data?.equityCurve[data.equityCurve.length - 1]?.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    iconName="wallet"
                    color="emerald"
                    trend={data?.equityCurve[data.equityCurve.length - 1]?.pnl >= 0 ? "Profit" : "Loss"}
                    trendUp={data?.equityCurve[data.equityCurve.length - 1]?.pnl >= 0}
                />
                <StatsWidget
                    title="Win Rate"
                    value={`${stats.winRate || 0}%`}
                    iconName="trophy"
                    color="blue"
                    trend={`${stats.totalTrades || 0} Trades`}
                    trendUp={true}
                />
                <StatsWidget
                    title="Profit Factor"
                    value={stats.profitFactor?.toFixed(2) || "0.00"}
                    iconName="scale"
                    color="violet"
                    trend="Target > 1.5"
                    trendUp={(stats.profitFactor || 0) > 1.5}
                />
                <StatsWidget
                    title="Expectancy"
                    value={`$${(stats.expectancy || 0).toFixed(2)}`}
                    iconName="target"
                    color="cyan"
                    trend="Per Trade"
                />
            </div>

            {/* Charts Section */}
            <div className="space-y-8">

                {/* Row 1: Equity Curve (Always Available) */}
                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                        <div className="p-2.5 rounded-xl bg-emerald-500/10">
                            <Activity className="h-6 w-6 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wide">Equity Growth</h3>
                    </div>
                    <div className="p-6 h-[400px]">
                        <EquityCurveChart data={data?.equityCurve || []} />
                    </div>
                </div>

                {/* Row 2: Sessions & Win Rate */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Session Split (LOCKED) */}
                    {isFree ? (
                        <LockedFeature title="Session Performance" />
                    ) : (
                        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                <div className="p-2.5 rounded-xl bg-blue-500/10">
                                    <Calendar className="h-6 w-6 text-blue-500" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-wide">Session Performance</h3>
                            </div>
                            <div className="p-6 h-[350px]">
                                <SessionSplitChart data={data?.sessionData || []} />
                            </div>
                        </div>
                    )}

                    {/* Daily Win Rate (LOCKED) */}
                    {isFree ? (
                        <LockedFeature title="Daily Win Rate" />
                    ) : (
                        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                                <div className="p-2.5 rounded-xl bg-orange-500/10">
                                    <Activity className="h-6 w-6 text-orange-500" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-wide">Win Rate by Day</h3>
                            </div>
                            <div className="p-6 h-[350px]">
                                <WinRateByDayChart data={data?.dayData || []} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Row 3: Hourly & Duration (New) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Hourly (LOCKED) */}
                    {isFree ? (
                        <LockedFeature title="Hourly Performance" />
                    ) : (
                        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
                                <div className="p-2.5 rounded-xl bg-violet-500/10">
                                    <Clock className="h-6 w-6 text-violet-500" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-wide">Hourly Performance</h3>
                            </div>
                            <div className="p-6 h-[350px]">
                                <TimePerformanceChart trades={trades} />
                            </div>
                        </div>
                    )}

                    {/* Duration (LOCKED) */}
                    {isFree ? (
                        <LockedFeature title="Trade Duration" />
                    ) : (
                        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-pink-500" />
                                <div className="p-2.5 rounded-xl bg-pink-500/10">
                                    <Timer className="h-6 w-6 text-pink-500" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-wide">Trade Duration vs P&L</h3>
                            </div>
                            <div className="p-6 h-[350px]">
                                <DurationScatterChart trades={trades} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Row 4: Direction & Pairs */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Direction (LOCKED) */}
                    {isFree ? (
                        <div className="lg:col-span-1 h-full">
                            <LockedFeature title="Directional Stats" />
                        </div>
                    ) : (
                        <div className="lg:col-span-1 rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                                <div className="p-2.5 rounded-xl bg-indigo-500/10">
                                    <ArrowUpDown className="h-6 w-6 text-indigo-500" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-wide">Long vs Short</h3>
                            </div>
                            <div className="p-6">
                                <DirectionalPerformanceChart data={data?.directionData || []} />
                            </div>
                        </div>
                    )}

                    {/* Pair Performance (Enhanced Basic or Full) */}
                    {/* We let Free users see basic pair performance, but maybe simplified? For now, allowing it as "Basic Analytics" */}
                    <div className="lg:col-span-2 rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
                            <div className="p-2.5 rounded-xl bg-cyan-500/10">
                                <BarChart3 className="h-6 w-6 text-cyan-500" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-wide">Pair Performance</h3>
                        </div>
                        <div className="p-6 h-[350px]">
                            <PairPerformanceChart trades={trades} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Deep Dive Stats */}
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <div className="p-2.5 rounded-xl bg-emerald-500/10">
                        <Target className="h-6 w-6 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wide">Detailed Statistics</h3>
                </div>

                <div className="p-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Avg Win</p>
                        <p className="text-2xl font-black text-emerald-400">${stats.avgWin?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Avg Loss</p>
                        <p className="text-2xl font-black text-red-400">${stats.avgLoss?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Avg R:R</p>
                        <p className="text-2xl font-black text-white">1:{stats.avgRR?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Max Drawdown</p>
                        <p className="text-2xl font-black text-red-500">${stats.maxDrawdown?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Max Cons. Wins</p>
                        <p className="text-2xl font-black text-emerald-400">{stats.maxConsecutiveWins || 0}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Max Cons. Losses</p>
                        <p className="text-2xl font-black text-red-400">{stats.maxConsecutiveLosses || 0}</p>
                    </div>
                    {/* New Stats for "Highly Accurate" feel */}
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Fees</p>
                        <p className="text-2xl font-black text-zinc-300">$0.00</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Breakeven Trades</p>
                        <p className="text-2xl font-black text-zinc-300">0</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
