export const ASSET_CATEGORIES = {
    FOREX: [
        // Major Pairs (Dukascopy)
        "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD",
        // Cross Pairs (Dukascopy)
        "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "CADJPY", "CHFJPY", "NZDJPY",
        "EURAUD", "EURNZD", "GBPAUD", "GBPNZD", "AUDNZD", "AUDCAD", "NZDCAD",
        "GBPCAD", "GBPCHF", "EURCHF", "EURCAD", "AUDCHF", "NZDCHF", "CADCHF",
        // Exotic Pairs (Dukascopy)
        "USDSGD", "USDHKD", "USDTRY", "USDMXN", "USDZAR", "USDNOK", "USDSEK",
        "USDPLN", "USDDKK", "USDCZK", "USDHUF", "EURTRY", "EURNOK", "EURSEK",
        "EURPLN", "EURDKK", "EURCZK", "EURHUF", "GBPTRY", "GBPNOK", "GBPSEK",
        "TRYJPY", "SGDJPY", "NOKJPY", "SEKJPY", "ZARJPY", "MXNJPY", "HKDJPY"
    ],
    CRYPTO: [
        // All crypto → Binance
        "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT",
        "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "MATICUSDT", "LINKUSDT", "UNIUSDT",
        "LTCUSDT", "ATOMUSDT", "NEARUSDT", "APTUSDT", "XLMUSDT", "HBARUSDT",
        "SHIBUSDT", "ARBUSDT", "OPUSDT", "PEPEUSDT", "SUIUSDT", "TONUSDT",
        "FILUSDT", "INJUSDT", "TIAUSDT", "FETUSDT", "RENDERUSDT", "WIFUSDT"
    ],
    INDICES: [
        // Indices → TradingView
        "SPX500USD", "NAS100USD", "US30USD", "DEU40", "UK100",
        "EU50", "FR40", "JP225", "AU200", "HK33"
    ],
    METALS: [
        // Metals & Commodities → Dukascopy
        "XAUUSD", "XAGUSD",                     // Gold & Silver
        "PLATINUM", "PALLADIUM",                 // Precious Metals
        "USOIL", "UKOIL",                       // Oil
        "XAUEUR", "XAUAUD", "XAUGBP",           // Gold crosses
        "XAGEUR"                                  // Silver crosses
    ],
    STOCKS: [
        // Stocks → TradingView
        "AAPL", "TSLA", "NVDA", "MSFT", "AMZN",
        "GOOGL", "META", "NFLX", "AMD", "INTC",
        "BABA", "JPM", "V", "WMT", "DIS"
    ]
}

export type AssetCategory = keyof typeof ASSET_CATEGORIES

/**
 * Internal mapping: clean symbol → TradingView-prefixed symbol.
 * Used by data-service when routing to TradingView API (indices, stocks).
 * Dukascopy & Binance don't need prefixes — they strip them anyway.
 */
export const TV_SYMBOL_MAP: Record<string, string> = {
    // Indices
    'SPX500USD': 'OANDA:SPX500USD',
    'NAS100USD': 'OANDA:NAS100USD',
    'US30USD': 'OANDA:US30USD',
    'DEU40': 'TVC:DEU40',
    'UK100': 'TVC:UK100',
    'EU50': 'TVC:EU50',
    'FR40': 'TVC:FR40',
    'JP225': 'TVC:JP225',
    'AU200': 'TVC:AU200',
    'HK33': 'TVC:HK33',
    // Stocks
    'AAPL': 'NASDAQ:AAPL',
    'TSLA': 'NASDAQ:TSLA',
    'NVDA': 'NASDAQ:NVDA',
    'MSFT': 'NASDAQ:MSFT',
    'AMZN': 'NASDAQ:AMZN',
    'GOOGL': 'NASDAQ:GOOGL',
    'META': 'NASDAQ:META',
    'NFLX': 'NASDAQ:NFLX',
    'AMD': 'NASDAQ:AMD',
    'INTC': 'NASDAQ:INTC',
    'BABA': 'NYSE:BABA',
    'JPM': 'NYSE:JPM',
    'V': 'NYSE:V',
    'WMT': 'NYSE:WMT',
    'DIS': 'NYSE:DIS',
}

