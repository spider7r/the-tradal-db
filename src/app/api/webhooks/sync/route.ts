import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const apiKey = req.headers.get('Authorization')
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
        }

        const supabase = await createClient()

        // 1. Verify User
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('webhook_key', apiKey)
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 })
        }

        const body = await req.json()
        const { pair, direction, price, size, pnl, timestamp } = body

        // Basic Validation
        if (!pair || !price) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 2. Find Account (Default to first one for now)
        const { data: accounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        const accountId = accounts?.[0]?.id

        if (!accountId) {
            return NextResponse.json({ error: 'No account found for user' }, { status: 400 })
        }

        // 3. Insert Trade
        const { error: insertError } = await supabase
            .from('trades')
            .insert({
                user_id: user.id,
                account_id: accountId,
                pair,
                direction: direction?.toUpperCase(),
                entry_price: price, // NOTE: EA sends exit price usually as "price" in close event, simplistic mapping
                exit_price: price,
                size,
                pnl,
                open_time: new Date(timestamp * 1000).toISOString(), // Unix timestamp conversion
                close_time: new Date().toISOString(),
                status: 'CLOSED',
                mode: 'Live',
                outcome: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE'
            })

        if (insertError) {
            console.error('Webhook Insert Error:', insertError)
            return NextResponse.json({ error: 'Database Error' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (e: any) {
        console.error('Webhook Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
