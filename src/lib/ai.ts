import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- CONFIGURATION ---
const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = 'llama-3.2-11b-vision-preview'; // Decommissioned? Logic handles fallback.
const CEREBRAS_MODEL = 'llama3.1-70b';
const GEMINI_MODEL = 'models/gemini-2.5-flash';

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
    console.log(`[GeminiProvider] Loaded ${this.keys.length} keys. (Env: ${multi.length > 0 ? 'GEMINI_API_KEYS' : 'GEMINI_API_KEY'})`);
  }

  private getClient(keyIndex: number): GoogleGenerativeAI {
    return new GoogleGenerativeAI(this.keys[keyIndex]);
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (this.keys.length === 0) throw new Error("No Gemini Keys Configured");

    // Models to try in order of priority
    // Models to try in order of priority
    // 1. gemini-2.5-flash (Experimental - High Rate Limits)
    // 2. gemini-1.5-flash-002 (Latest Stable)
    // 3. gemini-1.5-pro (Higher Intelligence, Lower Speed)
    // 4. gemini-1.5-flash-8b (Ultra Fast)
    const MODELS_TO_TRY = [
      GEMINI_MODEL,
      'models/gemini-1.5-flash-002',
      'models/gemini-1.5-pro',
      'models/gemini-1.5-flash-8b',
      'models/gemini-1.5-flash',
      'models/gemini-pro'
    ];

    let lastError: any = null;

    for (const modelTarget of MODELS_TO_TRY) {
      console.log(`[Gemini] Switching to Model: ${modelTarget}`);

      // Reset iterator to try all keys for this model
      let attempts = 0;
      let iterator = this.currentIndex;

      while (attempts < this.keys.length) {
        const key = this.keys[iterator];
        // Move index for next time (Round Robin globally)
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;

        try {
          console.log(`[Gemini] Attempt ${attempts + 1}/${this.keys.length} using key ...${key.slice(-5)} on ${modelTarget}`);
          const genAI = new GoogleGenerativeAI(key);

          // Ensure model has 'models/' prefix
          const modelId = modelTarget.startsWith('models/') ? modelTarget : `models/${modelTarget}`;
          const model = genAI.getGenerativeModel({ model: modelId });

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
          console.error(`[Gemini Error] Key ...${key.slice(-5)} failed on ${modelTarget}. Status: ${err.response?.status || 'Unknown'} | Message: ${err.message}`);
          lastError = err;

          // If 429 (Rate Limit) try next key.
          attempts++;
          iterator = (iterator + 1) % this.keys.length; // Next key
        }
      }
      // If we exit the while loop, it means ALL keys failed for this model.
      // We continue to the next model in MODELS_TO_TRY...
      console.warn(`[Gemini] All keys exhausted for ${modelTarget}. Falling back...`);
    }

    throw lastError || new Error("All Gemini Keys & Models Exhausted");
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

    // SAFETY CHECK:
    // Try to use Llama 3.2 Vision if image is present.
    let model = GROQ_TEXT_MODEL;
    let messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt } // Default text content
    ];

    if (imageBase64) {
      // Use Vision Model
      model = 'llama-3.2-11b-vision-preview';

      // Format message for Groq Vision (OpenAI compatible)
      messages[1].content = [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
          }
        }
      ];
    }

    let attempts = 0;
    while (attempts < this.keys.length) {
      try {
        const client = this.getNextClient();
        const completion = await client.chat.completions.create({
          messages: messages, // Use the pre-constructed messages array
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

// --- GITHUB MODELS IMPLEMENTATION (GPT-4o) ---
class GithubProvider implements AIProvider {
  name = 'GitHub Models (GPT-4o)';
  private client: OpenAI | null = null;

  constructor() {
    const token = process.env.GITHUB_MODELS_TOKEN;
    if (token) {
      this.client = new OpenAI({
        baseURL: "https://models.inference.ai.azure.com",
        apiKey: token
      });
    }
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (!this.client) throw new Error("No GitHub Models Token Configured");

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    // Handle Vision if image provided
    if (imageBase64) {
      // GPT-4o supports vision natively
      messages[1].content = [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
            detail: "high"
          }
        }
      ];
    }

    try {
      const completion = await this.client.chat.completions.create({
        messages: messages,
        model: "gpt-4o",
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.error(`[GitHub Models] Failed:`, err);
      throw err;
    }
  }
}

// --- THE MANAGER (THE BRAIN) ---
class AIManager {
  private providers: AIProvider[] = [];

  constructor() {
    // Priority: GitHub (GPT-4o) -> Gemini (Failover) -> Groq -> Cerebras
    this.providers.push(new GithubProvider());
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
