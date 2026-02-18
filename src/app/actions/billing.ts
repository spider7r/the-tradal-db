'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1/checkouts'

type PlanVariant = {
    monthly: string
    yearly: string
}

type PlanVariantSet = {
    trial: PlanVariant
    noTrial: PlanVariant
}

// Lemon Squeezy Variant IDs (scraped from API)
// Lemon Squeezy Variant IDs (Updated from fetch_products.ts)
const PLAN_VARIANTS: Record<string, PlanVariantSet> = {
    'FREE': {
        trial: {
            monthly: '1320197',
            yearly: '1320197'
        },
        noTrial: {
            monthly: '1320197',
            yearly: '1320197'
        }
    },
    'STARTER': {
        trial: {
            monthly: '1305645',
            yearly: '1305659'
        },
        noTrial: {
            monthly: '1305645',
            yearly: '1305659'
        }
    },
    'GROWTH': {
        trial: {
            monthly: '1305663',
            yearly: '1305673'
        },
        noTrial: {
            monthly: '1308221',
            yearly: '1308234'
        }
    },
    'ENTERPRISE': {
        trial: {
            monthly: '1305678',
            yearly: '1305680'
        },
        noTrial: {
            monthly: '1308246',
            yearly: '1308249'
        }
    }
}

export async function getCheckoutUrl(plan: string, interval: 'monthly' | 'yearly' = 'monthly', withTrial: boolean = true) {
    // Read env vars inside function body — NOT at module level.
    // Module-level reads can get cached at build time by Next.js.
    const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY
    const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User must be logged in to checkout')
    }

    const normalizedPlan = plan.toUpperCase()
    const variantSet = PLAN_VARIANTS[normalizedPlan]
    const variantId = variantSet?.[withTrial ? 'trial' : 'noTrial']?.[interval]

    if (!variantId) {
        throw new Error('Invalid plan or interval')
    }

    try {
        const payload = {
            data: {
                type: "checkouts",
                attributes: {
                    checkout_data: {
                        email: user.email,
                        custom: {
                            user_id: user.id,
                            plan_name: normalizedPlan,
                            interval: interval
                        }
                    },
                    product_options: {
                        // Hardcoded production redirect — env var was causing wrong domain
                        redirect_url: 'https://app.thetradal.com/dashboard',
                        receipt_button_text: "Go to Dashboard",
                        receipt_link_url: 'https://app.thetradal.com/dashboard'
                    }
                },
                relationships: {
                    store: {
                        data: {
                            type: "stores",
                            id: LEMONSQUEEZY_STORE_ID
                        }
                    },
                    variant: {
                        data: {
                            type: "variants",
                            id: variantId
                        }
                    }
                }
            }
        }


        if (!LEMONSQUEEZY_STORE_ID) {
            console.error("Missing LEMONSQUEEZY_STORE_ID")
            throw new Error("Missing Store ID")
        }

        const response = await fetch(LEMONSQUEEZY_API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Lemon Squeezy API Error Status:', response.status, response.statusText)
            console.error('Lemon Squeezy API Error Body:', errorText)
            throw new Error(`Failed to create checkout: ${response.statusText} - ${errorText}`)
        }

        const data = await response.json()
        const checkoutUrl = data.data.attributes.url

        return { url: checkoutUrl }

    } catch (error) {
        console.error('Checkout Error Details:', error)
        return { error: 'Failed to initiate checkout' }
    }
}

/**
 * Activate the Free plan for a user.
 * Sets onboarding_completed = true and plan_tier = 'free' in the DB.
 * This must be called BEFORE redirecting to dashboard to prevent
 * the infinite redirect loop (dashboard checks onboarding_completed).
 */
export async function activateFreePlan() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    // Use upsert instead of update — new signups may not have a public.users row yet.
    // .update() would silently match 0 rows and do nothing, causing an infinite onboarding loop.
    const { error } = await supabase
        .from('users')
        .upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            phone: user.user_metadata?.phone_number || null,
            onboarding_completed: true,
            plan_tier: 'free',
            subscription_status: 'free'
        }, { onConflict: 'id' })

    if (error) {
        console.error('Failed to activate free plan:', error)
        throw new Error('Failed to activate free plan')
    }

    return { success: true }
}
