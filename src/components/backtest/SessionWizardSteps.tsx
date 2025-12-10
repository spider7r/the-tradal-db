import { motion } from 'framer-motion'
import { Zap, BarChart2, Calendar, Clock, Settings, CheckCircle, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PropFirmSettings, ChallengeRules } from './PropFirmSettings'
import { timezones } from '@/lib/timezones'

// --- Step 1: Session Type ---
interface Step1Props {
    selectedType: 'BACKTEST' | 'PROP_FIRM'
    onSelect: (type: 'BACKTEST' | 'PROP_FIRM') => void
}

export function Step1SessionType({ selectedType, onSelect }: Step1Props) {
    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="text-center space-y-1 sm:space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">Choose Session Mode</h3>
                <p className="text-[#94A3B8] text-xs sm:text-sm">Select how you want to practice today</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect('BACKTEST')}
                    className={cn(
                        "cursor-pointer rounded-xl p-4 sm:p-6 border transition-all duration-200 relative overflow-hidden group",
                        selectedType === 'BACKTEST'
                            ? "bg-[#0A0A0A] border-[#00E676] ring-1 ring-[#00E676]/50"
                            : "bg-[#050505] border-white/5 hover:border-white/10"
                    )}
                >
                    <div className="relative z-10 space-y-3 sm:space-y-4">
                        <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-colors",
                            selectedType === 'BACKTEST' ? "bg-[#00E676]/20 text-[#00E676]" : "bg-white/5 text-[#94A3B8]"
                        )}>
                            <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h4 className="text-base sm:text-lg font-bold text-white mb-0.5 sm:mb-1">Standard Backtest</h4>
                            <p className="text-xs sm:text-sm text-[#94A3B8]">Practice with historical data at your own pace. No rules, just trading.</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect('PROP_FIRM')}
                    className={cn(
                        "cursor-pointer rounded-xl p-4 sm:p-6 border transition-all duration-200 relative overflow-hidden group",
                        selectedType === 'PROP_FIRM'
                            ? "bg-[#0A0A0A] border-[#00E676] ring-1 ring-[#00E676]/50"
                            : "bg-[#050505] border-white/5 hover:border-white/10"
                    )}
                >
                    <div className="relative z-10 space-y-3 sm:space-y-4">
                        <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-colors",
                            selectedType === 'PROP_FIRM' ? "bg-[#00E676]/20 text-[#00E676]" : "bg-white/5 text-[#94A3B8]"
                        )}>
                            <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h4 className="text-base sm:text-lg font-bold text-white mb-0.5 sm:mb-1">Prop Firm Simulator</h4>
                            <p className="text-xs sm:text-sm text-[#94A3B8]">Simulate a challenge with strict drawdown and profit targets.</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

// --- Step 2: Asset & Time ---
interface Step2Props {
    asset: string
    setAsset: (v: string) => void
    startDate: string
    setStartDate: (v: string) => void
    endDate: string
    setEndDate: (v: string) => void
    timezone: string
    setTimezone: (v: string) => void
}

export function Step2AssetTime({ asset, setAsset, startDate, setStartDate, endDate, setEndDate, timezone, setTimezone }: Step2Props) {
    const assets = [
        "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSDT", "ETHUSDT",
        "SOLUSDT", "XRPUSDT", "ADAUSDT", "BNBUSDT", "DOGEUSDT", "DOTUSDT"
    ]

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="text-center space-y-1 sm:space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">Select Market Data</h3>
                <p className="text-[#94A3B8] text-xs sm:text-sm">Choose your pair and time range</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-[#94A3B8] text-xs sm:text-sm">Asset Pair</Label>
                    <Select value={asset} onValueChange={setAsset}>
                        <SelectTrigger className="bg-[#050505] border-white/5 text-white h-10 sm:h-12 text-xs sm:text-sm">
                            <SelectValue placeholder="Select asset..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A0A0A] border-white/5 text-white">
                            {assets.map(a => (
                                <SelectItem key={a} value={a} className="text-xs sm:text-sm">{a}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-[#94A3B8] text-xs sm:text-sm">Start Date</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-[#050505] border-white/5 text-white h-10 sm:h-12 text-xs sm:text-sm"
                        />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-[#94A3B8] text-xs sm:text-sm">End Date</Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-[#050505] border-white/5 text-white h-10 sm:h-12 text-xs sm:text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-[#94A3B8] text-xs sm:text-sm">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger className="bg-[#050505] border-white/5 text-white h-10 sm:h-12 text-xs sm:text-sm">
                            <SelectValue placeholder="Select timezone..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A0A0A] border-white/5 text-white max-h-[200px]">
                            {timezones.map(tz => (
                                <SelectItem key={tz.value} value={tz.value} className="text-xs sm:text-sm">{tz.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}

// --- Step 3: Configuration ---
interface Step3Props {
    sessionType: 'BACKTEST' | 'PROP_FIRM'
    name: string
    setName: (v: string) => void
    balance: string
    setBalance: (v: string) => void
    strategyId: string
    setStrategyId: (v: string) => void
    strategies: any[]
    challengeRules: ChallengeRules
    setChallengeRules: (v: ChallengeRules) => void
}

export function Step3Config({ sessionType, name, setName, balance, setBalance, strategyId, setStrategyId, strategies, challengeRules, setChallengeRules }: Step3Props) {
    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="text-center space-y-1 sm:space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">Configuration</h3>
                <p className="text-[#94A3B8] text-xs sm:text-sm">Fine-tune your session settings</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-[#94A3B8] text-xs sm:text-sm">Session Name</Label>
                    <Input
                        placeholder="e.g. My Morning Strategy Test"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="bg-[#050505] border-white/5 text-white h-10 sm:h-12 text-xs sm:text-sm"
                    />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-[#94A3B8] text-xs sm:text-sm">Initial Balance</Label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs sm:text-sm">$</span>
                        <Input
                            type="number"
                            value={balance}
                            onChange={e => setBalance(e.target.value)}
                            className="bg-[#050505] border-white/5 text-white h-10 sm:h-12 pl-8 text-xs sm:text-sm"
                        />
                    </div>
                </div>

                {sessionType === 'BACKTEST' && (
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-[#94A3B8] text-xs sm:text-sm">Strategy (Optional)</Label>
                        <Select value={strategyId} onValueChange={setStrategyId}>
                            <SelectTrigger className="bg-[#050505] border-white/5 text-white h-10 sm:h-12 text-xs sm:text-sm">
                                <SelectValue placeholder="Link a strategy..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0A0A0A] border-white/5 text-white">
                                <SelectItem value="none" className="text-xs sm:text-sm">None</SelectItem>
                                {strategies.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs sm:text-sm">{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {sessionType === 'PROP_FIRM' && (
                    <div className="pt-2">
                        <PropFirmSettings rules={challengeRules} onChange={setChallengeRules} />
                    </div>
                )}
            </div>
        </div>
    )
}

// --- Step 4: Review ---
interface Step4Props {
    sessionType: 'BACKTEST' | 'PROP_FIRM'
    name: string
    asset: string
    balance: string
    startDate: string
    endDate: string
}

export function Step4Review({ sessionType, name, asset, balance, startDate, endDate }: Step4Props) {
    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="text-center space-y-1 sm:space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">Ready to Launch?</h3>
                <p className="text-[#94A3B8] text-xs sm:text-sm">Review your session details</p>
            </div>

            <div className="bg-[#050505] border border-white/5 rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/5">
                    <span className="text-[#94A3B8] text-xs sm:text-sm">Mode</span>
                    <span className="text-white font-medium flex items-center gap-2 text-xs sm:text-sm">
                        {sessionType === 'PROP_FIRM' ? <Zap className="w-4 h-4 text-[#00E676]" /> : <BarChart2 className="w-4 h-4 text-[#00E676]" />}
                        {sessionType === 'PROP_FIRM' ? 'Prop Firm Simulator' : 'Standard Backtest'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8] text-xs sm:text-sm">Name</span>
                    <span className="text-white font-medium text-xs sm:text-sm">{name}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8] text-xs sm:text-sm">Asset</span>
                    <span className="text-white font-medium text-xs sm:text-sm">{asset}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8] text-xs sm:text-sm">Balance</span>
                    <span className="text-white font-medium text-xs sm:text-sm">${parseInt(balance).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8] text-xs sm:text-sm">Duration</span>
                    <span className="text-white font-medium text-right text-xs sm:text-sm">
                        {startDate || 'Start'} <br /> to {endDate || 'End'}
                    </span>
                </div>
            </div>
        </div>
    )
}
