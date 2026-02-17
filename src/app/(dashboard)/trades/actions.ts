'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function getTrades(mode: 'Live' | 'Backtest' | 'Paper' = 'Live') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .order('open_time', { ascending: false })

    if (error) {
        console.error('Error fetching trades:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: trades }
}

async function checkTradeLimit(supabase: any, userId: string) {
    // 1. Get User Plan
    const { data: user } = await supabase
        .from('users')
        .select('plan_tier')
        .eq('id', userId)
        .single()

    // Default to FREE if no plan found (safe default)
    const plan = user?.plan_tier || 'FREE'

    // 2. Check Limits
    if (plan === 'FREE') {
        const { count, error } = await supabase
            .from('trades')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        if (error) {
            console.error('Error checking trade limit:', error)
            return // Allow if we can't check
        }

        if (count && count >= 50) {
            throw new Error('Free plan limit reached (50 trades). Please upgrade to log more trades.')
        }
    }
}

export async function createTrade(formData: FormData) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get Account ID from form
    let accountId = formData.get('account_id') as string

    // Fallback: Get the first account if not provided (legacy support)
    if (!accountId) {
        const { data: accounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
        accountId = accounts?.[0]?.id
    }

    if (!accountId) {
        throw new Error('No trading account found. Please create one first.')
    }

    const safeParseFloat = (value: FormDataEntryValue | null) => {
        if (!value) return null
        const parsed = parseFloat(value as string)
        return isNaN(parsed) ? null : parsed
    }

    const pair = formData.get('pair') as string
    const direction = formData.get('direction') as string
    const entryPrice = safeParseFloat(formData.get('entry_price'))
    const exitPrice = safeParseFloat(formData.get('exit_price'))
    const stopLoss = safeParseFloat(formData.get('stop_loss'))
    const takeProfit = safeParseFloat(formData.get('take_profit'))
    const rr = safeParseFloat(formData.get('rr'))
    const size = safeParseFloat(formData.get('size'))
    const notes = formData.get('notes') as string
    const status = formData.get('status') as string
    const closingReason = formData.get('closing_reason') as string
    const strategyId = formData.get('strategy_id') as string
    const mode = formData.get('mode') as string || 'Live'

    // Validate mandatory fields
    if (entryPrice === null || size === null) {
        return { error: 'Entry Price and Size are required' }
    }

    // Check Account Status (Drawdown Breaches)
    const accountStatus = await checkAccountStatus(supabase, accountId)
    if (accountStatus.status === 'FAILED') {
        return { error: `Trade blocked: ${accountStatus.reason}` }
    }

    // Check Plan Limits (Free Plan = 50 Trades)
    try {
        await checkTradeLimit(supabase, user.id)
    } catch (e: any) {
        return { error: e.message }
    }

    // Calculate P&L if closed
    let pnl = null
    let outcome = null
    if (status === 'CLOSED' && exitPrice !== null) {
        const multiplier = direction === 'LONG' ? 1 : -1
        // Simplified P&L calculation: (Exit - Entry) * Size * 100000 (standard lot) - roughly
        pnl = (exitPrice - entryPrice) * multiplier * size * 100000
        outcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE'
    }

    const { error } = await supabase.from('trades').insert({
        user_id: user.id,
        account_id: accountId,
        strategy_id: strategyId || null,
        pair,
        direction,
        entry_price: entryPrice,
        exit_price: exitPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        rr,
        size,
        pnl,
        outcome,
        notes,
        status,
        closing_reason: closingReason || null,
        mode,
        open_time: new Date().toISOString(),
    })

    if (error) {
        console.error('Error creating trade:', error)
        return { error: error.message || 'Failed to create trade' }
    }

    // Update HWM if trade was created as CLOSED
    if (status === 'CLOSED') {
        await updateHighWaterMark(supabase, user.id, undefined, accountId)
    }

    revalidatePath('/')
    revalidatePath('/trades')
    return { success: true }
}

export async function closeTrade(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const tradeId = formData.get('trade_id') as string
    const exitPrice = parseFloat(formData.get('exit_price') as string)
    const pnl = parseFloat(formData.get('pnl') as string)
    const closingReason = formData.get('closing_reason') as string

    if (!tradeId || isNaN(exitPrice) || isNaN(pnl)) {
        return { error: 'Invalid trade data' }
    }

    const { error } = await supabase
        .from('trades')
        .update({
            status: 'CLOSED',
            exit_price: exitPrice,
            pnl: pnl,
            closing_reason: closingReason,
            close_time: new Date().toISOString()
        })
        .eq('id', tradeId)
        .eq('user_id', user.id)

    if (error) {
        console.error('Error closing trade:', error)
        return { error: 'Failed to close trade' }
    }

    // Update High Water Mark
    await updateHighWaterMark(supabase, user.id, tradeId)

    revalidatePath('/')
    revalidatePath('/trades')
    return { success: true }
}

async function checkAccountStatus(supabase: any, accountId: string) {
    // 1. Fetch Account Details
    const { data: account } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single()

    if (!account) return { status: 'ACTIVE' }

    // 2. Fetch All Trades for Calculations
    const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('account_id', accountId)
        .order('open_time', { ascending: true })

    const initialBalance = Number(account.initial_balance) || 0
    const currentBalance = Number(account.current_balance)

    // Recalculate current balance from trades to be safe/consistent
    const totalPnL = trades?.reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0) || 0
    const calculatedCurrentBalance = initialBalance + totalPnL

    // 3. Check Max Drawdown
    const maxDrawdownLimit = Math.abs(Number(account.max_drawdown_limit))
    const maxDrawdownType = account.max_drawdown_type || 'STATIC'
    const highWaterMark = Math.max(Number(account.high_water_mark) || 0, initialBalance, calculatedCurrentBalance)

    if (maxDrawdownLimit > 0) {
        if (maxDrawdownType === 'TRAILING') {
            if (calculatedCurrentBalance <= (highWaterMark - maxDrawdownLimit)) {
                return { status: 'FAILED', reason: 'Max Trailing Drawdown Breached' }
            }
        } else {
            if (calculatedCurrentBalance <= (initialBalance - maxDrawdownLimit)) {
                return { status: 'FAILED', reason: 'Max Static Drawdown Breached' }
            }
        }
    }

    // 4. Check Daily Drawdown
    const dailyDrawdownLimit = Math.abs(Number(account.daily_drawdown_limit))

    if (dailyDrawdownLimit > 0) {
        const today = new Date()
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

        // Filter trades for today
        const dailyTrades = trades?.filter((t: any) => new Date(t.open_time) >= startOfToday) || []
        const dailyPnL = dailyTrades.reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0)

        const dailyDrawdownType = account.daily_drawdown_type || 'STATIC'
        const startOfDayBalance = calculatedCurrentBalance - dailyPnL

        if (dailyDrawdownType === 'TRAILING') {
            // Simulate Daily Peak
            let dailyPeakBalance = startOfDayBalance
            let runningDailyBalance = startOfDayBalance

            // Trades are already sorted ascending by open_time
            dailyTrades.forEach((trade: any) => {
                runningDailyBalance += (Number(trade.pnl) || 0)
                if (runningDailyBalance > dailyPeakBalance) {
                    dailyPeakBalance = runningDailyBalance
                }
            })

            if (calculatedCurrentBalance <= (dailyPeakBalance - dailyDrawdownLimit)) {
                return { status: 'FAILED', reason: 'Daily Trailing Drawdown Breached' }
            }
        } else {
            // Static Daily: PnL based
            if (dailyPnL <= -dailyDrawdownLimit) {
                return { status: 'FAILED', reason: 'Daily Static Drawdown Breached' }
            }
        }
    }

    return { status: 'ACTIVE' }
}

async function updateHighWaterMark(supabase: any, userId: string, tradeId?: string, accountIdParam?: string) {
    // Get account_id from trade if not provided
    let accountId = accountIdParam
    if (!accountId && tradeId) {
        const { data: trade } = await supabase.from('trades').select('account_id').eq('id', tradeId).single()
        accountId = trade?.account_id
    }

    if (!accountId) return

    // Get Account details
    const { data: account } = await supabase
        .from('accounts')
        .select('initial_balance, high_water_mark')
        .eq('id', accountId)
        .single()

    if (!account) return

    // Calculate total PnL
    const { data: trades } = await supabase
        .from('trades')
        .select('pnl')
        .eq('account_id', accountId)
        .eq('status', 'CLOSED')

    const totalPnL = trades?.reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0) || 0
    const currentBalance = Number(account.initial_balance) + totalPnL
    const currentHWM = Number(account.high_water_mark) || Number(account.initial_balance)

    // Update if new high
    if (currentBalance > currentHWM) {
        await supabase
            .from('accounts')
            .update({ high_water_mark: currentBalance })
            .eq('id', accountId)
    }
}

export async function importTrades(trades: any[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    if (!trades || trades.length === 0) {
        return { success: false, error: 'No trades provided' }
    }

    // Get the first account (Legacy support for now, ideally UI lets user pick)
    const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

    const accountId = accounts?.[0]?.id
    if (!accountId) {
        return { success: false, error: 'No account found. Please create one first.' }
    }

    // Prepare data for insertion
    const records = trades.map(t => ({
        ...t,
        user_id: user.id,
        account_id: accountId,
        mode: 'Live', // Default for now
        created_at: new Date().toISOString()
    }))

    const { error } = await supabase
        .from('trades')
        .insert(records)

    if (error) {
        console.error('Error importing trades:', error)
        return { success: false, error: error.message }
    }

    // Trigger basic HWM update (simplified for bulk)
    // For bulk inputs, usually better to recalc everything or skip for performance, 
    // but let's do a safe update call for the account.
    await updateHighWaterMark(supabase, user.id, undefined, accountId)

    revalidatePath('/')
    revalidatePath('/trades')
    return { success: true, count: records.length }
}
