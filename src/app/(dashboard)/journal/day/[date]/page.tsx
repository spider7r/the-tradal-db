import { getJournalEntry } from '../../actions'
import { DayJournalForm } from '@/components/journal/DayJournalForm'
import { TradesTable } from '@/components/trades/TradesTable'
import { ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function JournalDayPage({
    params,
}: {
    params: Promise<{ date: string }>
}) {
    const { date } = await params
    const res = await getJournalEntry(date)

    if (!res.success) {
        // Handle error or redirect
        return <div>Error loading journal entry</div>
    }

    if (!res.data) {
        return <div>No data found</div>
    }

    const { entry, trades } = res.data

    // Format date for display
    const displayDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="space-y-4">
                <Link
                    href="/journal"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Calendar
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                        <Calendar className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">{displayDate}</h1>
                        <p className="text-zinc-400">Daily Review & Trade Log</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Journal Form */}
                <div className="lg:col-span-1">
                    <DayJournalForm date={date} initialEntry={entry} />
                </div>

                {/* Right Column: Trades List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Trades Taken ({trades.length})</h3>
                            <div className="text-sm text-zinc-400">
                                Net P&L: <span className={trades.reduce((acc: number, t: any) => acc + (t.pnl || 0), 0) >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                    ${trades.reduce((acc: number, t: any) => acc + (t.pnl || 0), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        {/* We pass a filtered list of trades to the table, but TradesTable might expect to fetch its own data. 
                            Let's check TradesTable props. If it doesn't accept 'initialTrades', we might need to modify it or use a simpler table here.
                            For now, I'll assume I can pass data or I'll just render a simple list if TradesTable is complex.
                            Actually, viewing TradesTable first would be safer.
                        */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-950 text-zinc-400 font-medium uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4">Pair</th>
                                        <th className="px-6 py-4">Side</th>
                                        <th className="px-6 py-4">Outcome</th>
                                        <th className="px-6 py-4 text-right">P&L</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {trades.map((trade: any) => (
                                        <tr key={trade.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-6 py-4 text-zinc-400">
                                                {new Date(trade.entry_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-white">{trade.pair}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${trade.direction === 'Long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {trade.direction}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${trade.outcome === 'Win' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    trade.outcome === 'Loss' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'
                                                    }`}>
                                                    {trade.outcome}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                ${trade.pnl?.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {trades.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                                No trades recorded for this day.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
