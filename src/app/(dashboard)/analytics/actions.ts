'use server'

import { createClient } from '@/utils/supabase/server'

export async function getAnalyticsData(mode: 'Live' | 'Backtest' | 'Combined' | 'Paper' = 'Live') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    let allTrades: any[] = []

    // 1. Fetch from 'trades' table (Manual Logs + Live)
    let tradesQuery = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('open_time', { ascending: true })

    // Filter 'trades' based on mode
    if (mode === 'Live') {
        tradesQuery = tradesQuery.eq('mode', 'Live')
    } else if (mode === 'Backtest') {
        tradesQuery = tradesQuery.eq('mode', 'Backtest')
    } else if (mode === 'Paper') {
        tradesQuery = tradesQuery.eq('mode', 'Paper')
    }
    // If 'Combined', assume we want everything relevant? Or maybe just Live + Backtest?
    // Usually 'Combined' means everything.

    const { data: manualTrades, error: manualError } = await tradesQuery

    if (manualError) {
        console.error('Error fetching manual trades:', manualError)
        return { success: false, error: manualError.message }
    }

    // Normalize Manual Trades
    const normalizedManualTrades = (manualTrades || []).map(t => ({
        ...t,
        source: 'Manual',
        type: t.mode // Live, Backtest, Paper
    }))
    allTrades = [...normalizedManualTrades]

    // 2. Fetch from 'backtest_trades' table (Engine)
    // Only if mode is 'Backtest' or 'Combined'
    if (mode === 'Backtest' || mode === 'Combined') {
        const { data: engineTrades, error: engineError } = await supabase
            .from('backtest_trades')
            .select('*')
            //.eq('user_id', user.id) // backtest_trades should have user_id via session relation... wait, let's check schema/rls.
            // Actually backtest_trades links to backtest_sessions.
            // We need to join sessions to filter by user_id?
            // Or maybe RLS handles it? RLS usually requires user_id on the table or a join.
            // Assuming we added RLS on backtest_trades or it inherits.
            // Let's assume for now we need to filter by session -> user_id.
            .select(`
                *,
                backtest_sessions!inner(user_id)
            `)
            .eq('backtest_sessions.user_id', user.id)
            .order('entry_date', { ascending: true })

        if (engineError) {
            console.error('Error fetching engine trades:', engineError)
            return { success: false, error: engineError.message }
        }

        // Normalize Engine Trades to match 'trades' schema
        const normalizedEngineTrades = (engineTrades || []).map(t => ({
            id: t.id,
            pair: t.pair || t.symbol, // Handle variance
            direction: t.direction === 'LONG' ? 'Long' : t.direction === 'SHORT' ? 'Short' : t.direction,
            pnl: t.pnl,
            rr: 0, // Engine doesn't store RR explicitly yet, maybe calculate?
            open_time: t.entry_date,
            close_time: t.exit_date,
            session: 'Backtest', // Default session for engine trades
            mode: 'Backtest',
            source: 'Engine',
            type: 'Backtest'
        }))

        allTrades = [...allTrades, ...normalizedEngineTrades]
    }

    // Sort all trades by date
    allTrades.sort((a, b) => new Date(a.open_time).getTime() - new Date(b.open_time).getTime())

    // Filter for specific mode if it was 'Combined' (already handled by fetch logic, but strictly speaking)
    // If mode was 'Live', we only fetched Manual-Live.
    // If mode was 'Backtest', we fetched Manual-Backtest + Engine.
    // If mode was 'Combined', we fetched All Manual + Engine.

    const trades = allTrades

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
        'Other': { wins: 0, total: 0, pnl: 0 },
        'Backtest': { wins: 0, total: 0, pnl: 0 } // Add Backtest "session"
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
    let countRR = 0

    trades.forEach(trade => {
        const pnl = trade.pnl || 0
        const rr = trade.rr || 0

        // Session
        let session = trade.session || 'Other'
        // Normalize session names
        if (session.toLowerCase().includes('london')) session = 'London'
        else if (session.toLowerCase().includes('new york')) session = 'New York'
        else if (session.toLowerCase().includes('asian')) session = 'Asian'
        else if (trade.source === 'Engine') session = 'Backtest'

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
        const direction = trade.direction === 'Long' || trade.direction === 'LONG' ? 'Long' : 'Short'
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

        if (rr > 0) {
            totalRR += rr
            countRR++
        }
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
        avgRR: countRR > 0 ? Number((totalRR / countRR).toFixed(2)) : 0
    }

    // [STRICT LIMITS] Enforce Data Gating based on Plan
    // Fetch plan from users table
    const { data: userData } = await supabase
        .from('users')
        .select('plan_tier')
        .eq('id', user.id)
        .single()

    // Default to FREE if unknown
    const plan = userData?.plan_tier || 'FREE'

    // Define restrictions
    const isFree = plan === 'FREE'

    // Free Users: Restricted from "Deep" Analytics (Hourly, Session, Duration, etc.)
    // They get: Equity Curve, Pair Performance (Basic), Win Rate
    const restrictedSessionData = isFree ? [] : sessionData
    const restrictedDayData = isFree ? [] : dayData
    const restrictedDirectionData = isFree ? [] : directionData

    return {
        success: true,
        data: {
            equityCurve,
            sessionData: restrictedSessionData,
            dayData: restrictedDayData,
            directionData: restrictedDirectionData,
            advancedStats,
            trades,
            userPlan: plan
        }
    }
}
