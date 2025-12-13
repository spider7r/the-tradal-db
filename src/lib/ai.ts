import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- CONFIGURATION ---
const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';
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

// --- OPENROUTER IMPLEMENTATION (The Aggregator) ---
class OpenRouterProvider implements AIProvider {
  name = 'OpenRouter';
  private client: OpenAI | null = null;

  constructor() {
    const token = process.env.OPENROUTER_API_KEY;
    if (token) {
      this.client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: token,
        defaultHeaders: {
          "HTTP-Referer": "https://thetradal.com",
          "X-Title": "The Tradal"
        }
      });
    }
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (!this.client) throw new Error("No OpenRouter Token Configured");

    // Default to a high-tier free model
    let model = "google/gemini-2.0-flash-exp:free";
    let messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    if (imageBase64) {
      // Geminis on OpenRouter support vision
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

    try {
      const completion = await this.client.chat.completions.create({
        messages: messages,
        model: model,
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn(`[OpenRouter] Failed:`, err.message);
      throw err;
    }
  }
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

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (this.keys.length === 0) throw new Error("No Gemini Keys Configured");

    const MODELS_TO_TRY = [
      GEMINI_MODEL, // 2.5-flash
      'models/gemini-2.0-flash-exp', // BRAND NEW (Separate Quota)
      'models/gemini-1.5-flash', // Generic Alias (Try again)
      'models/gemini-1.5-flash-002',
      'models/gemini-1.5-pro',
      'models/gemini-1.5-flash-8b',
      'models/gemini-1.5-flash',
      'models/gemini-pro'
    ];

    let lastError: any = null;

    for (const modelTarget of MODELS_TO_TRY) {
      console.log(`[Gemini] Switching to Model: ${modelTarget}`);
      let attempts = 0;
      let iterator = this.currentIndex;

      while (attempts < this.keys.length) {
        const key = this.keys[iterator];
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;

        try {
          console.log(`[Gemini] Attempt ${attempts + 1}/${this.keys.length} using key ...${key.slice(-5)} on ${modelTarget}`);
          const genAI = new GoogleGenerativeAI(key);
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
          attempts++;
          iterator = (iterator + 1) % this.keys.length;
        }
      }
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
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return new Groq({ apiKey: key });
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (this.keys.length === 0) throw new Error("No Groq Keys Configured");

    let model = GROQ_TEXT_MODEL;
    let messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    if (imageBase64) {
      model = 'llama-3.2-90b-vision-preview'; // Flagship Vision
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
          messages: messages,
          model: model,
          temperature: 0.7,
          max_tokens: 4096
        });
        return completion.choices[0]?.message?.content || "";
      } catch (err: any) {
        console.error(`Groq Key Failed (${attempts + 1}/${this.keys.length}):`, err);
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

    if (imageBase64) {
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

// --- DEEPSEEK IMPLEMENTATION ---
class DeepSeekProvider implements AIProvider {
  name = 'DeepSeek V3';
  private client: OpenAI | null = null;

  constructor() {
    const token = process.env.DEEPSEEK_API_KEY;
    if (token) {
      this.client = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: token
      });
    }
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (!this.client) throw new Error("No DeepSeek Token Configured");

    const effectivePrompt = imageBase64
      ? prompt + "\n\n[System Note: Image context unavailable on DeepSeek. Analyze text data only.]"
      : prompt;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: effectivePrompt }
        ],
        model: "deepseek-chat",
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn(`[DeepSeek] Failed:`, err.message);
      throw err;
    }
  }
}

// --- SAMBANOVA IMPLEMENTATION ---
class SambaNovaProvider implements AIProvider {
  name = 'SambaNova (Llama 405B)';
  private client: OpenAI | null = null;

  constructor() {
    const token = process.env.SAMBANOVA_API_KEY;
    if (token) {
      this.client = new OpenAI({
        baseURL: "https://api.sambanova.ai/v1",
        apiKey: token
      });
    }
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (!this.client) throw new Error("No SambaNova Token Configured");

    const effectivePrompt = imageBase64
      ? prompt + "\n\n[System Note: Image context unavailable on SambaNova. Analyze text data only.]"
      : prompt;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: effectivePrompt }
        ],
        model: "Meta-Llama-3.1-405B-Instruct",
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn(`[SambaNova] Failed:`, err.message);
      throw err;
    }
  }
}

// --- HUGGING FACE IMPLEMENTATION ---
class HuggingFaceProvider implements AIProvider {
  name = 'Hugging Face (Qwen 72B)';
  private client: OpenAI | null = null;

  constructor() {
    const token = process.env.HUGGINGFACE_API_KEY;
    if (token) {
      this.client = new OpenAI({
        baseURL: "https://api-inference.huggingface.co/v1/",
        apiKey: token
      });
    }
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (!this.client) throw new Error("No HuggingFace Token Configured");

    const effectivePrompt = imageBase64
      ? prompt + "\n\n[System Note: Image context unavailable on Hugging Face. Analyze text data only.]"
      : prompt;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: effectivePrompt }
        ],
        model: "Qwen/Qwen2.5-72B-Instruct",
        temperature: 0.7,
        max_tokens: 4096
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn(`[HuggingFace] Failed:`, err.message);
      throw err;
    }
  }
}

// --- TOGETHER AI IMPLEMENTATION ---
class TogetherProvider implements AIProvider {
  name = 'Together AI';
  private client: OpenAI | null = null;

  constructor() {
    const token = process.env.TOGETHER_API_KEY;
    if (token) {
      this.client = new OpenAI({
        baseURL: "https://api.together.xyz/v1",
        apiKey: token
      });
    }
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (!this.client) throw new Error("No Together AI Token Configured");

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    let model = "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo";
    const isVision = !!imageBase64;

    if (isVision) {
      messages[1].content = [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
          }
        }
      ];
    } else {
      model = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";
    }

    try {
      const completion = await this.client.chat.completions.create({
        messages: messages,
        model: model,
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn(`[Together AI] Failed:`, err.message);
      throw err;
    }
  }
}

// --- NVIDIA NIM IMPLEMENTATION ---
class NvidiaProvider implements AIProvider {
  name = 'NVIDIA NIM';
  private client: OpenAI | null = null;

  constructor() {
    const token = process.env.NVIDIA_API_KEY;
    if (token) {
      this.client = new OpenAI({
        baseURL: "https://integrate.api.nvidia.com/v1",
        apiKey: token
      });
    }
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (!this.client) throw new Error("No NVIDIA Token Configured");

    const effectivePrompt = imageBase64
      ? prompt + "\n\n[System Note: Image context unavailable on NVIDIA. Analyze text data only.]"
      : prompt;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: effectivePrompt }
        ],
        model: "meta/llama-3.1-405b-instruct",
        temperature: 0.7,
        max_tokens: 4096
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn(`[NVIDIA] Failed:`, err.message);
      throw err;
    }
  }
}

// --- MISTRAL AI IMPLEMENTATION ---
class MistralProvider implements AIProvider {
  name = 'Mistral AI';
  private client: OpenAI | null = null;

  constructor() {
    const token = process.env.MISTRAL_API_KEY;
    if (token) {
      this.client = new OpenAI({
        baseURL: "https://api.mistral.ai/v1",
        apiKey: token
      });
    }
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    if (!this.client) throw new Error("No Mistral Token Configured");

    let model = "mistral-large-latest";
    let messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    if (imageBase64) {
      model = "pixtral-12b-2409";
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

    try {
      const completion = await this.client.chat.completions.create({
        messages: messages,
        model: model,
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.warn(`[Mistral] Failed:`, err.message);
      throw err;
    }
  }
}

// --- THE MANAGER (THE BRAIN) ---
class AIManager {
  private providers: AIProvider[] = [];

  constructor() {
    // Priority Chain:
    // 1. OpenRouter (User provided key!) - Aggregates everything
    // 2. GitHub (GPT-4o) - Top Tier Vision
    // 3. Together AI (Llama Vision) - Top Speed Vision
    // 4. NVIDIA (Llama 405B) - Top Reliability 405B
    // 5. SambaNova (Llama 405B) - Top Tier Reasoning
    // 6. Mistral (Large/Pixtral) - High IQ + Vision
    // 7. DeepSeek (V3) - Top Tier Reasoning
    // 8. Hugging Face (Qwen 72B) - Strong Fallback
    // 9. Gemini (Flash 2.0) - High Speed Vision
    // 10. Groq (Llama 3.2) - High Speed Vision Backup
    // 11. Cerebras (Llama 70b) - Instant Fallback

    this.providers.push(new OpenRouterProvider());
    this.providers.push(new GithubProvider());
    this.providers.push(new TogetherProvider());
    this.providers.push(new NvidiaProvider());
    this.providers.push(new SambaNovaProvider());
    this.providers.push(new MistralProvider());
    this.providers.push(new DeepSeekProvider());
    this.providers.push(new HuggingFaceProvider());
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
