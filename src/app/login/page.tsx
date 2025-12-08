'use client'

import { login } from './actions'
import Link from 'next/link'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

function LoginForm() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')
    const [googleLoading, setGoogleLoading] = useState(false)

    const handleGoogleLogin = async () => {
        setGoogleLoading(true)
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
    }

    return (
        <div className="flex min-h-screen w-full bg-[#050505] text-zinc-50 lg:grid lg:grid-cols-2">
            {/* Left Side - Brand Visual (Desktop Only) */}
            <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-zinc-900 p-12">
                {/* Background Effects */}
                <div className="absolute inset-0">
                    <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
                    <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[100px] animate-pulse delay-1000" />
                    <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="TradingJournal Pro" className="h-10 w-auto" />
                    </div>
                </div>

                <div className="relative z-10 max-w-lg">
                    <h1 className="text-5xl font-black tracking-tighter leading-[1.1] mb-6">
                        Master your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                            Trading Psychology
                        </span>
                    </h1>
                    <p className="text-lg text-zinc-400 font-medium leading-relaxed">
                        Join thousands of profitable traders who use data to eliminate emotion and execute with precision.
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-zinc-500">
                    <span>© 2024 TradingJournal Pro</span>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex items-center justify-center p-8 lg:p-12 relative overflow-hidden bg-black/50 backdrop-blur-sm lg:bg-transparent">
                {/* Mobile Background (Subtle) */}
                <div className="absolute inset-0 lg:hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-[80%] h-[50%] bg-emerald-500/5 blur-[80px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md space-y-8 relative z-10 bg-zinc-900/40 p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl lg:bg-transparent lg:border-none lg:shadow-none lg:p-0 lg:backdrop-blur-none"
                >
                    <div className="text-center space-y-2">
                        <div className="flex justify-center mb-6 lg:hidden">
                            <img src="/logo.png" alt="TradingJournal Pro" className="h-12 w-auto" />
                        </div>
                        <h2 className="text-center text-3xl font-black tracking-tight text-white">
                            Welcome Back
                        </h2>
                        <p className="text-center text-zinc-400">
                            Enter your credentials to access your dashboard.
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 font-medium flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={googleLoading}
                            className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            {googleLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                            ) : (
                                <>
                                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#050505] px-2 text-zinc-500 font-medium">Or continue with email</span>
                            </div>
                        </div>

                        <form className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="sr-only" htmlFor="email">Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 pl-12 p-3.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                                            placeholder="name@example.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="sr-only" htmlFor="password">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 pl-12 p-3.5 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                                            placeholder="Enter your password"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    {/* Remember me could go here */}
                                </div>
                                <Link href="/forgot-password" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                formAction={login}
                                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Sign in
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </button>
                        </form>
                    </div>

                    <div className="text-center text-sm">
                        <span className="text-zinc-500 font-medium">Don't have an account? </span>
                        <Link href="/signup" className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                            Sign up for free
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    )
}
