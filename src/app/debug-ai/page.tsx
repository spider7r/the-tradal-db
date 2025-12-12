
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export default async function DebugAIPage() {
    const envKeys = process.env.GEMINI_API_KEYS || '';
    const singleKey = process.env.GEMINI_API_KEY || '';

    const parsedKeys = envKeys
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

    if (singleKey && parsedKeys.length === 0) {
        parsedKeys.push(singleKey);
    }

    const diagnostics = {
        hasEnvVar: !!envKeys,
        hasSingleKey: !!singleKey,
        keysFound: parsedKeys.length,
        keysPreview: parsedKeys.map(k => `...${k.slice(-5)}`),
        modelCheck: 'Pending...'
    };

    // Test the first 5 keys
    let testResults: string[] = [];
    let modelStatus = 'Unknown';

    if (parsedKeys.length > 0) {
        const keysToTest = parsedKeys.slice(0, 5); // Test up to 5

        for (let i = 0; i < keysToTest.length; i++) {
            const key = keysToTest[i];
            const masked = `...${key.slice(-5)}`;
            try {
                const genAI = new GoogleGenerativeAI(key);

                // 1. Try Experimental 2.5 (Likely to Fail)
                try {
                    const model25 = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });
                    const res25 = await model25.generateContent("Test 2.5");
                    await res25.response;
                    testResults.push(`Key #${i + 1} (${masked}): ✅ 2.5-Flash WORKING`);
                    modelStatus = '2.5-Flash is healthy.';
                } catch (e25: any) {
                    // 2. Test Fallback Candidates (Specific Versions)
                    let fallbackSuccess = false;
                    // Note: 'gemini-1.5-flash' alias often 404s. Using specific versions.
                    const candidates = ['gemini-1.5-flash-002', 'gemini-1.5-flash-001'];
                    const results: string[] = [];

                    for (const candid of candidates) {
                        try {
                            const m = genAI.getGenerativeModel({ model: `models/${candid}` });
                            const r = await m.generateContent("Test");
                            await r.response;
                            results.push(`✅ ${candid}`);
                            fallbackSuccess = true;
                            // Update status if not already set by a previous candidate
                            if (!modelStatus.includes('WORKING')) {
                                modelStatus = `Fallback WORKING: ${candid}`;
                            }
                        } catch (ex: any) {
                            results.push(`❌ ${candid} (${ex.response?.status || 404})`);
                        }
                    }

                    if (fallbackSuccess) {
                        testResults.push(`Key #${i + 1} (${masked}): ⚠️ 2.5 (429) -> ${results.find(r => r.includes('✅'))}`);
                    } else {
                        const msg25 = e25.message || 'Unknown';
                        testResults.push(`Key #${i + 1} (${masked}): ❌ ALL FAILED. [2.5]: ${msg25} \n Candidates: ${results.join(', ')}`);
                    }
                }
            } catch (e: any) {
                testResults.push(`Key #${i + 1} (${masked}): ❌ Fatal Error: ${e.message}`);
                if (modelStatus === 'Unknown') modelStatus = `Error: ${e.response?.status || 'Unknown'}`;
            }
        }
    }

    return (
        <div className="p-8 font-mono bg-black text-green-400 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">AI Debug Diagnostics</h1>

            <div className="space-y-4 border p-4 rounded border-green-800">
                <div>
                    <strong className="text-white">Environment Variable (GEMINI_API_KEYS):</strong> <br />
                    {diagnostics.hasEnvVar ? '✅ Present' : '❌ MISSING'}
                </div>

                <div>
                    <strong className="text-white">Gemini Keys:</strong> {diagnostics.keysFound}
                </div>
                <div>
                    <strong className="text-white">GitHub Token:</strong> {process.env.GITHUB_MODELS_TOKEN ? '✅ Present' : '❌ Missing'}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                    Global Cluster Status:
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>OpenRouter: {process.env.OPENROUTER_API_KEY ? '✅' : '❌'}</div>
                    <div>SambaNova: {process.env.SAMBANOVA_API_KEY ? '✅' : '❌'}</div>
                    <div>DeepSeek: {process.env.DEEPSEEK_API_KEY ? '✅' : '❌'}</div>
                    <div>HuggingFace: {process.env.HUGGINGFACE_API_KEY ? '✅' : '❌'}</div>
                    <div>Together: {process.env.TOGETHER_API_KEY ? '✅' : '❌'}</div>
                    <div>NVIDIA: {process.env.NVIDIA_API_KEY ? '✅' : '❌'}</div>
                    <div>Mistral: {process.env.MISTRAL_API_KEY ? '✅' : '❌'}</div>
                </div>

                <div className="border-t border-green-900 pt-4">
                    <strong className="text-white">API Connectivity Test (First 5 Keys):</strong> <br />
                    <div className="space-y-2 bg-zinc-900 p-2 rounded mt-2 text-sm max-h-60 overflow-y-auto">
                        {testResults.map((res, i) => (
                            <div key={i} className={res.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                                {res}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <strong className="text-white">Model Status:</strong> <br />
                    {modelStatus}
                </div>
            </div>

            <div className="mt-8 text-sm text-gray-500">
                If "Parsed Keys" is 0, Vercel does not have your keys. Go to Settings &gt; Env Variables.<br />
                If "Model Error" is 404, the model name is wrong.<br />
                If "Model Error" is 429, the key is rate limited.
            </div>
        </div>
    );
}
