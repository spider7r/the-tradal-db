'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import LoadingTips from './LoadingTips'
import { Candle } from '@/lib/binance'
import { aggregateCandles, Timeframe } from '@/lib/candle-utils'
import { updateBacktestSession, saveBacktestTrade, fetchMarketData } from '@/app/(dashboard)/backtest/actions'
import { toast } from 'sonner'
import { getCachedData, waitForPrefetch, isPrefetching, clearPrefetchCache } from '@/lib/prefetch-cache'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Plus, BarChart2
} from 'lucide-react'
import { timezones } from '@/lib/timezones'

import { BacktestToolbar } from './BacktestToolbar'
import { BacktestTopBar } from './BacktestTopBar'
import { BacktestBottomBar } from './BacktestBottomBar'
import { PlaceOrderDialog } from './PlaceOrderDialog'
import { BacktestEngine, Order, Trade, ChallengeStatus } from '@/lib/backtest-engine'
import { TimeframeSelector } from './TimeframeSelector'
import { ChallengeStatusWidget } from './ChallengeStatusWidget'
import { BacktestControls } from './BacktestControls' // NEW WIDGET

import dynamic from 'next/dynamic'

// Dynamic Import for TradingView Widget
const BacktestTVChart = dynamic(
    () => import('./BacktestTVChart'),
    { ssr: false }
)

interface ChartReplayEngineProps {
    initialSession?: any
    initialTrades?: any[]
}

export function ChartReplayEngine({ initialSession, initialTrades = [] }: ChartReplayEngineProps) {
    // Data Management (Ref + State)
    // Base 1m data - fetched once and stored
    // Current interval data - ref for Datafeed (no re-render)
    const fullDataRef = useRef<Candle[]>([])

    // ═══════════════════════════════════════════════════════════════
    // SYNC INIT: Check global cache immediately for instant load
    // ═══════════════════════════════════════════════════════════════
    const [fullData, setFullData] = useState<Candle[]>(() => {
        const sessionPair = initialSession?.pair || initialSession?.asset
        if (sessionPair) {
            const cached = getCachedData(sessionPair)
            if (cached && cached.length > 0) {
                console.log(`[Backtest] ⚡ SYNC INIT: Found ${cached.length} candles in cache for ${sessionPair}!`)
                return aggregateCandles(cached, '15m')
            }
        }
        return []
    })

    // Update ref immediately if we have data
    if (fullDataRef.current.length === 0 && fullData.length > 0) {
        fullDataRef.current = fullData
    }

    // Core State
    const [currentIndex, setCurrentIndex] = useState(() => {
        // If we have data, calculate correct index synchronously
        if (fullData.length > 0) {
            const startStr = initialSession?.start_date
            if (startStr) {
                const startTime = new Date(startStr).getTime()
                const tSec = startTime / 1000
                // Find index
                for (let i = fullData.length - 1; i >= 0; i--) {
                    if (fullData[i].time <= tSec) return Math.max(0, i)
                }
            }
            return fullData.length - 1
        }
        return 0
    })

    const [isPlaying, setIsPlaying] = useState(false)
    const [speed, setSpeed] = useState(1000)
    const [pair, setPair] = useState(initialSession?.pair || initialSession?.asset || 'BTCUSDT')
    const [interval, setInterval] = useState('15m')
    const [timezone, setTimezone] = useState(initialSession?.timezone || 'Etc/UTC')

    // Initialize loading to FALSE if we have data
    const [isLoading, setIsLoading] = useState(() => {
        return fullData.length === 0
    })

    // Engine State
    const engineRef = useRef<BacktestEngine | null>(null)
    const [balance, setBalance] = useState(initialSession?.current_balance || 100000)
    const [equity, setEquity] = useState(initialSession?.current_balance || 100000)
    const [trades, setTrades] = useState<Trade[]>([])
    const [orders, setOrders] = useState<Order[]>([])
    const [maxDrawdown, setMaxDrawdown] = useState(0)
    const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus | undefined>(initialSession?.challenge_status)

    // Session State
    const [sessionId, setSessionId] = useState<string | null>(initialSession?.id || null)
    const [quantity, setQuantity] = useState(1)
    const [showOrderPanel, setShowOrderPanel] = useState(false)

    // Triggered by synchronous init
    const loadedParamsRef = useRef<{ pair: string, interval: string } | null>(null)
    // Initialize ref if we have data (mimic useState logic)
    if (fullData.length > 0 && !loadedParamsRef.current) {
        loadedParamsRef.current = { pair: initialSession?.pair || 'BTCUSDT', interval: '15m' }
    }

    const loadingRef = useRef<boolean>(false) // Prevent concurrent loadData calls

    // Background Prefetch Cache: Store 1m data for INSTANT timeframe switching (like FXReplay)
    // Initialize ref from cache if available
    const prefetchedDataRef = useRef<Candle[] | null>(
        initialSession?.pair ? (getCachedData(initialSession.pair) as Candle[] || null) : null
    )

    const [prefetchStatus, setPrefetchStatus] = useState<'idle' | 'loading' | 'done'>(() => {
        return prefetchedDataRef.current ? 'done' : 'idle'
    })



    // TRIGGER PROGRESSIVE LOADING
    const isFetchingHistoryRef = useRef(false)
    const historyLoadCountRef = useRef(0)

    // START FIX: Time Tracking (Top Level)
    const currentSimTimeRef = useRef<number | null>(initialSession?.last_replay_time || (initialSession?.start_date ? new Date(initialSession.start_date).getTime() : null))

    // IMPORTANT: Track if we're in the middle of a timeframe switch
    // During switches, we should NOT update currentSimTimeRef to avoid corrupting the position
    const isTimeframeSwitchingRef = useRef<boolean>(false)
    // Store the "intended" time position separately - this never gets corrupted by limited data
    const intendedTimeRef = useRef<number | null>(initialSession?.last_replay_time || (initialSession?.start_date ? new Date(initialSession.start_date).getTime() : null))

    useEffect(() => {
        // Only update the time reference if NOT switching timeframes
        // This prevents 1m (limited data) from corrupting the position
        if (!isTimeframeSwitchingRef.current && fullData.length > 0 && fullData[currentIndex]) {
            const t = fullData[currentIndex].time
            const timeMs = t < 10000000000 ? t * 1000 : t
            currentSimTimeRef.current = timeMs
            intendedTimeRef.current = timeMs // Also update intended time on manual navigation
        }
    }, [currentIndex, fullData])
    // END FIX

    // Initialize Engine
    useEffect(() => {
        if (!engineRef.current) {
            // Map DB trades to Engine trades
            const mappedTrades: Trade[] = initialTrades.map(t => ({
                id: t.id,
                orderId: 'hist',
                sessionId: t.backtest_session_id,
                symbol: t.pair,
                side: t.type,
                entryPrice: Number(t.entry_price),
                exitPrice: Number(t.exit_price),
                quantity: Number(t.size),
                pnl: Number(t.pnl),
                entryTime: new Date(t.entry_date).getTime(),
                exitTime: new Date(t.exit_date).getTime(),
                status: 'CLOSED',
                commission: 0,
                swap: 0
            }))

            engineRef.current = new BacktestEngine(balance, async (trade) => {
                if (sessionId) {
                    try {
                        await saveBacktestTrade({
                            backtest_session_id: sessionId,
                            pair: trade.symbol,
                            type: trade.side,
                            entry_price: trade.entryPrice,
                            exit_price: trade.exitPrice!,
                            size: trade.quantity,
                            pnl: trade.pnl!,
                            entry_date: new Date(trade.entryTime).toISOString(),
                            exit_date: new Date(trade.exitTime!).toISOString()
                        })
                        await updateBacktestSession(sessionId, {
                            current_balance: engineRef.current?.getStats().balance
                        })
                    } catch (error) {
                        console.error('Failed to save trade:', error)
                    }
                }
            }, mappedTrades,
                initialSession?.challenge_rules,
                initialSession?.challenge_status,
                async (status) => {
                    setChallengeStatus({ ...status })
                    if (sessionId) {
                        try {
                            await updateBacktestSession(sessionId, { challenge_status: status })
                        } catch (error) { console.error(error) }
                    }
                })
        }
    }, [sessionId, initialTrades])

    // Fetch Data (STRICT & LOOP-PROOF)
    useEffect(() => {
        let isMounted = true
        const loadData = async () => {
            // GUARD: Prevent concurrent loadData calls causing infinite loop
            if (loadingRef.current) {
                console.log('[Backtest] ⛔ Already loading, skipping duplicate call')
                return
            }

            // GUARD: Sync Init Check
            // If we just initialized synchronously with data, and params match, skip fetch
            if (fullData.length > 0 &&
                loadedParamsRef.current?.pair === pair &&
                loadedParamsRef.current?.interval === interval &&
                !isTimeframeSwitchingRef.current) {
                console.log('[Backtest] ⚡ Already initialized synchronously, skipping fetch')

                // Allow progressive loading to trigger
                return
            }

            loadingRef.current = true

            // *** FIX: Set flag to prevent position corruption during switch ***
            isTimeframeSwitchingRef.current = true

            console.log('═══════════════════════════════════════')
            console.log('[Backtest] loadData START')
            console.log('  Pair:', pair)
            console.log('  Interval:', interval)
            console.log('  Cached 1m data?', !!prefetchedDataRef.current, prefetchedDataRef.current?.length || 0, 'candles')
            console.log('═══════════════════════════════════════')

            const startTime = initialSession?.start_date ? new Date(initialSession.start_date).getTime() : undefined
            const endTime = initialSession?.end_date ? new Date(initialSession.end_date).getTime() : undefined

            // FIX: Ensure we fetch data WELL BEYOND end_date so there are
            // enough candles to play forward through. Without this, currentIndex
            // starts near the end of the array and play auto-pauses immediately.
            const extendedEndTime = endTime
                ? endTime + (30 * 24 * 60 * 60 * 1000) // Add 30 days beyond end_date
                : undefined

            // ═══════════════════════════════════════════════════════════════
            // STEP 1: Get 1m base data
            // Priority: 1) Local ref cache → 2) Global prefetch cache → 3) Fresh Dukascopy fetch
            // ═══════════════════════════════════════════════════════════════
            let baseData1m = prefetchedDataRef.current

            if (!baseData1m || baseData1m.length === 0) {
                // Check GLOBAL prefetch cache (data downloaded during session wizard)
                const cachedFromWizard = getCachedData(pair)
                if (cachedFromWizard && cachedFromWizard.length > 0) {
                    console.log(`[Backtest] ⚡⚡⚡ INSTANT LOAD from wizard prefetch! ${cachedFromWizard.length} candles`)
                    baseData1m = cachedFromWizard as Candle[]
                    prefetchedDataRef.current = baseData1m
                    setPrefetchStatus('done')
                    clearPrefetchCache() // Free global cache memory
                } else if (isPrefetching(pair, initialSession?.start_date || '', initialSession?.end_date || '')) {
                    // Prefetch is in progress — wait for it!
                    console.log('[Backtest] ⏳ Wizard prefetch in progress, waiting...')
                    setIsLoading(true)
                    const waitedData = await waitForPrefetch()
                    if (waitedData && waitedData.length > 0) {
                        console.log(`[Backtest] ⚡ Wizard prefetch completed! ${waitedData.length} candles`)
                        baseData1m = waitedData as Candle[]
                        prefetchedDataRef.current = baseData1m
                        setPrefetchStatus('done')
                        clearPrefetchCache()
                    }
                }
            }

            if (!baseData1m || baseData1m.length === 0) {
                // FALLBACK: Fetch 1m data from data service (routes to correct API)
                setIsLoading(true)
                console.log(`[Backtest] 📡 Fetching 1m base data for ${pair}...`)

                // Buffer: 200 candles of 15m = 3000 x 1m candles BEFORE session start
                const bufferMs = 200 * 15 * 60 * 1000 // 50 hours before
                const fetchStart = startTime ? startTime - bufferMs : undefined

                // FIX: Calculate needed candles including FORWARD buffer
                // Previously only counted session duration, leaving no room to play forward
                let neededCandles = 50000
                if (startTime) {
                    const preBufferMinutes = 200 * 15 // ~50 hours before start
                    // Forward buffer: use endTime if available, otherwise add 30 days
                    const effectiveEnd = endTime || (startTime + 30 * 24 * 60 * 1000)
                    const sessionMinutes = (effectiveEnd - startTime) / (60 * 1000)
                    // Add extra 30 days of forward data for playback headroom
                    const forwardBufferMinutes = 30 * 24 * 60
                    neededCandles = Math.ceil(preBufferMinutes + sessionMinutes + forwardBufferMinutes + 500)
                    console.log(`  Session: ${(sessionMinutes / 60).toFixed(1)} hours`)
                    console.log(`  Pre-buffer: ${(preBufferMinutes / 60).toFixed(1)} hours`)
                    console.log(`  Forward buffer: ${(forwardBufferMinutes / 60).toFixed(1)} hours`)
                    console.log(`  Total 1m candles needed: ${neededCandles}`)
                }

                const limit = Math.min(neededCandles, 100000)

                try {
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Data load timeout")), 90000)
                    )

                    console.log(`[Backtest] Calling fetchMarketData('${pair}', '1m', ${limit}, ${fetchStart}, ${extendedEndTime})`)
                    const rawData = await Promise.race([
                        fetchMarketData(pair, '1m', limit, fetchStart, extendedEndTime),
                        timeoutPromise
                    ]) as any[]

                    console.log(`[Backtest] fetchMarketData returned: ${rawData?.length || 0} candles`)

                    if (!rawData || rawData.length === 0) {
                        toast.error(`No market data found for ${pair}. Check browser console for details.`)
                        console.error(`[Backtest] ❌ No data returned for pair: ${pair}`)
                        console.error(`[Backtest] Session:`, { pair, startDate: initialSession?.start_date, endDate: initialSession?.end_date })
                        setIsLoading(false)
                        loadingRef.current = false
                        isTimeframeSwitchingRef.current = false
                        return
                    }

                    console.log(`[Backtest] ✅ Raw 1m data: ${rawData.length} candles`)

                    // Clean: sort, dedupe, validate
                    const cleaned = rawData
                        .filter((c: any) =>
                            c.time > 0 && !isNaN(c.open) && c.open > 0 &&
                            !isNaN(c.high) && c.high > 0 && !isNaN(c.low) && c.low > 0 &&
                            !isNaN(c.close) && c.close > 0 &&
                            c.high >= c.low && c.high >= c.open && c.high >= c.close &&
                            c.low <= c.open && c.low <= c.close
                        )
                        .sort((a: any, b: any) => a.time - b.time)

                    const seen = new Set<number>()
                    baseData1m = cleaned.filter((c: any) => {
                        if (seen.has(c.time)) return false
                        seen.add(c.time)
                        return true
                    }).map((c: any) => ({
                        time: c.time, open: c.open, high: c.high,
                        low: c.low, close: c.close, volume: c.volume || 0
                    })) as Candle[]

                    // ═══════════════════════════════════════════════════════════
                    // FIX CHEAP-LOOKING CANDLES: Remove zero-range dead candles
                    // These are market gaps where O=H=L=C with zero volume
                    // They look like flat lines on the chart — ugly!
                    // ═══════════════════════════════════════════════════════════
                    const beforeFilter = baseData1m.length
                    baseData1m = baseData1m.filter((c: Candle) => {
                        // Remove flat candles with no volume (market closed/no ticks)
                        if (c.open === c.high && c.high === c.low && c.low === c.close && (c.volume === 0 || !c.volume)) {
                            return false
                        }
                        return true
                    })
                    if (baseData1m.length < beforeFilter) {
                        console.log(`[Backtest] 🧹 Removed ${beforeFilter - baseData1m.length} zero-range candles`)
                    }

                    // CACHE for instant switching
                    prefetchedDataRef.current = baseData1m
                    setPrefetchStatus('done')

                    console.log(`[Backtest] ✅ Cached ${baseData1m.length} x 1m candles`)
                    console.log(`  First: ${new Date(baseData1m[0].time * 1000).toISOString()}`)
                    console.log(`  Last: ${new Date(baseData1m[baseData1m.length - 1].time * 1000).toISOString()}`)
                    console.log(`  ⚡ All timeframe switches will be INSTANT from now!`)

                } catch (error: any) {
                    console.error("[Backtest] Data Load Failed", error)
                    toast.error(error.message || "Failed to load chart data")
                    setIsLoading(false)
                    loadingRef.current = false
                    isTimeframeSwitchingRef.current = false
                    return
                }
            } else {
                console.log(`[Backtest] ⚡ Using cached 1m data (${baseData1m.length} candles)`)
            }

            // ═══════════════════════════════════════════════════════════════
            // STEP 2: Aggregate 1m → display interval (instant, client-side)
            // ═══════════════════════════════════════════════════════════════
            let data: Candle[]
            if (interval === '1m') {
                data = baseData1m
            } else {
                const t0 = performance.now()
                data = aggregateCandles(baseData1m, interval as any)
                const elapsed = (performance.now() - t0).toFixed(1)
                console.log(`[Backtest] ⚡ Aggregated ${baseData1m.length} x 1m → ${data.length} x ${interval} in ${elapsed}ms`)
            }

            // ═══════════════════════════════════════════════════════════════
            // STEP 3: Find correct replay position
            // ═══════════════════════════════════════════════════════════════
            const targetTime = intendedTimeRef.current || startTime
            let newIndex = 0
            if (targetTime && data.length > 0) {
                const tSec = targetTime > 10000000000 ? targetTime / 1000 : targetTime
                for (let i = data.length - 1; i >= 0; i--) {
                    if (data[i].time <= tSec) {
                        newIndex = i
                        break
                    }
                }
            }

            // Ensure minimum visible candles (but NOT near end of array!)
            const minVisible = 50
            if (newIndex < minVisible && data.length > minVisible) {
                newIndex = minVisible - 1
            } else if (newIndex < minVisible && data.length <= minVisible) {
                newIndex = Math.max(0, data.length - 1)
            }

            // FIX: Ensure currentIndex is NOT near end of array!
            // If it is, there are no candles to play forward through.
            const forwardRoom = data.length - newIndex
            if (forwardRoom < 50 && data.length > 100) {
                console.warn(`[Backtest] ⚠️ Only ${forwardRoom} candles ahead of current position!`)
                console.warn(`  This means play will auto-pause almost immediately.`)
                console.warn(`  Data length: ${data.length}, newIndex: ${newIndex}`)
                // Don't adjust — just warn. The extended fetch range above should prevent this.
            }

            console.log(`[Backtest] 📍 Position: index ${newIndex}/${data.length}, forward room: ${forwardRoom} candles`)

            // ═══════════════════════════════════════════════════════════════
            // STEP 4: Update state — triggers chart render
            // ═══════════════════════════════════════════════════════════════
            fullDataRef.current = data
            setFullData(data)
            setCurrentIndex(newIndex)
            loadedParamsRef.current = { pair, interval }

            console.log('════════════════════════════════════════════════════')
            console.log(`[Backtest] ✅ READY — ${data.length} x ${interval} candles, index ${newIndex}`)
            console.log(`  Position: ${new Date(data[newIndex].time * 1000).toISOString()}`)
            console.log(`  Using cached 1m: ${!!prefetchedDataRef.current}`)
            console.log('════════════════════════════════════════════════════')

            if (isMounted) {
                setIsLoading(false)
            }
            loadingRef.current = false
            isTimeframeSwitchingRef.current = false
        }

        loadData()
        return () => {
            isMounted = false
            loadingRef.current = false
        }
    }, [pair, interval])



    // Session Persistence
    const saveSession = useCallback(async () => {
        if (!sessionId || fullDataRef.current.length === 0) return
        const currentCandle = fullDataRef.current[currentIndex]
        if (!currentCandle) return

        try {
            await updateBacktestSession(sessionId, {
                last_replay_time: currentCandle.time,
                current_balance: balance
            })
        } catch (error) { console.error(error) }
    }, [sessionId, currentIndex, balance])

    // Auto-save
    useEffect(() => {
        const timer = window.setInterval(saveSession, 10000)
        return () => window.clearInterval(timer)
    }, [saveSession])

    // Replay Logic
    const stepForward = useCallback(() => {
        setCurrentIndex(prev => {
            const dataLen = fullDataRef.current.length
            if (prev >= dataLen - 1) {
                console.warn(`[Backtest] ⛔ Reached end of data (index ${prev}/${dataLen}). Pausing.`)
                setIsPlaying(false)
                return prev
            }
            return prev + 1
        })
    }, [])

    // Sync Engine & UI
    useEffect(() => {
        if (fullDataRef.current.length > 0 && engineRef.current) {
            // Safe bounds
            const idx = Math.min(currentIndex, fullDataRef.current.length - 1)
            const currentCandle = fullDataRef.current[idx]

            // Safety check for valid candle
            if (!currentCandle || typeof currentCandle.close !== 'number') {
                console.warn('[Backtest] Invalid candle at index', idx)
                return
            }

            try {
                // Process Candle in Engine
                engineRef.current.processCandle(currentCandle)

                // Update Stats
                const stats = engineRef.current.getStats()
                setBalance(stats.balance)
                setEquity(stats.equity)
                setTrades([...engineRef.current.getTrades()])
                setOrders([...engineRef.current.getOrders()])
            } catch (err) {
                console.error('[Backtest] Error processing candle:', err)
            }
        }
    }, [currentIndex])

    // Timer
    const timerRef = useRef<number | null>(null)
    useEffect(() => {
        if (isPlaying) {
            timerRef.current = window.setInterval(stepForward, speed)
        } else {
            if (timerRef.current) clearInterval(timerRef.current)
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [isPlaying, speed, stepForward])

    const handlePlaceOrder = (side: 'LONG' | 'SHORT', size: number, sl: number, tp: number, type: 'MARKET' | 'LIMIT' | 'STOP' = 'MARKET', price?: number) => {
        if (!engineRef.current) return
        engineRef.current.placeOrder({
            sessionId: sessionId || 'temp',
            symbol: pair,
            side,
            type,
            quantity: size,
            limitPrice: type === 'LIMIT' ? price : undefined,
            stopPrice: type === 'STOP' ? price : undefined,
            stopLoss: sl || undefined,
            takeProfit: tp || undefined
        })
        const stats = engineRef.current.getStats()
        setBalance(stats.balance)
        setOrders([...engineRef.current.getOrders()])
        toast.success(`${type} Order Placed`)
        if (showOrderPanel) setShowOrderPanel(false)
    }

    const unrealizedPnl = equity - balance
    const realizedPnl = balance - (initialSession?.initial_balance || 100000)

    // ═══════════════════════════════════════════════════════════════
    // PROGRESSIVE HISTORY LOADING (Background, silent)
    // ═══════════════════════════════════════════════════════════════
    const triggerLoadMoreHistory = useCallback(() => {
        if (isFetchingHistoryRef.current) return
        if (!prefetchedDataRef.current || prefetchedDataRef.current.length >= 250000) return
        if (historyLoadCountRef.current >= 10) return // Max 10 chunks

        const loadMore = async () => {
            isFetchingHistoryRef.current = true
            try {
                const current1m = prefetchedDataRef.current
                if (!current1m || current1m.length === 0) return
                const oldestTime = current1m[0].time * 1000 // ms

                const chunkDuration = 45 * 24 * 60 * 60 * 1000
                const fetchEnd = oldestTime
                const fetchStart = oldestTime - chunkDuration

                console.log(`[Backtest] 🕰️ Fetching history chunk ${historyLoadCountRef.current + 1} (silent)...`)

                const rawChunk = await fetchMarketData(pair, '1m', 60000, fetchStart, fetchEnd)

                if (rawChunk && rawChunk.length > 0) {
                    const cleaned = rawChunk
                        .filter((c: any) =>
                            c.time > 0 && !isNaN(c.open) && c.volume > 0 &&
                            !(c.open === c.high && c.high === c.low && c.low === c.close && c.volume === 0)
                        )
                        .sort((a: any, b: any) => a.time - b.time)

                    const firstExistingTime = current1m[0].time
                    const finalChunk = cleaned
                        .filter((c: any) => c.time < firstExistingTime)
                        .map((c: any) => ({
                            time: c.time,
                            open: c.open,
                            high: c.high,
                            low: c.low,
                            close: c.close,
                            volume: Number(c.volume || 0)
                        })) as Candle[]

                    if (finalChunk.length > 0) {
                        console.log(`[Backtest] 🕰️ Loaded ${finalChunk.length} older candles (silent)`)
                        const newData1m = [...finalChunk, ...current1m]
                        prefetchedDataRef.current = newData1m

                        const aggChunk = interval === '1m' ? finalChunk : aggregateCandles(finalChunk as Candle[], interval as Timeframe)

                        setFullData(prev => [...(aggChunk as Candle[]), ...prev])
                        setCurrentIndex(prev => prev + aggChunk.length)

                        // No toast — silent background loading
                        historyLoadCountRef.current++
                    }
                }
            } catch (err) {
                console.error('[Backtest] History fetch failed', err)
            } finally {
                isFetchingHistoryRef.current = false
            }
        }
        loadMore()
    }, [pair, interval])

    useEffect(() => {
        if (isLoading || isTimeframeSwitchingRef.current) return

        // Auto-load first chunk 2 seconds after initial load
        // Start auto-load check 2 seconds after initial load
        const timer = setTimeout(() => triggerLoadMoreHistory(), 2000)
        return () => clearTimeout(timer)
    }, [isLoading, interval, pair, triggerLoadMoreHistory])

    return (
        <div className="flex flex-col h-screen bg-[#000000] text-[#d1d4dc] overflow-hidden font-sans select-none">
            {/* CLEAN UI: No Top Bar or Side Toolbar */}

            {/* CHART AREA - Full Height/Width */}
            <div className="flex flex-1 min-h-0 relative">

                <div className="flex-1 relative min-w-0 bg-[#000000]">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#000000]/90 backdrop-blur-sm">
                            <LoadingTips />
                        </div>
                    )}

                    {/* BACKTEST TV CHART */}
                    <BacktestTVChart
                        key="backtest-chart-stable" // Prevent unmounting on interval change
                        // FIX: Always show enough candles for proper chart context
                        // Previously: slice(0, currentIndex+1) could show only 1 candle when currentIndex=0
                        // Now: Show ALL candles up to currentIndex, ensuring minimum context
                        data={useMemo(() => {
                            if (fullData.length === 0) return []
                            // Always include at least 100 candles of history before current position
                            // This ensures the chart has proper context even if currentIndex is low
                            const minHistoryCandles = 100
                            const endIdx = currentIndex + 1
                            const startIdx = Math.max(0, endIdx - minHistoryCandles)

                            // If we have very little data overall, show everything up to currentIndex
                            const sliced = fullData.slice(0, endIdx)

                            // DEBUG: Log what we're showing
                            if (sliced.length <= 1) {
                                console.warn(`[BacktestChart] Only ${sliced.length} candle(s) to display!`)
                                console.warn(`  fullData.length: ${fullData.length}`)
                                console.warn(`  currentIndex: ${currentIndex}`)
                                // If we only have 1 candle, show ALL available data for debugging
                                if (fullData.length > 1) {
                                    console.warn(`  Showing ALL ${fullData.length} candles instead!`)
                                    return fullData
                                }
                            }

                            return sliced.length > 0 ? sliced : fullData.length > 0 ? fullData : []
                        }, [fullData, currentIndex])}
                        interval={interval}
                        symbol={pair} // Use actual trading pair name
                        orders={orders}
                        trades={trades}

                        currentPrice={fullData[Math.min(currentIndex, fullData.length - 1)]?.close}
                        onCloseTrade={(tradeId) => {
                            if (engineRef.current && fullData.length > 0) {
                                const currentCandle = fullData[Math.min(currentIndex, fullData.length - 1)]
                                engineRef.current.manualCloseTrade(tradeId, currentCandle.close)
                                const stats = engineRef.current.getStats()
                                setBalance(stats.balance)
                                setEquity(stats.equity)
                                setTrades([...engineRef.current.getTrades()])
                                setOrders([...engineRef.current.getOrders()])
                            }
                        }}
                        // We disconnect built-in buttons since we have the floating widget now
                        // But we keep handlers for logical completeness
                        isPlaying={isPlaying}
                        onPlayPause={() => {
                            // Prevent play if engine or data isn't ready
                            if (!engineRef.current || fullDataRef.current.length === 0) {
                                console.warn('[Backtest] Cannot play: engine or data not ready')
                                return
                            }
                            setIsPlaying(!isPlaying)
                        }}
                        onStepForward={stepForward}
                        onPlaceOrder={() => setShowOrderPanel(true)}
                        onReset={() => setCurrentIndex(0)} // This might need to reset to 'startIndex' not 0? 
                        onIntervalChange={setInterval}
                        onRequestMoreHistory={triggerLoadMoreHistory}
                        sessionId={sessionId || undefined}
                        sessionStartTime={(() => {
                            const st = initialSession?.start_date ? new Date(initialSession.start_date).getTime() : undefined
                            console.log('📅 [ChartReplayEngine] Passing sessionStartTime to chart:', st, st ? new Date(st).toISOString() : 'undefined')
                            return st
                        })()}
                        currentTime={fullData[currentIndex]?.time < 10000000000 ? fullData[currentIndex]?.time * 1000 : fullData[currentIndex]?.time}
                    />

                    {/* FLOAT CONTROLS */}
                    <BacktestControls
                        isPlaying={isPlaying}
                        onPlayPause={() => {
                            if (!engineRef.current || fullDataRef.current.length === 0) {
                                console.warn('[Backtest] Cannot play: engine or data not ready')
                                return
                            }
                            setIsPlaying(!isPlaying)
                        }}
                        onStepForward={stepForward}
                        onRewind={() => {
                            // Find original start index? For now go to 0 or session start.
                            // Let's reset to the calculated 'start index' from loadData?
                            // For safety, just 0 for now.
                            setCurrentIndex(0)
                            setIsPlaying(false)
                        }}
                        onOrderClick={() => setShowOrderPanel(true)}
                        speed={speed}
                        onSpeedChange={setSpeed}
                        currentDate={fullData[currentIndex]?.time < 10000000000 ? fullData[currentIndex]?.time * 1000 : fullData[currentIndex]?.time}
                    />

                    {/* Prop Firm Widget */}
                    {initialSession?.session_type === 'PROP_FIRM' && (
                        <div className="absolute top-4 right-16 z-30 w-80">
                            <ChallengeStatusWidget
                                rules={initialSession.challenge_rules}
                                status={challengeStatus}
                                currentBalance={balance}
                                initialBalance={initialSession.initial_balance}
                                equity={equity}
                            />
                        </div>
                    )}
                </div>
            </div>

            <BacktestBottomBar
                balance={balance}
                equity={equity}
                realizedPnl={realizedPnl}
                unrealizedPnl={unrealizedPnl}
                quantity={quantity}
                onQuantityChange={setQuantity}
                onBuy={() => handlePlaceOrder('LONG', quantity, 0, 0, 'MARKET')}
                onSell={() => handlePlaceOrder('SHORT', quantity, 0, 0, 'MARKET')}
                onAnalytics={() => { }}
            />

            <Dialog open={showOrderPanel} onOpenChange={setShowOrderPanel}>
                <DialogContent className="sm:max-w-[400px] bg-[#1e222d] border-[#2a2e39] text-[#d1d4dc]">
                    <DialogHeader><DialogTitle>Place Order</DialogTitle></DialogHeader>
                    <PlaceOrderDialog
                        currentPrice={fullData.length > 0 ? fullData[currentIndex]?.close || fullData[fullData.length - 1].close : 0}
                        balance={balance}
                        onPlaceOrder={handlePlaceOrder}
                        onClose={() => setShowOrderPanel(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}
