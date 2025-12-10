'use client'

import { useState } from 'react'
import { createAccount } from '@/app/(dashboard)/accounts/actions'
import { Loader2, CheckCircle2, AlertCircle, X, Info, Trophy, Target, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type Step = 'TYPE' | 'PROGRAM' | 'DETAILS' | 'RULES' | 'REVIEW'

interface AccountWizardProps {
    onComplete?: () => void
    onSkip?: () => void
    isMandatory?: boolean
}

export function AccountWizard({ onComplete, onSkip, isMandatory = false }: AccountWizardProps) {
    const [step, setStep] = useState<Step>('TYPE')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        type: 'LIVE' as 'LIVE' | 'FUNDED',
        programType: 'ONE_STEP' as 'ONE_STEP' | 'TWO_STEP' | 'THREE_STEP' | 'INSTANT',
        name: '',
        balance: '',
        currency: 'USD',
        propFirm: '',
        challengeType: 'PHASE_1',
        dailyDrawdown: '',
        maxDrawdown: '',
        dailyDrawdownType: 'STATIC' as 'STATIC' | 'TRAILING',
        maxDrawdownType: 'STATIC' as 'STATIC' | 'TRAILING',
        profitTarget: '',
        consistencyRule: false,
        consistencyScore: '',
    })

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)
        try {
            // Convert percentages to fiat for storage
            const balance = parseFloat(formData.balance)
            const submissionData = {
                ...formData,
                dailyDrawdown: formData.dailyDrawdown ? (balance * (parseFloat(formData.dailyDrawdown) / 100)).toString() : '',
                maxDrawdown: formData.maxDrawdown ? (balance * (parseFloat(formData.maxDrawdown) / 100)).toString() : '',
                dailyDrawdownType: formData.dailyDrawdownType,
                maxDrawdownType: formData.maxDrawdownType,
                profitTarget: formData.profitTarget ? (balance * (parseFloat(formData.profitTarget) / 100)).toString() : '',
            }

            const result = await createAccount(submissionData)
            if (result?.error) {
                setError(result.error)
                setLoading(false)
                return
            }

            if (onComplete) {
                onComplete()
            } else {
                window.location.reload() // Force reload to ensure new account is picked up immediately
            }
        } catch (e: any) {
            console.error(e)
            setError(e.message || 'Failed to create account. Please try again.')
            setLoading(false)
        }
    }

    const steps = ['TYPE', formData.type === 'FUNDED' ? 'PROGRAM' : null, 'DETAILS', formData.type === 'FUNDED' ? 'RULES' : null, 'REVIEW'].filter(Boolean)

    const isStepValid = () => {
        switch (step) {
            case 'TYPE':
                return true
            case 'PROGRAM':
                return !!formData.programType
            case 'DETAILS':
                return !!formData.name.trim() && !!formData.balance
            case 'RULES':
                if (formData.type === 'FUNDED') {
                    return !!formData.propFirm.trim() &&
                        !!formData.dailyDrawdown &&
                        !!formData.maxDrawdown &&
                        !!formData.profitTarget
                }
                return true
            case 'REVIEW':
                return true
            default:
                return false
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-900/90 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="relative border-b border-zinc-800 bg-zinc-900/50 p-6 text-center">
                    {!isMandatory && onSkip && (
                        <button
                            onClick={onSkip}
                            className="absolute right-4 top-4 rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                    <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Setup The Tradal
                    </h2>
                    <p className="text-zinc-400 mt-1">Configure your account to start tracking.</p>
                </div>

                {/* Progress Steps */}
                <div className="px-8 pt-6">
                    <div className="flex justify-center gap-2">
                        {steps.map((s, i) => (
                            <div key={i} className="flex items-center">
                                <div className={cn(
                                    "h-2 w-12 rounded-full transition-all duration-500",
                                    step === s || (steps.indexOf(step as string) > i)
                                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                                        : "bg-zinc-800"
                                )} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {error && (
                        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 'TYPE' && (
                            <motion.div
                                key="type"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                                <button
                                    onClick={() => setFormData({ ...formData, type: 'LIVE' })}
                                    className={cn(
                                        "group relative flex flex-col items-center gap-4 rounded-2xl border p-8 transition-all hover:scale-[1.02]",
                                        formData.type === 'LIVE'
                                            ? "border-emerald-500 bg-emerald-500/10"
                                            : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                                    )}
                                >
                                    <div className={cn(
                                        "rounded-full p-4 transition-colors",
                                        formData.type === 'LIVE' ? "bg-emerald-500 text-white" : "bg-zinc-900 text-zinc-500 group-hover:text-white"
                                    )}>
                                        <Shield className="h-8 w-8" />
                                    </div>
                                    <div className="text-center">
                                        <span className={cn("block text-xl font-bold", formData.type === 'LIVE' ? "text-white" : "text-zinc-300")}>Live Account</span>
                                        <span className="text-sm text-zinc-500">Real money trading with your own capital.</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setFormData({ ...formData, type: 'FUNDED' })}
                                    className={cn(
                                        "group relative flex flex-col items-center gap-4 rounded-2xl border p-8 transition-all hover:scale-[1.02]",
                                        formData.type === 'FUNDED'
                                            ? "border-cyan-500 bg-cyan-500/10"
                                            : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                                    )}
                                >
                                    <div className={cn(
                                        "rounded-full p-4 transition-colors",
                                        formData.type === 'FUNDED' ? "bg-cyan-500 text-white" : "bg-zinc-900 text-zinc-500 group-hover:text-white"
                                    )}>
                                        <Trophy className="h-8 w-8" />
                                    </div>
                                    <div className="text-center">
                                        <span className={cn("block text-xl font-bold", formData.type === 'FUNDED' ? "text-white" : "text-zinc-300")}>Funded / Prop</span>
                                        <span className="text-sm text-zinc-500">Challenge or funded account (FTMO, etc).</span>
                                    </div>
                                </button>
                            </motion.div>
                        )}

                        {step === 'PROGRAM' && (
                            <motion.div
                                key="program"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h3 className="text-xl font-semibold text-white">Select Program Structure</h3>
                                <div className="space-y-4">
                                    {[
                                        {
                                            id: 'ONE_STEP',
                                            label: '1-Step Challenge (Single Phase)',
                                            desc: 'Only one challenge phase is required before funding.',
                                            details: [
                                                'Profit Target: 8–10%',
                                                'Daily Drawdown: 4–5%',
                                                'Max Drawdown: 8–10%',
                                                'Popular for: Fastest path to funding.'
                                            ],
                                            examples: 'FundedNext 1-Step, FTP 1-Step'
                                        },
                                        {
                                            id: 'TWO_STEP',
                                            label: '2-Step Challenge (Standard)',
                                            desc: 'Traders must pass Phase 1 and Phase 2.',
                                            details: [
                                                'Phase 1 Target: 8–10%',
                                                'Phase 2 Target: 4–5%',
                                                'Drawdown: ≈5% Daily / 10% Total',
                                                'Most common model.'
                                            ],
                                            examples: 'FTMO, TFT Challenge'
                                        },
                                        {
                                            id: 'THREE_STEP',
                                            label: '3-Step Challenge (High Consistency)',
                                            desc: 'Three phases with decreasing profit targets.',
                                            details: [
                                                'Phase 1: 10% | Phase 2: 5–6% | Phase 3: 3–4%',
                                                'Drawdown: ≈5% Daily / 10% Total',
                                                'For high-consistency traders.'
                                            ],
                                            examples: 'Specific firms offering 3-step'
                                        },
                                        {
                                            id: 'INSTANT',
                                            label: 'Instant Funding (No Challenge)',
                                            desc: 'Skip evaluation and get funded instantly.',
                                            details: [
                                                'No Profit Target',
                                                'Daily DD: 3–5% | Max DD: 6–10%',
                                                'Lower initial payouts (50–70%)',
                                                'Start earning immediately.'
                                            ],
                                            examples: 'Funding Pips Instant, TFT Instant'
                                        },
                                    ].map((prog) => (
                                        <button
                                            key={prog.id}
                                            onClick={() => setFormData({ ...formData, programType: prog.id as any })}
                                            className={cn(
                                                "w-full flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border p-6 transition-all text-left group",
                                                formData.programType === prog.id
                                                    ? "border-cyan-500 bg-cyan-500/10"
                                                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                                            )}
                                        >
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("font-bold text-lg", formData.programType === prog.id ? "text-cyan-400" : "text-white")}>
                                                        {prog.label}
                                                    </span>
                                                    {formData.programType === prog.id && <CheckCircle2 className="h-5 w-5 text-cyan-500" />}
                                                </div>
                                                <p className="text-sm text-zinc-400">{prog.desc}</p>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                                    {prog.details.map((d, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                                                            <div className="h-1 w-1 rounded-full bg-zinc-700" />
                                                            {d}
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-zinc-600 mt-2">Examples: {prog.examples}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 'DETAILS' && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Account Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                                        placeholder="e.g., My Forex Journey"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Initial Balance</label>
                                        <input
                                            type="number"
                                            value={formData.balance}
                                            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                                            placeholder="10000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Currency</label>
                                        <select
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="GBP">GBP (£)</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 'RULES' && formData.type === 'FUNDED' && (
                            <motion.div
                                key="rules"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">Prop Firm Name</label>
                                            <input
                                                type="text"
                                                value={formData.propFirm}
                                                onChange={(e) => setFormData({ ...formData, propFirm: e.target.value })}
                                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white focus:border-cyan-500 focus:outline-none"
                                                placeholder="e.g., FTMO"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">Current Phase</label>
                                            <select
                                                value={formData.challengeType}
                                                onChange={(e) => setFormData({ ...formData, challengeType: e.target.value })}
                                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white focus:border-cyan-500 focus:outline-none"
                                            >
                                                <option value="PHASE_1">Phase 1</option>
                                                {['TWO_STEP', 'THREE_STEP'].includes(formData.programType) && (
                                                    <option value="PHASE_2">Phase 2</option>
                                                )}
                                                {formData.programType === 'THREE_STEP' && (
                                                    <option value="PHASE_3">Phase 3</option>
                                                )}
                                                <option value="INSTANT">Funded / Live</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Tips Card */}
                                    <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-6">
                                        <div className="flex items-center gap-2 mb-4 text-cyan-400">
                                            <Info className="h-5 w-5" />
                                            <span className="font-semibold">Pro Tip</span>
                                        </div>
                                        <p className="text-sm text-zinc-400 leading-relaxed">
                                            Most traders fail because they ignore drawdown limits.
                                            Set your daily loss limit slightly <strong>tighter</strong> than the firm's rule (e.g., if 5%, aim for 4%) to give yourself a buffer.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Daily DD (%)</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    value={formData.dailyDrawdown}
                                                    onChange={(e) => setFormData({ ...formData, dailyDrawdown: e.target.value })}
                                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white focus:border-cyan-500 focus:outline-none"
                                                    placeholder="5"
                                                />
                                                <span className="absolute right-3 top-3 text-zinc-500">%</span>
                                            </div>
                                            <select
                                                value={formData.dailyDrawdownType}
                                                onChange={(e) => setFormData({ ...formData, dailyDrawdownType: e.target.value as 'STATIC' | 'TRAILING' })}
                                                className="w-24 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                                            >
                                                <option value="STATIC">Static</option>
                                                <option value="TRAILING">Trailing</option>
                                            </select>
                                        </div>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            ≈ {formData.balance && formData.dailyDrawdown ? (parseFloat(formData.balance) * (parseFloat(formData.dailyDrawdown) / 100)).toLocaleString() : '0'} {formData.currency}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Max DD (%)</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    value={formData.maxDrawdown}
                                                    onChange={(e) => setFormData({ ...formData, maxDrawdown: e.target.value })}
                                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white focus:border-cyan-500 focus:outline-none"
                                                    placeholder="10"
                                                />
                                                <span className="absolute right-3 top-3 text-zinc-500">%</span>
                                            </div>
                                            <select
                                                value={formData.maxDrawdownType}
                                                onChange={(e) => setFormData({ ...formData, maxDrawdownType: e.target.value as 'STATIC' | 'TRAILING' })}
                                                className="w-24 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                                            >
                                                <option value="STATIC">Static</option>
                                                <option value="TRAILING">Trailing</option>
                                            </select>
                                        </div>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            ≈ {formData.balance && formData.maxDrawdown ? (parseFloat(formData.balance) * (parseFloat(formData.maxDrawdown) / 100)).toLocaleString() : '0'} {formData.currency}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Profit Target (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.profitTarget}
                                                onChange={(e) => setFormData({ ...formData, profitTarget: e.target.value })}
                                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white focus:border-cyan-500 focus:outline-none"
                                                placeholder="10"
                                            />
                                            <span className="absolute right-3 top-3 text-zinc-500">%</span>
                                        </div>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            ≈ {formData.balance && formData.profitTarget ? (parseFloat(formData.balance) * (parseFloat(formData.profitTarget) / 100)).toLocaleString() : '0'} {formData.currency}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 'REVIEW' && (
                            <motion.div
                                key="review"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-8">
                                    <h3 className="font-semibold text-white mb-6">Review Configuration</h3>
                                    <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                        <div className="col-span-2 border-b border-zinc-900 pb-4 mb-2">
                                            <dt className="text-zinc-500 text-xs uppercase tracking-wider">Account Type</dt>
                                            <dd className="text-white text-lg font-medium">{formData.type === 'LIVE' ? 'Live Account' : `Funded (${formData.programType.replace('_', ' ')})`}</dd>
                                        </div>

                                        <div>
                                            <dt className="text-zinc-500">Name</dt>
                                            <dd className="text-white font-medium">{formData.name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-zinc-500">Balance</dt>
                                            <dd className="text-white font-medium">{formData.currency} {formData.balance}</dd>
                                        </div>

                                        {formData.type === 'FUNDED' && (
                                            <>
                                                <div>
                                                    <dt className="text-zinc-500">Firm</dt>
                                                    <dd className="text-white font-medium">{formData.propFirm}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-zinc-500">Phase</dt>
                                                    <dd className="text-white font-medium">{formData.challengeType}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-zinc-500">Max Drawdown</dt>
                                                    <dd className="text-red-400 font-medium">
                                                        {formData.maxDrawdown}% (${(parseFloat(formData.balance) * (parseFloat(formData.maxDrawdown) / 100)).toLocaleString()})
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-zinc-500">Profit Target</dt>
                                                    <dd className="text-emerald-400 font-medium">
                                                        {formData.profitTarget}% (${(parseFloat(formData.balance) * (parseFloat(formData.profitTarget) / 100)).toLocaleString()})
                                                    </dd>
                                                </div>
                                            </>
                                        )}
                                    </dl>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-800 bg-zinc-900/50 p-6 flex justify-between items-center">
                    <button
                        onClick={() => {
                            const currentIndex = steps.indexOf(step as string)
                            if (currentIndex > 0) {
                                setStep(steps[currentIndex - 1] as Step)
                            }
                        }}
                        disabled={step === 'TYPE' || loading}
                        className="rounded-lg px-6 py-2 text-sm font-medium text-zinc-400 hover:text-white disabled:opacity-0 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => {
                            const currentIndex = steps.indexOf(step as string)
                            if (currentIndex < steps.length - 1) {
                                setStep(steps[currentIndex + 1] as Step)
                            } else {
                                handleSubmit()
                            }
                        }}
                        disabled={loading || !isStepValid()}
                        className={cn(
                            "flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100",
                            formData.type === 'LIVE' ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20" : "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20"
                        )}
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {step === 'REVIEW' ? 'Create Account' : 'Next Step'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
