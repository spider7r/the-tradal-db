'use client'

import { forwardRef } from 'react'
import { Trophy } from 'lucide-react'

interface CertificateProps {
    id?: string
    accountName: string
    type: 'TARGET_HIT' | 'PASSED'
    date: string
    amount?: number
    currency?: string
    certificateId?: string
    achievements?: any[]
}

export const Certificate = forwardRef<HTMLDivElement, CertificateProps>(({ id, accountName, type, date, amount, currency = 'USD', certificateId }, ref) => {

    // Formatting currency
    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount || 0)

    return (
        <div
            id={id}
            ref={ref}
            className="w-[800px] h-[600px] bg-black relative flex flex-col p-12 font-sans overflow-hidden text-white"
            style={{ fontFamily: 'Inter, sans-serif' }}
        >
            {/* Background Texture/Gradient (Subtle) */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/50 to-black pointer-events-none" />

            {/* Header Section */}
            <div className="relative z-10 flex justify-between items-start mb-16">
                <div>
                    {/* Main Title Block */}
                    <h1 className="text-8xl font-black tracking-tighter leading-[0.85] text-white mb-2">
                        TRADING
                    </h1>
                    <div className="relative inline-block">
                        {/* Brackets */}
                        <div className="absolute -left-3 -top-2 w-4 h-4 border-t-4 border-l-4 border-white" />
                        <div className="absolute -right-3 -top-2 w-4 h-4 border-t-4 border-r-4 border-white" />
                        <div className="absolute -left-3 -bottom-1 w-4 h-4 border-b-4 border-l-4 border-white" />
                        <div className="absolute -right-3 -bottom-1 w-4 h-4 border-b-4 border-r-4 border-white" />

                        <h2 className="text-6xl font-black text-[#fbbf24] tracking-tight px-2 uppercase">
                            Certificate
                        </h2>
                    </div>
                </div>

                {/* Logo Area */}
                <div className="flex items-center gap-3 opacity-90">
                    <div className="w-12 h-12 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain filter brightness-0 invert" crossOrigin="anonymous" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold tracking-widest leading-none">TRADING</span>
                        <span className="text-sm tracking-widest text-[#fbbf24] font-bold">JOURNAL PRO</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="relative z-10 grid grid-cols-2 gap-8 flex-1">

                {/* Left Column: Details */}
                <div className="flex flex-col justify-center space-y-10 pl-2">

                    {/* Name Section */}
                    <div>
                        <p className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase mb-2">Proudly Presented To:</p>
                        <h3 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 truncate py-1">
                            {accountName}
                        </h3>
                    </div>

                    {/* Amount Section */}
                    <div>
                        <p className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase mb-1">
                            {type === 'TARGET_HIT' ? 'PROFIT TARGET' : 'ACCOUNT SIZE'}
                        </p>
                        <p className="text-7xl font-black text-[#fbbf24] tracking-tighter">
                            {formattedAmount}
                        </p>
                    </div>

                    {/* Date Section */}
                    <div>
                        <p className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase mb-1">Date</p>
                        <p className="text-2xl text-white font-mono font-medium">
                            {date}
                        </p>
                    </div>

                </div>

                {/* Right Column: Visual (Trophy Placeholder) */}
                <div className="relative flex items-center justify-center">
                    {/* Glowing effect behind trophy */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#fbbf24]/20 to-transparent blur-3xl opacity-40" />

                    {/* Crystal Trophy Simulation using CSS/SVG */}
                    <div className="relative w-full h-full flex items-center justify-center transform translate-y-8">
                        {/* We construct a 'Crystal' look with a large styled icon since we lack the 3D asset */}
                        <div className="relative drop-shadow-2xl filter">
                            <svg width="300" height="400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                                <defs>
                                    <linearGradient id="crystalGrad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                                        <stop offset="40%" stopColor="rgba(255,255,255,0.1)" />
                                        <stop offset="60%" stopColor="rgba(255,255,255,0.1)" />
                                        <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
                                    </linearGradient>
                                    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#fbbf24" />
                                        <stop offset="100%" stopColor="#b45309" />
                                    </linearGradient>
                                </defs>
                                {/* Trophy Shape */}
                                <path d="M6 9C6 4.5 9 3 12 3C15 3 18 4.5 18 9V11C18 14.5 15.5 17 12 17H12C8.5 17 6 14.5 6 11V9Z" fill="url(#crystalGrad)" stroke="white" strokeWidth="0.5" />
                                <path d="M6 9C6 4.5 9 3 12 3C15 3 18 4.5 18 9V11C18 14.5 15.5 17 12 17H12C8.5 17 6 14.5 6 11V9Z" stroke="url(#crystalGrad)" strokeWidth="0.5" opacity="0.5" />

                                {/* Base */}
                                <rect x="8" y="17" width="8" height="2" fill="#333" />
                                <rect x="7" y="19" width="10" height="2" fill="#111" />
                            </svg>
                            {/* Overlay generic Trophy icon for recognizable shape if SVG details fail */}
                            <Trophy className="absolute inset-0 w-full h-full text-white opacity-20" strokeWidth={0.5} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Signatures */}
            <div className="relative z-10 grid grid-cols-2 gap-8 mt-auto pt-8 border-t border-zinc-900/50">
                <div>
                    <p className="text-zinc-600 text-[10px] uppercase tracking-widest mb-4">Founder & CEO</p>
                    <div className="font-handwriting text-2xl text-white opacity-80" style={{ fontFamily: 'cursive' }}>
                        Antigravity Team
                    </div>
                </div>
                <div>
                    <p className="text-zinc-600 text-[10px] uppercase tracking-widest mb-4">Verification</p>
                    <p className="text-xs text-zinc-500 font-mono">{certificateId || 'ID: 8X92-BTC-2025'}</p>
                </div>
            </div>
        </div>
    )
})

Certificate.displayName = 'Certificate'
