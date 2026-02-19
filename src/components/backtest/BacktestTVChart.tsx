'use client'

import { useEffect, useRef, useState } from 'react'
import { Candle } from '@/lib/binance'

interface BacktestTVChartProps {
    data: Candle[]
    interval: string
    symbol?: string // Trading pair name (e.g., EURUSD)
    orders?: any[]
    trades?: any[]
    currentPrice?: number // Live price for PnL calculation
    isPlaying?: boolean
    onPlayPause?: () => void
    onStepForward?: () => void
    onPlaceOrder?: () => void
    onReset?: () => void
    onIntervalChange?: (interval: string) => void
    onRequestMoreHistory?: () => void // Triggered when user scrolls back past earliest data
    onCloseTrade?: (tradeId: string) => void // Manual close from chart
    sessionStartTime?: number
    currentTime?: number
    sessionId?: string // For per-session drawing persistence
}

const mapIntervalToTV = (interval: string) => {
    switch (interval) {
        case '1m': return '1'
        case '5m': return '5'
        case '15m': return '15'
        case '1h': return '60'
        case '4h': return '240'
        case 'D': return 'D'
        case '1W': return '1W'
        default: return '60'
    }
}

const mapTVToInterval = (resolution: string) => {
    switch (resolution) {
        case '1': return '1m'
        case '5': return '5m'
        case '15': return '15m'
        case '60': return '1h'
        case '240': return '4h'
        case 'D': case '1D': return 'D'
        case 'W': case '1W': return '1W'
        default: return '1h'
    }
}

const mapIntervalToSeconds = (interval: string) => {
    switch (interval) {
        case '1m': return 60
        case '5m': return 5 * 60
        case '15m': return 15 * 60
        case '1h': return 60 * 60
        case '4h': return 4 * 60 * 60
        case 'D': return 24 * 60 * 60
        case '1W': return 7 * 24 * 60 * 60
        default: return 60 * 60
    }
}

// UPDATED: Accepts Refs to ensure it always reads live state
const createBacktestDatafeed = (
    dataRef: React.MutableRefObject<Candle[]>,
    currentIntervalRef: React.MutableRefObject<string>,
    onIntervalChange?: (i: string) => void,
    onRequestMoreHistory?: () => void
) => {
    const supportedResolutions = ['1', '5', '15', '60', '240', 'D', 'W']

    return {
        onReady: (callback: any) => {
            setTimeout(() => callback({
                supported_resolutions: supportedResolutions,
                supports_marks: false,
                supports_timescale_marks: false,
            }))
        },
        resolveSymbol: (symbolName: string, onSymbolResolvedCallback: any, onResolveErrorCallback: any) => {
            // Detect asset type for proper price precision
            const cleanSymbol = symbolName.replace('BINANCE:', '').replace('FX:', '').replace('OANDA:', '').replace('TVC:', '').replace('NASDAQ:', '').replace('NYSE:', '').toUpperCase()
            const isCrypto = cleanSymbol.endsWith('USDT') || cleanSymbol.endsWith('BUSD')
            const isForex = !isCrypto && cleanSymbol.length === 6 && /^[A-Z]+$/.test(cleanSymbol)
            const isJPY = cleanSymbol.includes('JPY')
            const isMetal = cleanSymbol.includes('XAU') || cleanSymbol.includes('XAG') || cleanSymbol.includes('PLATINUM') || cleanSymbol.includes('PALLADIUM')
            const isOil = cleanSymbol.includes('OIL')
            const isIndex = cleanSymbol.includes('SPX') || cleanSymbol.includes('NAS') || cleanSymbol.includes('US30') || cleanSymbol.includes('DEU') || cleanSymbol.includes('UK100') || cleanSymbol.includes('EU50') || cleanSymbol.includes('FR40') || cleanSymbol.includes('JP225') || cleanSymbol.includes('AU200') || cleanSymbol.includes('HK33')

            // Set pricescale based on asset type:
            // - Forex (non-JPY): 5 decimals (pricescale: 100000) e.g., 1.18287
            // - Forex (JPY): 3 decimals (pricescale: 1000) e.g., 150.123
            // - Crypto: 8 decimals for safety (pricescale: 100000000)
            // - Metals (Gold): 2 decimals (pricescale: 100) e.g., 2035.50
            // - Metals (Silver): 4 decimals (pricescale: 10000) e.g., 23.4567
            // - Oil: 2 decimals (pricescale: 100) e.g., 78.50
            // - Indices: 1 decimal (pricescale: 10) e.g., 5123.4
            let pricescale = 100000 // Default: 5 decimals for forex
            if (isJPY) {
                pricescale = 1000 // 3 decimals for JPY pairs
            } else if (isCrypto) {
                pricescale = 100000000 // 8 decimals for crypto
            } else if (cleanSymbol.includes('XAU')) {
                pricescale = 100 // 2 decimals for Gold
            } else if (cleanSymbol.includes('XAG')) {
                pricescale = 10000 // 4 decimals for Silver
            } else if (isOil) {
                pricescale = 100 // 2 decimals for Oil
            } else if (isMetal) {
                pricescale = 100 // 2 decimals for other metals
            } else if (isIndex) {
                pricescale = 10 // 1 decimal for indices
            }

            const assetType = isCrypto ? 'crypto' : isIndex ? 'stock' : 'forex'

            const info = {
                name: symbolName,
                description: symbolName,
                type: assetType,
                session: '24x7',
                timezone: 'Etc/UTC',
                minmov: 1,
                pricescale: pricescale,
                has_intraday: true,
                has_no_volume: false,
                has_weekly_and_monthly: true,
                supported_resolutions: supportedResolutions,
                volume_precision: 2,
                data_status: 'streaming',
            }

            setTimeout(() => onSymbolResolvedCallback(info))
        },
        getBars: (symbolInfo: any, resolution: string, periodParams: any, onHistoryCallback: any, onErrorCallback: any) => {
            const { from, to, firstDataRequest } = periodParams

            const mappedRes = mapTVToInterval(resolution)

            console.log('[TV Datafeed] getBars called')
            console.log('  Resolution:', resolution, '→ mapped:', mappedRes)
            console.log('  Current intervalRef:', currentIntervalRef.current)
            console.log('  From:', periodParams.from, '→', new Date(periodParams.from * 1000).toISOString())
            console.log('  To:', periodParams.to, '→', new Date(periodParams.to * 1000).toISOString())

            // Check if resolution matches current requested interval
            if (mappedRes !== currentIntervalRef.current) {
                console.log('[TV Datafeed] ⚡ Interval changed from', currentIntervalRef.current, 'to', mappedRes)

                // UPDATE REF IMMEDIATELY to prevent repeated mismatch handling
                currentIntervalRef.current = mappedRes

                // Notify parent to re-aggregate data for new interval
                if (onIntervalChange) {
                    onIntervalChange(mappedRes)
                }

                // Return current data temporarily while new data loads
                // This prevents "NO DATA" flash during transition
                const currentData = dataRef.current || []
                if (currentData.length > 0) {
                    const allBars = currentData.map((d: any) => ({
                        time: d.time < 10000000000 ? d.time * 1000 : d.time,
                        open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume
                    }))
                    allBars.sort((a, b) => a.time - b.time)
                    console.log('[TV Datafeed] Returning', allBars.length, 'bars during interval transition')
                    onHistoryCallback(allBars, { noData: false })
                    return
                }

                // Only return noData if we truly have no data
                onHistoryCallback([], { noData: true })
                return
            }

            const currentData = dataRef.current || []

            if (currentData.length === 0) {
                console.log('[TV Datafeed] No data available yet')
                onHistoryCallback([], { noData: true })
                return
            }

            // Get data range (timestamps are in SECONDS in our data)
            const dataFirstTime = currentData[0].time

            // If TradingView is requesting data BEFORE our earliest data,
            // trigger background fetch for more history instead of hard-stopping
            if (to < dataFirstTime) {
                console.log('[TV Datafeed] 📜 Request is before our data range, requesting more history...')
                // Trigger background fetch (non-blocking)
                if (onRequestMoreHistory) {
                    onRequestMoreHistory()
                }
                // Return noData for now — chart will update when new data arrives
                onHistoryCallback([], { noData: true })
                return
            }

            // Convert all data to bars format
            // KEEP ORIGINAL FORMAT: Convert to milliseconds (this is what was working)
            const allBars = currentData.map((d: any) => ({
                time: d.time < 10000000000 ? d.time * 1000 : d.time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volume
            }))

            allBars.sort((a, b) => a.time - b.time)

            // KEEP ORIGINAL BEHAVIOR: Return ALL data
            // TradingView figures out what to display
            console.log(`[TV Datafeed] Returning all ${allBars.length} bars`)

            if (allBars.length) {
                onHistoryCallback(allBars, { noData: false })
            } else {
                onHistoryCallback([], { noData: true })
            }
        },
        subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: any, listenerGuid: string, onResetCacheNeededCallback: any) => {
        },
        unsubscribeBars: (listenerGuid: string) => { }
    }
}

export default function BacktestTVChart({
    data,
    interval,
    symbol,
    orders,
    trades,
    currentPrice,
    isPlaying,
    onPlayPause,
    onStepForward,
    onPlaceOrder,
    onReset,
    onIntervalChange,
    onRequestMoreHistory,
    onCloseTrade,
    sessionStartTime,
    currentTime,
    sessionId
}: BacktestTVChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const widgetRef = useRef<any>(null)
    const realtimeCallbackRef = useRef<any>(null)

    // Buttons Refs to update icons dynamically
    const playButtonRef = useRef<HTMLElement | null>(null)

    // Refs for Datafeed Access
    const dataRef = useRef(data)
    const intervalRef = useRef(interval)
    const sessionStartTimeRef = useRef(sessionStartTime)

    // Flag to ensure widget only initializes ONCE EVER
    const hasInitializedRef = useRef(false)

    // Trigger state to force useEffect rerun when data loads
    const [initTrigger, setInitTrigger] = useState(0)

    // Widget state tracking
    const widgetReadyRef = useRef(false)
    const chartInstanceRef = useRef<any>(null)
    const hasPositionedRef = useRef(false) // Track if chart has been positioned to session start

    // SMOOTH TRANSITION: Track when timeframe is changing
    const [isTransitioning, setIsTransitioning] = useState(false)


    // Update refs when props change
    useEffect(() => {
        intervalRef.current = interval
        sessionStartTimeRef.current = sessionStartTime
    }, [interval, sessionStartTime])

    // Update data ref when it changes  
    useEffect(() => {
        dataRef.current = data
    }, [data])

    // Update Play Button Icon when isPlaying changes
    useEffect(() => {
        if (playButtonRef.current) {
            playButtonRef.current.innerHTML = isPlaying
                ? `<div style="display: flex; align-items: center; color: #ef4444; font-weight: 600;" title="Pause"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></div>`
                : `<div style="display: flex; align-items: center; color: #10b981; font-weight: 600;" title="Play"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>`
        }
    }, [isPlaying])

    useEffect(() => {
        // GUARD: Prevent rerun
        if (hasInitializedRef.current) {
            console.log('[TV Chart] ✅ Already initialized, skipping')
            return
        }

        const currentData = dataRef.current
        console.log('[TV Chart] 🚀 ONE-TIME INIT - Data length:', currentData?.length || 0)

        if (!chartContainerRef.current) {
            console.log('[TV Chart] ⚠️  No container ref')
            return
        }

        // Wait for data to be available (check ref, not prop!)
        if (!currentData || currentData.length === 0) {
            console.log('[TV Chart] ⏳ Waiting for data...')
            return
        }

        // GUARD: Only initialize once
        if (widgetRef.current) {
            console.log('[TV Chart] ✅ Widget already exists, skipping')
            return
        }

        // GUARD: Prevent double script loading
        const existingScript = document.querySelector('script[src="/charting_library/charting_library.js"]')
        if (existingScript && (window as any).TradingView) {
            console.log('[TV Chart] ✅ TradingView library already loaded, creating widget directly')
            // Small delay to ensure DOM ref is attached
            setTimeout(() => initializeWidget(), 100)
            return
        }

        console.log(`[TV Chart] 📊 Initializing with ${currentData.length} candles`)

        const script = document.createElement('script')
        script.src = '/charting_library/charting_library.js'
        script.async = true
        script.onload = () => {
            // Small delay to ensure DOM ref is attached
            setTimeout(() => initializeWidget(), 100)
        }
        document.head.appendChild(script)

        // Widget initialization logic (extracted to avoid duplication)
        function initializeWidget() {
            // CRITICAL: Verify container still exists before creating widget
            if (!chartContainerRef.current) {
                console.error('❌ [TV Chart] Container ref is null, cannot initialize widget')
                console.log('   Retrying in 200ms...')
                // Retry once after a short delay
                setTimeout(() => {
                    if (chartContainerRef.current) {
                        console.log('✅ [TV Chart] Container ref now available, initializing...')
                        initializeWidget()
                    } else {
                        console.error('❌ [TV Chart] Container ref still null after retry')
                    }
                }, 200)
                return
            }
            const tvInterval = mapIntervalToTV(interval)
            const datafeed = createBacktestDatafeed(dataRef, intervalRef, onIntervalChange, onRequestMoreHistory)

            const originalSubscribe = datafeed.subscribeBars
            datafeed.subscribeBars = (symbolInfo: any, resolution: string, onRealtimeCallback: any, listenerGuid: string, onResetCacheNeededCallback: any) => {
                realtimeCallbackRef.current = onRealtimeCallback
            }

            const widgetOptions = {
                symbol: symbol, // Use actual pair name instead of 'Backtest'
                datafeed: datafeed,
                interval: tvInterval,
                container: chartContainerRef.current!,
                library_path: '/charting_library/',
                locale: 'en',
                disabled_features: [
                    'header_symbol_search',
                    'header_compare',
                    'display_market_status',
                    'study_templates',
                    'header_saveload',
                ] as any,
                enabled_features: [
                    'header_widget',
                    'header_resolutions',
                    'header_interval_dialog_button',
                    'left_toolbar',
                    'control_bar',
                    'timeframes_toolbar',
                    'context_menus',
                    'header_settings',
                    'header_screenshot',
                ] as any,
                fullscreen: false,
                autosize: true,
                theme: 'Dark',
                time_scale: {
                    right_offset: 20,
                    bar_spacing: 6, // Smaller = more candles visible
                    min_bar_spacing: 2,
                },
                studies_overrides: {
                    "volume.volume.color.0": "#ef4444",
                    "volume.volume.color.1": "#10b981",
                    "volume.volume.transparency": 50,
                },
                overrides: {
                    "paneProperties.background": "#000000",
                    "paneProperties.vertGridProperties.color": "#18181b",
                    "paneProperties.horzGridProperties.color": "#18181b",
                    "scalesProperties.textColor": "#71717a",
                    "mainSeriesProperties.candleStyle.upColor": "#10b981",
                    "mainSeriesProperties.candleStyle.downColor": "#ef4444",
                    "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
                    "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
                    "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
                    "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
                }
            }

            // @ts-ignore
            if (window.TradingView) {
                const widget = new window.TradingView.widget(widgetOptions as any)
                widgetRef.current = widget

                widget.onChartReady(() => {
                    console.log('[TV Chart] 📈 Widget ready!')

                    // Store chart instance
                    chartInstanceRef.current = widget.activeChart()
                    widgetReadyRef.current = true

                    // Note: Volume study is now automatically included via has_no_volume: false
                    // and studies_overrides. No need to manually add - it causes duplicates.

                    widget.headerReady().then(() => {
                        console.log('[TV Chart] 🎨 Header ready, creating buttons')


                        // REPLAY CONTROLS (Left/Center)
                        // Use props directly (not refs) to avoid undefined errors
                        const handleStep = () => onStepForward?.()
                        const handlePlay = () => onPlayPause?.()
                        const handlePlaceOrder = () => onPlaceOrder?.()
                        const handleReset = () => onReset?.()

                        // 1. Step Forward
                        if (onStepForward) {
                            const btn = widget.createButton({ align: 'left' } as any)
                            btn.setAttribute('title', 'Next Candle')
                            btn.addEventListener('click', handleStep)
                            btn.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: pointer; color: #d1d4dc; border-right: 1px solid #2a2e39; transition: color 0.2s;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></div>`
                            btn.onmouseenter = () => { btn.querySelector('div')!.style.color = '#f0f3fa' }
                            btn.onmouseleave = () => { btn.querySelector('div')!.style.color = '#d1d4dc' }
                        }

                        // 2. Play/Pause
                        if (onPlayPause) {
                            const btn = widget.createButton({ align: 'left' } as any)
                            btn.setAttribute('title', 'Play/Pause')
                            btn.addEventListener('click', handlePlay)
                            playButtonRef.current = btn
                            // Initial Render
                            btn.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: pointer; color: #10b981; font-weight: 600; padding: 0 4px;"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>`
                        }

                        // ACTIONS (Right)

                        // 3. Quick Place (Premium Button)
                        if (onPlaceOrder) {
                            const btn = widget.createButton({ align: 'right' } as any)
                            btn.setAttribute('title', 'Place Order')
                            btn.addEventListener('click', handlePlaceOrder)
                            btn.innerHTML = `
                                <div style="
                                    display: flex; 
                                    gap: 8px; 
                                    align-items: center; 
                                    cursor: pointer; 
                                    color: white; 
                                    font-weight: 600; 
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                                    padding: 6px 16px; 
                                    border-radius: 6px;
                                    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1);
                                    border: 1px solid rgba(255,255,255,0.1);
                                    font-size: 13px;
                                    letter-spacing: 0.3px;
                                    transition: all 0.2s ease;
                                ">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    <span>NEW ORDER</span>
                                </div>`

                            // Hover effect
                            btn.onmouseenter = () => {
                                const div = btn.querySelector('div')
                                if (div) {
                                    div.style.transform = 'translateY(-1px)'
                                    div.style.boxShadow = '0 6px 8px -1px rgba(59, 130, 246, 0.3), 0 4px 6px -1px rgba(59, 130, 246, 0.15)'
                                }
                            }
                            btn.onmouseleave = () => {
                                const div = btn.querySelector('div')
                                if (div) {
                                    div.style.transform = 'translateY(0)'
                                    div.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)'
                                }
                            }
                        }

                        // 4. Rewind
                        if (onReset) {
                            const btnRewind = widget.createButton({ align: 'right' } as any)
                            btnRewind.setAttribute('title', 'Reset Session')
                            btnRewind.addEventListener('click', handleReset)
                            btnRewind.innerHTML = `<div style="display: flex; gap: 6px; align-items: center; justify-content: center; height: 32px; width: 32px; cursor: pointer; color: #71717a; transition: color 0.2s;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                                </div>`
                            btnRewind.onmouseenter = () => { btnRewind.querySelector('div')!.style.color = '#ef4444' }
                            btnRewind.onmouseleave = () => { btnRewind.querySelector('div')!.style.color = '#71717a' }
                        }



                        // ═══════════════════════════════════════════════════════════
                        // PHASE 4: CORRECT DATE POSITIONING
                        // ═══════════════════════════════════════════════════════════
                        console.log('🔍 [TV Chart] PHASE 4 - Date Positioning Debug:')
                        console.log('   sessionStartTimeRef.current:', sessionStartTimeRef.current)
                        console.log('   sessionStartTime prop (at render):', sessionStartTime)
                        console.log('   intervalRef.current:', intervalRef.current)

                        const startTime = sessionStartTimeRef.current
                        if (startTime) {
                            // Convert to seconds if needed (TradingView uses Unix seconds)
                            const startSec = startTime > 10000000000 ? startTime / 1000 : startTime

                            // Show 100 candles before start for context
                            const intSec = mapIntervalToSeconds(intervalRef.current)
                            const rangeStart = startSec - (100 * intSec)
                            const rangeEnd = startSec + (300 * intSec)

                            console.log(`📅 [TV Chart] Setting viewport range:`)
                            console.log(`   Start: ${new Date(rangeStart * 1000).toISOString()}`)
                            console.log(`   Session Start: ${new Date(startSec * 1000).toISOString()}`)
                            console.log(`   End: ${new Date(rangeEnd * 1000).toISOString()}`)

                            try {
                                widget.activeChart().setVisibleRange(
                                    { from: rangeStart, to: rangeEnd },
                                    { applyDefaultRightMargin: false }
                                ).then(() => {
                                    console.log('✅ [TV Chart] setVisibleRange Promise resolved - Viewport positioned!')
                                    hasPositionedRef.current = true // Mark as positioned to prevent fallback from re-triggering
                                }).catch((err: any) => {
                                    console.error('❌ [TV Chart] setVisibleRange Promise rejected:', err)
                                })
                            } catch (e) {
                                console.error('❌ [TV Chart] setVisibleRange FAILED:', e)
                            }
                        } else {
                            console.warn('⚠️ [TV Chart] NO sessionStartTime available! Chart will show default range.')
                            console.warn('   This means the prop was not passed or was undefined at initialization.')
                        }

                        // PHASE 2: Drawing Persistence (Auto-Load) — per-session
                        const STORAGE_KEY = sessionId ? `backtest_drawings_v4_${sessionId}` : 'backtest_drawings_v4'
                        const savedState = localStorage.getItem(STORAGE_KEY)
                        if (savedState) {
                            try {
                                const parsed = JSON.parse(savedState)
                                widget.load(parsed)
                                console.log('✅ [TV Chart] Restored saved chart state')
                            } catch (e) {
                                console.error('❌ [TV Chart] Failed to load chart state:', e)
                                localStorage.removeItem(STORAGE_KEY) // Clear corrupt data
                            }
                        }
                    })
                })

                // Mark as initialized to prevent re-init
                hasInitializedRef.current = true
                // Mark as initialized to prevent re-init
                hasInitializedRef.current = true
                console.log('✅ [TV Chart] hasInitializedRef = TRUE (will never recreate)')
            }
        }

        // ═══════════════════════════════════════════════════════════
        // PHASE 2: AUTO-SAVE (Back to widget.save() - simple approach)
        // ═══════════════════════════════════════════════════════════
        const STORAGE_KEY = sessionId ? `backtest_drawings_v4_${sessionId}` : 'backtest_drawings_v4'

        const saveInterval = setInterval(() => {
            if (widgetRef.current && widgetReadyRef.current) {
                try {
                    widgetRef.current.save((state: any) => {
                        const stateWithMeta = {
                            ...state,
                            savedAt: Date.now(),
                            interval: intervalRef.current
                        }
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithMeta))
                        console.log('💾 [TV Chart] Auto-saved chart state')
                    })
                } catch (e) {
                    console.error('❌ [TV Chart] Auto-save failed:', e)
                }
            }
        }, 2000)

        // Cleanup ONLY on final unmount
        // This return applies to the useEffect that creates the widget
        return () => {
            console.log('[TV Chart] 🧹 Component unmounting - final cleanup')
            clearInterval(saveInterval)

            // Final save before unmount
            if (widgetRef.current && widgetReadyRef.current) {
                try {
                    // Extra null safety - widget might be in transitional state
                    const widget = widgetRef.current
                    if (widget && typeof widget.save === 'function') {
                        widget.save((state: any) => {
                            const stateWithMeta = {
                                ...state,
                                savedAt: Date.now(),
                                interval: intervalRef.current
                            }
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithMeta))
                            console.log('💾 [TV Chart] Final save on unmount')
                        })
                    }
                } catch (e) {
                    console.warn('[TV Chart] Final save failed (widget may be disposed):', e)
                }
            }

            // Only destroy widget on final unmount (not on re-renders)
            if (widgetRef.current) {
                try { widgetRef.current.remove() } catch (e) {
                    console.error('Failed to remove widget:', e)
                }
                widgetRef.current = null
                playButtonRef.current = null
            }

            widgetReadyRef.current = false
            chartInstanceRef.current = null
            hasInitializedRef.current = false // Reset initialization flag on unmount
        }
    }, [data?.length]) // Re-run if data length changes (e.g. new session loaded)

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 4 FALLBACK: Reposition chart when sessionStartTime prop becomes available
    // ═══════════════════════════════════════════════════════════════════════════
    // This effect handles the case where the initial onChartReady fires BEFORE
    // the sessionStartTime prop is populated (async data loading race condition)

    useEffect(() => {
        console.log('🔄 [TV Chart] FALLBACK EFFECT - sessionStartTime changed:', sessionStartTime)
        console.log('   Widget ready?:', widgetReadyRef.current)
        console.log('   Already positioned?:', hasPositionedRef.current)

        // Skip if already positioned or widget not ready
        if (hasPositionedRef.current) {
            console.log('   ⏭️ Already positioned, skipping')
            return
        }

        if (!widgetReadyRef.current || !widgetRef.current) {
            console.log('   ⏭️ Widget not ready, skipping')
            return
        }

        if (!sessionStartTime) {
            console.log('   ⏭️ No sessionStartTime, skipping')
            return
        }

        // Convert to seconds
        const startSec = sessionStartTime > 10000000000 ? sessionStartTime / 1000 : sessionStartTime
        const intSec = mapIntervalToSeconds(interval)
        const rangeStart = startSec - (100 * intSec)
        const rangeEnd = startSec + (300 * intSec)

        console.log(`📅 [TV Chart] FALLBACK positioning to: ${new Date(startSec * 1000).toISOString()}`)

        try {
            const chart = widgetRef.current?.activeChart?.()
            if (!chart) {
                console.warn('[TV Chart] activeChart() returned null, skipping setVisibleRange')
                return
            }

            chart.setVisibleRange(
                { from: rangeStart, to: rangeEnd },
                { applyDefaultRightMargin: false }
            ).then(() => {
                console.log('✅ [TV Chart] FALLBACK setVisibleRange succeeded!')
                hasPositionedRef.current = true
            }).catch((err: any) => {
                console.error('❌ [TV Chart] FALLBACK setVisibleRange failed:', err)
            })
        } catch (e) {
            console.error('❌ [TV Chart] FALLBACK setVisibleRange threw:', e)
        }
    }, [sessionStartTime, interval])

    // PHASE 3: Seamless Timeframe Switching
    // ═══════════════════════════════════════════════════════════════════════════
    // SIMPLE APPROACH: Watch interval + data together.
    // When interval changes, mark pending. When data arrives with new interval
    // data, refresh chart. Failsafe clears overlay after 5 seconds.
    // ═══════════════════════════════════════════════════════════════════════════
    const prevIntervalRef = useRef(interval)
    const prevDataLenRef = useRef(data.length)

    useEffect(() => {
        const intervalChanged = prevIntervalRef.current !== interval
        const dataChanged = prevDataLenRef.current !== data.length

        prevIntervalRef.current = interval
        prevDataLenRef.current = data.length

        // Only act when interval ACTUALLY changes
        if (!intervalChanged) return

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`[TV Chart] ⏱️ INTERVAL SWITCH: ${interval}, data: ${data.length} candles`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        // Show transition overlay
        setIsTransitioning(true)

        // Update refs immediately
        dataRef.current = data
        intervalRef.current = interval

        // If no widget yet, just wait — data change handler below will pick it up
        if (!widgetRef.current || !widgetReadyRef.current) {
            console.log('[TV Chart] ⚠️ Widget not ready, will refresh when ready')
            // Failsafe: clear overlay after 5s even if something goes wrong
            setTimeout(() => setIsTransitioning(false), 5000)
            return
        }

        if (data.length === 0) {
            console.log('[TV Chart] ⚠️ No data yet, waiting...')
            // Failsafe: clear overlay after 5s
            setTimeout(() => setIsTransitioning(false), 5000)
            return
        }

        // Save drawings before switch
        const STORAGE_KEY = sessionId ? `backtest_drawings_v4_${sessionId}` : 'backtest_drawings_v4'
        try {
            widgetRef.current.save((state: any) => {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now(), interval }))
            })
        } catch (e) { /* non-critical */ }

        // Refresh chart with new data
        try {
            const chart = widgetRef.current.activeChart()
            const tvInterval = mapIntervalToTV(interval)

            console.log(`[TV Chart] 🔄 Refreshing: setResolution(${tvInterval}) + resetData()`)

            // Set resolution first, then resetData to reload from our updated dataRef
            chart.setResolution(tvInterval, () => {
                // Resolution callback
                try {
                    chart.resetData()
                    console.log(`[TV Chart] ✅ Chart refreshed with ${data.length} x ${interval} candles`)

                    // Restore drawings + reposition after brief delay
                    setTimeout(() => {
                        try {
                            const widget = widgetRef.current
                            if (widget && typeof widget.load === 'function') {
                                const saved = localStorage.getItem(STORAGE_KEY)
                                if (saved) widget.load(JSON.parse(saved))
                            }

                            // Reposition viewport
                            const startTime = sessionStartTimeRef.current
                            if (startTime) {
                                const startSec = startTime > 10000000000 ? startTime / 1000 : startTime
                                const intSec = mapIntervalToSeconds(interval)
                                chart.setVisibleRange(
                                    { from: startSec - (100 * intSec), to: startSec + (300 * intSec) },
                                    { applyDefaultRightMargin: false }
                                ).catch(() => { })
                            }
                        } catch (e) { /* non-critical */ }
                        setIsTransitioning(false)
                    }, 200)
                } catch (e) {
                    console.error('[TV Chart] resetData failed:', e)
                    setIsTransitioning(false)
                }
            })
        } catch (e) {
            console.error('[TV Chart] Failed to refresh chart:', e)
            setIsTransitioning(false)
        }
    }, [interval, data, data?.length])


    // Handle Data Updates (Replay Tick vs Reset)
    // ONLY for normal playback - NOT for interval switches (handled by PHASE 3 above)
    const prevDataLengthRef = useRef(0)

    useEffect(() => {
        if (!widgetRef.current || data.length === 0) return
        // SKIP if we're in the middle of an interval switch - PHASE 3 handles it
        if (isTransitioning) return

        const prevLen = prevDataLengthRef.current
        const currLen = data.length
        prevDataLengthRef.current = currLen

        // Case 1: Reset / Rewind (Data shrank) - but NOT from interval switch
        if (currLen < prevLen && prevLen > 0) {
            console.log('[TV Chart] ⏪ Data Rewind Detected. Forcing refresh.')
            try {
                const chart = widgetRef.current.activeChart()
                const tvInterval = mapIntervalToTV(interval)
                chart.setResolution(tvInterval, () => {
                    chart.executeActionById('chartReset')
                })
            } catch (e) {
                console.warn('Failed to refresh chart on rewind:', e)
            }
            return
        }

        // Case 2: New Candle (Replay Tick)
        if (realtimeCallbackRef.current && currLen > prevLen && prevLen > 0) {
            const lastCandle = data[data.length - 1]
            const time = lastCandle.time < 10000000000 ? lastCandle.time * 1000 : lastCandle.time

            realtimeCallbackRef.current({
                time: time,
                open: lastCandle.open,
                high: lastCandle.high,
                low: lastCandle.low,
                close: lastCandle.close,
                volume: lastCandle.volume
            })
        }
    }, [data])

    // Draw Order Lines using Standard API (createShape)
    const orderShapesRef = useRef<any[]>([])

    // Helper to clear shapes
    const clearShapes = () => {
        if (!widgetRef.current || !widgetRef.current.activeChart) return

        try {
            const chart = widgetRef.current.activeChart()
            if (!chart) return

            orderShapesRef.current.forEach(shapeId => {
                try {
                    chart.removeEntity(shapeId)
                } catch (e) {
                    // Shape might already be removed
                }
            })
        } catch (e) {
            console.warn('[TV Chart] Failed to access activeChart during cleanup:', e)
        }
        orderShapesRef.current = []
    }

    // ===============================================================
    // TRADE LINES: EP / TP / SL with Live PnL using createShape
    // Uses horizontal_line shapes (works in basic charting library)
    // ===============================================================
    const tradeShapeIdsRef = useRef<any[]>([])

    const clearTradeShapes = () => {
        if (!widgetRef.current) return
        try {
            const chart = widgetRef.current.activeChart()
            tradeShapeIdsRef.current.forEach(id => {
                try { chart.removeEntity(id) } catch (e) { /* already removed */ }
            })
        } catch (e) { /* chart not ready */ }
        tradeShapeIdsRef.current = []
    }

    useEffect(() => {
        if (!widgetRef.current || !widgetReadyRef.current) return
        if (!data || data.length === 0) return

        let chart: any
        try {
            chart = widgetRef.current.activeChart()
        } catch (e) {
            console.warn('[TV Chart] Cannot access chart for trade lines:', e)
            return
        }
        if (!chart) return
        
        // Clear previous shapes
        clearTradeShapes()

        const price = currentPrice || (data.length > 0 ? data[data.length - 1].close : 0)
        const lastCandle = data[data.length - 1]
        const lastTime = lastCandle.time

        // Helper: Format PnL
        const fmtPnl = (pnl: number) => {
            const s = pnl >= 0 ? '+' : ''
            return s + '$' + Math.abs(pnl).toFixed(2)
        }

        // Helper: Format price
        const fmtPrice = (p: number) => {
            if (p >= 1000) return p.toFixed(2)
            if (p >= 10) return p.toFixed(4)
            return p.toFixed(5)
        }

        // Draw OPEN TRADES with Entry, TP, SL lines
        trades?.forEach(trade => {
            if (trade.status !== 'OPEN') return

            const qty = trade.quantity || 1
            const isLong = trade.side === 'LONG'
            const priceDiff = isLong ? (price - trade.entryPrice) : (trade.entryPrice - price)
            const livePnl = priceDiff * qty

            try {
                // === ENTRY LINE (Blue/Red solid) ===
                const entryId = chart.createShape(
                    { time: lastTime, price: trade.entryPrice },
                    {
                        shape: 'horizontal_line',
                        lock: true,
                        disableSelection: false,
                        disableSave: true,
                        disableUndo: true,
                        zOrder: 'top',
                        overrides: {
                            linecolor: isLong ? '#3b82f6' : '#ef4444',
                            linestyle: 0, // solid
                            linewidth: 2,
                            showPrice: true,
                            showLabel: true,
                            text: (isLong ? 'LONG' : 'SHORT') + ' Entry ' + fmtPrice(trade.entryPrice) + '  |  PnL: ' + fmtPnl(livePnl),
                            textcolor: isLong ? '#93c5fd' : '#fca5a5',
                            fontsize: 12,
                            horzLabelsAlign: 'right',
                            bold: true,
                        }
                    }
                )
                if (entryId) tradeShapeIdsRef.current.push(entryId)

                // === TAKE PROFIT LINE (Green dashed) ===
                if (trade.takeProfit && trade.takeProfit > 0) {
                    const tpDiff = isLong
                        ? (trade.takeProfit - trade.entryPrice)
                        : (trade.entryPrice - trade.takeProfit)
                    const tpPnl = tpDiff * qty

                    const tpId = chart.createShape(
                        { time: lastTime, price: trade.takeProfit },
                        {
                            shape: 'horizontal_line',
                            lock: true,
                            disableSelection: false,
                            disableSave: true,
                            disableUndo: true,
                            zOrder: 'top',
                            overrides: {
                                linecolor: '#22c55e',
                                linestyle: 2, // dashed
                                linewidth: 1,
                                showPrice: true,
                                showLabel: true,
                                text: 'TP ' + fmtPrice(trade.takeProfit) + '  |  ' + fmtPnl(tpPnl),
                                textcolor: '#86efac',
                                fontsize: 11,
                                horzLabelsAlign: 'right',
                                bold: false,
                            }
                        }
                    )
                    if (tpId) tradeShapeIdsRef.current.push(tpId)
                }

                // === STOP LOSS LINE (Red dashed) ===
                if (trade.stopLoss && trade.stopLoss > 0) {
                    const slDiff = isLong
                        ? (trade.stopLoss - trade.entryPrice)
                        : (trade.entryPrice - trade.stopLoss)
                    const slPnl = slDiff * qty

                    const slId = chart.createShape(
                        { time: lastTime, price: trade.stopLoss },
                        {
                            shape: 'horizontal_line',
                            lock: true,
                            disableSelection: false,
                            disableSave: true,
                            disableUndo: true,
                            zOrder: 'top',
                            overrides: {
                                linecolor: '#ef4444',
                                linestyle: 2, // dashed
                                linewidth: 1,
                                showPrice: true,
                                showLabel: true,
                                text: 'SL ' + fmtPrice(trade.stopLoss) + '  |  ' + fmtPnl(slPnl),
                                textcolor: '#fca5a5',
                                fontsize: 11,
                                horzLabelsAlign: 'right',
                                bold: false,
                            }
                        }
                    )
                    if (slId) tradeShapeIdsRef.current.push(slId)
                }
            } catch (e) {
                console.warn('[TV Chart] Failed to create trade line shapes:', e)
            }
        })

        // Draw PENDING ORDERS
        orders?.forEach(order => {
            if (order.status !== 'PENDING') return
            const orderPrice = order.limitPrice || order.stopPrice
            if (!orderPrice) return

            try {
                const orderId = chart.createShape(
                    { time: lastTime, price: orderPrice },
                    {
                        shape: 'horizontal_line',
                        lock: true,
                        disableSelection: false,
                        disableSave: true,
                        disableUndo: true,
                        zOrder: 'top',
                        overrides: {
                            linecolor: order.side === 'LONG' ? '#60a5fa' : '#f97316',
                            linestyle: 1, // dotted
                            linewidth: 1,
                            showPrice: true,
                            showLabel: true,
                            text: order.side + ' ' + order.type + ' @ ' + fmtPrice(orderPrice),
                            textcolor: order.side === 'LONG' ? '#93c5fd' : '#fdba74',
                            fontsize: 10,
                            horzLabelsAlign: 'right',
                        }
                    }
                )
                if (orderId) tradeShapeIdsRef.current.push(orderId)
            } catch (e) {
                console.warn('[TV Chart] Failed to create order shape:', e)
            }
        })

        return () => { clearTradeShapes() }
    }, [orders, trades, data, currentPrice, JSON.stringify(trades?.map(t => ({ id: t.id, status: t.status })))])

    return (
        <div className="h-full w-full relative">
            <div ref={chartContainerRef} className="h-full w-full" />

            {/* SMOOTH TRANSITION OVERLAY */}
            {isTransitioning && (
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
                    style={{ animation: 'fadeIn 0.2s ease-out' }}
                >
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-zinc-400 font-medium">Switching timeframe...</span>
                    </div>
                </div>
            )}
        </div>
    )
}
