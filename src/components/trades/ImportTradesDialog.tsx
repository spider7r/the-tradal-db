'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { parseTradesCsv, ImportedTrade, CsvColumnMapping } from '@/lib/importers/csv-parser'
import { importTrades } from '@/app/(dashboard)/trades/actions' // Create this action next
import Papa from 'papaparse'
import { Upload, ArrowRight, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

export function ImportTradesDialog() {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [file, setFile] = useState<File | null>(null)
    const [headers, setHeaders] = useState<string[]>([])
    const [parsedTrades, setParsedTrades] = useState<ImportedTrade[]>([])
    const [isUploading, setIsUploading] = useState(false)

    // Default Mapping State
    const [mapping, setMapping] = useState<CsvColumnMapping>({
        open_time: '',
        pair: '',
        direction: '',
        entry_price: '',
        exit_price: '',
        size: '',
        pnl: '', // optional but good to map
        // close_time is usually inferred if pnl exists or can be mapped manually
    })

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)

            // Preview headers
            Papa.parse(selectedFile, {
                header: true,
                preview: 1, // just first row
                complete: (results) => {
                    if (results.meta.fields) {
                        setHeaders(results.meta.fields)
                        autoMapColumns(results.meta.fields)
                        setStep(2)
                    }
                }
            })
        }
    }

    // Auto-detect columns based on common names
    const autoMapColumns = (fields: string[]) => {
        const newMapping = { ...mapping }
        const findMatch = (keywords: string[]) => fields.find(f => keywords.some(k => f.toLowerCase().includes(k))) || ''

        newMapping.open_time = findMatch(['date', 'time', 'open time', 'entry time'])
        newMapping.pair = findMatch(['pair', 'symbol', 'instrument'])
        newMapping.direction = findMatch(['type', 'direction', 'side'])
        newMapping.entry_price = findMatch(['open', 'entry', 'price'])
        newMapping.exit_price = findMatch(['close', 'exit', 'price'])
        newMapping.size = findMatch(['size', 'lot', 'volume', 'qty'])
        newMapping.pnl = findMatch(['profit', 'pnl', 'net', 'gain'])

        setMapping(newMapping)
    }

    const handleParse = async () => {
        if (!file) return

        try {
            const trades = await parseTradesCsv(file, mapping)
            if (trades.length === 0) {
                toast.error('No valid trades found. Check your mapping.')
                return
            }
            setParsedTrades(trades)
            setStep(3)
        } catch (error) {
            console.error(error)
            toast.error('Failed to parse CSV.')
        }
    }

    const handleUpload = async () => {
        setIsUploading(true)
        const result = await importTrades(parsedTrades)
        setIsUploading(false)

        if (result.success) {
            toast.success(`Successfully imported ${result.count} trades!`)
            setOpen(false)
            // Reset state
            setStep(1)
            setFile(null)
            setParsedTrades([])
        } else {
            toast.error(result.error || 'Failed to upload trades.')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col bg-slate-950 border-slate-800/50">
                <DialogHeader>
                    <DialogTitle>Import Trades (Step {step}/3)</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-800 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors">
                            <label className="cursor-pointer flex flex-col items-center gap-4 w-full h-full justify-center">
                                <Upload className="w-12 h-12 text-slate-500" />
                                <div className="text-center">
                                    <p className="text-lg font-medium text-slate-200">Drop CSV file here</p>
                                    <p className="text-sm text-slate-500">or click to browse</p>
                                </div>
                                <Input type="file" accept=".csv" className="hidden" onChange={onFileSelect} />
                            </label>
                        </div>
                    )}

                    {/* STEP 2: MAP COLUMNS */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">Map the columns from your CSV to our format.</p>

                            <div className="grid grid-cols-2 gap-4">
                                <MappingField label="Date / Time" value={mapping.open_time} options={headers}
                                    onChange={(v) => setMapping(prev => ({ ...prev, open_time: v }))} />
                                <MappingField label="Symbol / Pair" value={mapping.pair} options={headers}
                                    onChange={(v) => setMapping(prev => ({ ...prev, pair: v }))} />
                                <MappingField label="Type (Buy/Sell)" value={mapping.direction} options={headers}
                                    onChange={(v) => setMapping(prev => ({ ...prev, direction: v }))} />
                                <MappingField label="Entry Price" value={mapping.entry_price} options={headers}
                                    onChange={(v) => setMapping(prev => ({ ...prev, entry_price: v }))} />
                                <MappingField label="Exit Price" value={mapping.exit_price} options={headers}
                                    onChange={(v) => setMapping(prev => ({ ...prev, exit_price: v }))} />
                                <MappingField label="Size (Lots)" value={mapping.size} options={headers}
                                    onChange={(v) => setMapping(prev => ({ ...prev, size: v }))} />
                                <MappingField label="Profit (PnL)" value={mapping.pnl} options={headers}
                                    onChange={(v) => setMapping(prev => ({ ...prev, pnl: v }))} />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-400">Previewing first 5 of {parsedTrades.length} trades</p>
                                <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                                    Ready to Import
                                </span>
                            </div>

                            <div className="border border-slate-800 rounded-md overflow-hidden text-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                                        <tr>
                                            <th className="p-2">Date</th>
                                            <th className="p-2">Pair</th>
                                            <th className="p-2">Type</th>
                                            <th className="p-2 text-right">PnL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {parsedTrades.slice(0, 5).map((t, i) => (
                                            <tr key={i} className="hover:bg-slate-900/50">
                                                <td className="p-2">{new Date(t.open_time).toLocaleDateString()}</td>
                                                <td className="p-2">{t.pair}</td>
                                                <td className={`p-2 ${t.direction === 'LONG' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {t.direction}
                                                </td>
                                                <td className={`p-2 text-right font-mono ${t.pnl && t.pnl > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {t.pnl?.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-800">
                    <Button variant="ghost" onClick={() => step > 1 && setStep(step - 1 as any)} disabled={step === 1}>
                        Back
                    </Button>

                    {step === 2 && (
                        <Button onClick={handleParse} className="gap-2">
                            Preview <ArrowRight className="w-4 h-4" />
                        </Button>
                    )}

                    {step === 3 && (
                        <Button onClick={handleUpload} disabled={isUploading} className="bg-emerald-500 hover:bg-emerald-600">
                            {isUploading ? 'Importing...' : 'Confirm Import'}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function MappingField({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-slate-500">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full bg-slate-900 border-slate-800">
                    <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                    {options.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
