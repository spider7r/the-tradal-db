import { fetchMarketDataAction, searchSymbolsAction } from '@/app/actions/market-data'
import { Candle } from '@/lib/types'

// Supported resolutions
const RESOLUTIONS = ['1', '5', '15', '30', '60', '240', 'D', 'W']

const configurationData = {
    supported_resolutions: RESOLUTIONS,
    exchanges: [{ value: 'Forex', name: 'Forex', desc: 'Forex' }],
    symbols_types: [{ name: 'Forex', value: 'forex' }],
}

export const TVDatafeed = {
    onReady: (callback: any) => {
        setTimeout(() => callback(configurationData))
    },

    searchSymbols: async (userInput: string, exchange: string, symbolType: string, onResultReadyCallback: any) => {
        try {
            const symbols = await searchSymbolsAction(userInput)
            onResultReadyCallback(symbols)
        } catch (error) {
            console.error('[TVDatafeed] Search error:', error)
            onResultReadyCallback([])
        }
    },

    resolveSymbol: async (symbolName: string, onSymbolResolvedCallback: any, onResolveErrorCallback: any) => {
        // Since we don't have a backend symbol info API primarily, we construct generic info.
        // In a real app, you'd fetch metadata. Here we assume generic Forex properties.

        // Extract basic info
        const name = symbolName.toUpperCase()

        const symbolInfo = {
            name: name,
            description: name,
            type: 'forex',
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: 'Forex',
            minmov: 1,
            pricescale: 100000,
            has_intraday: true,
            has_no_volume: false,
            has_weekly_and_monthly: true,
            supported_resolutions: RESOLUTIONS,
            volume_precision: 2,
            data_status: 'streaming',
        }

        // Adjust pricescale for JPY pairs
        if (name.includes('JPY')) {
            symbolInfo.pricescale = 1000
        }

        setTimeout(() => onSymbolResolvedCallback(symbolInfo))
    },

    getBars: async (symbolInfo: any, resolution: string, periodParams: any, onHistoryCallback: any, onErrorCallback: any) => {
        const { from, to, firstDataRequest } = periodParams

        try {
            // Convert resolution to our API format if needed (e.g. 'D' -> '1D')
            let res = resolution
            if (res === 'D') res = '1D'
            if (res === 'W') res = '1W'

            // Call Server Action
            const candles = (await fetchMarketDataAction(symbolInfo.name, res, from, to)) as Candle[]

            if (!candles.length) {
                onHistoryCallback([], { noData: true })
                return
            }

            // Map to TV format
            const bars = candles.map(c => ({
                time: c.time * 1000, // TV expects ms
                low: c.low,
                high: c.high,
                open: c.open,
                close: c.close,
                volume: c.volume || 0
            }))

            onHistoryCallback(bars, { noData: false })
        } catch (error) {
            console.error('[TVDatafeed] getBars error:', error)
            onErrorCallback(error)
        }
    },

    subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: any, listenerGuid: string, onResetCacheNeededCallback: any) => {
        // Real-time subscription placeholder
        // In a real implementation with WebSocket, we would subscribe here.
        console.log('[TVDatafeed] SubscribeBars', symbolInfo.name, resolution)
    },

    unsubscribeBars: (listenerGuid: string) => {
        console.log('[TVDatafeed] UnsubscribeBars', listenerGuid)
    },
}
