'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { AnalyzeButton } from '@/components/ai/AnalyzeButton'
import { CloseTradeDialog } from '@/components/trades/CloseTradeDialog'
import { ShareTradeModal } from '@/components/sharing/ShareTradeModal'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'

type Trade = {
    id: string
    pair: string
    direction: 'LONG' | 'SHORT'
    entry_price: number
    exit_price: number | null
    size: number
    pnl: number | null
    status: 'OPEN' | 'CLOSED' | 'BE'
    open_time: string
    stop_loss: number | null
    take_profit: number | null
}

type SortConfig = {
    key: keyof Trade | null
    direction: 'asc' | 'desc'
}

export function TradesTable({ trades }: { trades: Trade[] }) {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'open_time', direction: 'desc' })
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Sorting Logic
    const sortedTrades = [...trades].sort((a, b) => {
        if (!sortConfig.key) return 0

        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (aValue === bValue) return 0

        if (aValue === null) return 1
        if (bValue === null) return -1

        const comparison = aValue > bValue ? 1 : -1
        return sortConfig.direction === 'asc' ? comparison : -comparison
    })

    // Pagination Logic
    const totalPages = Math.ceil(sortedTrades.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedTrades = sortedTrades.slice(startIndex, startIndex + itemsPerPage)

    const handleSort = (key: keyof Trade) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const SortIcon = ({ column }: { column: keyof Trade }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-zinc-600" />
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="ml-2 h-4 w-4 text-[#00E676]" />
            : <ChevronDown className="ml-2 h-4 w-4 text-[#00E676]" />
    }

    if (trades.length === 0) {
        return (
            <div className="mt-4 h-64 flex items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50">
                <p className="text-zinc-500">No trades found</p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-zinc-800">
                    <thead className="bg-zinc-950 sticky top-0 z-10">
                        <tr>
                            {[
                                { key: 'open_time', label: 'Date' },
                                { key: 'pair', label: 'Pair' },
                                { key: 'direction', label: 'Direction' },
                                { key: 'entry_price', label: 'Entry' },
                                { key: 'size', label: 'Size' },
                                { key: 'status', label: 'Status' },
                                { key: 'pnl', label: 'P&L', align: 'right' },
                            ].map((header) => (
                                <th
                                    key={header.key}
                                    scope="col"
                                    className={cn(
                                        "cursor-pointer px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors",
                                        header.align === 'right' && "text-right"
                                    )}
                                    onClick={() => handleSort(header.key as keyof Trade)}
                                >
                                    <div className={cn("flex items-center gap-2", header.align === 'right' && "justify-end")}>
                                        {header.label}
                                        <SortIcon column={header.key as keyof Trade} />
                                    </div>
                                </th>
                            ))}
                            <th scope="col" className="relative py-4 pl-3 pr-6 sm:pr-6">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                        {paginatedTrades.map((trade) => (
                            <tr key={trade.id} className="group hover:bg-zinc-800/50 transition-colors">
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-400 group-hover:text-zinc-300">
                                    {format(new Date(trade.open_time), 'MMM d, HH:mm')}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-black text-white tracking-tight">
                                    {trade.pair}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ring-1 ring-inset uppercase tracking-wider',
                                            trade.direction === 'LONG'
                                                ? 'bg-[#00E676]/10 text-[#00E676] ring-[#00E676]/20'
                                                : 'bg-red-500/10 text-red-400 ring-red-500/20'
                                        )}
                                    >
                                        {trade.direction}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-400 font-mono">
                                    {trade.entry_price}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-400 font-mono">
                                    {trade.size}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ring-1 ring-inset uppercase tracking-wider',
                                            trade.status === 'OPEN'
                                                ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
                                                : trade.status === 'CLOSED'
                                                    ? 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20'
                                                    : 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'
                                        )}
                                    >
                                        {trade.status}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-black font-mono">
                                    {trade.pnl !== null ? (
                                        <span
                                            className={cn(
                                                trade.pnl > 0 ? 'text-[#00E676]' : trade.pnl < 0 ? 'text-red-400' : 'text-zinc-400'
                                            )}
                                        >
                                            {trade.pnl > 0 ? '+' : ''}{trade.pnl}
                                        </span>
                                    ) : (
                                        <span className="text-zinc-600">-</span>
                                    )}
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium sm:pr-6">
                                    <div className="flex justify-end gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        {trade.status === 'OPEN' && (
                                            <CloseTradeDialog trade={trade} />
                                        )}
                                        <AnalyzeButton tradeId={trade.id} />
                                        <ShareTradeModal trade={trade} />
                                        <button className="text-zinc-500 hover:text-white transition-colors font-bold text-xs uppercase tracking-wider">
                                            Edit
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-6 py-4">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="relative ml-3 inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-zinc-500">
                                Showing <span className="font-bold text-white">{startIndex + 1}</span> to <span className="font-bold text-white">{Math.min(startIndex + itemsPerPage, sortedTrades.length)}</span> of <span className="font-bold text-white">{sortedTrades.length}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-l-xl px-3 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-800 hover:bg-zinc-900 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </button>
                                {/* Page Numbers (Simplified for now) */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={cn(
                                            "relative inline-flex items-center px-4 py-2 text-sm font-bold ring-1 ring-inset ring-zinc-800 focus:z-20 focus:outline-offset-0 transition-all",
                                            page === currentPage
                                                ? "z-10 bg-[#00E676] text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E676]"
                                                : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                                        )}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center rounded-r-xl px-3 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-800 hover:bg-zinc-900 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
