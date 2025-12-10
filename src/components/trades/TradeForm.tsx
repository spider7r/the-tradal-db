'use client'

import { createTrade } from '@/app/(dashboard)/trades/actions'
import { getStrategies } from '@/app/(dashboard)/strategies/actions'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TradeFormProps {
    accountId?: string
    onSuccess?: () => void
}

export function TradeForm({ accountId, onSuccess }: TradeFormProps) {
    const router = useRouter()
    const [isPending, setIsPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [direction, setDirection] = useState('LONG')
    const [entryPrice, setEntryPrice] = useState<string>('')
    const [stopLoss, setStopLoss] = useState<string>('')
    const [takeProfit, setTakeProfit] = useState<string>('')
    const [status, setStatus] = useState('OPEN')
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [formDataToSubmit, setFormDataToSubmit] = useState<FormData | null>(null)
    const [strategies, setStrategies] = useState<any[]>([])
    const [selectedStrategy, setSelectedStrategy] = useState<string>('')
    const [mode, setMode] = useState<'Live' | 'Backtest' | 'Paper'>('Live')

    useEffect(() => {
        const loadStrategies = async () => {
            const res = await getStrategies()
            if (res.success && res.data) {
                setStrategies(res.data)
            }
        }
        loadStrategies()
    }, [])

    // Calculate R:R for display and submission
    const epVal = parseFloat(entryPrice)
    const slVal = parseFloat(stopLoss)
    const tpVal = parseFloat(takeProfit)

    let calculatedRR: string | null = null
    if (epVal && slVal && tpVal && Math.abs(epVal - slVal) > 0) {
        const risk = Math.abs(epVal - slVal)
        const reward = Math.abs(tpVal - epVal)
        calculatedRR = (reward / risk).toFixed(2)
    }

    const handleInitialSubmit = (formData: FormData) => {
        // Append calculated RR if not present
        if (calculatedRR) {
            formData.set('rr', calculatedRR)
        }
        formData.set('mode', mode)
        setFormDataToSubmit(formData)
        setShowConfirmation(true)
    }

    const confirmSubmit = async () => {
        if (!formDataToSubmit) return

        setIsPending(true)
        setError(null)

        const result = await createTrade(formDataToSubmit)
        setIsPending(false)
        setShowConfirmation(false)

        if (result?.error) {
            setError(result.error)
        } else {
            // Reset form
            setEntryPrice('')
            setStopLoss('')
            setTakeProfit('')
            setMode('Live')
            setSelectedStrategy('')
            router.refresh()
            if (onSuccess) onSuccess()
        }
    }

    return (
        <>
            <form action={handleInitialSubmit} className="space-y-4">
                <input type="hidden" name="account_id" value={accountId || ''} />
                <input type="hidden" name="rr" value={calculatedRR || ''} />

                {error && (
                    <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                        {error}
                    </div>
                )}

                {/* Mode Selection */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    {['Live', 'Backtest', 'Paper'].map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m as any)}
                            className={cn(
                                "py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all",
                                mode === m
                                    ? "bg-[#00E676] text-black shadow-sm"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                            )}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="pair" className="block text-sm font-medium text-zinc-400">
                            Pair
                        </label>
                        <input
                            type="text"
                            name="pair"
                            id="pair"
                            required
                            placeholder="EURUSD"
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676] text-xs sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="direction" className="block text-sm font-medium text-zinc-400">
                            Direction
                        </label>
                        <select
                            name="direction"
                            id="direction"
                            value={direction}
                            onChange={(e) => setDirection(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676] text-xs sm:text-sm"
                        >
                            <option value="LONG">Long</option>
                            <option value="SHORT">Short</option>
                        </select>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label htmlFor="strategy" className="block text-sm font-medium text-zinc-400">
                            Strategy
                        </label>
                        <Link href="/strategies" className="text-xs text-[#00E676] hover:text-[#00E676]/80 flex items-center gap-1">
                            <PlusCircle className="h-3 w-3" /> New Strategy
                        </Link>
                    </div>
                    <select
                        name="strategy_id"
                        id="strategy"
                        value={selectedStrategy}
                        onChange={(e) => setSelectedStrategy(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs sm:text-sm"
                    >
                        <option value="">Select a Strategy (Optional)</option>
                        {strategies.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="entry_price" className="block text-sm font-medium text-zinc-400">
                            Entry Price
                        </label>
                        <input
                            type="number"
                            step="0.00001"
                            name="entry_price"
                            id="entry_price"
                            required
                            value={entryPrice}
                            onChange={(e) => setEntryPrice(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676] text-xs sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="stop_loss" className="block text-sm font-medium text-zinc-400">
                            Stop Loss
                        </label>
                        <input
                            type="number"
                            step="0.00001"
                            name="stop_loss"
                            id="stop_loss"
                            required
                            value={stopLoss}
                            onChange={(e) => setStopLoss(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676] text-xs sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="take_profit" className="block text-sm font-medium text-zinc-400">
                            Take Profit
                        </label>
                        <input
                            type="number"
                            step="0.00001"
                            name="take_profit"
                            id="take_profit"
                            required
                            value={takeProfit}
                            onChange={(e) => setTakeProfit(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676] text-xs sm:text-sm"
                        />
                    </div>
                </div>

                {/* R:R Display */}
                <div className="flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-2 border border-zinc-700/50">
                    <span className="text-sm text-zinc-400">Risk : Reward</span>
                    <span className={`text-sm font-bold ${calculatedRR && parseFloat(calculatedRR) >= 2 ? 'text-[#00E676]' :
                        calculatedRR && parseFloat(calculatedRR) >= 1 ? 'text-yellow-400' : 'text-zinc-500'
                        }`}>
                        {calculatedRR ? `1 : ${calculatedRR}` : '- : -'}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="size" className="block text-sm font-medium text-zinc-400">
                            Size (Lots)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            name="size"
                            id="size"
                            required
                            defaultValue="1.0"
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676] text-xs sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-zinc-400">
                            Status
                        </label>
                        <select
                            name="status"
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676] text-xs sm:text-sm"
                        >
                            <option value="OPEN">Open</option>
                            <option value="CLOSED">Closed</option>
                            <option value="BE">Break Even</option>
                        </select>
                    </div>
                </div>

                {status === 'CLOSED' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="exit_price" className="block text-sm font-medium text-zinc-400">
                                Exit Price
                            </label>
                            <input
                                type="number"
                                step="0.00001"
                                name="exit_price"
                                id="exit_price"
                                required
                                className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676] text-xs sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="closing_reason" className="block text-sm font-medium text-zinc-400">
                                Closing Reason
                            </label>
                            <select
                                name="closing_reason"
                                id="closing_reason"
                                required
                                className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676] text-xs sm:text-sm"
                            >
                                <option value="TP">Take Profit</option>
                                <option value="SL">Stop Loss</option>
                                <option value="BE">Break Even</option>
                                <option value="MANUAL">Manual Close</option>
                            </select>
                        </div>
                    </div>
                )}

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-zinc-400">
                        Notes
                    </label>
                    <textarea
                        name="notes"
                        id="notes"
                        rows={3}
                        className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 text-zinc-100 focus:border-[#00E676] focus:outline-none focus:ring-1 focus:ring-[#00E676] text-xs sm:text-sm"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-md bg-[#00E676] px-4 py-2 text-sm font-medium text-black hover:bg-[#00E676]/90 focus:outline-none focus:ring-2 focus:ring-[#00E676] focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
                >
                    {isPending ? 'Saving...' : 'Log Trade'}
                </button>
            </form>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-full bg-yellow-500/10 p-2">
                                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Confirm Trade Entry</h3>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Pair</span>
                                <span className="text-white font-medium">{formDataToSubmit?.get('pair') as string}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Direction</span>
                                <span className={cn(
                                    "font-medium",
                                    formDataToSubmit?.get('direction') === 'LONG' ? 'text-[#00E676]' : 'text-red-400'
                                )}>
                                    {formDataToSubmit?.get('direction') as string}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Entry Price</span>
                                <span className="text-white font-medium">{formDataToSubmit?.get('entry_price') as string}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Mode</span>
                                <span className="text-white font-medium">{mode}</span>
                            </div>
                            {calculatedRR && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Risk : Reward</span>
                                    <span className="text-[#00E676] font-bold">1 : {calculatedRR}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
                            >
                                Edit
                            </button>
                            <button
                                onClick={confirmSubmit}
                                disabled={isPending}
                                className="flex-1 rounded-lg bg-[#00E676] px-4 py-2 text-sm font-medium text-black hover:bg-[#00E676]/90 disabled:opacity-50"
                            >
                                {isPending ? 'Confirming...' : 'Confirm Trade'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
