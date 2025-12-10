"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const reviews = [
    {
        text: "If you can't measure it, you can't improve it. This platform gave me the data I needed to finally become profitable.",
        author: "Alex M.",
        role: "Professional Forex Trader",
        color: "bg-emerald-400"
    },
    {
        text: "The Tradal completely changed how I approach my daily sessions. The AI insights are scary accurate.",
        author: "Sarah K.",
        role: "Crypto Day Trader",
        color: "bg-cyan-400"
    },
    {
        text: "Finally, a journal that isn't just a spreadsheet. The visual analytics help me spot mistakes instantly.",
        author: "Michael R.",
        role: "Funded Trader",
        color: "bg-purple-400"
    },
    {
        text: "I used to skip journaling because it was tedious. Now it's my favorite part of the trading day.",
        author: "David L.",
        role: "Indices Scalper",
        color: "bg-yellow-400"
    },
    {
        text: "Going from break-even to consistent profitability was all about identifying my tilt triggers. The Tradal spotted them for me.",
        author: "Jessica T.",
        role: "Swing Trader",
        color: "bg-red-400"
    },
    {
        text: "The best investment I've made for my trading career. The accountability features are unmatched.",
        author: "James H.",
        role: "Prop Firm Trader",
        color: "bg-blue-400"
    },
    {
        text: "Clean, fast, and powerful. It feels like a tool built by traders, for traders.",
        author: "Emma W.",
        role: "Forex Analyst",
        color: "bg-pink-400"
    }
]

export function TestimonialCarousel() {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % reviews.length)
        }, 5000) // Switch every 5 seconds

        return () => clearInterval(timer)
    }, [])

    return (
        <div className="relative h-48 w-full">
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute inset-0"
                >
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                        <div className="flex gap-4 mb-4">
                            <div className="h-2 w-2 rounded-full bg-red-400/50" />
                            <div className="h-2 w-2 rounded-full bg-yellow-400/50" />
                            <div className="h-2 w-2 rounded-full bg-emerald-400/50" />
                        </div>
                        <p className="text-zinc-300 font-mono text-sm leading-relaxed min-h-[60px]">
                            "{reviews[index].text}"
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full ${reviews[index].color} flex items-center justify-center text-black font-bold text-xs`}>
                                {reviews[index].author[0]}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">{reviews[index].author}</p>
                                <p className="text-[10px] text-zinc-500">{reviews[index].role}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
