import { GoogleGenerativeAI } from '@google/generative-ai'

// --- Gemini Key Manager (Round Robin & Failover) ---
class GeminiKeyManager {
  private keys: string[]
  private currentIndex: number = 0

  constructor() {
    // 1. Try GEMINI_API_KEYS (Comma separated list)
    // 2. Fallback to GEMINI_API_KEY (Single key)
    const keysRaw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || ''

    // Parse and clean keys
    this.keys = keysRaw.split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)

    if (this.keys.length > 0) {
      console.log(`[GeminiKeyManager] Initialized with ${this.keys.length} API keys.`)
    } else {
      console.warn('[GeminiKeyManager] No API keys found! AI features will not work.')
    }
  }

  // Execute an AI operation with automatic failover for Rate Limits (429)
  async execute<T>(operation: (model: any) => Promise<T>): Promise<T> {
    if (this.keys.length === 0) throw new Error('No Gemini API keys configured.')

    let lastError: any
    // Try each key at least once (or loop through them if needed)
    const maxAttempts = this.keys.length

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const currentKey = this.keys[this.currentIndex]
        const genAI = new GoogleGenerativeAI(currentKey)
        // Use gemini-1.5-flash as the standard efficient model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        return await operation(model)

      } catch (error: any) {
        lastError = error

        // Check for Rate Limit / Quota errors
        const isRateLimit = error.response?.status === 429 ||
          error.status === 429 ||
          error.toString().includes('429') ||
          error.toString().includes('quota') ||
          error.toString().includes('resource_exhausted')

        if (isRateLimit) {
          console.warn(`[GeminiKeyManager] Key ending in ...${this.keys[this.currentIndex].slice(-4)} exhausted (429). Switching keys...`)

          // Rotate to next key
          this.currentIndex = (this.currentIndex + 1) % this.keys.length
          continue // Retry immediately with new key
        }

        // If it's a different error (e.g., policy violation), throw it immediately
        throw error
      }
    }

    throw new Error(`All Gemini API keys exhausted. Last error: ${lastError?.message}`)
  }
}

// Global instance
const keyManager = new GeminiKeyManager()

export async function generateTradeReview(tradeData: any) {
  return keyManager.execute(async (model) => {
    const prompt = `
      You are an expert trading coach with decades of experience in price action, risk management, and trading psychology. 
      Analyze this trade deeply and provide a structured, high-value review.

      Trade Details:
      - Pair: ${tradeData.pair}
      - Direction: ${tradeData.direction}
      - Entry Price: ${tradeData.entry_price}
      - Exit Price: ${tradeData.exit_price}
      - P&L: ${tradeData.pnl}
      - Risk:Reward Ratio: ${tradeData.rr || 'Not specified'}
      - Setup/Strategy: ${tradeData.setup_type || 'Not specified'}
      - User Notes: "${tradeData.notes || 'No notes provided'}"
      - Closing Reason: ${tradeData.closing_reason || 'Not specified'}
      - Mode: ${tradeData.mode || 'Live'}

      STRICT INSTRUCTIONS:
      1. Adopt a professional, "tough love" mentor persona. Be direct but encouraging.
      2. Analyze the R:R and outcome. Did the user follow their plan?
      3. Use the User Notes to infer their psychological state.
      4. Format your response using the following Markdown headers:

      ## 🔍 Technical Analysis
      (Analyze the entry/exit efficiency and trade management)

      ## ✅ Strengths
      (Bullet points of what they did well)

      ## ⚠️ Weaknesses & Mistakes
      (Bullet points of errors in execution or mindset)

      ## 💡 Actionable Advice
      (One specific thing to practice or change for the next trade)

      ## 🧠 Psychology Check
      (Brief assessment of their mindset based on notes/actions)

      **Rating: X/10**
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  })
}


export async function chatWithCoach(message: string, context?: any, imageBase64?: string) {
  return keyManager.execute(async (model) => {
    const prompt = `
      You are "TJP Buddy", the expert AI trading assistant for the TJP (Trading Journal Platform).
      
      Context:
      ${context ? JSON.stringify(context, null, 2) : 'No specific trade context provided.'}

      User Message: "${message}"

      STRICT INSTRUCTIONS:
      1. Your name is "TJP Buddy".
      2. The founder and CEO of TJP is "Wali" (aka "Muhammad Waleed").
      3. Be extremely concise and direct.
      4. ONLY answer questions related to:
         - Trading (Psychology, Risk Management, Technical Analysis).
         - The user's specific trades provided in the context.
         - This TJP platform.
         - Market analysis based on provided charts/images.
      5. If the user greets you, respond: "Hello! I'm TJP Buddy. How can I help with your trading?"
      6. Refuse off-topic questions politely.
      7. Do NOT give financial advice.
      8. DO NOT introduce yourself in every message. Only mention your name if asked or in the initial greeting.
      9. IF AN IMAGE IS PROVIDED (Chart Analysis Mode):
         - Adopt a "Pro Trading Expert" persona.
         - Provide a detailed, structured analysis with the following sections:
           **📊 Market Structure & Trend**:
           - Identify the overall trend (Bullish/Bearish/Ranging).
           - Note key Highs and Lows (HH, HL, LH, LL).
           
           **🎯 Key Levels (SNR)**:
           - Identify nearest Support & Resistance zones.
           - Note any psychological levels.
           
           **🔮 Scenarios (If This / If That)**:
           - **Bullish Scenario**: "If price breaks above [Level], look for..."
           - **Bearish Scenario**: "If price breaks below [Level], look for..."
           
           **💡 Prediction & Confluence**:
           - Give a probability-based prediction.
           - List confluences (e.g., Trend + Support + Candle Pattern).
         
         - Keep the tone professional, valuable, and educational.

      10. FOR COMPLEX QUESTIONS (Strategy, Psychology, Math):
          - Break down the answer into logical steps.
          - Use analogies if helpful.
          - Provide pros and cons where applicable.
          - Ensure the reasoning is sound and easy to follow.
    `

    let parts: any[] = [{ text: prompt }];

    if (imageBase64) {
      // Remove data URL prefix if present
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: "image/png" // Assuming PNG/JPEG, API is flexible
        }
      });
    }

    const result = await model.generateContent(parts)
    const response = await result.response
    return response.text()
  })
}
