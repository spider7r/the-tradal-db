'use client'

import { useState, useMemo } from 'react'
import { format, isAfter, startOfDay, startOfWeek, startOfMonth, startOfYear, subMonths, isSameDay } from 'date-fns'
import { Search, Filter, Smile, Meh, Frown, Calendar, Edit2, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DailyDetailSheet } from '@/components/journal/DailyDetailSheet'

interface NotesListProps {
    entries: any[]
    trades: any[] // We need trades to pass to DailyDetailSheet
}

type DateRange = 'all' | 'today' | 'week' | 'month' | 'last_month' | 'year'
type MoodFilter = 'all' | 'happy' | 'neutral' | 'sad'

export function NotesList({ entries, trades }: NotesListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [dateRange, setDateRange] = useState<DateRange>('all')
    const [moodFilter, setMoodFilter] = useState<MoodFilter>('all')
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)

    // Filter Logic
    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const entryDate = new Date(entry.date)
            const now = new Date()

            // Date Filter
            let dateMatch = true
            switch (dateRange) {
                case 'today':
                    dateMatch = isAfter(entryDate, startOfDay(now))
                    break
                case 'week':
                    dateMatch = isAfter(entryDate, startOfWeek(now))
                    break
                case 'month':
                    dateMatch = isAfter(entryDate, startOfMonth(now))
                    break
                case 'last_month':
                    const lastMonthStart = startOfMonth(subMonths(now, 1))
                    const thisMonthStart = startOfMonth(now)
                    dateMatch = isAfter(entryDate, lastMonthStart) && entryDate < thisMonthStart
                    break
                case 'year':
                    dateMatch = isAfter(entryDate, startOfYear(now))
                    break
                case 'all':
                default:
                    dateMatch = true
            }

            // Mood Filter
            const moodMatch = moodFilter === 'all' || entry.mood === moodFilter

            // Search Filter
            const searchMatch = searchQuery === '' ||
                (entry.content && entry.content.toLowerCase().includes(searchQuery.toLowerCase()))

            return dateMatch && moodMatch && searchMatch
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by newest first
    }, [entries, dateRange, moodFilter, searchQuery])

    const recentEntries = filteredEntries.slice(0, 3)

    // Helper to find entry for selected date
    const selectedEntry = selectedDate
        ? entries.find(e => isSameDay(new Date(e.date), selectedDate))
        : null

    return (
        <div className="space-y-8">
            {/* Header Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex-1">
                    {/* Search Bar */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Date Filter */}
                    <div className="flex items-center gap-2 rounded-xl bg-zinc-950 p-1 ring-1 ring-zinc-800">
                        <Calendar className="ml-2 h-4 w-4 text-zinc-500" />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as DateRange)}
                            className="bg-transparent py-1.5 pl-2 pr-8 text-sm font-bold text-zinc-300 focus:outline-none [&>option]:bg-zinc-900 cursor-pointer"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="year">This Year</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 sm:px-6 text-xs sm:text-sm font-black text-white uppercase tracking-wide transition-all hover:bg-emerald-500 hover:scale-105 shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                    >
                        <Plus className="h-4 w-4" />
                        Write Note
                    </button>
                </div>
            </div>

            {/* Recent Reflections */}
            {
                recentEntries.length > 0 && searchQuery === '' && dateRange === 'all' && moodFilter === 'all' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-white">
                            <Sparkles className="h-5 w-5 text-emerald-400" />
                            <h3 className="text-xl font-black uppercase italic tracking-tight">Recent Reflections</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {recentEntries.map((entry) => (
                                <div
                                    key={`recent-${entry.id}`}
                                    onClick={() => setSelectedDate(new Date(entry.date))}
                                    className="group cursor-pointer relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10"
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                            {format(new Date(entry.date), 'MMM d')}
                                        </span>
                                        {entry.mood && (
                                            <div className={cn(
                                                "rounded-lg px-2 py-1 border",
                                                entry.mood === 'happy' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                                entry.mood === 'neutral' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                                entry.mood === 'sad' && "bg-red-500/10 text-red-400 border-red-500/20"
                                            )}>
                                                {entry.mood === 'happy' && <Smile className="h-4 w-4" />}
                                                {entry.mood === 'neutral' && <Meh className="h-4 w-4" />}
                                                {entry.mood === 'sad' && <Frown className="h-4 w-4" />}
                                            </div>
                                        )}
                                    </div>
                                    <p className="line-clamp-3 text-sm text-zinc-300 leading-relaxed font-medium">
                                        {entry.content || <span className="italic text-zinc-600">No content...</span>}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* All Notes Grid */}
            <div className="space-y-6">
                <div className="flex flex-col gap-3 items-center sm:flex-row sm:justify-between">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight text-center sm:text-left">All Notes</h3>
                    {/* Mood Filter Inline */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Filter by mood</span>
                        <div className="flex rounded-xl bg-zinc-950 p-1 ring-1 ring-zinc-800">
                            {(['all', 'happy', 'neutral', 'sad'] as MoodFilter[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMoodFilter(m)}
                                    className={cn(
                                        "rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all",
                                        moodFilter === m ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredEntries.map((entry) => (
                        <div
                            key={entry.id}
                            onClick={() => setSelectedDate(new Date(entry.date))}
                            className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900 p-6 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-800/80"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">
                                    {format(new Date(entry.date), 'MMM d, yyyy')}
                                </span>
                                {entry.mood && (
                                    <div className={cn(
                                        "rounded-lg px-2 py-1 border",
                                        entry.mood === 'happy' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                        entry.mood === 'neutral' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                        entry.mood === 'sad' && "bg-red-500/10 text-red-400 border-red-500/20"
                                    )}>
                                        {entry.mood === 'happy' && <Smile className="h-3.5 w-3.5" />}
                                        {entry.mood === 'neutral' && <Meh className="h-3.5 w-3.5" />}
                                        {entry.mood === 'sad' && <Frown className="h-3.5 w-3.5" />}
                                    </div>
                                )}
                            </div>

                            <p className="line-clamp-4 text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed">
                                {entry.content || <span className="italic text-zinc-600">No content...</span>}
                            </p>

                            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-500 opacity-0 transition-all transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 uppercase tracking-wider">
                                <Edit2 className="h-3 w-3" />
                                Click to edit
                            </div>
                        </div>
                    ))}

                    {filteredEntries.length === 0 && (
                        <div className="col-span-full flex h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-zinc-800 bg-zinc-900/50 text-zinc-500">
                            <Filter className="mb-2 h-8 w-8 opacity-50" />
                            <p className="font-medium">No notes found matching your filters</p>
                            <button
                                onClick={() => setSelectedDate(new Date())}
                                className="mt-4 text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-wider text-sm"
                            >
                                Write a note for today
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Sheet */}
            <DailyDetailSheet
                date={selectedDate}
                onClose={() => setSelectedDate(null)}
                trades={selectedDate ? trades.filter(t => isSameDay(new Date(t.open_time), selectedDate)) : []}
                entry={selectedEntry}
            />
        </div >
    )
}
