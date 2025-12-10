import { createClient } from '@/utils/supabase/server'
import { JournalCalendar } from '@/components/journal/JournalCalendar'
import { redirect } from 'next/navigation'

export default async function JournalPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const params = await searchParams
    const accountId = params?.accountId as string

    let tradesQuery = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('open_time', { ascending: false })

    if (accountId) {
        tradesQuery = tradesQuery.eq('account_id', accountId)
    }

    const { data: trades } = await tradesQuery

    // Journal entries are currently global (per user), but we could add account_id later
    const { data: entries } = await supabase
        .from('journal_entries') // Note: Schema says 'daily_journal', checking code usage
        .select('*')
        .eq('user_id', user.id)

    return (
        <div className="h-full flex flex-col space-y-6">
            <div>
                <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tight">The Tradal Journal</h1>
                <p className="text-zinc-400 mt-1 text-sm sm:text-base">Review your daily performance and notes</p>
            </div>

            <div className="flex-1 min-h-0">
                <JournalCalendar
                    trades={trades || []}
                    entries={entries || []}
                />
            </div>
        </div>
    )
}
