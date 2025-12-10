import { createClient } from '@/utils/supabase/server'
import { TradeDialog } from '@/components/trades/TradeDialog'
import { TradesTable } from '@/components/trades/TradesTable'
import { StatsWidget } from '@/components/dashboard/StatsWidget'
import { EquityCurveChart } from '@/components/dashboard/EquityCurveChart'
import { WinrateChart } from '@/components/dashboard/WinrateChart'
import { CalendarHeatmap } from '@/components/dashboard/CalendarHeatmap'
import { DurationScatterChart } from '@/components/analytics/DurationScatterChart'
import { TimePerformanceChart } from '@/components/analytics/TimePerformanceChart'
import { PairPerformanceChart } from '@/components/analytics/PairPerformanceChart'
import { ProfitDistributionChart } from '@/components/analytics/ProfitDistributionChart'
import { Trophy, Wallet, BarChart3, TrendingUp, Activity, Calendar, Clock, ScatterChart as ScatterIcon, ArrowUpDown } from 'lucide-react'

import { AccountOverview } from '@/components/dashboard/AccountOverview'
import { AchievementManager } from '@/components/dashboard/AchievementManager'
import { EmptyDashboard } from '@/components/dashboard/EmptyDashboard'


export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch Achievements
    const { data: achievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)

    const params = await searchParams
    // Get selected account ID from URL or default to first
    let accountId = params?.accountId as string
    let account = null

    if (!accountId) {
        const { data: accounts } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1)

        if (accounts && accounts.length > 0) {
            account = accounts[0]
            accountId = account.id
        }
    } else {
        const { data: acc } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', accountId)
            .single()
        account = acc
    }

    if (!accountId || !account) {
        // If specific account not found, try to fallback to first account again
        if (!account) {
            const { data: accounts } = await supabase
                .from('accounts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })
                .limit(1)

            if (accounts && accounts.length > 0) {
                account = accounts[0]
                accountId = account.id
            }
        }

        // If still no account, show empty dashboard
        if (!account) {
            return <EmptyDashboard />
        }
    }

    const { data: realTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .order('open_time', { ascending: false })
        .limit(500)

    const trades = realTrades || []

    console.log('Dashboard Debug:', {
        tradesLength: trades?.length,
        initialBalance: account?.initial_balance,
        firstTrade: trades?.[0]
    })

    // Calculate basic stats
    const totalTrades = trades?.length || 0
    const winningTrades = trades?.filter((t) => (t.pnl || 0) > 0).length || 0
    const winrate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0
    const totalPnL = trades?.reduce((sum, t) => sum + (t.pnl || 0), 0) || 0

    // Calculate Current Balance
    const initialBalance = account?.initial_balance || 0
    const currentBalance = initialBalance + totalPnL

    // Calculate Avg R:R
    const tradesWithRR = trades?.filter(t => t.rr) || []
    const avgRRVal = tradesWithRR.length > 0
        ? tradesWithRR.reduce((sum, t) => sum + (t.rr || 0), 0) / tradesWithRR.length
        : 0
    const avgRR = avgRRVal > 0 ? `1:${avgRRVal.toFixed(1)}` : "0:0"

    // Calculate Trends (Simple comparison with previous 30 days vs current 30 days)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30))
    const sixtyDaysAgo = new Date(now.setDate(now.getDate() - 30))

    const currentPeriodTrades = trades?.filter(t => new Date(t.open_time) >= thirtyDaysAgo) || []
    const prevPeriodTrades = trades?.filter(t => {
        const date = new Date(t.open_time)
        return date >= sixtyDaysAgo && date < thirtyDaysAgo
    }) || []

    const currentWinrate = currentPeriodTrades.length > 0
        ? (currentPeriodTrades.filter(t => (t.pnl || 0) > 0).length / currentPeriodTrades.length) * 100
        : 0
    const prevWinrate = prevPeriodTrades.length > 0
        ? (prevPeriodTrades.filter(t => (t.pnl || 0) > 0).length / prevPeriodTrades.length) * 100
        : 0
    const winrateTrend = currentWinrate - prevWinrate

    const currentPnL = currentPeriodTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const prevPnL = prevPeriodTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const pnlTrend = prevPnL !== 0 ? ((currentPnL - prevPnL) / Math.abs(prevPnL)) * 100 : 0

    // Calculate Daily PnL for Drawdown Tracking
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const dailyTrades = trades?.filter(t => new Date(t.open_time) >= startOfToday) || []
    const dailyPnL = dailyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)

    // Calculate Daily Peak Balance (for Daily Trailing Drawdown)
    // 1. Start with balance at beginning of day
    const dailyStartBalance = currentBalance - dailyPnL
    let dailyPeakBalance = dailyStartBalance
    let runningDailyBalance = dailyStartBalance

    // 2. Sort today's trades by close_time (or open_time if close_time missing) ascending to simulate progression
    // We use open_time here as a proxy for sequence if close_time isn't strictly ordered or available, 
    // but ideally it should be close_time for realized PnL. 
    // Assuming trades are closed, we use open_time for simplicity as per current schema usage, 
    // but we must reverse the 'desc' list we have.
    const sortedDailyTrades = [...dailyTrades].sort((a, b) =>
        new Date(a.open_time).getTime() - new Date(b.open_time).getTime()
    )

    // 3. Simulate balance changes
    sortedDailyTrades.forEach(trade => {
        runningDailyBalance += (trade.pnl || 0)
        if (runningDailyBalance > dailyPeakBalance) {
            dailyPeakBalance = runningDailyBalance
        }
    })

    return (

        <div className="space-y-10 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tight">Dashboard</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-zinc-400 text-sm sm:text-base">Overview for <span className="text-emerald-400 font-bold">{account?.name}</span></p>
                    </div>
                </div>
                <TradeDialog accountId={accountId} />
            </div>

            {/* Account Overview & Achievements */}
            <AccountOverview
                account={account}
                currentBalance={currentBalance}
                totalPnL={totalPnL}
                dailyPnL={dailyPnL}
                dailyPeakBalance={dailyPeakBalance}
            />

            <AchievementManager
                account={account}
                currentBalance={currentBalance}
                dailyPnL={dailyPnL}
                achievements={achievements || []}
                dailyPeakBalance={dailyPeakBalance}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatsWidget
                    title="Current Balance"
                    value={`$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={Wallet}
                    color="emerald"
                    trend={`${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)} P&L`}
                    trendUp={totalPnL >= 0}
                />
                <StatsWidget
                    title="Winrate"
                    value={`${winrate}%`}
                    icon={Trophy}
                    color="blue"
                    trend={`${winrateTrend >= 0 ? '+' : ''}${winrateTrend.toFixed(1)}%`}
                    trendUp={winrateTrend >= 0}
                />
                <StatsWidget
                    title="Total Trades"
                    value={totalTrades}
                    icon={BarChart3}
                    color="violet"
                />
                <StatsWidget
                    title="Avg R:R"
                    value={avgRR}
                    icon={TrendingUp}
                    color="cyan"
                />
            </div>

            {/* Middle Row: Equity Curve (2/3) & Winrate (1/3) */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                        <div className="p-2.5 rounded-xl bg-emerald-500/10">
                            <Activity className="h-6 w-6 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wide">Equity Curve</h3>
                    </div>
                    <div className="p-6 h-[350px]">
                        <EquityCurveChart trades={trades || []} initialBalance={initialBalance > 0 ? initialBalance : 100000} createdAt={account?.created_at} />
                    </div>
                </div>

                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <div className="p-2.5 rounded-xl bg-blue-500/10">
                            <ArrowUpDown className="h-6 w-6 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wide">Long vs Short P&L</h3>
                    </div>
                    <div className="flex-1 min-h-[250px] flex items-center justify-center p-6">
                        <ProfitDistributionChart trades={trades || []} />
                    </div>
                </div>
            </div>

            {/* Analytics Row 1: Hourly & Duration */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                        <div className="p-2.5 rounded-xl bg-orange-500/10">
                            <Clock className="h-6 w-6 text-orange-500" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wide">Hourly Performance</h3>
                    </div>
                    <div className="p-6 h-[350px]">
                        <TimePerformanceChart trades={trades || []} />
                    </div>
                </div>
                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-pink-500" />
                        <div className="p-2.5 rounded-xl bg-pink-500/10">
                            <ScatterIcon className="h-6 w-6 text-pink-500" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wide">Duration vs P&L</h3>
                    </div>
                    <div className="p-6 h-[350px]">
                        <DurationScatterChart trades={trades || []} />
                    </div>
                </div>
            </div>

            {/* Analytics Row 2: Pair Performance & Heatmap */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1 rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                        <div className="p-2.5 rounded-xl bg-indigo-500/10">
                            <BarChart3 className="h-6 w-6 text-indigo-500" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wide">Pair Performance</h3>
                    </div>
                    <div className="p-6 h-[350px]">
                        <PairPerformanceChart trades={trades || []} />
                    </div>
                </div>
                <div className="lg:col-span-2 rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
                        <div className="p-2.5 rounded-xl bg-violet-500/10">
                            <Calendar className="h-6 w-6 text-violet-500" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-wide">Consistency Heatmap</h3>
                    </div>
                    <div className="p-6">
                        <CalendarHeatmap trades={trades || []} />
                    </div>
                </div>
            </div>

            {/* Recent Trades */}
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-zinc-700 transition-colors duration-300">
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <h3 className="text-xl font-black text-white uppercase tracking-wide">Recent Trades</h3>
                    <button className="text-sm text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider transition-colors">
                        View All
                    </button>
                </div>
                <div className="p-6">
                    <TradesTable trades={(trades || []).slice(0, 10)} />
                </div>
            </div>
        </div>
    )
}
