'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCheckoutUrl } from '../actions/billing'
import { Loader2, Check, ShieldCheck, Zap, CreditCard, Lock, Sparkles, Clock, Bitcoin, BadgeCheck, User, ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

type PlanKey = 'free' | 'starter' | 'growth' | 'enterprise'

const PLANS: Record<PlanKey, {
    name: string
    tagline: string
    monthlyPrice: number
    yearlyPrice: number
    features: string[]
    icon: any
    color: string
    hasTrial: boolean
}> = {
    free: {
        name: 'Free',
        tagline: 'Experience the power of AI trading',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: ['50 Lifetime Trades', '1 Portfolio', '3 AI Chats / Day', '1 AI Chart / Day', 'Basic Analytics'],
        icon: User,
        color: 'text-zinc-400',
        hasTrial: false,
    },
    starter: {
        name: 'Starter',
        tagline: 'For traders building their edge',
        monthlyPrice: 19,
        yearlyPrice: 185,
        features: ['Unlimited Trades', '3 Portfolios', 'Unlimited AI Chat', '10 AI Charts / Day', 'Advanced Analytics'],
        icon: Zap,
        color: 'text-emerald-400',
        hasTrial: false,
    },
    growth: {
        name: 'Growth',
        tagline: 'For serious traders seeking consistency',
        monthlyPrice: 29,
        yearlyPrice: 280,
        features: ['Unlimited Auto-Sync', '10 Portfolios', 'Unlimited AI Chat', '30 AI Charts / Day', 'Prop Firm Guardian'],
        icon: Sparkles,
        color: 'text-emerald-400',
        hasTrial: true,
    },
    enterprise: {
        name: 'Enterprise',
        tagline: 'For funded traders managing multi-accounts',
        monthlyPrice: 59,
        yearlyPrice: 570,
        features: ['Everything Unlimited', 'Unlimited Portfolios', 'Unlimited AI Analysis', 'Dedicated Account Manager', 'API Access'],
        icon: ShieldCheck,
        color: 'text-cyan-400',
        hasTrial: true,
    },
}

function SlidingTrustBadges() {
    const badges = [
        { icon: Lock, label: 'SSL Encrypted' },
        { icon: ShieldCheck, label: '30-Day Guarantee' },
        { icon: BadgeCheck, label: 'Cancel Anytime' },
        { icon: Lock, label: 'SSL Encrypted' },
    ]
    return (
        <div className="flex items-center gap-6 text-zinc-600 text-xs font-bold uppercase tracking-wider overflow-hidden">
            {badges.map((b, i) => (
                <div key={i} className="flex items-center gap-2 shrink-0">
                    <b.icon className="w-3.5 h-3.5" />
                    <span>{b.label}</span>
                </div>
            ))}
        </div>
    )
}

function getChargeDate() {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function CheckoutPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const planParam = (searchParams.get('plan')?.toLowerCase() || 'starter') as PlanKey

    // Default to Starter if invalid plan
    const safePlanParam = PLANS[planParam] ? planParam : 'starter'
    const selectedPlan = PLANS[safePlanParam]

    const [loading, setLoading] = useState(false)
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card')
    const [user, setUser] = useState<any>(null)
    const [trialEnabled, setTrialEnabled] = useState(selectedPlan.hasTrial)
    const [isYearly, setIsYearly] = useState(false) // Better state for yearly toggle

    const price = interval === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice
    const showTrial = selectedPlan.hasTrial && trialEnabled
    const chargeDate = getChargeDate()
    const PlanIcon = selectedPlan.icon

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUser(user)
        })
    }, [])

    useEffect(() => {
        setTrialEnabled(selectedPlan.hasTrial)
    }, [safePlanParam])

    // Effect to sync interval state if needed, or just rely on interval
    useEffect(() => {
        if (interval === 'yearly') setIsYearly(true)
        else setIsYearly(false)
    }, [interval])


    const handleCheckout = async () => {
        if (!user) {
            router.push(`/login?next=/checkout?plan=${safePlanParam}`)
            return
        }

        if (safePlanParam === 'free') {
            setLoading(true)
            router.push('/dashboard')
            return
        }

        setLoading(true)
        try {
            const result = await getCheckoutUrl(safePlanParam, interval, showTrial)
            if (result.url) window.location.href = result.url
            else alert('Checkout failed. Please try again.')
        } catch (error) {
            console.error(error)
            alert('An unexpected error occurred.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden font-sans selection:bg-emerald-500/30">

            {/* Background Gradients */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-900/10 to-transparent" />
                <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/5 blur-[120px] rounded-full" />
            </div>

            {/* Premium Header */}
            <div className="w-full border-b border-white/[0.06] bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-bold">Back</span>
                    </Link>

                    {/* Logo Section */}
                    <div className="flex items-center gap-3">
                        <div className="relative h-8 w-auto aspect-[3/1]"> {/* Adjust aspect ratio based on actual logo dimensions */}
                            <img src="/logo.png" alt="The Tradal" className="h-full w-auto object-contain" />
                        </div>
                    </div>

                    <div className="w-16 flex justify-end">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5">
                            <Lock className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 flex items-start justify-center px-4 py-12 relative z-10">
                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-16">

                    {/* LEFT COLUMN: Order Summary */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-3 space-y-8"
                    >
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                                Upgrade Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Edge</span>
                            </h1>
                            <p className="text-zinc-400 font-medium text-lg max-w-lg">
                                Complete your purchase securely to unlock institutional-grade trading tools.
                            </p>
                        </div>

                        {/* Enhanced Plan Card */}
                        <div className="rounded-[2rem] border border-white/[0.08] bg-[#0A0A0A] p-1 relative overflow-hidden group shadow-2xl shadow-emerald-900/10">
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                            <div className="relative bg-zinc-900/40 rounded-[1.8rem] p-8 md:p-10 overflow-hidden">
                                {/* Plan Color Accent */}
                                <div className={`absolute top-0 left-0 w-full h-1 ${selectedPlan.color.replace('text-', 'bg-').replace('400', '500')}`} />

                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                                    <div className="flex items-start gap-5">
                                        <div className={`w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center border border-white/5 shadow-inner`}>
                                            <PlanIcon className={`w-8 h-8 ${selectedPlan.color}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-2xl font-black uppercase tracking-wide text-white">{selectedPlan.name}</h3>
                                                {selectedPlan.hasTrial && <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Free Trial</span>}
                                            </div>
                                            <p className="text-zinc-500 font-medium">{selectedPlan.tagline}</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="flex items-baseline justify-end gap-1.5">
                                            <span className="text-4xl font-black text-white tracking-tight">${price}</span>
                                            <span className="text-zinc-500 font-bold uppercase text-sm">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
                                        </div>
                                        {interval === 'yearly' && <p className="text-emerald-400 text-xs font-bold mt-1">You save 20%</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-8">
                                    {selectedPlan.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center bg-zinc-800/80`}>
                                                <Check className={`w-3 h-3 ${selectedPlan.color}`} />
                                            </div>
                                            <span className="text-sm text-zinc-300 font-medium">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Billing Toggle */}
                                {safePlanParam !== 'free' && (
                                    <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Billing Cycle</span>
                                        <div className="flex bg-black rounded-lg p-1 border border-zinc-800">
                                            <button
                                                onClick={() => setInterval('monthly')}
                                                className={`px-5 py-2 rounded-md text-xs font-bold uppercase transition-all ${interval === 'monthly' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                Monthly
                                            </button>
                                            <button
                                                onClick={() => setInterval('yearly')}
                                                className={`px-5 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${interval === 'yearly' ? 'bg-emerald-500/20 text-emerald-400 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                Yearly <span className="hidden sm:inline bg-emerald-500 text-black text-[9px] px-1.5 rounded-sm font-black">-20%</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <SlidingTrustBadges />
                    </motion.div>

                    {/* RIGHT COLUMN: Payment Details */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2"
                    >
                        <div className="sticky top-28">
                            <div className="rounded-[2rem] border border-white/[0.08] backdrop-blur-xl overflow-hidden bg-zinc-900/60 shadow-2xl shadow-black/50">

                                {/* Header */}
                                <div className="px-8 py-6 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Payment Details</h3>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                        <Lock className="w-3 h-3" />
                                        SECURE
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    {safePlanParam === 'free' ? (
                                        <div className="text-center py-4">
                                            <div className="w-20 h-20 rounded-full bg-zinc-800/50 mx-auto flex items-center justify-center mb-6 border border-white/5">
                                                <User className="w-10 h-10 text-zinc-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Create Account</h3>
                                            <p className="text-sm text-zinc-400 mb-8 px-4">
                                                Join thousands of traders improving their performance with AI. No credit card required.
                                            </p>
                                            <button
                                                onClick={handleCheckout}
                                                disabled={loading}
                                                className="w-full py-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-wider text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Get Started Free'}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Payment Methods */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={() => setPaymentMethod('card')}
                                                    className={`py-4 px-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all ${paymentMethod === 'card' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]' : 'bg-black/40 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                                >
                                                    <CreditCard className="w-6 h-6" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Card / PayPal</span>
                                                </button>
                                                <button
                                                    disabled
                                                    className={`relative py-4 px-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all opacity-60 cursor-not-allowed bg-black/40 border-zinc-800 text-zinc-600`}
                                                >
                                                    <Bitcoin className="w-6 h-6" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Crypto</span>
                                                    <span className="absolute -top-2.5 -right-2 bg-zinc-800 text-white border border-zinc-700 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg">SOON</span>
                                                </button>
                                            </div>

                                            {/* Trial Switch */}
                                            {selectedPlan.hasTrial && (
                                                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-900/10 to-transparent border border-emerald-500/20">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                                            <Sparkles className="w-5 h-5 text-emerald-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white">Enable 7-Day Trial</div>
                                                            <div className="text-[11px] text-zinc-400 font-medium">Test drive before paying</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setTrialEnabled(!trialEnabled)}
                                                        className={`w-12 h-7 rounded-full relative transition-all duration-300 focus:outline-none ${trialEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                                                    >
                                                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${trialEnabled ? 'left-[24px]' : 'left-[4px]'}`} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Summary Lines */}
                                            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-400 font-medium">Subtotal</span>
                                                    <span className="text-white font-bold">${price}.00</span>
                                                </div>
                                                {showTrial && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-emerald-400 font-medium">Trial Discount</span>
                                                        <span className="text-emerald-400 font-bold">-${price}.00</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center pt-3 border-t border-white/[0.06]">
                                                    <span className="text-white font-black text-lg uppercase tracking-wider">Total Due</span>
                                                    <span className="text-3xl font-black text-white">{showTrial ? '$0.00' : `$${price}.00`}</span>
                                                </div>
                                            </div>

                                            {/* Pay Button */}
                                            <button
                                                onClick={handleCheckout}
                                                disabled={loading || !user}
                                                className="w-full py-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-sm transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden"
                                            >
                                                <span className="relative z-10 flex items-center gap-2">
                                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                        <>
                                                            {showTrial ? 'Start Free Trial' : 'Secure Payment'}
                                                            <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                                                        </>
                                                    )}
                                                </span>
                                                {/* Button Glint */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                            </button>

                                            <div className="text-center">
                                                <p className="text-[10px] text-zinc-500 font-medium">
                                                    By continuing, you agree to our <Link href="/terms" className="underline hover:text-white">Terms</Link> and <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>.
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    )
}
