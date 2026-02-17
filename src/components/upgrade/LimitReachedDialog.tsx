'use client'

import { Crown, Sparkles, X, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
// import { ManualPaymentDialog } from '@/components/upgrade/ManualPaymentDialog' // Removed
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LimitReachedDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    feature: 'chat' | 'vision'
}

export function LimitReachedDialog({ open, onOpenChange, feature }: LimitReachedDialogProps) {
    const [showPayment, setShowPayment] = useState(false)

    const router = useRouter()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md border-0 bg-transparent p-0 overflow-hidden shadow-2xl">
                <div className="relative flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 text-center overflow-hidden">
                    {/* ... (keep existing content until button) ... */}
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
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed mb-8 max-w-[80%]">
                        You've hit your daily limit for {feature === 'vision' ? 'Chart Analysis' : 'AI Chat'}.
                        Upgrade to <span className="text-amber-500 font-bold">PROFESSIONAL</span> for unlimited access.
                    </p>

                    {/* Features List */}
                    <div className="w-full space-y-3 mb-8">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                            <Sparkles className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-bold text-zinc-300">Unlimited Chart Analysis</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                            <Sparkles className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-bold text-zinc-300">Advanced AI Models (Claude/GPT-4)</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-bold text-zinc-300">Priority Support</span>
                        </div>
                    </div>

                    {/* Actions */}
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
