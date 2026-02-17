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
import { DashboardCard } from '@/components/dashboard/DashboardCard'

import { AccountOverview } from '@/components/dashboard/AccountOverview'
import { AchievementManager } from '@/components/dashboard/AchievementManager'
import { EmptyDashboard } from '@/components/dashboard/EmptyDashboard'
import { GuardianWidget } from '@/components/dashboard/GuardianWidget'
import { InnerCircleCard } from '@/components/dashboard/InnerCircleCard'


export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    // GUEST MODE FALLBACK (matches layout.tsx)
    const user = authUser || {
        id: 'guest-user-id',
        email: 'guest@tradal.com',
        user_metadata: { full_name: 'Guest Trader' }
    }

    if (!authUser) {
        return <EmptyDashboard />
    }

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

    // Fetch full user profile for plan_tier
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GuardianWidget user={user} />
                {profile?.plan_tier === 'ENTERPRISE' && <InnerCircleCard plan={profile.plan_tier} />}
            </div>

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
                    iconName="wallet"
                    color="emerald"
                    trend={`${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)} P&L`}
                    trendUp={totalPnL >= 0}
                />
                <StatsWidget
                    title="Winrate"
                    value={`${winrate}%`}
                    iconName="trophy"
                    color="blue"
                    trend={`${winrateTrend >= 0 ? '+' : ''}${winrateTrend.toFixed(1)}%`}
                    trendUp={winrateTrend >= 0}
                />
                <StatsWidget
                    title="Total Trades"
                    value={totalTrades}
                    iconName="bar-chart"
                    color="violet"
                />
                <StatsWidget
                    title="Avg R:R"
                    value={avgRR}
                    iconName="trending-up"
                    color="cyan"
                />
            </div>

            {/* Middle Row: Equity Curve (2/3) & Winrate (1/3) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <DashboardCard
                    title="Equity Curve"
                    iconName="activity"
                    color="emerald"
                    className="lg:col-span-2"
                    minHeight="h-[350px]"
                >
                    <EquityCurveChart trades={trades || []} initialBalance={initialBalance > 0 ? initialBalance : 100000} createdAt={account?.created_at} />
                </DashboardCard>

                <DashboardCard
                    title="Long vs Short P&L"
                    iconName="arrow-up-down"
                    color="blue"
                    minHeight="min-h-[250px] flex items-center justify-center"
                >
                    <ProfitDistributionChart trades={trades || []} />
                </DashboardCard>
            </div>

            {/* Analytics Row 1: Hourly & Duration */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <DashboardCard title="Hourly Performance" iconName="clock" color="orange" minHeight="h-[350px]">
                    <TimePerformanceChart trades={trades || []} />
                </DashboardCard>
                <DashboardCard title="Duration vs P&L" iconName="scatter" color="pink" minHeight="h-[350px]">
                    <DurationScatterChart trades={trades || []} />
                </DashboardCard>
            </div>

            {/* Analytics Row 2: Pair Performance & Heatmap */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <DashboardCard title="Pair Performance" iconName="bar-chart" color="indigo" minHeight="h-[350px]">
                    <PairPerformanceChart trades={trades || []} />
                </DashboardCard>
                <DashboardCard
                    title="Consistency Heatmap"
                    iconName="calendar"
                    color="violet"
                    className="lg:col-span-2"
                    minHeight="min-h-0"
                >
                    <CalendarHeatmap trades={trades || []} />
                </DashboardCard>
            </div>

            {/* Recent Trades */}
            <DashboardCard
                title="Recent Trades"
                iconName="activity"
                color="emerald"
                minHeight="min-h-0"
                headerAction={
                    <button className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold tracking-wide transition-colors">
                        View All →
                    </button>
                }
            >
                <TradesTable trades={(trades || []).slice(0, 10)} />
            </DashboardCard>
        </div>
    )
}
