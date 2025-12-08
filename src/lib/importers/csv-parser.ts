import Papa from 'papaparse'

export interface ImportedTrade {
    open_time: string
    close_time?: string
    pair: string
    direction: 'LONG' | 'SHORT'
    entry_price: number
    exit_price?: number
    size: number
    pnl?: number
    status: 'OPEN' | 'CLOSED' | 'BE'
    outcome?: 'WIN' | 'LOSS' | 'BE'
}

export type CsvColumnMapping = {
    open_time: string
    close_time?: string
    pair: string
    direction: 'type' | 'direction' | string  // 'Type' in MT4 usually implies direction (Buy/Sell)
    entry_price: string
    exit_price: string
    size: string
    pnl: string
}

export async function parseTradesCsv(file: File, mapping: CsvColumnMapping): Promise<ImportedTrade[]> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const trades: ImportedTrade[] = []

                results.data.forEach((row: any) => {
                    // Basic Validation: Must have at least a date and a pair
                    if (!row[mapping.open_time] || !row[mapping.pair]) return

                    try {
                        const pair = row[mapping.pair].trim()

                        // Parse Direction
                        // MT4/5 often uses "Type" column: "buy", "sell", "buy limit" etc.
                        let direction: 'LONG' | 'SHORT' = 'LONG'
                        const dirRaw = (row[mapping.direction] || '').toLowerCase()
                        if (dirRaw.includes('buy') || dirRaw.includes('long')) direction = 'LONG'
                        else if (dirRaw.includes('sell') || dirRaw.includes('short')) direction = 'SHORT'

                        // Parse Numbers
                        const entryPrice = parseFloat(row[mapping.entry_price])
                        const exitPrice = row[mapping.exit_price] ? parseFloat(row[mapping.exit_price]) : undefined
                        const size = parseFloat(row[mapping.size])
                        const pnl = row[mapping.pnl] ? parseFloat(row[mapping.pnl]) : undefined

                        // skip invalid rows
                        if (isNaN(entryPrice) || isNaN(size)) return

                        // Determine Date
                        // Try to parse flexible date formats
                        const openTime = new Date(row[mapping.open_time]).toISOString()
                        const closeTime = (mapping.close_time && row[mapping.close_time]) ? new Date(row[mapping.close_time]).toISOString() : undefined

                        // Determine Status & Outcome
                        let status: 'OPEN' | 'CLOSED' | 'BE' = 'OPEN'
                        let outcome: 'WIN' | 'LOSS' | 'BE' | undefined = undefined

                        if (closeTime && exitPrice) {
                            status = 'CLOSED' // Default to closed if we have exit time
                        }

                        // Specific check: if PnL is present, it's definitely closed
                        if (pnl !== undefined) {
                            status = 'CLOSED'
                            if (pnl > 0) outcome = 'WIN'
                            else if (pnl < 0) outcome = 'LOSS'
                            else outcome = 'BE'
                        }

                        trades.push({
                            open_time: openTime,
                            close_time: closeTime,
                            pair,
                            direction,
                            entry_price: entryPrice,
                            exit_price: exitPrice,
                            size,
                            pnl,
                            status,
                            outcome
                        })

                    } catch (err) {
                        console.warn('Skipping invalid CSV row:', row, err)
                    }
                })

                resolve(trades)
            },
            error: (error) => {
                reject(error)
            }
        })
    })
}
