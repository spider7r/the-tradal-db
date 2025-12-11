import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- CONFIGURATION ---
const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = 'llama-3.2-11b-vision-preview'; // Decommissioned? Logic handles fallback.
const CEREBRAS_MODEL = 'llama3.1-70b';
const GEMINI_MODEL = 'gemini-2.5-flash';

// --- KEY MANAGEMENT ---
function getKeys(envVar: string): string[] {
  const val = process.env[envVar] || '';
  return val.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

// --- PROVIDER INTERFACE ---
interface AIProvider {
  name: string;
  generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string>;
}

// --- GEMINI IMPLEMENTATION ---
class GeminiProvider implements AIProvider {
  name = 'Gemini';
  private keys: string[] = [];
  private currentIndex = 0;

  constructor() {
    // Support both multiple keys (GEMINI_API_KEYS) and legacy single key (GEMINI_API_KEY)
    const multi = getKeys('GEMINI_API_KEYS');
    const single = process.env.GEMINI_API_KEY;

    if (multi.length > 0) {
      this.keys = multi;
    } else if (single) {
      this.keys = [single];
    }
  }

  private getClient(keyIndex: number): GoogleGenerativeAI {
    return new GoogleGenerativeAI(this.keys[keyIndex]);
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (this.keys.length === 0) throw new Error("No Gemini Keys Configured");

    // Try keys in Round-Robin fashion
    // We try at most 'this.keys.length' times.
    let attempts = 0;
    let lastError: any = null;

    // Start from current index
    let iterator = this.currentIndex;

    while (attempts < this.keys.length) {
      const key = this.keys[iterator];
      // Move index for next time (Round Robin globally)
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;

      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        let parts: any[] = [{ text: `${systemPrompt}\n\nUSER PROMPT:\n${prompt}` }];

        if (imageBase64) {
          const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, "");
          parts.push({
            inlineData: {
              data: base64Clean,
              mimeType: "image/jpeg"
            }
          });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        return response.text();

      } catch (err: any) {
        console.warn(`Gemini Key ending in ...${key.slice(-5)} Failed:`, err.message);
        lastError = err;

        // If 429 (Rate Limit) or 503 (Overloaded), try next key.
        // If it's a 400 (Bad Request), it might be the image/prompt, so retrying might not help, but for safety we try one more just in case.
        attempts++;
        iterator = (iterator + 1) % this.keys.length; // Next key
      }
    }

    throw lastError || new Error("All Gemini Keys Exhausted");
  }
}

// --- GROQ IMPLEMENTATION ---
class GroqProvider implements AIProvider {
  name = 'Groq';
  private keys: string[];
  private currentIndex = 0;

  constructor() {
    this.keys = getKeys('GROQ_API_KEYS');
  }

  private getNextClient(): Groq {
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length; // Round Robin
    return new Groq({ apiKey: key });
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (this.keys.length === 0) throw new Error("No Groq Keys Configured");

    // SAFETY OVERRIDE:
    // Groq Vision is unstable/decommissioned. If we receive an image, it means Gemini failed.
    // We MUST fallback to Text-Only to prevent a crash.
    const model = GROQ_TEXT_MODEL;

    // Add a note about missing vision
    const effectivePrompt = imageBase64
      ? prompt + "\n\n[SYSTEM NOTE: Image analysis failed on primary provider (Gemini). This is a text-only fallback response. Do not hallucinate chart details.]"
      : prompt;

    let attempts = 0;
    while (attempts < this.keys.length) {
      try {
        const client = this.getNextClient();
        const completion = await client.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: effectivePrompt }
          ],
          model: model,
        });
        return completion.choices[0]?.message?.content || "";
      } catch (err: any) {
        console.error(`Groq Key Failed (${attempts + 1}/${this.keys.length}):`, err);
        if (err.error) console.error("Groq Error Details:", JSON.stringify(err.error, null, 2));
        attempts++;
        if (err.status === 429) continue;
        throw err;
      }
    }
    throw new Error("All Groq Keys Exhausted");
  }
}

// --- CEREBRAS IMPLEMENTATION ---
class CerebrasProvider implements AIProvider {
  name = 'Cerebras';
  private keys: string[];
  private currentIndex = 0;

  constructor() {
    this.keys = getKeys('CEREBRAS_API_KEYS');
  }

  private getNextClient(): OpenAI {
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return new OpenAI({
      apiKey: key,
      baseURL: "https://api.cerebras.ai/v1"
    });
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (this.keys.length === 0) throw new Error("No Cerebras Keys Configured");

    // Cerebras Llama 3.1 70b is Text Only.
    const effectivePrompt = imageBase64
      ? prompt + "\n\n[System Note: Image analysis failed on primary provider. This is a text-only fallback response.]"
      : prompt;

    let attempts = 0;
    while (attempts < this.keys.length) {
      try {
        const client = this.getNextClient();
        const completion = await client.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: effectivePrompt }
          ],
          model: CEREBRAS_MODEL,
        });
        return completion.choices[0]?.message?.content || "";
      } catch (err: any) {
        console.warn(`Cerebras Key Failed (${attempts + 1}/${this.keys.length}):`, err.message);
        attempts++;
        if (err.status === 429) continue;
        throw err;
      }
    }
    throw new Error("All Cerebras Keys Exhausted");
  }
}

// --- THE MANAGER (THE BRAIN) ---
class AIManager {
  private providers: AIProvider[] = [];

  constructor() {
    // Order defines priority: Gemini (Best) -> Groq (Fast) -> Cerebras (Backup)
    this.providers.push(new GeminiProvider());
    this.providers.push(new GroqProvider());
    this.providers.push(new CerebrasProvider());
  }

  async generate(message: string, context?: any, imageBase64?: string): Promise<string> {
    const systemPrompt = `
      You are "Tradal Buddy", the Lead Trading Analyst for The Tradal.
      
      CONTEXT: ${context ? JSON.stringify(context) : 'No specific trade context.'}
      
      YOUR PERSONA:
      - **Role**: Institutional Hedge Fund Analyst (Wall Street Grade).
      - **Methodology**: Smart Money Concepts (SMC), ICT, Price Action, Wyckoff, Supply & Demand.
      - **Tone**: Professional, Analytical, Unemotional, Precision-Oriented.
      - **Goal**: To provide "Deep Dive" analytics that give the user an unfair edge.
      
      INSTRUCTIONS:
      1. **Casual Chat**: Respond briefly but professionally. Focus on the mission.
      2. **Text Questions**: Use advanced terminology (Liquidity, Imbalance, Premium/Discount) to explain concepts.
      
      3. **CHART ANALYSIS (Strict "Pro" Format)**:
      If an image is provided, acts as if you are managing a $10M book. Use this structure:
      
      **PAIR NAME**: [Pair]  |  **TIMING**: [Timeframe identified]
      
      **MARKET STRUCTURE (The Narrative)**:
      - Trend Direction (Order Flow).
      - Identify **Order Blocks (OB)**, **Breaker Blocks**, and **Fair Value Gaps (FVG)**.
      - Check for **Liquidity Thefts** (Stop Hunts) or **Inducements**.
      - Is price in **Premium** or **Discount**?
      
      **NEAREST SNR**:
      - **Support**: Identify Demand Zones, Order Blocks, psychological levels.
      - **Resistance**: Identify Supply Zones, Bearish Breakers.
      
      **PROBABILITIES & CONFLUENCE**:
      - **Bullish Case %**: Based on Price Action + Structure.
      - **Bearish Case %**: Based on Price Action + Structure.
      - **Confluences**: List 3+ reasons (e.g., "Retest of FVG + 0.618 Fib + RSI Divergence").
      
      **FINAL CONCLUSION (Institutional Verdict)**:
      - **Bias**: [LONG / SHORT / WAIT]
      - **Invalidation Level**: Where does the thesis fail?
      - **Target Areas**: Where is the liquidity?
      
      4. **Safety**: "Not Financial Advice. Institutional Analysis Only."
        `;

    for (const provider of this.providers) {
      try {
        console.log(`[AIManager] Attempting ${provider.name}...`);
        const result = await provider.generate(message, systemPrompt, imageBase64);
        return result;
      } catch (err: any) {
        console.warn(`[AIManager] ${provider.name} Failed:`, err.message);
        // Continue to next provider
      }
    }
    throw new Error("ALL AI PROVIDERS FAILED. Application is overloaded.");
  }
} // End AIManager

// --- SINGLETON INSTANCE ---
const aiManager = new AIManager();

// --- EXPORTED FACADE ---
export async function chatWithCoach(message: string, context?: any, imageBase64?: string) {
  return aiManager.generate(message, context, imageBase64);
}

export async function generateTradeReview(tradeData: any) {
  const prompt = `Review this trade data and give 3 bullet points of advice: ${JSON.stringify(tradeData)}`;
  return aiManager.generate(prompt, tradeData);
}
