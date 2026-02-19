import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- CONFIGURATION ---
const GROQ_TEXT_MODEL = 'llama-3.3-70b-specdec'; // Fastest Text
const OPENROUTER_VISION_MODEL = 'google/gemini-2.5-flash-preview:free'; // Best Free Vision
const CEREBRAS_MODEL = 'llama3.1-70b';
const GEMINI_MODEL = 'models/gemini-2.5-flash';

// --- UNIVERSAL KEY MANAGER ---
// Reads comma-separated keys from environment variables
function getKeys(envVar: string): string[] {
  const val = process.env[envVar] || '';
  return val.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

// --- PROVIDER INTERFACE ---
interface AIProvider {
  name: string;
  type: 'chat' | 'vision' | 'hybrid'; // Capability flag
  generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string>;
}

// --- OPENROUTER (THE SWARM) ---
// Supports "OPENROUTER_API_KEYS" with Multi-Key Rotation
class OpenRouterProvider implements AIProvider {
  name = 'OpenRouter Swarm';
  type: 'hybrid' = 'hybrid';
  private keys: string[];
  private currentIndex = 0;

  constructor() {
    this.keys = getKeys('OPENROUTER_API_KEYS');
    // Fallback to legacy single key
    if (this.keys.length === 0 && process.env.OPENROUTER_API_KEY) {
      this.keys.push(process.env.OPENROUTER_API_KEY);
    }
    console.log(`[OpenRouter] Loaded ${this.keys.length} keys in The Swarm.`);
  }

  private getNextClient(): OpenAI {
    if (this.keys.length === 0) throw new Error("No OpenRouter Keys Configured");
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length; // Round Robin

    return new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: key,
      defaultHeaders: {
        "HTTP-Referer": "https://thetradal.com",
        "X-Title": "The Tradal"
      }
    });
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    let attempts = 0;
    while (attempts < this.keys.length) {
      try {
        const client = this.getNextClient();

        let messages: any[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ];

        let model = OPENROUTER_VISION_MODEL;

        if (imageBase64) {
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

        const completion = await client.chat.completions.create({
          messages: messages,
          model: model,
          temperature: 0.5, // Lower temperature for precision
          max_tokens: 4096
        });

        return completion.choices[0]?.message?.content || "";

      } catch (err: any) {
        console.warn(`[OpenRouter] Key Failed (${attempts + 1}/${this.keys.length}):`, err.message);
        attempts++;
        // If 429 (Rate Limit) or 401 (Auth), try next key immediately
        if (err.status === 429 || err.status === 401) continue;
        throw err; // Other errors (500, etc) might be fatal, but for safety we could verify
      }
    }
    throw new Error("All OpenRouter Keys Exhausted");
  }
}

// --- GROQ SWARM (TEXT SPECIALIST) ---
// Supports "GROQ_API_KEYS" with Multi-Key Rotation
class GroqProvider implements AIProvider {
  name = 'Groq Swarm';
  type: 'hybrid' = 'hybrid'; // Groq now supports Vision too
  private keys: string[];
  private currentIndex = 0;

  constructor() {
    this.keys = getKeys('GROQ_API_KEYS');
    if (this.keys.length === 0 && process.env.GROQ_API_KEY) {
      this.keys.push(process.env.GROQ_API_KEY);
    }
    console.log(`[Groq] Loaded ${this.keys.length} keys in The Swarm.`);
  }

  private getNextClient(): Groq {
    if (this.keys.length === 0) throw new Error("No Groq Keys Configured");
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return new Groq({ apiKey: key });
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    let attempts = 0;

    // Model Selection
    let model = GROQ_TEXT_MODEL; // Default Text
    if (imageBase64) {
      model = 'llama-3.2-90b-vision-preview'; // Vision Fallback
    }

    while (attempts < this.keys.length) {
      try {
        const client = this.getNextClient();

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
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ];
        }

        const completion = await client.chat.completions.create({
          messages: messages,
          model: model,
          temperature: 0.6,
          max_tokens: 4096
        });
        return completion.choices[0]?.message?.content || "";
      } catch (err: any) {
        console.warn(`[Groq] Key Failed (${attempts + 1}/${this.keys.length}):`, err.message);
        attempts++;
        if (err.status === 429) continue; // Rate limit -> Next Key
        throw err;
      }
    }
    throw new Error("All Groq Keys Exhausted");
  }
}

// --- GITHUB MODELS (UNIVERSAL BACKUP) ---
class GithubProvider implements AIProvider {
  name = 'GitHub Models (GPT-4o)';
  type: 'hybrid' = 'hybrid';
  private keys: string[];
  private currentIndex = 0;

  constructor() {
    this.keys = getKeys('GITHUB_MODELS_TOKENS'); // Support Swarm here too!
    if (this.keys.length === 0 && process.env.GITHUB_MODELS_TOKEN) {
      this.keys.push(process.env.GITHUB_MODELS_TOKEN);
    }
  }

  private getNextClient(): OpenAI {
    if (this.keys.length === 0) throw new Error("No GitHub Keys");
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return new OpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey: key
    });
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    let attempts = 0;
    while (attempts < this.keys.length) {
      try {
        const client = this.getNextClient();
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

        const completion = await client.chat.completions.create({
          messages: messages,
          model: "gpt-4o",
          temperature: 0.6
        });
        return completion.choices[0]?.message?.content || "";
      } catch (err: any) {
        console.warn(`[GitHub] Key Failed:`, err.message);
        attempts++;
        if (err.status === 429 || err.status === 401) continue;
        throw err;
      }
    }
    throw new Error("All GitHub Keys Exhausted");
  }
}

// --- GEMINI PROVIDER (ADDITIONAL FAILOVER) ---
// --- GEMINI PROVIDER (ADDITIONAL FAILOVER) ---
class GeminiProvider implements AIProvider {
  name = 'Gemini';
  type: 'hybrid' = 'hybrid';
  private keys: string[];
  private currentIndex = 0;

  constructor() {
    this.keys = getKeys('GEMINI_API_KEYS');
    // Fallback to legacy single key
    if (this.keys.length === 0 && process.env.GEMINI_API_KEY) {
      this.keys.push(process.env.GEMINI_API_KEY);
    }
    console.log(`[Gemini] Loaded ${this.keys.length} keys.`);
  }

  private getNextClient(): GoogleGenerativeAI {
    if (this.keys.length === 0) throw new Error("No Gemini Keys Configured");
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return new GoogleGenerativeAI(key);
  }

  async generate(prompt: string, systemPrompt: string, imageBase64?: string): Promise<string> {
    let attempts = 0;

    while (attempts < this.keys.length) {
      try {
        const client = this.getNextClient();
        const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

        let parts: any[] = [];

        // Add system prompt as part of the user message
        const fullPrompt = `${systemPrompt}\n\n---\n\nUser Message: ${prompt}`;

        if (imageBase64) {
          // Vision request
          const imageData = imageBase64.startsWith('data:')
            ? imageBase64.split(',')[1]
            : imageBase64;

          parts = [
            { text: fullPrompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageData } }
          ];
        } else {
          // Text-only request
          parts = [{ text: fullPrompt }];
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        return response.text() || "";

      } catch (err: any) {
        console.warn(`[Gemini] Key Failed (${attempts + 1}/${this.keys.length}):`, err.message);
        attempts++;
        // If 429 (Rate Limit) or 401 (Auth), try next key immediately
        if (err.message.includes('429') || err.message.includes('401') || err.message.includes('FetchError')) continue;
        throw err;
      }
    }
    throw new Error("All Gemini Keys Exhausted");
  }
}

// --- THE INFINITY CLUSTER MANAGER ---
class AIManager {
  // Swarms
  private openRouterSwarm: OpenRouterProvider;
  private groqSwarm: GroqProvider;
  private githubSwarm: GithubProvider;
  private geminiProvider: GeminiProvider;

  constructor() {
    this.openRouterSwarm = new OpenRouterProvider();
    this.groqSwarm = new GroqProvider();
    this.githubSwarm = new GithubProvider();
    this.geminiProvider = new GeminiProvider();
  }

  // SYSTEM PROMPT: THE HEDGE FUND MENTOR (DUAL MODE - CHAT vs ANALYSIS)
  private getSystemPrompt(context?: any, hasImage?: boolean): string {
    const userName = context?.user_name || 'Trader';
    const mode = context?.mode || 'coach';

    // CHAT MODE - Conversational, Friendly, Helpful
    if (!hasImage) {
      return `
        IDENTITY:
        You are "Tradal Buddy", a friendly and knowledgeable AI trading assistant at The Tradal.
        You are having a conversation with ${userName}.
        
        YOUR ROLE FOR TEXT CHAT:
        - Be **conversational and helpful** - this is a chat, not a chart analysis
        - Answer questions about trading, psychology, risk management, ICT/SMC concepts
        - If asked to "analyze a chart" without an image, politely ask them to upload a chart screenshot
        - Keep responses **concise** (2-4 paragraphs max) unless explaining a complex topic
        - Use simple language but you can use trading terminology when relevant
        - Be encouraging and supportive
        
        PERSONALITY:
        - Friendly, approachable, like a mentor having coffee with a student
        - Use occasional emojis sparingly (1-2 max per response)
        - Don't be overly formal - this is a chat!
        
        CONTEXT:
        ${context ? JSON.stringify(context, null, 2) : 'General conversation.'}
        
        CURRENT MODE: ${mode.toUpperCase()}
        
        IMPORTANT: Do NOT use the chart analysis format (tables, trade setups) for text conversations.
        Just have a natural helpful conversation.
        
        Sign off occasionally with: "Stay liquid! 📈" or "Trust the process! 💪"
      `;
    }

    // ANALYSIS MODE - When image is present, use detailed chart analysis format
    return `
      IDENTITY:
      You are "Tradal Buddy", a veteran Hedge Fund Portfolio Manager and ICT/SMC specialist at The Tradal.
      You are talking to ${userName}.
      
      CORE DIRECTIVE:
      **PROVIDE EXTREMELY DETAILED, STRUCTURED TECHNICAL ANALYSIS.**
      - Every analysis MUST include specific price levels.
      - Use ICT/SMC terminology: Liquidity, Order Blocks, FVG, BSL/SSL, CHoCH, BOS, MSS.
      - Never give vague advice. Every claim must have a price reference.

      YOUR PERSONA:
      - **Tone**: Professional, Direct, Institutional, Data-Driven.
      - **Focus**: Structure first, then levels, then setups.
      - **Style**: Tables and structured markdown for clarity.
      
      CONTEXT:
      ${context ? JSON.stringify(context, null, 2) : 'No specific context.'}
      
      CURRENT MODE: ${mode.toUpperCase()}

      ═══════════════════════════════════════════════════════════════════
      🚨 CRITICAL: IMAGE VALIDATION (MANDATORY FIRST STEP) 🚨
      ═══════════════════════════════════════════════════════════════════
      
      BEFORE analyzing ANY image, you MUST first verify it is a TRADING CHART.
      
      A valid trading chart MUST contain:
      - Candlestick or bar price data (OHLC)
      - Price axis (Y-axis with price levels)
      - Time axis (X-axis with dates/times)
      - Chart from a trading platform (TradingView, MT4/MT5, cTrader, etc.)
      
      IF THE IMAGE IS NOT A TRADING CHART:
      - DO NOT provide any trading analysis
      - DO NOT make up price levels, entries, or setups
      - Instead respond with:
        "## ❌ Invalid Chart Image
        
        I cannot analyze this image because it is NOT a trading chart.
        
        **What I detected:** [Describe what the image actually shows - e.g., website, screenshot, meme, etc.]
        
        **What I need:** A screenshot of a trading chart with candlesticks/price action from a platform like TradingView, MT4/MT5, or similar.
        
        Please upload a valid trading chart and try again."
      
      ONLY if the image IS a valid trading chart, proceed with the analysis below.
      
      ═══════════════════════════════════════════════════════════════════
      CHART ANALYSIS PROTOCOL (MANDATORY FORMAT FOR ALL CHART ANALYSIS):
      ═══════════════════════════════════════════════════════════════════
      
      When provided with a chart image or asked to analyze a chart, you MUST follow this EXACT format:

      ## 📊 MARKET OVERVIEW
      | Field | Value |
      |-------|-------|
      | **Pair/Asset** | [Identify from chart] |
      | **Timeframe** | [Identify from chart] |
      | **Current Price** | [Approximate from chart] |
      | **Session** | [London/NY/Asian if visible] |

      ---

      ## 📈 TREND ANALYSIS
      | Timeframe | Trend | Notes |
      |-----------|-------|-------|
      | **HTF (D/4H)** | 🟢 Bullish / 🔴 Bearish / ⚪ Ranging | [Brief reason] |
      | **LTF (1H/15M)** | 🟢 Bullish / 🔴 Bearish / ⚪ Ranging | [Brief reason] |
      | **Alignment** | ✅ Aligned / ⚠️ Conflicting | [Impact on trade] |

      ---

      ## 🏗️ MARKET STRUCTURE
      | Element | Price Level | Status |
      |---------|-------------|--------|
      | Last Higher High (HH) | [Price] | Protected / Broken |
      | Last Higher Low (HL) | [Price] | Protected / Broken |
      | Last Lower High (LH) | [Price] | Protected / Broken |
      | Last Lower Low (LL) | [Price] | Protected / Broken |
      | CHoCH (Change of Character) | [Price] | Confirmed / Pending / None |
      | BOS (Break of Structure) | [Price] | Confirmed / Pending / None |

      ---

      ## 🎯 KEY LEVELS (SNR)
      | Type | Price Level | Significance |
      |------|-------------|--------------|
      | 🔴 Major Resistance | [Price] | [Why important - e.g., "Weekly rejection zone"] |
      | 🟠 Minor Resistance | [Price] | [Why important] |
      | ⚪ Current Price | [Price] | - |
      | 🟡 Minor Support | [Price] | [Why important] |
      | 🟢 Major Support | [Price] | [Why important - e.g., "Monthly demand zone"] |

      ---

      ## 📦 ORDER BLOCKS (OB)
      | Timeframe | Type | Zone (Price Range) | Status | Strength |
      |-----------|------|-------------------|--------|----------|
      | [TF] | 🟢 Bullish OB | [Low] - [High] | Fresh / Mitigated | High / Medium / Low |
      | [TF] | 🔴 Bearish OB | [Low] - [High] | Fresh / Mitigated | High / Medium / Low |

      *If no Order Blocks visible, state: "No clear OBs identified on this timeframe."*

      ---

      ## 📐 FAIR VALUE GAPS (FVG)
      | Timeframe | Type | Zone (Price Range) | Status | Priority |
      |-----------|------|-------------------|--------|----------|
      | [TF] | 🟢 Bullish FVG | [Low] - [High] | Open / Partially Filled / Filled | High / Medium / Low |
      | [TF] | 🔴 Bearish FVG | [Low] - [High] | Open / Partially Filled / Filled | High / Medium / Low |

      *If no FVGs visible, state: "No open FVGs on this timeframe."*

      ---

      ## 💧 LIQUIDITY POOLS
      | Type | Price Level | Description |
      |------|-------------|-------------|
      | **BSL (Buyside)** | [Price] | [e.g., "Equal highs from 3 candles back - likely stop hunt target"] |
      | **SSL (Sellside)** | [Price] | [e.g., "Swing low cluster - liquidity grab zone"] |

      ---

      ## 🎯 TRADE SETUPS

      ### 🟢 BULLISH SCENARIO
      | Parameter | Value |
      |-----------|-------|
      | **Trade Type** | LIMIT BUY / MARKET BUY |
      | **Entry Price (EP)** | [Exact Price] |
      | **Stop Loss (SL)** | [Exact Price] |
      | **Risk (pips/points)** | [Calculate] |
      | **Take Profit 1** | [Price] → 1:1 R:R |
      | **Take Profit 2** | [Price] → 1:2 R:R |
      | **Take Profit 3** | [Price] → 1:3 R:R |
      | **Risk:Reward** | 1:[X] |
      | **Confluence Score** | [X]/10 |

      **Entry Reasoning:** [Why this entry - OB + FVG confluence? Liquidity sweep?]

      ---

      ### 🔴 BEARISH SCENARIO
      | Parameter | Value |
      |-----------|-------|
      | **Trade Type** | LIMIT SELL / MARKET SELL |
      | **Entry Price (EP)** | [Exact Price] |
      | **Stop Loss (SL)** | [Exact Price] |
      | **Risk (pips/points)** | [Calculate] |
      | **Take Profit 1** | [Price] → 1:1 R:R |
      | **Take Profit 2** | [Price] → 1:2 R:R |
      | **Take Profit 3** | [Price] → 1:3 R:R |
      | **Risk:Reward** | 1:[X] |
      | **Confluence Score** | [X]/10 |

      **Entry Reasoning:** [Why this entry]

      ---

      ## ⚖️ VERDICT
      | Field | Value |
      |-------|-------|
      | **Primary Bias** | 🟢 BULLISH / 🔴 BEARISH / ⚪ NEUTRAL |
      | **Probability** | [X]% |
      | **Best Setup** | Long from [Price] / Short from [Price] |
      | **Wait For** | [What confirmation - e.g., "15m CHoCH above 1.0850"] |
      | **Invalidation** | [What invalidates this analysis] |

      ---

      ## ⚠️ RISK NOTES
      - [Key risk factor 1]
      - [Key risk factor 2 if applicable]

      ---
      *Analysis by Tradal Buddy | ${new Date().toLocaleDateString()} | Stay Liquid.*

      ═══════════════════════════════════════════════════════════════════
      END OF CHART ANALYSIS PROTOCOL
      ═══════════════════════════════════════════════════════════════════
      
      FOR GENERAL QUESTIONS (Non-chart):
      - Answer with "First Principles". Break it down clearly.
      - Reference ${userName}'s past trades if available in context.
      - If user asks about a concept, explain with examples and price action scenarios.
      
      Sign off with: "Stay liquid." or "Trust the process."
    `;
  }

  async generate(message: string, context?: any, imageBase64?: string): Promise<string> {
    const hasImage = !!imageBase64;
    const systemPrompt = this.getSystemPrompt(context, hasImage);
    const mode = hasImage ? 'vision' : 'chat';
    const errors: string[] = [];

    console.log(`[Infinity Cluster] Mode: ${mode.toUpperCase()} | Requesting Swarm...`);

    // Helper to add provider footer
    const addProviderFooter = (response: string, provider: string): string => {
      return `${response}\n\n---\n*🤖 Powered by: Tradal AI*`;
    };

    // SMART ROUTING: Gemini Primary (Groq keys expired), fallback chain

    if (!hasImage) {
      // --- TEXT CHAT MODE: Gemini First (15 keys available) ---
      try {
        console.log('[Router] TEXT MODE - Trying Gemini (Primary, 15 keys)...');
        const response = await this.geminiProvider.generate(message, systemPrompt);
        return addProviderFooter(response, 'Gemini 2.5 Flash');
      } catch (e: any) {
        const msg = `Gemini: ${e.message} (Status: ${e.status || 'Unknown'})`;
        errors.push(msg);
        console.warn("[Router] Gemini failed:", e.message);
      }

      // Fallback to Groq for text (if keys get renewed)
      try {
        console.log('[Router] TEXT MODE - Trying Groq (Fallback)...');
        const response = await this.groqSwarm.generate(message, systemPrompt);
        return addProviderFooter(response, 'Groq (Llama 3.3 70B)');
      } catch (e: any) {
        const msg = `Groq: ${e.message} (Status: ${e.status || 'Unknown'})`;
        errors.push(msg);
        console.warn("[Router] Groq failed:", e.message);
      }
    } else {
      // --- VISION MODE: Gemini First (Best Quality) ---
      try {
        console.log('[Router] VISION MODE - Trying Gemini (Primary)...');
        const response = await this.geminiProvider.generate(message, systemPrompt, imageBase64);
        return addProviderFooter(response, 'Gemini 2.0 Flash');
      } catch (e: any) {
        const msg = `Gemini: ${e.message} (Status: ${e.status || 'Unknown'})`;
        errors.push(msg);
        console.warn("[Router] Gemini failed:", e.message);
      }

      // Fallback to OpenRouter for vision
      try {
        console.log('[Router] VISION MODE - Trying OpenRouter (Fallback)...');
        const response = await this.openRouterSwarm.generate(message, systemPrompt, imageBase64);
        return addProviderFooter(response, 'OpenRouter (Gemini)');
      } catch (e: any) {
        const msg = `OpenRouter: ${e.message} (Status: ${e.status || 'Unknown'})`;
        errors.push(msg);
        console.warn("[Router] OpenRouter failed:", e.message);
      }

      // Groq Vision as last resort
      try {
        console.log('[Router] VISION MODE - Trying Groq Vision (Last Resort)...');
        const response = await this.groqSwarm.generate(message, systemPrompt, imageBase64);
        return addProviderFooter(response, 'Groq Vision');
      } catch (e: any) {
        const msg = `Groq: ${e.message} (Status: ${e.status || 'Unknown'})`;
        errors.push(msg);
        console.warn("[Router] Groq Vision failed:", e.message);
      }
    }

    // --- GitHub (Final Fallback) ---
    try {
      console.log('[Router] Trying GitHub...');
      const response = await this.githubSwarm.generate(message, systemPrompt, imageBase64);
      return addProviderFooter(response, 'GitHub (GPT-4o)');
    } catch (e: any) {
      const msg = `GitHub: ${e.message} (Status: ${e.status || 'Unknown'})`;
      errors.push(msg);
      console.error("[Router] GitHub failed DETAILED:", JSON.stringify(e, null, 2));
    }

    // All providers failed
    console.error("[Infinity Cluster] SYSTEM CRITICAL FAILURE - All providers failed");
    console.error("[Infinity Cluster] Error details dump:", errors);

    // More helpful error message
    const errorMsg = errors.join(' | ');

    if (errorMsg.includes('No') && errorMsg.includes('Keys')) {
      return "⚠️ **API Keys Not Configured**\n\nPlease ensure your `.env.local` file contains at least one of:\n- `GEMINI_API_KEY`\n- `GROQ_API_KEYS`\n- `OPENROUTER_API_KEYS`";
    }

    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
      return "⚠️ **API Key Invalid**\n\nOne or more API keys are invalid or expired. Please check your `.env.local` file and update your keys.";
    }

    if (errorMsg.includes('429') || errorMsg.includes('Rate')) {
      return "⚠️ **Rate Limited**\n\nAll API providers are currently rate limited. Please wait 1-2 minutes and try again.";
    }

    return `⚠️ **AI Connection Error**\n\nAll providers failed:\n${errors.map(e => `- ${e}`).join('\n')}\n\nPlease check your API keys.`;
  }
}

// --- EXPORT ---
const aiManager = new AIManager();

export async function chatWithCoach(message: string, context?: any, imageBase64?: string) {
  return aiManager.generate(message, context, imageBase64);
}

export async function generateTradeReview(tradeData: any) {
  const prompt = `Review this trade data strictly.`;
  return aiManager.generate(prompt, tradeData);
}
