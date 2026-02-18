import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'
import { headers } from 'next/headers'

// Webhook Secret from LS Dashboard
const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

export async function POST(request: Request) {
    try {
        if (!WEBHOOK_SECRET) {
            console.error('LEMONSQUEEZY_WEBHOOK_SECRET is missing')
            return new Response('Configuration Error', { status: 500 })
        }

        // 1. Verify Signature
        const text = await request.text()
        const signature = (await headers()).get('x-signature')

        if (!signature) {
            return new Response('Missing Signature', { status: 401 })
        }

        const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
        const digest = hmac.update(text).digest('hex')

        if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
            return new Response('Invalid Signature', { status: 401 })
        }

        // 2. Parse Body
        const payload = JSON.parse(text)
        const { meta, data } = payload
        const eventName = meta.event_name
        const customData = meta.custom_data // { user_id: '...', plan_name: '...' }

        if (!customData || !customData.user_id) {
            console.warn('Webhook received without user_id in custom_data', meta)
            return new Response('No user_id provided', { status: 200 })
        }

        const supabase = await createClient()
        const userId = customData.user_id
        const attributes = data.attributes

        // 3. Handle Events
        switch (eventName) {
            case 'subscription_created':
            case 'subscription_updated':
            case 'subscription_resumed':
            case 'subscription_payment_success':
                // Update User Plan
                const planName = customData.plan_name || 'FREE'

                // Fetch Plan Limits from DB or use Fallback
                const { data: planData } = await supabase.from('plans').select('limits').eq('name', planName).single()

                const PLAN_LIMITS: Record<string, number> = {
                    'FREE': 1,
                    'STARTER': 5,
                    'GROWTH': 1000,
                    'ENTERPRISE': 10000
                }
                const newLimit = planData?.limits?.ai_daily_limit ?? PLAN_LIMITS[planName] ?? 1

                const { error: updateError } = await supabase
                    .from('users')
                    .upsert({
                        id: userId,
                        plan_tier: planName,
                        onboarding_completed: true,
                        ai_daily_limit: newLimit,
                        lemon_squeezy_customer_id: attributes.customer_id,
                        lemon_squeezy_subscription_id: data.id,
                        lemon_squeezy_variant_id: attributes.variant_id || attributes.first_subscription_item?.variant_id,
                        subscription_status: attributes.status,
                        renews_at: attributes.renews_at,
                    }, { onConflict: 'id' })

                if (updateError) {
                    console.error('Failed to update user subscription:', updateError)
                    return new Response('Database Update Failed', { status: 500 })
                }

                // Handle Affiliate Commission (Only on actual payment success)
                if (eventName === 'subscription_payment_success' || eventName === 'subscription_created') {
                    // Fetch user to check referral
                    const { data: userData } = await supabase.from('users').select('referred_by, email, raw_user_meta_data').eq('id', userId).single()

                    if (userData?.referred_by) {
                        try {
                            const amountPaid = attributes.total_formatted || attributes.total // Check LS API for exact field
                            const amountValue = attributes.total ? attributes.total / 100 : 0 // LS uses cents

                            if (amountValue > 0) {
                                const webhookUrl = process.env.AFFILIATE_WEBHOOK_URL || 'https://partners.thetradal.com/api/webhook/conversion'
                                const secret = process.env.AFFILIATE_WEBHOOK_SECRET || 'dev_secret'

                                await fetch(webhookUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'x-affiliate-secret': secret
                                    },
                                    body: JSON.stringify({
                                        ref_code: userData.referred_by,
                                        amount: amountValue,
                                        currency: attributes.currency || 'USD',
                                        product: planName,
                                        transaction_id: `ls_${data.id}`,
                                        user_email: userData.email,
                                        user_name: userData.raw_user_meta_data?.full_name || 'User',
                                    })
                                })
                                console.log('Affiliate webhook sent for user:', userId)
                            }
                        } catch (err) {
                            console.error("Failed to trigger affiliate webhook:", err)
                        }
                    }
                }
                break

            case 'subscription_cancelled':
            case 'subscription_expired':
                // If expired, revert to FREE. If cancelled, just update status.
                if (attributes.status === 'expired') {
                    await supabase
                        .from('users')
                        .update({
                            plan_tier: 'FREE',
                            subscription_status: attributes.status,
                        })
                        .eq('id', userId)
                } else {
                    // Just update status (e.g. 'cancelled' but still active until period ends)
                    await supabase
                        .from('users')
                        .update({
                            subscription_status: attributes.status,
                            renews_at: attributes.renews_at,
                        })
                        .eq('id', userId)
                }
                break

            default:
                console.log(`Unhandled event: ${eventName}`)
        }

        return new Response('Webhook processed', { status: 200 })

    } catch (error) {
        console.error('Webhook Error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
