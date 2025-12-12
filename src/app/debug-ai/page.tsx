
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

    // Test the first key
    let testResult = 'Not Attempted';
    let modelStatus = 'Unknown';

    if (parsedKeys.length > 0) {
        try {
            const genAI = new GoogleGenerativeAI(parsedKeys[0]);
            // Test the configured model from ai.ts logic
            const modelId = 'models/gemini-2.5-flash';
            const model = genAI.getGenerativeModel({ model: modelId });

            const result = await model.generateContent("Test connection. Reply 'OK'.");
            const response = await result.response;
            testResult = `Success: ${response.text()}`;
            modelStatus = `Model '${modelId}' is working.`;
        } catch (e: any) {
            testResult = `Failed: ${e.message}`;
            modelStatus = `Model Error: ${e.response?.status || 'Unknown Status'}`;
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
                    <strong className="text-white">Parsed Keys:</strong> {diagnostics.keysFound} <br />
                    <span className="text-xs text-gray-500">{JSON.stringify(diagnostics.keysPreview)}</span>
                </div>

                <div className="border-t border-green-900 pt-4">
                    <strong className="text-white">API Connectivity Test (Key #1):</strong> <br />
                    <pre className="whitespace-pre-wrap bg-zinc-900 p-2 rounded mt-2 text-sm">
                        {testResult}
                    </pre>
                </div>

                <div>
                    <strong className="text-white">Model Status:</strong> <br />
                    {modelStatus}
                </div>
            </div>

            <div className="mt-8 text-sm text-gray-500">
        If "Parsed Keys" is 0, Vercel does not have your keys. Go to Settings > Env Variables.<br />
                If "Model Error" is 404, the model name is wrong.<br />
                If "Model Error" is 429, the key is rate limited.
            </div>
        </div>
    );
}
