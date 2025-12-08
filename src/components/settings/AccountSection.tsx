'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import { Loader2, KeyRound } from 'lucide-react'

export function AccountSection({ user }: { user: any }) {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [syncKey, setSyncKey] = useState('')
    const [generatingKey, setGeneratingKey] = useState(false)

    const handlePasswordReset = async () => {
        setLoading(true)
        setMessage('')

        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        })

        if (error) {
            setMessage('Error sending reset email')
        } else {
            setMessage('Password reset email sent')
        }
        setLoading(false)
    }

    // Function to generate/fetch key
    const generateKey = async () => {
        setGeneratingKey(true)
        const supabase = createClient()
        // Check current key
        const { data } = await supabase.from('users').select('webhook_key').eq('id', user.id).single()

        let key = data?.webhook_key

        if (key) {
            setSyncKey(key)
        } else {
            // Fallback if migration hasn't run or new user
            const newKey = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
            await supabase.from('users').update({ webhook_key: newKey }).eq('id', user.id)
            setSyncKey(newKey)
        }
        setGeneratingKey(false)
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Account Security</h3>
                <p className="text-sm text-zinc-400 font-medium">Manage your account credentials.</p>
            </div>

            <div className="grid gap-6 rounded-[2rem] border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
                {/* Email Section */}
                <div className="grid gap-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                    <input
                        type="email"
                        value={user.email}
                        disabled
                        className="cursor-not-allowed rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-500 font-medium"
                    />
                    <p className="text-xs text-zinc-600 font-medium">Email cannot be changed.</p>
                </div>

                {/* Password Section */}
                <div className="border-t border-zinc-800 pt-6">
                    <h4 className="mb-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</h4>
                    <button
                        onClick={handlePasswordReset}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-700 disabled:opacity-50 transition-all"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        Send Password Reset Email
                    </button>
                    {message && (
                        <p className="mt-4 text-sm font-bold text-emerald-500">{message}</p>
                    )}
                </div>

                {/* Auto-Sync Section */}
                <div className="border-t border-zinc-800 pt-6">
                    <h4 className="mb-4 text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                        Auto-Sync (MT5 / cTrader) <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-500 border border-emerald-500/20">NEW</span>
                    </h4>
                    <p className="text-sm text-zinc-400 mb-4">
                        Automatically import trades from your platform using our free plugin.
                    </p>

                    <div className="space-y-4">
                        {!syncKey ? (
                            <button
                                onClick={generateKey}
                                disabled={generatingKey}
                                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50 transition-all"
                            >
                                {generatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Reveal Sync Key
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Your Sync Key</label>
                                <div onClick={() => { navigator.clipboard.writeText(syncKey); setMessage('Key Copied!') }} className="cursor-pointer group relative rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 font-mono text-emerald-500 font-bold hover:bg-emerald-500/10 transition-all">
                                    {syncKey}
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-emerald-500/50 group-hover:text-emerald-500">Click to Copy</span>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <a href="/downloads/TJP_Sync_MT5.mq5" download className="block p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all text-center">
                                <div className="text-lg font-black text-white mb-1">MetaTrader 5</div>
                                <div className="text-xs text-emerald-500 font-bold uppercase">Download EA (.mq5)</div>
                            </a>
                            <a href="/downloads/TJP_Sync_cTrader.cs" download className="block p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-blue-500/50 hover:bg-zinc-900 transition-all text-center">
                                <div className="text-lg font-black text-white mb-1">cTrader</div>
                                <div className="text-xs text-blue-500 font-bold uppercase">Download cBot (.cs)</div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
