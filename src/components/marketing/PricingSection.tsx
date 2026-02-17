'use client'

import { Check, Zap, Crown, Shield, Sparkles, User, BarChart2, MessageSquare, Briefcase } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface PricingSectionProps {
    user?: any
}

const plans = [
    {
        key: 'free',
        name: 'Free',
        icon: User,
        monthlyPrice: 0,
        yearlyPrice: 0,
        tagline: 'Experience the power of AI trading.',
        features: [
            '50 Lifetime Trades',
            '1 Portfolio',
            '3 AI Chats / Day',
            '1 AI Chart Analysis / Day',
            'Basic Analytics',
        ],
        color: 'zinc',
        popular: false,
        cta: 'Get Started Free',
    },
    {
        key: 'starter',
        name: 'Starter',
        icon: Zap,
        monthlyPrice: 19,
        yearlyPrice: 185,
        tagline: 'For traders building their edge.',
        features: [
            'Unlimited Trades',
            '3 Portfolios',
            'Unlimited AI Chat',
            '10 AI Chart Analysis / Day',
            'Advanced Analytics',
        ],
        color: 'emerald',
        popular: false,
        cta: 'Get Started',
    },
    {
        key: 'growth',
        name: 'Growth',
        icon: Crown,
        monthlyPrice: 29,
        yearlyPrice: 280,
        tagline: 'For serious traders seeking consistency.',
        features: [
            'Unlimited Auto-Sync',
            '10 Portfolios',
            'Unlimited AI Chat',
            '30 AI Chart Analysis / Day',
            'Prop Firm Guardian',
        ],
        color: 'emerald',
        popular: true,
        cta: 'Start 14-Day Trial',
    },
    {
        key: 'enterprise',
        name: 'Enterprise',
        icon: Shield,
        monthlyPrice: 59,
        yearlyPrice: 570,
        tagline: 'For funded traders managing multi-accounts.',
        features: [
            'Everything Unlimited',
            'Unlimited Portfolios',
            'Unlimited AI Analysis',
            'Dedicated Account Manager',
            'API Access',
        ],
        color: 'cyan',
        popular: false,
        cta: 'Get Enterprise',
    },
]

export function PricingSection({ user }: PricingSectionProps) {
    const router = useRouter()
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')

    const handleSelect = (plan: typeof plans[0]) => {
        if (plan.key === 'free') {
            router.push('/signup?plan=free')
        } else {
            // Redirect to universal checkout page
            router.push(`/checkout?plan=${plan.key}`)
        }
    }

    return (
        <section className="py-24 bg-black relative overflow-hidden" id="pricing">
            {/* Background Gradients */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/[0.06] rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/[0.04] rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12 space-y-4"
                >
                    <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter">
                        Choose Your{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                            Edge
                        </span>
                    </h2>
                    <p className="text-zinc-400 font-medium max-w-2xl mx-auto">
                        Stop gambling. Start trading like a professional institution.
                    </p>
                </motion.div>

                {/* Billing Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex justify-center mb-12"
                >
                    <div className="relative flex bg-zinc-900/80 p-1 rounded-xl border border-white/[0.06]">
                        <motion.div
                            className="absolute top-1 bottom-1 rounded-lg bg-emerald-500"
                            initial={false}
                            animate={{
                                left: interval === 'monthly' ? '4px' : '50%',
                                width: 'calc(50% - 4px)',
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                        <button
                            onClick={() => setInterval('monthly')}
                            className={`relative z-10 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${interval === 'monthly' ? 'text-black' : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setInterval('yearly')}
                            className={`relative z-10 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${interval === 'yearly' ? 'text-black' : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            Yearly
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${interval === 'yearly' ? 'bg-black/20 text-black' : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                SAVE 20%
                            </span>
                        </button>
                    </div>
                </motion.div>

                {/* Plans Grid - 4 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1400px] mx-auto">
                    {plans.map((plan, i) => {
                        const price = interval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
                        const PlanIcon = plan.icon

                        return (
                            <motion.div
                                key={plan.key}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 hover:scale-[1.02] ${plan.popular
                                    ? 'border-2 border-emerald-500/40 bg-zinc-900/80 shadow-2xl shadow-emerald-500/10 lg:-translate-y-4 z-10'
                                    : 'border border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700'
                                    }`}
                            >
                                {/* Popular Badge */}
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-1 rounded-full text-[10px] font-black text-black uppercase tracking-widest shadow-lg whitespace-nowrap">
                                        Most Popular
                                    </div>
                                )}

                                {/* Plan Header */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.popular ? 'bg-emerald-500/20' : 'bg-zinc-800'
                                            }`}>
                                            <PlanIcon className={`h-4 w-4 ${plan.popular ? 'text-emerald-400' : 'text-zinc-400'}`} />
                                        </div>
                                        <h3 className={`text-lg font-black uppercase tracking-wider ${plan.popular ? 'text-emerald-400' : 'text-zinc-400'
                                            }`}>
                                            {plan.name}
                                        </h3>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`font-black text-white ${plan.popular ? 'text-4xl' : 'text-3xl'}`}>
                                            ${price}
                                        </span>
                                        <span className="text-zinc-500 font-medium text-sm">
                                            /{interval === 'monthly' ? 'mo' : 'yr'}
                                        </span>
                                    </div>
                                    <p className="text-zinc-500 text-xs mt-3 font-medium min-h-[40px]">{plan.tagline}</p>
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((item) => (
                                        <li key={item} className={`flex items-start gap-3 text-xs ${plan.popular ? 'text-white font-medium' : 'text-zinc-300'
                                            }`}>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.popular ? 'bg-emerald-500/20' : 'bg-zinc-800'
                                                }`}>
                                                <Check className={`h-2.5 w-2.5 ${plan.popular ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                            </div>
                                            <span className="leading-tight">{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleSelect(plan)}
                                    className={`w-full py-3 rounded-xl font-black uppercase tracking-wider text-xs transition-all ${plan.popular
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-black shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
                                        : plan.key === 'free'
                                            ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                                            : 'bg-zinc-800 text-white hover:bg-zinc-700'
                                        }`}
                                >
                                    {plan.cta}
                                </motion.button>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
