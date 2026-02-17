'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ManualPaymentDialog } from './ManualPaymentDialog'
import { cn } from '@/lib/utils'

interface OnboardingPricingDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function OnboardingPricingDialog({ open, onOpenChange }: OnboardingPricingDialogProps) {
    const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string } | null>(null)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

    const plans = [
        {
            name: "STARTER",
            price: billingCycle === 'monthly' ? "19" : "15",
            desc: "For beginners ready to commit.",
            features: ["Unlimited Trades", "Basic Analytics", "3 AI Analysis / Day", "Manual Journaling"],
            cta: "Start Now",
            highlight: false,
            popular: false
        },
        {
            name: "GROWTH",
            price: billingCycle === 'monthly' ? "29" : "24",
            desc: "For serious traders seeking consistency.",
            features: ["Everything in Starter", "Unlimited Auto-Sync", "Full AI Coach Access", "Prop Firm Guardian", "Advanced Strategy Tracking"],
            cta: "Start 7-Day Free Trial",
            highlight: true, // Green Style
            popular: true
        },
        {
            name: "ENTERPRISE",
            price: billingCycle === 'monthly' ? "59" : "49",
            desc: "For funded traders & teams.",
            features: ["Everything in Growth (7-Day Trial)", "Multi-Account Aggregation", "Mentor Access (Discord)", "Risk Model Templates", "API Access"],
            cta: "Start 7-Day Free Trial",
            highlight: false, // Standard Style
            popular: false
        }
    ]

    const router = useRouter() // Need to import useRouter

    const handlePlanSelect = (plan: typeof plans[0]) => {
        if (plan.name === "STARTER" || plan.name === "GROWTH" || plan.name === "ENTERPRISE") {
            router.push(`/checkout?plan=${plan.name.toLowerCase()}`)
            return
        }
        // Fallback
        setSelectedPlan({ name: plan.name, price: plan.price })
    }

    // Removed ManualPaymentDialog return block as we are redirecting now.


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl border-0 bg-transparent p-0 overflow-hidden shadow-2xl focus:outline-none">
                <div className="bg-[#050505] rounded-3xl overflow-hidden w-full border border-white/10 shadow-2xl relative">

                    {/* Background Noise/Gradient Effects could go here */}

                    <div className="p-8 md:p-12 overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-zinc-800">

                        {/* Header & Toggle */}
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight">Simple Pricing.</h2>
                            <p className="text-zinc-400 mb-8 font-medium">Invest in your edge. Cancel anytime.</p>

                            <div className="inline-flex bg-[#111] p-1 rounded-lg border border-white/10">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={cn(
                                        "px-6 py-2 rounded-md text-sm font-black transition-all",
                                        billingCycle === 'monthly' ? "bg-white text-black shadow-lg" : "text-zinc-400 hover:text-white"
                                    )}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={cn(
                                        "px-6 py-2 rounded-md text-sm font-black transition-all",
                                        billingCycle === 'yearly' ? "bg-white text-black shadow-lg" : "text-zinc-400 hover:text-white"
                                    )}
                                >
                                    Yearly <span className="text-[10px] text-[#00E676] ml-1 font-black">-20%</span>
                                </button>
                            </div>
                        </div>

                        {/* Pricing Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            {plans.map((plan, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "relative p-8 rounded-3xl border flex flex-col transition-all duration-300",
                                        plan.highlight
                                            ? "bg-[#0A0A0A] border-[#00E676]/50 shadow-[0_0_40px_-10px_rgba(0,230,118,0.15)] md:scale-105 z-10"
                                            : "bg-[#080808] border-white/5 hover:border-white/10"
                                    )}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00E676] text-black text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                            Most Popular
                                        </div>
                                    )}

                                    <h3 className="text-sm font-black text-white mb-2 uppercase tracking-wider">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-5xl font-black text-white tracking-tighter">${plan.price}</span>
                                        <span className="text-zinc-500 font-bold text-sm">/mo</span>
                                    </div>
                                    <p className="text-zinc-400 text-xs font-medium mb-8 min-h-[40px]">{plan.desc}</p>

                                    <button
                                        onClick={() => handlePlanSelect(plan)}
                                        className={cn(
                                            "w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-all mb-8",
                                            plan.highlight
                                                ? "bg-[#00E676] hover:bg-[#00C853] text-black shadow-lg shadow-[#00E676]/20"
                                                : "border border-white/10 hover:bg-white/5 text-white"
                                        )}
                                    >
                                        {plan.cta}
                                    </button>

                                    <ul className="space-y-4 flex-1">
                                        {plan.features.map((feat, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-xs font-medium text-zinc-400">
                                                <Check className={cn("h-4 w-4 shrink-0", plan.highlight ? "text-[#00E676]" : "text-zinc-600")} />
                                                <span className="leading-tight">{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {/* Forever Free Tier */}
                        <div className="rounded-3xl border border-white/10 bg-[#080808] p-8 md:p-10 relative overflow-hidden">
                            {/* Badge */}
                            <div className="absolute top-8 left-8 md:static md:inline-block md:mb-4">
                                <div className="inline-flex items-center px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    Forever Free Tier
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 mt-12 md:mt-0">
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4">Just Starting Out?</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
                                        Experience the power of Tradal with our generous free tier. No credit card required.
                                    </p>
                                </div>

                                <div className="flex-[2] grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                                    {[
                                        "30 Trades / Month", "1 Daily AI Analysis", "Manual Journaling",
                                        "1 Year Backtesting", "2 Backtest Sessions", "No Auto-API Access"
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                                            {item}
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <button
                                        onClick={() => onOpenChange(false)}
                                        className="px-8 py-4 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-sm uppercase tracking-wide transition-all whitespace-nowrap"
                                    >
                                        Start for Free
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}