'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'

const testimonials = [
    {
        name: "Alex M.",
        role: "Forex Trader",
        text: "The journaling features are a game changer. I've improved my win rate by 15% in just two months.",
        rating: 5
    },
    {
        name: "Sarah K.",
        role: "Day Trader",
        text: "Finally a journal that understands what traders actually need. The analytics are incredible.",
        rating: 5
    },
    {
        name: "Michael R.",
        role: "Swing Trader",
        text: "Best investment I've made for my trading career. The AI insights are surprisingly accurate.",
        rating: 5
    },
    {
        name: "David L.",
        role: "Prop Firm Trader",
        text: "Passed my FTMO challenge thanks to the risk management tracking. Highly recommended.",
        rating: 5
    },
    {
        name: "Emma W.",
        role: "Crypto Trader",
        text: "The interface is beautiful and so easy to use. Makes reviewing trades actually enjoyable.",
        rating: 5
    },
    {
        name: "James H.",
        role: "Scalper",
        text: "Speed and reliability are top notch. Syncs with my cTrader account perfectly.",
        rating: 5
    },
    {
        name: "Oliver P.",
        role: "Gold Trader",
        text: "The backtesting engine is professional grade. Identical to FX Replay but integrated.",
        rating: 5
    }
]

export function TestimonialCarousel() {
    const [current, setCurrent] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % testimonials.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="relative h-32 w-full overflow-hidden">
            {testimonials.map((testimonial, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${index === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    <div className="flex gap-1 mb-3">
                        {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                        ))}
                    </div>

                    <p className="text-zinc-300 text-center text-sm md:text-base italic mb-3 max-w-lg">
                        "{testimonial.text}"
                    </p>

                    <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{testimonial.name}</span>
                        <span className="text-zinc-600 text-xs">•</span>
                        <span className="text-emerald-400 text-xs font-medium uppercase tracking-wider">{testimonial.role}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}
