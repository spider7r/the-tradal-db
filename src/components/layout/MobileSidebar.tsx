'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    BookOpen,
    LineChart,
    BarChart3,
    Bot,
    Settings,
    LogOut,
    X,
    Calendar,
    Target,
    History,
    Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Journal', href: '/journal', icon: Calendar },
    { name: 'Notes', href: '/notes', icon: BookOpen },
    { name: 'Trades', href: '/trades', icon: LineChart },
    { name: 'Strategies', href: '/strategies', icon: Target },
    { name: 'Backtest', href: '/backtest', icon: History },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Achievements', href: '/achievements', icon: Trophy },
    { name: 'AI Coach', href: '/ai-coach', icon: Bot },
    { name: 'Settings', href: '/settings', icon: Settings },
]

interface MobileSidebarProps {
    isOpen: boolean
    onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const accountId = searchParams.get('accountId')

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-zinc-950/80 backdrop-blur-sm lg:hidden"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-800 bg-zinc-900 p-6 shadow-xl lg:hidden"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-x-3">
                                <div className="relative h-10 w-40 overflow-hidden">
                                    <Image
                                        src="/full-logo.png"
                                        alt="The Tradal"
                                        fill
                                        className="object-contain object-left"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <nav className="flex flex-1 flex-col">
                            <ul role="list" className="flex flex-1 flex-col gap-y-2">
                                <li>
                                    <ul role="list" className="space-y-1">
                                        {navigation.map((item) => {
                                            const isActive = pathname === item.href
                                            const href = accountId ? `${item.href}?accountId=${accountId}` : item.href
                                            return (
                                                <li key={item.name}>
                                                    <Link
                                                        href={href}
                                                        onClick={onClose}
                                                        className={cn(
                                                            'group flex gap-x-3 rounded-xl p-3 text-sm font-medium transition-all duration-200',
                                                            isActive
                                                                ? 'bg-[#00E676]/10 text-[#00E676]'
                                                                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                                                        )}
                                                    >
                                                        <item.icon
                                                            className={cn(
                                                                'h-5 w-5 shrink-0 transition-colors',
                                                                isActive
                                                                    ? 'text-[#00E676]'
                                                                    : 'text-zinc-500 group-hover:text-zinc-300'
                                                            )}
                                                            aria-hidden="true"
                                                        />
                                                        {item.name}
                                                    </Link>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </li>
                                <li className="mt-auto flex items-center justify-between gap-2">
                                    <Link
                                        href="/login"
                                        className="group flex flex-1 gap-x-3 rounded-xl p-3 text-sm font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                                    >
                                        <LogOut
                                            className="h-5 w-5 shrink-0 text-zinc-500 group-hover:text-red-400 transition-colors"
                                            aria-hidden="true"
                                        />
                                        Sign out
                                    </Link>
                                    <ThemeToggle />
                                </li>
                            </ul>
                        </nav>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
