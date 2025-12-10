'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export function Preloader() {
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false)
        }, 2000) // Show preloader for 2 seconds

        return () => clearTimeout(timer)
    }, [])

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-950"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="relative flex flex-col items-center gap-4"
                    >
                        <div className="relative h-24 w-64 sm:h-32 sm:w-80 max-w-[90vw] overflow-hidden">
                            <Image
                                src="/logo.png"
                                alt="The Tradal"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="h-1 w-32 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
