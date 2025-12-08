'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Trophy, TrendingUp, BarChart3, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { DailyDetailSheet } from '@/components/journal/DailyDetailSheet'

interface JournalCalendarProps {
    trades: any[]
    entries: any[]
}

export function JournalCalendar({ trades, entries }: JournalCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const router = useRouter()

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const getDayData = (date: Date) => {
        const dayTrades = trades.filter(t => isSameDay(new Date(t.open_time), date))
        const dayEntry = entries.find(e => isSameDay(new Date(e.date), date))

        const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
        const tradeCount = dayTrades.length

        let status = 'neutral'
        if (tradeCount > 0) {
            status = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be'
        }

        return { pnl, tradeCount, status, entry: dayEntry }
    }

    // Calculate Monthly Stats
    const monthlyTrades = trades.filter(t => isSameMonth(new Date(t.open_time), currentDate))
    const monthlyPnL = monthlyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const monthlyWins = monthlyTrades.filter(t => (t.pnl || 0) > 0).length
    const monthlyWinrate = monthlyTrades.length > 0 ? Math.round((monthlyWins / monthlyTrades.length) * 100) : 0

    // Find Best Day
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    let bestDayPnL = -Infinity
    let bestDayDate = null

    daysInMonth.forEach(day => {
        const { pnl } = getDayData(day)
        if (pnl > bestDayPnL) {
            bestDayPnL = pnl
            bestDayDate = day
        }
    })

    const selectedDayData = selectedDate ? getDayData(selectedDate) : null

    // Helper for Stats Cards
    const StatCard = ({ title, value, subValue, color }: { title: string, value: string, subValue?: string, color: string }) => (
        <div className={cn(
            "relative overflow-hidden rounded-[2rem] border bg-zinc-900 p-6 transition-all duration-300 hover:-translate-y-1 group",
            `border-zinc-800 hover:border-${color}-500/50`
        )}>
            <div className={cn("absolute bottom-0 left-0 w-full h-1 opacity-50 group-hover:opacity-100 transition-opacity", `bg-${color}-500`)} />
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">{title}</h3>
            <div className="flex items-baseline gap-2">
                <p className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
                    {value}
                </p>
                {subValue && <span className="text-xs font-bold text-zinc-500 uppercase">{subValue}</span>}
            </div>
        </div>
    )

    return (
        <div className="flex h-full flex-col space-y-8">
            {/* Monthly Stats Row */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Monthly P&L"
                    value={`${monthlyPnL >= 0 ? '+' : ''}$${monthlyPnL.toLocaleString()}`}
                    color={monthlyPnL >= 0 ? 'emerald' : 'red'}
                />
                <StatCard
                    title="Win Rate"
                    value={`${monthlyWinrate}%`}
                    color="blue"
                />
                <StatCard
                    title="Total Trades"
                    value={monthlyTrades.length.toString()}
                    color="violet"
                />
                <StatCard
                    title="Best Day"
                    value={bestDayPnL > -Infinity ? `+$${bestDayPnL.toLocaleString()}` : '-'}
                    subValue={bestDayDate ? format(bestDayDate, 'MMM d') : ''}
                    color="emerald"
                />
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tight">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all hover:scale-105"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all hover:scale-105"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Desktop Calendar Grid (Hidden on Mobile) */}
            <div className="hidden md:grid md:grid-cols-7 md:gap-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        {day}
                    </div>
                ))}

                {calendarDays.map((day, dayIdx) => {
                    const { pnl, tradeCount, status } = getDayData(day)
                    const isCurrentMonth = isSameMonth(day, monthStart)
                    const isToday = isSameDay(day, new Date())

                    return (
                        <motion.button
                            key={day.toString()}
                            whileHover={{ scale: 1.02, y: -2 }}
                            onClick={() => router.push(`/journal/day/${format(day, 'yyyy-MM-dd')}`)}
                            className={cn(
                                'relative h-40 p-4 text-left transition-all duration-300 flex flex-col justify-between group rounded-2xl border overflow-hidden',
                                isCurrentMonth ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-950/30 border-zinc-900 text-zinc-700',
                                isCurrentMonth && 'hover:border-zinc-600 hover:shadow-xl',
                                isToday && 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950'
                            )}
                        >
                            {/* Top Border for Status */}
                            {isCurrentMonth && tradeCount > 0 && (
                                <div className={cn(
                                    "absolute top-0 left-0 w-full h-1.5",
                                    status === 'win' && "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
                                    status === 'loss' && "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
                                    status === 'be' && "bg-yellow-500"
                                )} />
                            )}

                            <span className={cn(
                                "text-lg font-black tracking-tight",
                                isToday ? "text-emerald-500" : isCurrentMonth ? "text-zinc-500 group-hover:text-white" : "text-zinc-800"
                            )}>
                                {format(day, 'd')}
                            </span>

                            {tradeCount > 0 && isCurrentMonth && (
                                <div className="space-y-1">
                                    <div className={cn(
                                        "text-2xl font-black tracking-tighter leading-none",
                                        pnl > 0 ? "text-emerald-400" : pnl < 0 ? "text-red-400" : "text-zinc-400"
                                    )}>
                                        {pnl > 0 ? '+' : ''}{pnl.toLocaleString()}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                            pnl > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                        )}>
                                            {tradeCount} Trade{tradeCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </motion.button>
                    )
                })}
            </div>

            {/* Mobile List View (Visible on Mobile) */}
            <div className="space-y-3 md:hidden">
                {calendarDays.filter(day => isSameMonth(day, monthStart)).map((day) => {
                    const { pnl, tradeCount, status } = getDayData(day)
                    const isToday = isSameDay(day, new Date())

                    // Only show days with trades or today on mobile to save space? 
                    // Or show all days? Let's show all days but compact.

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => router.push(`/journal/day/${format(day, 'yyyy-MM-dd')}`)}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-xl border bg-zinc-900/50",
                                isToday ? "border-emerald-500/50" : "border-zinc-800/50"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "flex flex-col items-center justify-center w-12 h-12 rounded-lg border",
                                    isToday ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400"
                                )}>
                                    <span className="text-[10px] font-bold uppercase">{format(day, 'EEE')}</span>
                                    <span className="text-xl font-black leading-none">{format(day, 'd')}</span>
                                </div>
                                {tradeCount > 0 ? (
                                    <div>
                                        <div className={cn(
                                            "text-lg font-black tracking-tight",
                                            pnl > 0 ? "text-emerald-400" : pnl < 0 ? "text-red-400" : "text-zinc-400"
                                        )}>
                                            {pnl > 0 ? '+' : ''}{pnl.toLocaleString()}
                                        </div>
                                        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                                            {tradeCount} Trade{tradeCount !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-zinc-600 text-sm font-medium italic">No Entry</span>
                                )}
                            </div>

                            {tradeCount > 0 && (
                                <ChevronRight className="h-5 w-5 text-zinc-600" />
                            )}
                        </div>
                    )
                })}
            </div>

            <DailyDetailSheet
                date={selectedDate}
                onClose={() => setSelectedDate(null)}
                trades={selectedDate ? trades.filter(t => isSameDay(new Date(t.open_time), selectedDate)) : []}
                entry={selectedDayData?.entry || null}
            />
        </div>
    )
}
