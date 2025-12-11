'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createBacktestSession, getStrategiesList } from '@/app/(dashboard)/backtest/actions'
import { ChallengeRules } from './PropFirmSettings'
import { Step1SessionType, Step2AssetTime, Step3Config, Step4Review } from './SessionWizardSteps'
import { motion, AnimatePresence } from 'framer-motion'

interface CreateSessionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateSessionDialog({ open, onOpenChange }: CreateSessionDialogProps) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [sessionType, setSessionType] = useState<'BACKTEST' | 'PROP_FIRM'>('BACKTEST')
    const [name, setName] = useState('')
    const [balance, setBalance] = useState('100000')
    const [asset, setAsset] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [timezone, setTimezone] = useState('America/New_York')
    const [layout, setLayout] = useState('')
    const [strategyId, setStrategyId] = useState('')
    const [strategies, setStrategies] = useState<any[]>([])

    // Prop Firm State
    const [challengeRules, setChallengeRules] = useState<ChallengeRules>({
        dailyDrawdown: 5,
        maxDrawdown: 10,
        profitTarget: 10,
        timeLimit: 30,
        minTradingDays: 5
    })

    useEffect(() => {
        if (open) {
            setStep(1)
            getStrategiesList().then(setStrategies)
        }
    }, [open])

    const handleNext = () => {
        if (step === 2 && (!asset || !startDate || !endDate)) {
            toast.error('Please select an asset and date range')
            return
        }
        if (step === 3 && (!name || !balance)) {
            toast.error('Please enter a name and balance')
            return
        }
        setStep(s => s + 1)
    }

    const handleBack = () => setStep(s => s - 1)

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
                startDate: startDate ? new Date(startDate).toISOString() : undefined,
                endDate: endDate ? new Date(endDate).toISOString() : undefined,
                timezone,
                challengeRules: sessionType === 'PROP_FIRM' ? challengeRules : undefined
            })

            toast.success('Session created successfully!')
            onOpenChange(false)
            router.push(`/backtest/session/${session.id}`)
        } catch (error: any) {
            console.error('Session creation error:', error)
            toast.error(error.message || 'Failed to create session')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                <div className="p-6 pt-4 border-t border-white/5 flex justify-between items-center bg-[#050505]">
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
                            {isLoading ? 'Launching...' : 'Launch Session'}
                            {!isLoading && <Check className="w-4 h-4 ml-2" />}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
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
