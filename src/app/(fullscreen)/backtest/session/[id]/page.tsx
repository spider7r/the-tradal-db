import { ChartReplayEngine } from '@/components/backtest/ChartReplayEngine'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    // Try with joined candle data first, fallback to plain session
    let session: any = null
    let queryError: any = null

    // First try: with candle_data join
    const { data: sessionWithData, error: joinError } = await supabase
        .from('backtest_sessions')
        .select('*, backtest_session_data(candle_data)')
        .eq('id', id)
        .single()

    if (!joinError && sessionWithData) {
        session = sessionWithData
        // Merge optimized data back into session object for compatibility
        if (session.backtest_session_data && session.backtest_session_data.length > 0) {
            session.candle_data = session.backtest_session_data[0].candle_data
        }
        if (session.backtest_session_data) delete session.backtest_session_data
    } else {
        // Fallback: plain select without join (relation might not exist)
        console.warn('[Session] Join query failed, falling back to plain select:', joinError?.message)
        const { data: plainSession, error: plainError } = await supabase
            .from('backtest_sessions')
            .select('*')
            .eq('id', id)
            .single()

        if (plainError || !plainSession) {
            notFound()
        }
        session = plainSession
    }

    if (!session) {
        notFound()
    }

    // Fetch historical trades
    const { data: trades } = await supabase
        .from('backtest_trades')
        .select('*')
        .eq('backtest_session_id', id)
        .order('entry_date', { ascending: true })

    return (
        <div className="h-full flex flex-col">
            {/* Pass session data and trades to engine */}
            <ChartReplayEngine initialSession={session} initialTrades={trades || []} />
        </div>
    )
}
