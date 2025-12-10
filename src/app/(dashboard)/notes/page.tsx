import { createClient } from '@/utils/supabase/server'
import { NotesList } from '@/components/notes/NotesList'
import { redirect } from 'next/navigation'

export default async function NotesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch all journal entries
    const { data: entries } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

    // Fetch all trades (needed for DailyDetailSheet context)
    const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)

    return (
        <div className="h-full flex flex-col space-y-8">
            <div>
                <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tight">My Notes</h1>
                <p className="text-zinc-400 mt-1 text-sm sm:text-base">Browse and search your daily trading journal</p>
            </div>

            <div className="flex-1 min-h-0">
                <NotesList
                    entries={entries || []}
                    trades={trades || []}
                />
            </div>
        </div>
    )
}
