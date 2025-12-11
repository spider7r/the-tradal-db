
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Using one of the keys provided by the user for testing
const genAI = new GoogleGenerativeAI("AIzaSyBG1l3bcegvQFT7Gj02bdB6r4lP0la5YOk");

async function listModels() {
    try {
        console.log("Fetching available models...");
        // For listing models, we don't need to select a model first, usually done via model manager or similar 
        // but the SDK structure is slightly different.
        // Actually, looking at SDK docs, usually it's not directly exposed on genAI instance in older versions?
        // checking recent docs: genAI.getGenerativeModel is for generation.
        // There isn't a simple listModels on the main class in some versions.

        // Let's try to just run a generation on 'gemini-1.5-flash' and print precise error or success.
        // And also 'gemini-pro'.

        const modelsToTest = ["gemini-pro"];

        for (const modelName of modelsToTest) {
            console.log(`Testing model: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you there?");
                const response = await result.response;
                console.log(`SUCCESS: ${modelName} works. Response: ${response.text()}`);
                return; // Exit after finding one working model
            } catch (error) {
                console.log(`FAILED: ${modelName} - ${error.message.split('\n')[0]}`);
            }
        }
    } catch (error) {
        console.error("Global script error:", error);
    }
}

listModels();
