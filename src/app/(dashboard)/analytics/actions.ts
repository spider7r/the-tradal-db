'use server'

import { createClient } from '@/utils/supabase/server'

export async function getAnalyticsData(mode: 'Live' | 'Backtest' | 'Paper' = 'Live') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    // Fetch all trades
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .order('open_time', { ascending: true })

    if (error) {
        console.error('Error fetching analytics data:', error)
        return { success: false, error: error.message }
    }

    // Process Equity Curve Data
    let cumulativePnl = 0
    const equityCurve = trades.map(trade => {
        cumulativePnl += trade.pnl || 0
        return {
            date: new Date(trade.open_time).toLocaleDateString(),
            pnl: cumulativePnl,
            tradePnl: trade.pnl
        }
    })

    // Process Session Data
    const sessions = {
        'London': { wins: 0, total: 0, pnl: 0 },
        'New York': { wins: 0, total: 0, pnl: 0 },
        'Asian': { wins: 0, total: 0, pnl: 0 },
        'Other': { wins: 0, total: 0, pnl: 0 }
    }

    // Process Day of Week Data
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayStats = daysOfWeek.map(day => ({ name: day, wins: 0, total: 0, pnl: 0 }))

    // Process Direction Data
    const directionStats = {
        'Long': { wins: 0, total: 0, pnl: 0 },
        'Short': { wins: 0, total: 0, pnl: 0 }
    }

    let maxDrawdown = 0
    let currentDrawdown = 0
    let peakEquity = 0
    let totalWins = 0
    let totalLosses = 0
    let grossProfit = 0
    let grossLoss = 0
    let currentConsecutiveWins = 0
    let maxConsecutiveWins = 0
    let currentConsecutiveLosses = 0
    let maxConsecutiveLosses = 0
    let totalRR = 0

    trades.forEach(trade => {
        const pnl = trade.pnl || 0
        const rr = trade.rr || 0

        // Session
        const session = trade.session || 'Other'
        if (sessions[session as keyof typeof sessions]) {
            sessions[session as keyof typeof sessions].total++
            sessions[session as keyof typeof sessions].pnl += pnl
            if (pnl > 0) sessions[session as keyof typeof sessions].wins++
        } else {
            sessions['Other'].total++
            sessions['Other'].pnl += pnl
            if (pnl > 0) sessions['Other'].wins++
        }

        // Day of Week
        const date = new Date(trade.open_time)
        const dayIndex = date.getDay()
        dayStats[dayIndex].total++
        dayStats[dayIndex].pnl += pnl
        if (pnl > 0) dayStats[dayIndex].wins++

        // Direction
        const direction = trade.direction === 'Long' ? 'Long' : 'Short'
        if (direction) {
            directionStats[direction].total++
            directionStats[direction].pnl += pnl
            if (pnl > 0) directionStats[direction].wins++
        }

        // Advanced Stats
        if (pnl > 0) {
            totalWins++
            grossProfit += pnl
            currentConsecutiveWins++
            currentConsecutiveLosses = 0
            if (currentConsecutiveWins > maxConsecutiveWins) maxConsecutiveWins = currentConsecutiveWins
        } else if (pnl < 0) {
            totalLosses++
            grossLoss += Math.abs(pnl)
            currentConsecutiveLosses++
            currentConsecutiveWins = 0
            if (currentConsecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentConsecutiveLosses
        }

        totalRR += rr
    })

    // Re-calculate drawdown properly using the equity curve
    let runningPnl = 0
    equityCurve.forEach(point => {
        runningPnl = point.pnl
        if (runningPnl > peakEquity) {
            peakEquity = runningPnl
            currentDrawdown = 0
        } else {
            currentDrawdown = peakEquity - runningPnl
            if (currentDrawdown > maxDrawdown) {
                maxDrawdown = currentDrawdown
            }
        }
    })

    const sessionData = Object.entries(sessions).map(([name, stats]) => ({
        name,
        winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
        pnl: stats.pnl,
        trades: stats.total
    })).filter(s => s.trades > 0)

    const dayData = dayStats.map(stat => ({
        name: stat.name,
        winRate: stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0,
        pnl: stat.pnl,
        trades: stat.total
    })).filter(s => s.trades > 0)

    const directionData = Object.entries(directionStats).map(([name, stats]) => ({
        name,
        winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
        pnl: stats.pnl,
        trades: stats.total
    })).filter(s => s.trades > 0)

    const winRate = trades.length > 0 ? totalWins / trades.length : 0
    const avgWin = totalWins > 0 ? grossProfit / totalWins : 0
    const avgLoss = totalLosses > 0 ? grossLoss / totalLosses : 0
    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.99 : 0

    // Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
    const lossRate = 1 - winRate
    const expectancy = (winRate * avgWin) - (lossRate * avgLoss)

    const advancedStats = {
        maxDrawdown,
        profitFactor,
        winRate: Math.round(winRate * 100),
        totalTrades: trades.length,
        avgWin: Math.round(avgWin),
        avgLoss: Math.round(avgLoss),
        expectancy: Math.round(expectancy),
        maxConsecutiveWins,
        maxConsecutiveLosses,
        avgRR: trades.length > 0 ? Number((totalRR / trades.length).toFixed(2)) : 0
    }

    return {
        success: true,
        data: {
            equityCurve,
            sessionData,
            dayData,
            directionData,
            advancedStats,
            trades
        }
    }
}
