'use server'

import { createClient } from '@/utils/supabase/server'

const COINBASE_API_URL = 'https://api.commerce.coinbase.com/charges'

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
    starter: { monthly: 19, yearly: 185 },
    growth: { monthly: 29, yearly: 280 },
    enterprise: { monthly: 59, yearly: 570 },
}

/**
 * Create a Coinbase Commerce charge for crypto payment.
 * Returns the hosted checkout URL where users can pay with BTC, ETH, USDC, etc.
 */
export async function createCryptoCheckout(
    planName: string,
    billingCycle: 'monthly' | 'yearly'
) {
    // Read env var inside function body — NOT at module level.
    // Module-level reads can get cached/inlined at build time by Next.js,
    // causing the var to be undefined even when set in Vercel.
    const COINBASE_API_KEY = process.env.COINBASE_COMMERCE_API_KEY

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated. Please log in first.' }
    }

    const plan = PLAN_PRICES[planName.toLowerCase()]
    if (!plan) {
        return { error: 'Invalid plan selected.' }
    }

    const amount = billingCycle === 'monthly' ? plan.monthly : plan.yearly
    const planLabel = planName.charAt(0).toUpperCase() + planName.slice(1)

    if (!COINBASE_API_KEY) {
        console.error('[CryptoBilling] COINBASE_COMMERCE_API_KEY is not set. Value:', process.env.COINBASE_COMMERCE_API_KEY)
        return { error: 'Crypto payments are not configured. Please contact support.' }
    }

    try {
        const response = await fetch(COINBASE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CC-Api-Key': COINBASE_API_KEY,
                'X-CC-Version': '2018-03-22',
            },
            body: JSON.stringify({
                name: `Tradal ${planLabel} Plan`,
                description: `${planLabel} Plan — ${billingCycle} subscription`,
                pricing_type: 'fixed_price',
                local_price: {
                    amount: amount.toFixed(2),
                    currency: 'USD',
                },
                metadata: {
                    user_id: user.id,
                    user_email: user.email,
                    plan: planName.toLowerCase(),
                    billing_cycle: billingCycle,
                },
                redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.thetradal.com'}/dashboard?payment=success&method=crypto`,
                cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.thetradal.com'}/checkout?plan=${planName.toLowerCase()}`,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('[CryptoBilling] Coinbase API error:', errorData)
            return { error: 'Failed to create crypto checkout. Please try again.' }
        }

        const data = await response.json()
        const checkoutUrl = data?.data?.hosted_url

        if (!checkoutUrl) {
            console.error('[CryptoBilling] No hosted_url in response:', data)
            return { error: 'Failed to get checkout URL.' }
        }

        console.log(`[CryptoBilling] ✅ Charge created for ${user.email}: $${amount} ${billingCycle} ${planLabel}`)
        return { url: checkoutUrl }

    } catch (error: any) {
        console.error('[CryptoBilling] Error:', error?.message || error)
        return { error: 'An unexpected error occurred. Please try again.' }
    }
}
