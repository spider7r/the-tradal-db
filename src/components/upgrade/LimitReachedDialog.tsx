'use client'

import { Crown, Sparkles, X, ChevronRight, Clock, Timer } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface LimitReachedDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    feature: 'chat' | 'vision' | 'trade'
    /** ISO timestamp of when the limit was hit (for countdown calculation) */
    limitHitTime?: string
}

function useCountdown(limitHitTime?: string) {
    const [timeLeft, setTimeLeft] = useState('')

    useEffect(() => {
        if (!limitHitTime) {
            setTimeLeft('')
            return
        }

        const calculate = () => {
            const hitTime = new Date(limitHitTime).getTime()
            const resetTime = hitTime + 24 * 60 * 60 * 1000 // 24 hours after hit
            const now = Date.now()
            const diff = resetTime - now

            if (diff <= 0) {
                setTimeLeft('Available now! Refresh the page.')
                return
            }

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s`)
            } else {
                setTimeLeft(`${seconds}s`)
            }
        }

        calculate()
        const interval = setInterval(calculate, 1000) // Update every second
        return () => clearInterval(interval)
    }, [limitHitTime])

    return timeLeft
}

export function LimitReachedDialog({ open, onOpenChange, feature, limitHitTime }: LimitReachedDialogProps) {
    const router = useRouter()
    const countdown = useCountdown(limitHitTime)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md border-0 bg-transparent p-0 overflow-hidden shadow-2xl">
                <div className="relative flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 text-center overflow-hidden">
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />

                    {/* Icon */}
                    <div className="relative mb-6">
                        <div className="h-16 w-16 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/20 animate-bounce-slow">
                            <Crown className="h-8 w-8 text-amber-500" />
                        </div>
                        <div className="absolute -right-2 -top-2">
                            <span className="relative flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-zinc-900"></span>
                            </span>
                        </div>
                    </div>

                    {/* Text */}
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-2">
                        Limit Reached
                    </h2>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed mb-4 max-w-[80%]">
                        You've hit your {feature === 'trade' ? 'monthly limit for TRADES' : `daily limit for ${feature === 'vision' ? 'Chart Analysis' : 'AI Chat'}`}.
                    </p>

                    {/* Countdown Timer */}
                    {countdown && (
                        <div className="w-full mb-6 p-4 rounded-xl bg-zinc-950/80 border border-amber-500/20">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Timer className="h-4 w-4 text-amber-500 animate-pulse" />
                                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Next Free Usage In</span>
                            </div>
                            <div className="text-2xl font-black text-white tracking-wider font-mono">
                                {countdown}
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                                Or upgrade now for unlimited access
                            </p>
                        </div>
                    )}

                    {/* Features List */}
                    <div className="w-full space-y-3 mb-8">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                            <Sparkles className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-bold text-zinc-300">Unlimited Chart Analysis</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                            <Sparkles className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-bold text-zinc-300">Unlimited AI Chat</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-bold text-zinc-300">Priority Support</span>
                        </div>
                    </div>

                    {/* Upgrade Button */}
                    <button
                        onClick={() => {
                            onOpenChange(false)
                            router.push('/checkout?plan=growth')
                        }}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
                    >
                        Upgrade Now
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => onOpenChange(false)}
                        className="mt-4 text-xs font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors"
                    >
                        Maybe Later
                    </button>

                </div>
            </DialogContent>
        </Dialog>
    )
}
