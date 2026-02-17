'use client'

import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { Check, Copy, ChevronLeft, Upload, Bitcoin, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'

// TYPES
type PaymentMethod = {
    id: string
    name: string
    icon: string // For now using local assets or emojis/lucide
    network?: string
    address?: string
    qrCode?: string // URL to QR code image
}

// CONFIGURATION (Mock Data matching screenshots)
const PAYMENT_METHODS: PaymentMethod[] = [
    {
        id: 'usdt_trc20',
        name: 'USDT TRC20',
        icon: 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=024',
        network: 'TRC20',
        address: 'TLM9qpQVH5eGKbUMfukFEC85N5iHGzmrg',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TLM9qpQVH5eGKbUMfukFEC85N5iHGzmrg'
    },
    {
        id: 'usdt_bep20',
        name: 'USDT BEP20',
        icon: 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=024',
        network: 'BEP20',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=0x1234567890abcdef1234567890abcdef12345678'
    },
    {
        id: 'usdt_erc20',
        name: 'USDT ERC20',
        icon: 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=024',
        network: 'ERC20',
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=0xabcdef1234567890abcdef1234567890abcdef12'
    },
    {
        id: 'btc',
        name: 'BTC',
        icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024',
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
    },
    {
        id: 'upi',
        name: 'UPI',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg',
        address: 'merchant@upi',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=merchant@upi'
    },
]

interface ManualPaymentDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    initialAmount?: string
}

export function ManualPaymentDialog({ open, onOpenChange, trigger, initialAmount = '53.90' }: ManualPaymentDialogProps) {
    const [step, setStep] = useState<'methods' | 'qr' | 'details'>('methods')
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
    const [amount, setAmount] = useState(initialAmount)
    const [txid, setTxid] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [copied, setCopied] = useState(false)

    // Reset when closing
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setTimeout(() => {
                setStep('methods')
                setSelectedMethod(null)
                setTxid('')
                setFile(null)
            }, 300)
        }
        onOpenChange?.(isOpen)
    }

    const copyAddress = () => {
        if (selectedMethod?.address) {
            navigator.clipboard.writeText(selectedMethod.address)
            setCopied(true)
            toast.success("Address Copied!")
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleSubmit = () => {
        // Here we would typically upload the file and send data to server
        // For now, we'll just open WhatsApp with the details
        const msg = `Payment Submitted for PLAN UPGRADE\nMethod: ${selectedMethod?.name}\nAmount: ${amount}\nTXID: ${txid}`
        const waLink = `https://wa.me/19176906233?text=${encodeURIComponent(msg)}`

        window.open(waLink, '_blank')
        toast.success("Payment Submitted! Redirecting to WhatsApp...")
        handleOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-md border-0 bg-transparent p-0 overflow-hidden shadow-2xl">
                <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[700px] w-full relative">

                    {/* Header */}
                    <div className="p-4 border-b border-zinc-800 flex items-center gap-4 bg-[#0D1117] z-10">
                        {step !== 'methods' && (
                            <button
                                onClick={() => setStep(step === 'details' ? 'qr' : 'methods')}
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        )}
                        <DialogTitle className="text-base font-medium text-white flex-1 text-center pr-8">
                            {step === 'methods' && 'Choose payment method'}
                            {step === 'qr' && 'Payment Details'}
                            {step === 'details' && 'Fill your payment details'}
                        </DialogTitle>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-800">

                        {/* STEP 1: PAYMENT METHODS */}
                        {step === 'methods' && (
                            <div className="space-y-3">
                                {PAYMENT_METHODS.map(method => (
                                    <button
                                        key={method.id}
                                        onClick={() => {
                                            setSelectedMethod(method)
                                            setStep('qr')
                                        }}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-[#161B22] hover:bg-[#1C2128] transition-all group text-left"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center p-1.5 flex-shrink-0">
                                            <img src={method.icon} alt={method.name} className="w-full h-full object-contain" />
                                        </div>
                                        <span className="text-sm font-medium text-white flex-1">{method.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* STEP 2: QR CODE */}
                        {step === 'qr' && selectedMethod && (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <div className="text-xs text-zinc-500 font-medium">{selectedMethod.name.split(' ')[0]}</div>
                                    <div className="text-sm font-bold text-white uppercase">{selectedMethod.name}</div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs text-zinc-500">Deposit Address:</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm text-zinc-300 font-mono flex-1 break-all bg-[#0D1117] p-2 rounded border border-transparent hover:border-zinc-800 transition-colors">
                                            {selectedMethod.address}
                                        </div>
                                        <button onClick={copyAddress} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                                            {copied ? <Check className="h-4 w-4 text-[#00E676]" /> : <Copy className="h-4 w-4 text-zinc-500" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-center py-4 bg-[#161B22] rounded-xl border border-zinc-800">
                                    <div className="p-2 bg-white rounded-xl">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={selectedMethod.qrCode} alt="QR Code" className="w-48 h-48" />
                                    </div>
                                    <div className="absolute inset-x-0 top-1/2 flex justify-center pointer-events-none">
                                        {/* Shield Overlay like screenshot */}
                                        <div className="bg-white p-1 rounded-full shadow-lg translate-y-[-50%]">
                                            {/* Using a placeholder SVG or just emptiness */}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 text-xs text-zinc-400">
                                    <p className="font-medium text-zinc-500">Procedure:</p>
                                    <ol className="space-y-2 list-decimal list-outside ml-4">
                                        <li>Complete the transfer to the {selectedMethod.name} deposit address.</li>
                                        <li>Once you get the confirmation, then enter the amount transferred along with the Proof of Transfer. - <span className="text-[#00E676] cursor-pointer hover:underline" onClick={() => setStep('details')}>Proceed</span></li>
                                        <li>We will verify your transaction and automatically approve your Deposit.</li>
                                    </ol>
                                </div>

                                <div className="bg-[#161B22] p-3 rounded-lg flex gap-3 items-start border border-zinc-800/50">
                                    <Smartphone className="h-5 w-5 text-[#00E676] shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                                        Point your smartphone's camera at the QR code provided by the deposit service. Ensure the QR code is within the frame and clearly visible.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setStep('details')}
                                    className="w-full py-3.5 bg-[#00E676] hover:bg-[#00C853] text-black font-bold rounded-xl transition-colors shadow-lg shadow-[#00E676]/20"
                                >
                                    Continue
                                </button>
                            </div>
                        )}

                        {/* STEP 3: DETAILS FORM */}
                        {step === 'details' && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 ml-1">Amount</label>
                                    <input
                                        type="text"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-[#0D1117] border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00E676] transition-colors"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 ml-1">TXID</label>
                                    <input
                                        type="text"
                                        placeholder="Enter TXID"
                                        value={txid}
                                        onChange={(e) => setTxid(e.target.value)}
                                        className="w-full bg-[#0D1117] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#00E676] transition-colors"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-block w-full">
                                        <div className="border border-dashed border-[#00E676]/50 bg-[#0D1117] hover:bg-[#161B22] rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors group h-48 relative overflow-hidden">
                                            {file ? (
                                                <div className="z-10 text-center">
                                                    <Check className="h-8 w-8 text-[#00E676] mx-auto mb-2" />
                                                    <span className="text-sm font-medium text-[#00E676]">{file.name}</span>
                                                    <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-3 rounded-full bg-[#161B22] group-hover:bg-zinc-900 transition-colors">
                                                        <Upload className="h-6 w-6 text-zinc-400 group-hover:text-white" />
                                                    </div>
                                                    <div className="text-center z-10">
                                                        <p className="text-sm text-zinc-300 font-medium">Drag and drop your screenshot(s) or <span className="text-[#00E676] underline">Browse</span></p>
                                                        <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">JPEG, PNG · Max 1 file(s) · 5 MB per file</p>
                                                    </div>
                                                </>
                                            )}
                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#00E676]/10 to-transparent pointer-events-none" />
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={!txid || !file}
                                    className="w-full py-3.5 bg-[#00E676] hover:bg-[#00C853] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors shadow-lg shadow-[#00E676]/20 mt-auto"
                                >
                                    Submit
                                </button>
                            </div>
                        )}

                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
}
