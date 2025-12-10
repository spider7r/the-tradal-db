'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X, Share2, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react'
import Image from 'next/image'
import confetti from 'canvas-confetti'
import html2canvas from 'html2canvas'
import { unlockAchievement } from '@/app/(dashboard)/achievements/actions'
import { Certificate } from '@/components/achievements/Certificate'

interface AchievementManagerProps {
    account: any
    currentBalance: number
    dailyPnL: number
    achievements: any[]
    dailyPeakBalance?: number
}

export function AchievementManager({ account, currentBalance, dailyPnL, achievements, dailyPeakBalance }: AchievementManagerProps) {
    const [popup, setPopup] = useState<{ type: 'SUCCESS' | 'FAILURE', title: string, message: string, badge: string } | null>(null)
    const [isDismissed, setIsDismissed] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const certificateRef = useRef<HTMLDivElement>(null)

    const handleShare = async () => {
        setIsGenerating(true)

        // Wait for render cycle and asset loading
        setTimeout(async () => {
            if (!certificateRef.current) {
                setIsGenerating(false)
                return
            }

            try {
                const canvas = await html2canvas(certificateRef.current, {
                    scale: 3, // Ultra High Quality
                    backgroundColor: null,
                    logging: false,
                    useCORS: true,
                    allowTaint: true,
                    scrollX: 0,
                    scrollY: 0,
                    foreignObjectRendering: false,
                    onclone: (doc) => {
                        // Force styles if needed, but visible render should handle it
                        const el = doc.getElementById('cert-element')
                        if (el) el.style.visibility = 'visible'
                    }
                } as any)

                const image = canvas.toDataURL('image/png')
                const link = document.createElement('a')
                link.href = image
                link.download = `Certificate_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`
                link.click()
            } catch (err) {
                console.error('Failed to generate certificate:', err)
            } finally {
                setIsGenerating(false)
            }
        }, 800) // 800ms delay to guarantee fonts/images load in the visible view
    }

    const triggerConfetti = () => {
        const duration = 3 * 1000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now()

            if (timeLeft <= 0) {
                return clearInterval(interval)
            }

            const particleCount = 50 * (timeLeft / duration)
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
        }, 250)
    }

    useEffect(() => {
        if (!account) return

        const initialBalance = Number(account.initial_balance) || 0
        const currentHWM = Math.max(Number(account.high_water_mark) || 0, initialBalance, currentBalance)
        const gain = currentBalance - initialBalance

        const profitTarget = Number(account.profit_target)
        const maxDrawdown = Number(account.max_drawdown_limit)
        const dailyDrawdown = Number(account.daily_drawdown_limit)

        const maxDrawdownType = account.max_drawdown_type || 'STATIC'
        const dailyDrawdownType = account.daily_drawdown_type || 'STATIC'

        const checkAchievements = async () => {
            // 1. Check Profit Target (Success)
            if (profitTarget && profitTarget > 0 && gain >= profitTarget) {
                const badgeCode = `TARGET_HIT_${account.id}`
                const sessionKey = `SHOWN_TARGET_${account.id}`
                const hasShownSession = sessionStorage.getItem(sessionKey)

                // Only show if not already unlocked AND not shown in this session
                const isAlreadyUnlocked = achievements.some(a => a.badge_code === badgeCode)

                if (!isAlreadyUnlocked && !hasShownSession) {
                    const result = await unlockAchievement(badgeCode)
                    if (result?.newUnlock) {
                        setPopup({
                            type: 'SUCCESS',
                            title: 'Target Smashed!',
                            message: `You've hit your profit target of $${profitTarget.toLocaleString()}!`,
                            badge: 'TARGET_HIT'
                        })
                        triggerConfetti()
                        sessionStorage.setItem(sessionKey, 'true')
                    }
                }
            }

            // If dismissed, don't show failure popups again until reload or component remount
            if (isDismissed) return

            // 2. Check Max Drawdown (Failure)
            let isMaxBreached = false
            if (maxDrawdown && maxDrawdown > 0) {
                if (maxDrawdownType === 'TRAILING') {
                    if (currentBalance <= (currentHWM - maxDrawdown)) isMaxBreached = true
                } else {
                    if (gain <= -maxDrawdown) isMaxBreached = true
                }
            }

            if (isMaxBreached) {
                // Show popup if not currently showing a failure popup
                if (popup?.type !== 'FAILURE') {
                    setPopup({
                        type: 'FAILURE',
                        title: 'Don\'t Give Up!',
                        message: `You've hit your max drawdown limit. It happens to the best of us. Review your trades, learn from this, and come back stronger.`,
                        badge: 'MAX_DD_HIT'
                    })
                }
                return // Prioritize Max Drawdown
            }

            // 3. Check Daily Drawdown (Failure)
            let isDailyBreached = false
            if (dailyDrawdown && dailyDrawdown > 0) {
                if (dailyDrawdownType === 'TRAILING') {
                    // For Daily Trailing, we check if current balance is below (DailyPeak - DailyLimit)
                    // Fallback to startOfDayBalance if dailyPeakBalance is not yet established (no trades today)
                    const startOfDayBalance = currentBalance - dailyPnL
                    const effectiveDailyPeak = dailyPeakBalance !== undefined ? dailyPeakBalance : startOfDayBalance

                    if (currentBalance <= (effectiveDailyPeak - dailyDrawdown)) isDailyBreached = true
                } else {
                    if (dailyPnL <= -dailyDrawdown) isDailyBreached = true
                }
            }

            if (isDailyBreached) {
                // Show popup if not currently showing a failure popup
                if (popup?.type !== 'FAILURE') {
                    setPopup({
                        type: 'FAILURE',
                        title: 'Daily Limit Reached',
                        message: `You've hit your daily limit. Discipline is key to longevity. Step away for today and reset for tomorrow.`,
                        badge: 'DAILY_DD_HIT'
                    })
                }
            }
        }

        checkAchievements()
    }, [account, currentBalance, dailyPnL, achievements, popup, isDismissed, dailyPeakBalance])

    if (!popup && !isGenerating) return null

    return (
        <>
            {/* Generation Overlay - VISIBLE on screen to enforce rendering */}
            {isGenerating && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm">
                    {/* The Certificate to Capture */}
                    <div className="relative shadow-2xl scale-75 md:scale-100 transform-gpu transition-all">
                        <Certificate
                            id="cert-element"
                            ref={certificateRef}
                            accountName={account.name}
                            type="TARGET_HIT"
                            date={new Date().toLocaleDateString()}
                            amount={Number(account.profit_target)}
                            currency={account.currency || 'USD'}
                            certificateId={`CERT-${account.id.substring(0, 8).toUpperCase()}`}
                            achievements={achievements}
                        />
                    </div>
                    {/* Loading Text */}
                    <div className="mt-8 flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                        <p className="text-emerald-500 font-bold animate-pulse">Generating High-Res Certificate...</p>
                    </div>
                </div>
            )}

            {/* Achievement Popup */}
            <AnimatePresence>
                {popup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 50 }}
                            transition={{ type: "spring", bounce: 0.4 }}
                            className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-zinc-950 border border-zinc-800 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                        >
                            {/* Dynamic Background Gradient */}
                            <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${popup.type === 'SUCCESS' ? 'from-emerald-500 via-teal-500 to-zinc-950' : 'from-red-500 via-orange-500 to-zinc-950'}`} />

                            {/* Grid Pattern Overlay */}
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

                            {/* Close Button */}
                            <button
                                onClick={() => { setPopup(null); setIsDismissed(true); }}
                                className="absolute right-6 top-6 z-20 rounded-full bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="relative z-10 flex flex-col items-center p-10 text-center">
                                {/* Animated Icon Container */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="mb-8 relative"
                                >
                                    <div className={`absolute inset-0 blur-3xl opacity-50 ${popup.type === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <div className={`relative h-24 w-24 rounded-3xl flex items-center justify-center border-2 shadow-2xl ${popup.type === 'SUCCESS'
                                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-400/50'
                                        : 'bg-gradient-to-br from-red-500 to-red-700 border-red-400/50'
                                        }`}>
                                        {popup.type === 'SUCCESS' ? (
                                            <Trophy className="h-12 w-12 text-white drop-shadow-lg" />
                                        ) : (
                                            <ShieldAlert className="h-12 w-12 text-white drop-shadow-lg" />
                                        )}
                                    </div>
                                    {popup.type === 'SUCCESS' && (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                            className="absolute -top-2 -right-2"
                                        >
                                            <Sparkles className="h-8 w-8 text-yellow-300 fill-yellow-300" />
                                        </motion.div>
                                    )}
                                </motion.div>

                                {/* Title & Account Info */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <h2 className="mb-3 text-4xl font-black text-white tracking-tight leading-none">
                                        {popup.title}
                                    </h2>
                                    <div className="flex items-center justify-center gap-2 mb-6">
                                        <span className="text-zinc-400 font-medium">{account.name}</span>
                                        <span className="h-1 w-1 rounded-full bg-zinc-700" />
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${popup.type === 'SUCCESS'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {account.type}
                                        </span>
                                    </div>
                                </motion.div>

                                {/* Message */}
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="mb-10 text-lg text-zinc-300 leading-relaxed max-w-sm mx-auto"
                                >
                                    {popup.message}
                                </motion.p>

                                {/* Actions */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="w-full space-y-3"
                                >
                                    {popup.type === 'SUCCESS' && (
                                        <button
                                            onClick={handleShare}
                                            disabled={isGenerating}
                                            className="group relative w-full overflow-hidden rounded-2xl bg-white py-4 text-black font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                            <span className="relative flex items-center justify-center gap-2">
                                                {isGenerating ? (
                                                    <span className="animate-pulse">Generating...</span>
                                                ) : (
                                                    <>
                                                        <Share2 className="h-5 w-5" />
                                                        Download Certificate
                                                    </>
                                                )}
                                            </span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setPopup(null); setIsDismissed(true); }}
                                        className="w-full py-3 text-sm font-medium text-zinc-500 hover:text-white transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
