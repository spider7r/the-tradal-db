'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import { TradeForm } from './TradeForm'
import { checkHasAccounts } from '@/app/(dashboard)/accounts/actions'
import { AccountWizard } from '@/components/accounts/AccountWizard'

interface TradeDialogProps {
    accountId?: string
}

export function TradeDialog({ accountId }: TradeDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [showWizard, setShowWizard] = useState(false)

    const handleOpen = async () => {
        const hasAccount = await checkHasAccounts()
        if (!hasAccount) {
            setShowWizard(true)
        } else {
            setIsOpen(true)
        }
    }

    if (showWizard) {
        return (
            <AccountWizard
                isMandatory={true}
                onComplete={() => {
                    setShowWizard(false)
                    setIsOpen(true)
                }}
                onSkip={() => setShowWizard(false)}
            />
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    onClick={handleOpen}
                    className="flex items-center gap-x-2 rounded-md bg-emerald-600 px-3 py-2 sm:px-3.5 sm:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                    <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                    <span className="hidden sm:inline">Log Trade</span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-[#0A0A0A] border-white/5 text-white p-0 gap-0 overflow-hidden w-[95vw]">
                <div className="flex items-center justify-between p-4 sm:p-6 pb-2 sm:pb-4 border-b border-white/5">
                    <DialogTitle className="text-lg sm:text-xl font-bold text-white">Log New Trade</DialogTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#94A3B8] hover:text-white" onClick={() => setIsOpen(false)}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
                    <TradeForm accountId={accountId} onSuccess={() => setIsOpen(false)} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
