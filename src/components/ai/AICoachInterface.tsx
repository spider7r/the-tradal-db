'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Bot, Send, Sparkles, User, BrainCircuit, TrendingUp, Zap, ChevronRight, Loader2, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sendChatMessage } from '@/app/(dashboard)/ai-coach/actions'
import { TradesTable } from '@/components/trades/TradesTable'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    image?: string
    timestamp: Date
}

interface AICoachInterfaceProps {
    initialTrades: any[]
    initialReports: any[]
}

export function AICoachInterface({ initialTrades, initialReports }: AICoachInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm TJP Buddy, your AI trading assistant. I can analyze your trades, provide psychological tips, or discuss market concepts. How can I help you today?",
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [selectedMode, setSelectedMode] = useState<'coach' | 'analyst' | 'psychologist'>('coach')
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [showSuggestions, setShowSuggestions] = useState(false)

    // Mode Configuration
    const modes = {
        coach: {
            color: '#00E676',
            gradient: 'from-[#00E676]/20 to-emerald-500/20',
            icon: Bot,
            label: 'Coach',
            description: 'Strategic guidance & performance analysis'
        },
        analyst: {
            color: '#2962ff',
            gradient: 'from-[#2962ff]/20 to-cyan-500/20',
            icon: TrendingUp,
            label: 'Analyst',
            description: 'Market structure & technical analysis'
        },
        psychologist: {
            color: '#d946ef', // Fuchsia-500
            gradient: 'from-[#d946ef]/20 to-purple-500/20',
            icon: BrainCircuit,
            label: 'Psychologist',
            description: 'Mindset, discipline & emotional control'
        }
    }

    const currentMode = modes[selectedMode]

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setSelectedImage(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSend = async () => {
        if (!input.trim() && !selectedImage) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            image: selectedImage || undefined,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setSelectedImage(null)
        setIsTyping(true)
        setShowSuggestions(false) // Hide suggestions after sending

        // Context for the AI
        const context = {
            mode: selectedMode,
            recentTrades: initialTrades.slice(0, 5), // Pass last 5 trades for context
            lastReport: initialReports[0]
        }

        const response = await sendChatMessage(userMsg.content, context, selectedImage || undefined)

        setIsTyping(false)

        if (response.success && response.message) {
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.message,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, aiMsg])
        } else {
            // Error handling
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm having trouble connecting to the server right now. Please try again.",
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
        }
    }

    const handleQuickPrompt = (prompt: string) => {
        setInput(prompt)
        // Optional: auto-send
        // handleSend() 
    }

    const handleClearChat = () => {
        setMessages([messages[0]])
    }

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* Top Section: Chat Area (Full Width & Full Height) */}
            <div className="flex-1 flex flex-col rounded-[2rem] border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl min-h-[85vh] transition-all duration-500"
                style={{ borderColor: `${currentMode.color}20` }}
            >
                {/* Chat Header */}
                <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${currentMode.gradient} border border-white/5 shadow-lg relative group`}>
                            <div className="absolute inset-0 rounded-2xl bg-current opacity-0 group-hover:opacity-10 transition-opacity" style={{ color: currentMode.color }} />
                            <img src="/logo.svg" alt="AI Avatar" className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                                TJP Buddy
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wider border border-zinc-700">
                                    v1.0
                                </span>
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: currentMode.color }}></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: currentMode.color }}></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: currentMode.color }}>
                                    {currentMode.label} Mode Active
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Mode Selector */}
                        <div className="hidden md:flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                            {(Object.entries(modes) as [keyof typeof modes, typeof modes.coach][]).map(([key, mode]) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedMode(key)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                                        selectedMode === key
                                            ? "bg-zinc-800 text-white shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                                    )}
                                >
                                    <mode.icon className={cn("h-3 w-3", selectedMode === key ? "text-current" : "")} style={{ color: selectedMode === key ? mode.color : undefined }} />
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        <div className="h-8 w-px bg-zinc-800 mx-2" />

                        <button
                            onClick={handleClearChat}
                            className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                            title="Clear Chat"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex gap-4 max-w-4xl mx-auto w-full group",
                                msg.role === 'user' ? "flex-row-reverse" : ""
                            )}
                        >
                            <div className={cn(
                                "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border shadow-lg",
                                msg.role === 'user'
                                    ? "bg-zinc-800 border-zinc-700"
                                    : `bg-zinc-900 border-[${currentMode.color}]/20`
                            )}
                                style={{ borderColor: msg.role === 'assistant' ? `${currentMode.color}40` : undefined }}
                            >
                                {msg.role === 'user' ? (
                                    <User className="h-5 w-5 text-zinc-400" />
                                ) : (
                                    <img src="/logo.svg" alt="AI" className="h-6 w-6" />
                                )}
                            </div>

                            <div className={cn(
                                "p-5 rounded-3xl text-sm leading-relaxed shadow-sm max-w-[85%] relative",
                                msg.role === 'user'
                                    ? "bg-zinc-800 text-zinc-100 rounded-tr-none border border-zinc-700"
                                    : "bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-tl-none"
                            )}>
                                {msg.image && (
                                    <div className="mb-4 rounded-2xl overflow-hidden border border-zinc-700/50 shadow-md">
                                        <img src={msg.image} alt="User upload" className="w-full h-auto max-h-96 object-cover" />
                                    </div>
                                )}
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-white mb-3 mt-4 border-b border-zinc-800 pb-2" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2 mt-4 uppercase tracking-wide flex items-center gap-2" style={{ color: currentMode.color }} {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-zinc-200 mb-2 mt-3" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 space-y-1.5 mb-3 text-zinc-300" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 space-y-1.5 mb-3 text-zinc-300" {...props} />,
                                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                            strong: ({ node, ...props }) => <strong className="font-bold" style={{ color: currentMode.color }} {...props} />,
                                            p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed text-zinc-300" {...props} />,
                                            blockquote: ({ node, ...props }) => <blockquote className="border-l-2 pl-4 italic text-zinc-400 my-3 bg-zinc-900/50 py-2 pr-2 rounded-r-lg" style={{ borderColor: currentMode.color }} {...props} />,
                                            code: ({ node, ...props }) => <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-xs font-mono text-zinc-200 border border-zinc-800" {...props} />,
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50">
                                    <span className="text-[10px] text-zinc-500 font-medium">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.role === 'assistant' && (
                                        <button
                                            onClick={() => navigator.clipboard.writeText(msg.content)}
                                            className="text-[10px] text-zinc-500 hover:text-white transition-colors uppercase tracking-wider font-bold flex items-center gap-1"
                                        >
                                            Copy
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-4 max-w-4xl mx-auto w-full"
                        >
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-900 border flex items-center justify-center shadow-lg" style={{ borderColor: `${currentMode.color}40` }}>
                                <img src="/logo.svg" alt="AI" className="h-6 w-6 animate-pulse" />
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-3xl rounded-tl-none flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: currentMode.color, animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: currentMode.color, animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: currentMode.color, animationDelay: '300ms' }} />
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 relative z-20">
                    {/* Quick Prompts (Collapsible) */}
                    <AnimatePresence>
                        {showSuggestions && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {[
                                        "Analyze my last trade",
                                        "Calculate Position Size (Risk 1%)",
                                        "Review my Win Rate vs Risk/Reward",
                                        "Give me a Psychology Checklist",
                                        "Explain Market Structure Shift",
                                        "What is ICT Silver Bullet?"
                                    ].map((prompt) => (
                                        <button
                                            key={prompt}
                                            onClick={() => handleQuickPrompt(prompt)}
                                            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all whitespace-nowrap shadow-sm group"
                                            style={{ borderColor: 'transparent' }}
                                        >
                                            <span className="group-hover:text-current transition-colors" style={{ color: undefined }}>{prompt}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="relative max-w-4xl mx-auto w-full">
                        {selectedImage && (
                            <div className="absolute bottom-full left-0 mb-3 p-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-start gap-2 shadow-xl animate-in slide-in-from-bottom-2">
                                <img src={selectedImage || ""} alt="Preview" className="h-24 w-auto rounded-lg object-cover" />
                                <button
                                    onClick={() => setSelectedImage(null)}
                                    className="p-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />

                        {/* Suggestions Toggle */}
                        <button
                            onClick={() => setShowSuggestions(!showSuggestions)}
                            className={cn(
                                "absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all duration-300 z-10",
                                showSuggestions ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                            )}
                        >
                            <div className="relative">
                                <Sparkles className={cn("h-5 w-5 transition-transform", showSuggestions ? "rotate-180" : "")} style={{ color: showSuggestions ? currentMode.color : undefined }} />
                                {!showSuggestions && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: currentMode.color }}></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: currentMode.color }}></span>
                                    </span>
                                )}
                            </div>
                        </button>

                        <div className="h-6 w-px bg-zinc-800 absolute left-14 top-1/2 -translate-y-1/2 z-10" />

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={`Ask ${currentMode.label} anything...`}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-5 pl-20 pr-32 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all shadow-inner font-medium"
                            style={{
                                caretColor: currentMode.color,
                                // @ts-ignore
                                '--tw-ring-color': `${currentMode.color}50`
                            }}
                        />

                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                                title="Upload Chart"
                            >
                                <Paperclip className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={(!input.trim() && !selectedImage) || isTyping}
                                className="p-2.5 rounded-xl text-black transition-all shadow-lg disabled:opacity-50 disabled:shadow-none transform active:scale-95"
                                style={{
                                    backgroundColor: (!input.trim() && !selectedImage) ? '#27272a' : currentMode.color,
                                    color: (!input.trim() && !selectedImage) ? '#71717a' : '#000000'
                                }}
                            >
                                {isTyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Stats & Actions (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Coach's Memory */}
                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="h-5 w-5 text-[#00E676]" />
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Coach's Memory</h3>
                    </div>
                    <div className="flex-1 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Last Trade Analysis</div>
                        <div className="text-sm text-zinc-300 font-medium">
                            {initialReports[0] ? (
                                <span className="line-clamp-3 leading-relaxed">
                                    {initialReports[0].content?.review || initialReports[0].report_content || 'Analysis available'}
                                </span>
                            ) : (
                                <span className="text-zinc-600 italic">No recent analysis found.</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Performance Stats */}
                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Live Performance</h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                        <div className="flex items-center gap-8">
                            <div className="text-center">
                                <div className="text-3xl font-black text-white">
                                    {initialTrades.length > 0
                                        ? `${Math.round((initialTrades.filter(t => t.pnl > 0).length / initialTrades.length) * 100)}%`
                                        : '0%'}
                                </div>
                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Win Rate</div>
                            </div>
                            <div className="h-12 w-px bg-zinc-800" />
                            <div className="text-center">
                                <div className={cn(
                                    "text-3xl font-black",
                                    initialTrades.reduce((acc, t) => acc + (t.pnl || 0), 0) >= 0 ? "text-[#00E676]" : "text-red-400"
                                )}>
                                    ${initialTrades.reduce((acc, t) => acc + (t.pnl || 0), 0).toFixed(0)}
                                </div>
                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Net P&L</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Quick Actions */}
                <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Quick Actions</h3>
                    </div>
                    <div className="flex-1 space-y-3">
                        <button className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-[#00E676]/30 hover:bg-zinc-900 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#00E676]/10 text-[#00E676] group-hover:bg-[#00E676] group-hover:text-black transition-colors">
                                    <BrainCircuit className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-bold text-zinc-300 group-hover:text-white">Full Account Audit</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-[#00E676]" />
                        </button>

                        <button className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-[#00E676]/30 hover:bg-zinc-900 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-bold text-zinc-300 group-hover:text-white">Generate Weekly Plan</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-purple-500" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
