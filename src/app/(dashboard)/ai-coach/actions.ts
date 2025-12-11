'use server'

import { createClient } from '@/utils/supabase/server'
import { generateTradeReview } from '@/lib/ai'
import { revalidatePath } from 'next/cache'

export async function analyzeTrade(tradeId: string) {
    const supabase = await createClient()

    // 1. Fetch trade data
    const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', tradeId)
        .single()

    if (tradeError || !trade) {
        throw new Error('Trade not found')
    }

    // 2. Generate AI Review
    const review = await generateTradeReview(trade)

    // 3. Save to ai_reports table
    const { error: saveError } = await supabase
        .from('ai_reports')
        .insert({
            user_id: trade.user_id,
            type: 'trade_review',
            content: {
                trade_id: tradeId,
                review: review,
                rating: 0
            }
        })

    if (saveError) {
        console.error('Failed to save report:', JSON.stringify(saveError, null, 2))
        throw new Error(`Failed to save analysis: ${saveError.message}`)
    }

    revalidatePath('/trades')
    revalidatePath('/')
    revalidatePath('/ai-coach')
}

export async function sendChatMessage(message: string, context?: any, imageBase64?: string) {
    try {
        console.log(`[Action] Received message: "${message.substring(0, 20)}..."`);
        console.log(`[Action] Image present: ${!!imageBase64} (Length: ${imageBase64?.length || 0})`);

        const response = await import('@/lib/ai').then(mod => mod.chatWithCoach(message, context, imageBase64));
        console.log("[Action] Response success:", !!response);
        return { success: true, message: response };
    } catch (error: any) {
        console.error('[Action] Chat error details:', error);
        return { success: false, error: error.message || 'Failed to get response from AI coach' };
    }
}
