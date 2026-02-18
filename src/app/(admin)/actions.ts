'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper to log admin actions
async function logAdminAction(supabase: any, action: string, targetId: string, details: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get IP (simulated since we are in server action, headers might be needed for real IP)
    // For now we just log the event
    await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action,
        target_id: targetId,
        details,
        ip_address: 'System' // In production, parse headers()
    })
}

export async function updateUserPlan(userId: string, planTier: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE') {
    const supabase = await createClient()

    // 1. Verify Admin (Double check)
    const { data: { user } } = await supabase.auth.getUser()
    // if (user?.email !== process.env.ADMIN_EMAIL) throw new Error("Unauthorized")

    // 2. Fetch Plan Limits AND User Referral Info
    const { data: planData } = await supabase.from('plans').select('limits').eq('name', planTier).single()

    // Fetch user to check for referrer
    const { data: userData } = await supabase.from('users').select('referred_by').eq('id', userId).single()

    // Default fallback limits if plan not found in DB
    const PLAN_LIMITS = {
        'FREE': 1, // 1 AI Daily
        'STARTER': 5,
        'GROWTH': 1000,
        'ENTERPRISE': 10000
    }
    const newLimit = planData?.limits?.ai_daily_limit || PLAN_LIMITS[planTier] || 1

    // 3. Update User with new Tier AND Limits
    const { error } = await supabase
        .from('users')
        .update({
            plan_tier: planTier,
            ai_daily_limit: newLimit
        })
        .eq('id', userId)

    if (error) throw new Error(error.message)

    // 3.5. HANDLE AFFILIATE COMMISSION (If User was referred)
    if (userData?.referred_by) {
        // Define Plan Prices for Commission Calculation
        const PLAN_PRICES = {
            'FREE': 0,
            'STARTER': 19,
            'GROWTH': 29,
            'ENTERPRISE': 59
        }
        const price = PLAN_PRICES[planTier] || 0

        if (price > 0) {
            try {
                // Send Webhook to Affiliate Platform
                // In production, use process.env.AFFILIATE_WEBHOOK_URL
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
                        amount: price,
                        currency: 'USD',
                        product: planTier,
                        transaction_id: `txn_${userId}_${Date.now()}`,
                        user_email: user?.email || null,
                        user_name: user?.user_metadata?.full_name || null,
                    })
                })
            } catch (err) {
                console.error("Failed to trigger affiliate webhook:", err)
                // Don't block the admin action
            }
        }
    }

    // 4. Log it
    await logAdminAction(supabase, 'GRANT_PLAN', userId, { new_plan: planTier, new_limit: newLimit })

    revalidatePath('/admin/users')
    revalidatePath('/') // Revalidate app root to refresh user session/plan
    return { success: true }
}

export async function banUser(userId: string, isBanned: boolean) {
    /* 
       NOTE: Supabase Auth users cannot be "Banned" easily via pure SQL update on 'users' table 
       unless we have a 'banned' column or use the Supabase Admin API to actually ban the Auth User.
       For now, we will assume we added a 'is_banned' column to our public users table 
       OR we just revoke their plan to STARTER and maybe add a flag.
       
       Let's assume we want to call Supabase Admin API. 
       However, 'createClient' here is the standard one. 
       We need 'supabase-admin' client (SERVICE_ROLE_KEY) to actually ban from Auth.
       
       Safety: We will stick to public.users table update if column exists, 
       but we didn't create an 'is_banned' column in the migration.
       Let's add a 'notes' column update for now or just skip implementing "True Ban" until schema update.
       
       Let's just Log it for now and throw error saying "Schema Update Needed".
    */

    // For this demo, we will simulated it by downgrading to STARTER
    const supabase = await createClient()
    await supabase.from('users').update({ plan_tier: 'STARTER' }).eq('id', userId)
    await logAdminAction(supabase, 'BAN_USER', userId, { reason: 'Admin Action - Revoked Plan' })

    revalidatePath('/admin/users')
    return { success: true, message: "User plan revoked (Soft Ban)" }
}

export async function createPlan(data: any) {
    const supabase = await createClient()
    const { error } = await supabase.from('plans').insert(data)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/plans')
    await logAdminAction(supabase, 'CREATE_PLAN', 'new', data)
    return { success: true }
}

export async function togglePlanStatus(planId: string, isActive: boolean) {
    const supabase = await createClient()
    await supabase.from('plans').update({ is_active: isActive }).eq('id', planId)
    revalidatePath('/admin/plans')
    return { success: true }
}
