import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const WEBHOOK_SECRET = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET!

/**
 * Coinbase Commerce webhook handler.
 * Verifies the signature, then activates the user's subscription on charge:confirmed.
 */
export async function POST(req: Request) {
    const body = await req.text()
    const signature = req.headers.get('x-cc-webhook-signature')

    // Verify webhook signature
    if (!WEBHOOK_SECRET) {
        console.error('[Coinbase Webhook] WEBHOOK_SECRET is not configured')
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    if (!signature) {
        console.error('[Coinbase Webhook] Missing signature header')
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
    hmac.update(body)
    const expectedSignature = hmac.digest('hex')

    if (signature !== expectedSignature) {
        console.error('[Coinbase Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse the event
    let event
    try {
        event = JSON.parse(body)
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const eventType = event?.event?.type
    const metadata = event?.event?.data?.metadata

    console.log(`[Coinbase Webhook] Received event: ${eventType}`)

    // Handle confirmed payment
    if (eventType === 'charge:confirmed' || eventType === 'charge:resolved') {
        if (!metadata?.user_id || !metadata?.plan) {
            console.error('[Coinbase Webhook] Missing metadata:', metadata)
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
        }

        const { user_id, plan, billing_cycle } = metadata

        // Calculate subscription expiry
        const daysToAdd = billing_cycle === 'yearly' ? 365 : 30
        const expiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString()

        console.log(`[Coinbase Webhook] ✅ Activating ${plan} plan for user ${user_id} (expires: ${expiresAt})`)

        const supabase = await createClient()

        const { error } = await supabase
            .from('users')
            .update({
                plan_tier: plan,
                subscription_status: 'active',
                onboarding_completed: true,
                payment_method: 'crypto',
                subscription_expires_at: expiresAt,
            })
            .eq('id', user_id)

        if (error) {
            console.error('[Coinbase Webhook] DB update failed:', error)
            return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        }

        console.log(`[Coinbase Webhook] ✅ User ${user_id} activated on ${plan} plan`)
    }

    // Handle failed/expired payments
    if (eventType === 'charge:failed' || eventType === 'charge:expired') {
        console.warn(`[Coinbase Webhook] ⚠️ Payment ${eventType} for user ${metadata?.user_id}`)
        // Don't deactivate — just log it. User can retry.
    }

    return NextResponse.json({ received: true })
}
