'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Download, Share2, Award, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import html2canvas from 'html2canvas'
import { QRCodeCanvas } from 'qrcode.react'

interface AchievementCardProps {
    achievement: {
        id: string
        title: string
        description: string
        type: string
        unlocked_at: string
        metadata?: any
    }
}

export function AchievementCard({ achievement }: AchievementCardProps) {
    const [isDownloading, setIsDownloading] = useState(false)
    const certificateRef = useRef<HTMLDivElement>(null)

    const handleDownload = async () => {
        if (!certificateRef.current) return
        setIsDownloading(true)

        try {
            // Temporarily show the certificate container for capture
            certificateRef.current.style.display = 'block'

            const canvas = await html2canvas(certificateRef.current, {
                scale: 2, // Higher quality
                backgroundColor: '#09090b', // zinc-950
                useCORS: true,
                logging: false
            } as any)

            // Hide it again
            certificateRef.current.style.display = 'none'

            // Create download link
            const link = document.createElement('a')
            link.download = `certificate-${achievement.title.toLowerCase().replace(/\s+/g, '-')}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()
        } catch (err) {
            console.error('Failed to generate certificate:', err)
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10"
            >
                {/* Glow Effect */}
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-500" />

                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-6">
                        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 transition-colors">
                            <Award className="h-8 w-8 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
                            {format(new Date(achievement.unlocked_at), 'MMM d, yyyy')}
                        </span>
                    </div>

                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-3 group-hover:text-emerald-400 transition-colors">
                        {achievement.title}
                    </h3>
                    <p className="text-sm text-zinc-400 mb-8 leading-relaxed font-medium flex-1">
                        {achievement.description}
                    </p>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-600 py-4 text-sm font-black text-white uppercase tracking-wider transition-all disabled:opacity-50 group/btn"
                    >
                        {isDownloading ? (
                            <span className="animate-pulse">Generating...</span>
                        ) : (
                            <>
                                <Download className="h-4 w-4 group-hover/btn:animate-bounce" />
                                Download Certificate
                            </>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* Hidden Certificate Template for Capture */}
            <div
                ref={certificateRef}
                style={{ display: 'none', width: '800px', height: '600px' }}
                className="fixed top-0 left-0 z-[-1]"
            >
                <div className="w-full h-full bg-zinc-950 p-12 relative overflow-hidden flex flex-col items-center justify-center text-center border-[16px] border-double border-emerald-900/30">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-zinc-950 to-zinc-950" />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center h-full w-full">
                        {/* Header with Logo */}
                        <div className="w-full flex justify-between items-start mb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 relative overflow-hidden rounded-lg">
                                    {/* Using standard img tag for html2canvas compatibility */}
                                    <img
                                        src="/favicon.png"
                                        alt="Logo"
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-white">
                                    The Tradal
                                </h1>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center w-full">
                            <div className="mb-8 p-6 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                <Award className="h-16 w-16 text-emerald-400" />
                            </div>

                            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">Certificate of Achievement</h1>
                            <p className="text-xl text-zinc-400 mb-12 uppercase tracking-widest">The Tradal</p>

                            <div className="mb-12">
                                <p className="text-zinc-500 text-lg mb-2">This certifies that</p>
                                <h2 className="text-3xl font-bold text-emerald-400 mb-4">Trader</h2>
                                <p className="text-zinc-500 text-lg mb-2">has successfully unlocked</p>
                                <h3 className="text-4xl font-bold text-white mb-4">{achievement.title}</h3>
                                <p className="text-zinc-400 max-w-lg mx-auto">{achievement.description}</p>
                            </div>
                        </div>

                        <div className="w-full flex items-end justify-between mt-auto pt-8 border-t border-zinc-800/50">
                            <div className="text-left">
                                <p className="text-sm text-zinc-500 mb-1">Date Unlocked</p>
                                <p className="text-lg font-mono text-white">
                                    {format(new Date(achievement.unlocked_at), 'MMMM d, yyyy')}
                                </p>
                            </div>

                            <div className="flex flex-col items-end">
                                <div className="bg-white p-2 rounded-lg mb-2">
                                    <QRCodeCanvas
                                        value="https://thetradal.com/"
                                        size={80}
                                        level={"H"}
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-600 font-mono">VERIFY AT THETRADAL.COM</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
