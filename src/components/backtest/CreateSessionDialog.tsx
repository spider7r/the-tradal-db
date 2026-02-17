'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight, Check, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createBacktestSession, getStrategiesList, fetchMarketData } from '@/app/(dashboard)/backtest/actions'
// ... existing imports
import { OnboardingPricingDialog } from '@/components/upgrade/OnboardingPricingDialog'

export function CreateSessionDialog({ open, onOpenChange }: CreateSessionDialogProps) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [showPricing, setShowPricing] = useState(false)

    // ... existing state ...

    const handleCreate = async () => {
        setIsLoading(true)
        try {
            const session = await createBacktestSession({
                name,
                balance: parseFloat(balance),
                asset,
                layout,
                type: sessionType,
                strategyId: strategyId === 'none' ? undefined : strategyId,
                // PERMANENT FIX: Use localDateToUTC to prevent timezone offset bugs
                startDate: startDate ? localDateToUTC(startDate) : undefined,
                endDate: endDate ? localDateToUTC(endDate) : undefined,
                timezone,
                challengeRules: sessionType === 'PROP_FIRM' ? challengeRules : undefined
            })

            toast.success('Session created successfully!')
            onOpenChange(false)
            router.push(`/backtest/session/${session.id}`)
        } catch (error: any) {
            console.error('Session creation error:', error)
            if (error.message && error.message.includes('LIMIT_REACHED')) {
                // Show pricing dialog
                setShowPricing(true)
                // Optional: Show toast explaining why
                toast.error(error.message.replace('LIMIT_REACHED: ', ''))
            } else {
                toast.error(error.message || 'Failed to create session')
            }
        } finally {
            setIsLoading(false)
        }
    }

    // ... existing render ...

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                {/* ... existing dialog content ... */}
                <DialogContent className="sm:max-w-[600px] bg-[#0A0A0A] border-white/5 text-white p-0 gap-0 overflow-hidden min-h-[500px] flex flex-col w-[95vw]">
                    <DialogTitle className="sr-only">Create New Session</DialogTitle>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 sm:p-6 pb-2 sm:pb-4 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            {step > 1 && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-[#94A3B8] hover:text-white" onClick={handleBack}>
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                            )}
                            <span className="text-xs sm:text-sm font-bold text-[#94A3B8]">Step {step} of 4</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#94A3B8] hover:text-white" onClick={() => onOpenChange(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 bg-white/5 w-full">
                        <motion.div
                            className="h-full bg-[#00E676]"
                            initial={{ width: '25%' }}
                            animate={{ width: `${step * 25}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {step === 1 && (
                                    <Step1SessionType
                                        selectedType={sessionType}
                                        onSelect={(type) => {
                                            setSessionType(type)
                                            setStep(2)
                                        }}
                                    />
                                )}
                                {step === 2 && (
                                    <Step2AssetTime
                                        asset={asset} setAsset={setAsset}
                                        startDate={startDate} setStartDate={setStartDate}
                                        endDate={endDate} setEndDate={setEndDate}
                                        timezone={timezone} setTimezone={setTimezone}
                                    />
                                )}
                                {step === 3 && (
                                    <Step3Config
                                        sessionType={sessionType}
                                        name={name} setName={setName}
                                        balance={balance} setBalance={setBalance}
                                        strategyId={strategyId} setStrategyId={setStrategyId}
                                        strategies={strategies}
                                        challengeRules={challengeRules} setChallengeRules={setChallengeRules}
                                    />
                                )}
                                {step === 4 && (
                                    <Step4Review
                                        sessionType={sessionType}
                                        name={name}
                                        asset={asset}
                                        balance={balance}
                                        startDate={startDate}
                                        endDate={endDate}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-6 pt-4 border-t border-white/5 bg-[#050505]">
                        {/* Pre-fetch Status Bar */}
                        {showPrefetchStatus && (
                            <div className="mb-3 flex items-center gap-2">
                                {prefetchState.status === 'loading' && (
                                    <div className="flex-1 flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-amber-400 to-[#00E676] rounded-full"
                                                initial={{ width: '0%' }}
                                                animate={{ width: `${prefetchState.progress}%` }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-amber-400 font-mono">{prefetchState.progress}%</span>
                                    </div>
                                )}
                                {prefetchState.status === 'done' && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#00E676] font-mono">
                                        <Check className="w-3 h-3" />
                                        Data pre-loaded · {prefetchState.data1m?.length?.toLocaleString()} candles
                                    </div>
                                )}
                                {prefetchState.status === 'error' && (
                                    <span className="text-[10px] text-red-400 font-mono">Pre-load failed · will retry on launch</span>
                                )}
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <Button
                                variant="ghost"
                                className="text-[#94A3B8] hover:text-white"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>

                            {step < 4 ? (
                                <Button
                                    className="bg-white text-black hover:bg-white/90 font-bold"
                                    onClick={handleNext}
                                    disabled={step === 1} // Step 1 auto-advances
                                >
                                    Next Step <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    className="bg-[#00E676] hover:bg-[#00C853] text-black font-bold min-w-[140px]"
                                    onClick={handleCreate}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Launching...' : prefetchState.status === 'done' ? '⚡ Instant Launch' : 'Launch Session'}
                                    {!isLoading && <Check className="w-4 h-4 ml-2" />}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <OnboardingPricingDialog open={showPricing} onOpenChange={setShowPricing} />
        </>
    )
}
    )
}

function InfoIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
        </svg>
    )
}

