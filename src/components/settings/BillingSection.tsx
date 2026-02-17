'use client'

import { Crown, Check, Zap, Shield, CreditCard, Award } from 'lucide-react'
// import { ManualPaymentDialog } from '@/components/upgrade/ManualPaymentDialog' // Removed
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BillingSection({ user }: { user: any }) {
    const router = useRouter()
    const [showPayment, setShowPayment] = useState(false) // Keeping state for now to minimize diff, or remove if unused warning is ok (VSCode usually handles it)
    const currentPlan = user?.plan_tier || 'STARTER'

    // Dynamic Plan Details
    const planDetails = {
        'STARTER': {
            name: 'Starter Plan',
            color: 'text-zinc-400',
            bg: 'bg-zinc-800',
            icon: Shield,
            features: ['10 AI Charts/day', 'Basic Analytics', 'Community Access']
        },
        'PROFESSIONAL': {
            name: 'Professional',
            color: 'text-amber-500',
            bg: 'from-amber-500 to-orange-600',
            icon: Crown,
            features: ['Unlimited AI Chat & Analysis', 'Advanced Market Structure', 'Priority Support', 'Full History']
        },
        'ELITE': {
            name: 'Elite Status',
            color: 'text-purple-500',
            bg: 'from-purple-500 to-indigo-600',
            icon: Award,
            features: ['Everything in Pro', 'Dedicated Success Manager', '1-on-1 Strategy Calls', 'Early Access Features']
        }
    }

    // @ts-ignore
    const currentDetails = planDetails[currentPlan] || planDetails['STARTER']

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Billing & Plans</h3>
                <p className="text-sm text-zinc-400 font-medium">Manage your subscription and billing details.</p>
            </div>

            {/* Current Plan Card */}
            <div className="relative rounded-[2rem] border border-zinc-800 bg-zinc-900 p-8 overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest ${currentPlan === 'ELITE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        currentPlan === 'PROFESSIONAL' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                        {currentPlan} PLAN
                    </span>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-3 rounded-2xl bg-gradient-to-br shadow-lg ${currentPlan === 'STARTER' ? 'bg-zinc-800' : currentDetails.bg
                            }`}>
                            <currentDetails.icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-white italic uppercase tracking-tight">{currentDetails.name}</h4>
                            {currentPlan === 'PROFESSIONAL' && <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Active</p>}
                            {currentPlan === 'ELITE' && <p className="text-xs text-purple-500 font-bold uppercase tracking-wider">VIP Status Active</p>}
                            {currentPlan === 'STARTER' && <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Free Tier</p>}
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        {/* @ts-ignore */}
                        {currentDetails.features.map((feat, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                                <Check className={`h-4 w-4 ${currentPlan === 'ELITE' ? 'text-purple-500' :
                                    currentPlan === 'PROFESSIONAL' ? 'text-amber-500' :
                                        'text-zinc-600'
                                    }`} />
                                <span>{feat}</span>
                            </div>
                        ))}
                    </div>

                    {currentPlan !== 'ELITE' && (
                        <button
                            onClick={() => router.push('/checkout?plan=growth')}
                            className="w-full py-4 rounded-xl bg-white text-black font-black uppercase tracking-wider hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <Zap className="h-4 w-4 fill-black" />
                            Upgrade Plan
                        </button>
                    )}
                    {currentPlan === 'ELITE' && (
                        <div className="w-full py-4 rounded-xl bg-zinc-800 text-zinc-500 font-black uppercase tracking-wider text-center cursor-not-allowed">
                            Max Plan Active
                        </div>
                    )}

                    <p className="text-center text-xs text-zinc-500 mt-4">
                        Secure manual payment via Crypto or Bank Transfer.
                    </p>
                </div>
            </div>

            {/* Payment History (Placeholder) */}
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 p-8 opacity-50">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="h-5 w-5 text-zinc-500" />
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">Payment History</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-zinc-500 gap-2">
                    <CreditCard className="h-8 w-8 opacity-20" />
                    <span className="text-sm font-medium">No payment history found.</span>
                </div>
            </div>

            {/* ManualPaymentDialog removed */}
        </div>
    )
}
