'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import {
    LayoutDashboard,
    BookOpen,
    LineChart,
    BarChart3,
    Bot,
    Settings,
    LogOut,
    Calendar,
    Trophy,
    Target,
    History
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

export function Sidebar() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const accountId = searchParams.get('accountId')

    return (
        <div className="hidden h-full w-60 flex-col border-r border-zinc-800/50 bg-zinc-900/50 backdrop-blur-xl lg:flex">
            <div className="flex h-20 items-center gap-x-3 px-6 border-b border-zinc-800/50">
                <div className="relative h-10 w-40 overflow-hidden">
                    <Image
                        src="/full-logo.png"
                        alt="The Tradal"
                        fill
                        className="object-contain object-left"
                    />
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-y-4 overflow-y-auto px-4 py-6">
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
                                                className={cn(
                                                    'group flex gap-x-3 rounded-xl p-3 text-sm font-medium transition-all duration-200',
                                                    isActive
                                                        ? 'bg-[#00E676]/10 text-[#00E676] shadow-[0_0_20px_-5px_rgba(0,230,118,0.3)]'
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
            </div>
        </div>
    )
}
