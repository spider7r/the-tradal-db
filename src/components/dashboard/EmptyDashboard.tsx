'use client'

import { motion } from 'framer-motion'
import { LineChart, BrainCircuit, ShieldCheck, ArrowRight, Wallet, BarChart3, PieChart } from 'lucide-react'
import { TradeDialog } from '@/components/trades/TradeDialog'
import { useState } from 'react'
import { AccountWizard } from '@/components/accounts/AccountWizard'

export function EmptyDashboard() {
    const [showWizard, setShowWizard] = useState(false)

    if (showWizard) {
        return (
            <AccountWizard
                isMandatory={true}
                onComplete={() => window.location.reload()}
            />
        )
    }

    const features = [
        {
            icon: LineChart,
            title: "Advanced Analytics",
            desc: "Visualize your equity curve, win rate, and daily performance in real-time.",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            icon: BrainCircuit,
            title: "Psychology Tracking",
            desc: "Log your emotions and mental state to find your peak performance zone.",
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20"
        },
        {
            icon: ShieldCheck,
            title: "Risk Management",
            desc: "Smart alerts for daily drawdown and profit targets to keep you disciplined.",
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20"
        }
    ]

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl w-full text-center space-y-12"
            >
                {/* Hero Section */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Ready to start your journey
                    </motion.div>

                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
                        Master Your <br />
                        <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Trading Edge
                        </span>
                    </h1>

                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        Stop gambling and start treating your trading like a business.
                        Track, analyze, and optimize your strategy with professional-grade tools.
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowWizard(true)}
                        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all"
                    >
                        Initialize The Tradal
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + (i * 0.1) }}
                            className={`p-6 rounded-3xl border ${feature.border} ${feature.bg} backdrop-blur-sm hover:bg-opacity-20 transition-colors`}
                        >
                            <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-4`}>
                                <feature.icon className={`w-6 h-6 ${feature.color}`} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Social Proof / Trust (Optional Visual) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="pt-8 flex justify-center gap-8 opacity-50 grayscale"
                >
                    {/* Just some visual noise/icons to look like "integrated with" or "trusted by" style */}
                    <div className="flex items-center gap-2 text-zinc-600">
                        <Wallet className="w-5 h-5" />
                        <span className="font-bold">Multi-Currency</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-600">
                        <BarChart3 className="w-5 h-5" />
                        <span className="font-bold">Deep Analytics</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-600">
                        <PieChart className="w-5 h-5" />
                        <span className="font-bold">Portfolio View</span>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    )
}
