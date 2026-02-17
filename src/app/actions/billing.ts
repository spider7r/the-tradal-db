'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID
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
                        // Redirect back to dashboard after purchase
                        redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.thetradal.com'}/dashboard`,
                        receipt_button_text: "Go to Dashboard",
                        receipt_link_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.thetradal.com'}/dashboard`
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
