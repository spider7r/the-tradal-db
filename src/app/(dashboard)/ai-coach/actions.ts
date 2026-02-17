'use server'

import { createClient } from '@/utils/supabase/server'
import { generateTradeReview } from '@/lib/ai'
import { revalidatePath } from 'next/cache'


// --- GATEKEEPER LOGIC ---
async function checkAILimit(userId: string, type: 'vision' | 'chat') {
    const supabase = await createClient()

    // 1. Get User Plan & Limits
    const { data: user, error } = await supabase
        .from('users')
        .select('plan_tier, ai_daily_limit, ai_usage_today, last_usage_date')
        .eq('id', userId)
        .single()

    if (error || !user) throw new Error("User plan not found");

    // 2. UNLIMITED CHAT RULE (Pro/Elite get unlimited text chat)
    if (type === 'chat' && (user.plan_tier === 'PROFESSIONAL' || user.plan_tier === 'ELITE')) {
        return; // Allow immediately
    }

    // 3. Reset Check (Manual Logic in case trigger missing)
    const today = new Date().toISOString().split('T')[0];
    let currentUsage = user.ai_usage_today || 0;

    if (user.last_usage_date !== today) {
        currentUsage = 0; // Reset
        await supabase.from('users').update({
            ai_usage_today: 0,
            last_usage_date: today
        }).eq('id', userId);
    }

    // 4. Limit Check
    // Starter: Chat Limit = 10 (hardcoded rule), Vision Limit = ai_daily_limit (1)
    let limit = user.ai_daily_limit;

    if (type === 'chat' && user.plan_tier === 'STARTER') {
        limit = 10; // 10 Free chats/day for starter
    }

    if (user.plan_tier === 'FREE' || !user.plan_tier) {
        limit = type === 'chat' ? 3 : 1;
    }

    if (currentUsage >= limit) {
        throw new Error(`Daily Limit Reached! Upgrade to PRO for more.`);
    }

    // 5. Increment Usage
    // We only increment "official" usage for Vision (or Starter Chat)
    await supabase.from('users').update({ ai_usage_today: currentUsage + 1 }).eq('id', userId);
}

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

    // [GATEKEEPER] - Trade Analysis counts as Vision/High Value
    await checkAILimit(trade.user_id, 'vision');

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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Unauthorized");

        console.log(`[Action] Received message: "${message.substring(0, 20)}..."`);
        console.log(`[Action] Image present: ${!!imageBase64} (Length: ${imageBase64?.length || 0})`);

        // [GATEKEEPER] - Vision if image, Chat if text
        const type = imageBase64 ? 'vision' : 'chat';
        await checkAILimit(user.id, type);

        // Inject User Name into Context
        const userName = user.user_metadata?.full_name || user.user_metadata?.name || 'Trader';
        const enhancedContext = { ...context, user_name: userName };

        const response = await import('@/lib/ai').then(mod => mod.chatWithCoach(message, enhancedContext, imageBase64));
        console.log("[Action] Response success:", !!response);
        return { success: true, message: response };
    } catch (error: any) {
        console.error('[Action] Chat error details:', error);
        return { success: false, error: error.message || 'Failed to get response from AI coach' };
    }
}

// Pre-validate if image is a trading chart before full analysis
export async function validateChartImage(imageBase64: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Unauthorized");

        console.log(`[Validation] Checking if image is a valid trading chart...`);

        // Quick validation prompt
        const validationPrompt = `
You are an image validator. Look at this image and determine if it is a TRADING CHART.

A valid trading chart MUST have:
- Candlestick or bar price data (OHLC patterns)
- A price axis (numbers showing price levels)
- A trading platform interface (like TradingView, MT4, MT5, etc.)

Respond in EXACTLY this format:
VALID: [true/false]
DETECTED: [What the image actually shows in 1-2 sentences]

Examples:
- If it's a TradingView chart: "VALID: true | DETECTED: TradingView chart showing XAUUSD candlesticks"
- If it's a website screenshot: "VALID: false | DETECTED: WordPress admin dashboard"
- If it's a meme: "VALID: false | DETECTED: Internet meme image"

Be strict. Only trading charts with visible price data are valid.
`.trim();

        // Use the AI to validate
        const response = await import('@/lib/ai').then(mod =>
            mod.chatWithCoach(validationPrompt, { mode: 'analyst', isValidation: true }, imageBase64)
        );

        // Parse the response
        const isValid = response.toLowerCase().includes('valid: true');
        const detectedMatch = response.match(/DETECTED:\s*(.+)/i);
        const detected = detectedMatch ? detectedMatch[1].trim() : 'Unknown content';

        console.log(`[Validation] Result: ${isValid ? 'VALID CHART' : 'NOT A CHART'} - ${detected}`);

        return {
            success: true,
            isValid,
            detected,
            message: isValid
                ? 'Valid trading chart detected'
                : `This is not a trading chart. Detected: ${detected}`
        };
    } catch (error: any) {
        console.error('[Validation] Error:', error);
        // On error, allow through (fail-open for UX)
        return { success: true, isValid: true, detected: 'Unable to validate', message: 'Proceeding with analysis' };
    }
}
