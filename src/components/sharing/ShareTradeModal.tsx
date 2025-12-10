'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Share2, Download, Copy } from 'lucide-react'
import html2canvas from 'html2canvas'
import { cn } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'

interface ShareTradeModalProps {
    trade: any
}

export function ShareTradeModal({ trade }: ShareTradeModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    const handleDownload = async () => {
        if (!cardRef.current) return
        setIsGenerating(true)

        try {
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#09090b', // zinc-950
                scale: 2, // Higher quality
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false
            } as any)

            const image = canvas.toDataURL('image/png')
            const link = document.createElement('a')
            link.href = image
            link.download = `trade-${trade.pair}-${trade.open_time}.png`
            link.click()
        } catch (error) {
            console.error('Error generating image:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    // Helper for safe colors
    const getStyles = () => {
        if (trade.pnl > 0) {
            return {
                text: '#34d399',
                bg: 'rgba(16, 185, 129, 0.1)',
                border: 'rgba(16, 185, 129, 0.2)',
                badgeText: '#34d399'
            }
        } else if (trade.pnl < 0) {
            return {
                text: '#f87171',
                bg: 'rgba(239, 68, 68, 0.1)',
                border: 'rgba(239, 68, 68, 0.2)',
                badgeText: '#f87171'
            }
        }
        return {
            text: '#a1a1aa',
            bg: 'rgba(113, 113, 122, 0.1)',
            border: 'rgba(113, 113, 122, 0.2)',
            badgeText: '#a1a1aa'
        }
    }

    const tradeStyles = getStyles()

    // Unified Card Renderer to ensure 1:1 consistency between preview and download
    const renderCardContent = () => (
        <>
            {/* Dynamic Background Overlay */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    backgroundColor: tradeStyles.bg
                }}
            />

            {/* Background Pattern */}
            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.1,
                backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                zIndex: 0
            }} />

            {/* Header */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>{trade.pair}</h3>
                    <div style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(24, 24, 27, 0.5)',
                        border: '1px solid #3f3f46',
                        color: tradeStyles.badgeText
                    }}>
                        {trade.direction}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', fontWeight: 'bold', margin: 0, marginBottom: '4px' }}>Result</p>
                    <p style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.025em', color: tradeStyles.text, margin: 0, lineHeight: 1 }}>
                        {trade.pnl > 0 ? '+' : ''}{trade.pnl?.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: 'auto', marginBottom: 'auto' }}>
                <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', fontWeight: 'bold', marginBottom: '4px', margin: 0 }}>Entry</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>{trade.entry_price}</p>
                </div>
                <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', fontWeight: 'bold', marginBottom: '4px', margin: 0 }}>Exit</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>{trade.exit_price}</p>
                </div>
                <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', fontWeight: 'bold', marginBottom: '4px', margin: 0 }}>R:R</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>1:{trade.rr || '-'}</p>
                </div>
            </div>

            {/* Footer */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ height: '48px', width: '48px', position: 'relative' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo.png"
                            alt="Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            crossOrigin="anonymous"
                        />
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.025em', margin: 0 }}>The Tradal</p>
                        <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', margin: 0 }}>AI-Powered Analytics</p>
                    </div>
                </div>

                {/* QR Code & Date */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '10px', color: '#71717a', margin: 0, marginBottom: '2px' }}>Scanned & Verified</p>
                        <p style={{ fontSize: '10px', color: '#52525b', margin: 0 }}>
                            {new Date(trade.open_time).toLocaleDateString()}
                        </p>
                    </div>
                    <div style={{ padding: '4px', background: 'white', borderRadius: '4px', height: '48px', width: '48px' }}>
                        <QRCodeSVG
                            value="https://thetradal.com/"
                            size={40}
                            level="M"
                        />
                    </div>
                </div>
            </div>
        </>
    )

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-[#18181b] border-[#27272a] text-white">
                <DialogHeader>
                    <DialogTitle>Share Trade</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-4">

                    {/* VISIBLE PREVIEW (Responsive) */}
                    <div
                        className="w-full aspect-[4/3] rounded-xl border flex flex-col justify-between relative overflow-hidden"
                        style={{
                            backgroundColor: '#09090b',
                            borderColor: tradeStyles.border,
                            color: 'white',
                            padding: '24px' // Match padding of hidden card's base
                        }}
                    >
                        {renderCardContent()}
                    </div>

                    {/* HIDDEN CAPTURE TARGET (Fixed Reference Size) */}
                    {/* 
                        Strategy: Render the card at a fixed "ideal" dimenstion (600x450).
                        Use html2canvas scale:2 to generate a 1200x900 image.
                        This ensures the layout is identical to a standard desktop view, preventing "blown up" spacing issues.
                    */}
                    <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
                        <div
                            ref={cardRef}
                            style={{
                                width: '600px',
                                height: '450px',
                                borderRadius: '24px',
                                border: `2px solid ${tradeStyles.border}`, // Scaled border
                                padding: '32px', // Comfortable padding for 600px width
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                position: 'relative',
                                overflow: 'hidden',
                                backgroundColor: '#09090b',
                                color: 'white',
                                fontFamily: 'sans-serif'
                            }}
                        >
                            {renderCardContent()}
                        </div>
                    </div>

                    <div className="flex gap-2 w-full">
                        <Button
                            className="flex-1 gap-2 bg-[#ffffff] text-[#000000] hover:bg-[#e4e4e7]"
                            onClick={handleDownload}
                            disabled={isGenerating}
                        >
                            <Download className="h-4 w-4" />
                            {isGenerating ? 'Generating...' : 'Download Image'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
